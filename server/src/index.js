import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { UPLOAD_DIR } from './utils.js';
import { pool } from './db.js';
import { preparerBase } from './infosSite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '..', '..', 'client', 'dist');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Photos envoyées depuis l'admin
// fallthrough: false = une photo absente renvoie une vraie erreur 404 (et non la page d'accueil)
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: false }));

// API
app.use('/api', publicRoutes);
app.use('/api', adminRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue' }));

// Site React compilé (production) : toutes les autres URLs renvoient index.html
if (fs.existsSync(CLIENT_DIST)) {
  // Fichiers compilés par Vite (leur nom change à chaque version) : gardés 1 an par le navigateur
  app.use('/assets', express.static(path.join(CLIENT_DIST, 'assets'), { maxAge: '1y', immutable: true, fallthrough: false }));
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1d' }));
  // index.html jamais mis en cache : les visiteurs reçoivent toujours la dernière version du site
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// Erreurs
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image trop lourde (3 Mo maximum)' });
  if (err.status === 404) return res.status(404).json({ error: 'Fichier introuvable' }); // sans révéler le chemin sur le serveur
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

const PORT = process.env.PORT || 4000;
// En production, HOST=127.0.0.1 : le serveur n'est joignable que par Nginx, pas directement depuis Internet
const HOST = process.env.HOST || undefined;
app.listen(PORT, HOST, async () => {
  console.log(`Ovolina : serveur démarré sur http://${HOST || 'localhost'}:${PORT}`);
  // Vérifie tout de suite la base pour afficher un message clair en cas de problème
  try {
    await pool.query('SELECT 1 FROM admins LIMIT 1');
    await preparerBase(); // ajoute les tables manquantes après une mise à jour du code
    console.log('Base PostgreSQL : connectée.');
  } catch (e) {
    if (e.code === '42P01') console.error('Base PostgreSQL : tables absentes. Lancez « npm run db:init ».');
    else console.error(`Base PostgreSQL : connexion impossible (${e.message}). Vérifiez DATABASE_URL dans server/.env.`);
  }
});
