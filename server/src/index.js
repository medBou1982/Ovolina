import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { UPLOAD_DIR } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '..', '..', 'client', 'dist');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Photos envoyées depuis l'admin
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

// API
app.use('/api', publicRoutes);
app.use('/api', adminRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue' }));

// Site React compilé (production) : toutes les autres URLs renvoient index.html
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

// Erreurs
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image trop lourde (3 Mo maximum)' });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Ovolina : serveur démarré sur http://localhost:${PORT}`));
