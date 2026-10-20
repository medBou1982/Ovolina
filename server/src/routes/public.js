import { Router } from 'express';
import { query } from '../db.js';
import { wrap } from '../utils.js';

const router = Router();

const PRODUIT_COLS = `id, nom, slug, resume, description, points_forts, formats, nutrition, couleur_jaune, image, ordre`;
const RECETTE_COLS = `r.id, r.titre, r.slug, r.categorie, r.resume, r.image, r.temps_preparation, r.personnes,
  r.difficulte, r.ingredients, r.etapes, r.produit_id`;

// Liste des produits visibles
router.get('/produits', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT ${PRODUIT_COLS} FROM produits WHERE actif ORDER BY ordre, nom`
  );
  res.json(rows);
}));

// Fiche produit + recettes associées
router.get('/produits/:slug', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT ${PRODUIT_COLS} FROM produits WHERE slug = $1 AND actif`,
    [req.params.slug]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Produit introuvable' });
  const recettes = await query(
    `SELECT ${RECETTE_COLS} FROM recettes r WHERE r.produit_id = $1 AND r.actif ORDER BY r.ordre, r.titre LIMIT 3`,
    [rows[0].id]
  );
  res.json({ ...rows[0], recettes: recettes.rows });
}));

// Liste des recettes (filtre optionnel ?categorie=Plats, ?limit=3)
router.get('/recettes', wrap(async (req, res) => {
  const params = [];
  let where = 'r.actif';
  if (req.query.categorie) {
    params.push(req.query.categorie);
    where += ` AND r.categorie = $${params.length}`;
  }
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 100);
  params.push(limit);
  const { rows } = await query(
    `SELECT ${RECETTE_COLS} FROM recettes r WHERE ${where} ORDER BY r.ordre, r.cree_le DESC LIMIT $${params.length}`,
    params
  );
  res.json(rows);
}));

// Fiche recette + produit utilisé
router.get('/recettes/:slug', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT ${RECETTE_COLS},
            CASE WHEN p.id IS NOT NULL AND p.actif
                 THEN json_build_object('nom', p.nom, 'slug', p.slug, 'couleur_jaune', p.couleur_jaune, 'image', p.image)
            END AS produit
     FROM recettes r LEFT JOIN produits p ON p.id = r.produit_id
     WHERE r.slug = $1 AND r.actif`,
    [req.params.slug]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Recette introuvable' });
  res.json(rows[0]);
}));

// Formulaire de contact
router.post('/contact', wrap(async (req, res) => {
  const { nom, email, telephone, profil, message, site } = req.body || {};
  // Champ piège anti-robots : invisible pour les humains
  if (site) return res.status(201).json({ ok: true });

  const erreurs = {};
  if (!nom || String(nom).trim().length < 2) erreurs.nom = 'Indiquez votre nom';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) erreurs.email = 'Email invalide';
  if (!message || String(message).trim().length < 5) erreurs.message = 'Votre message est trop court';
  if (Object.keys(erreurs).length) return res.status(400).json({ error: 'Formulaire incomplet', erreurs });

  const profils = ['Particulier', 'Professionnel', 'Autre'];
  await query(
    `INSERT INTO messages (nom, email, telephone, profil, message) VALUES ($1, $2, $3, $4, $5)`,
    [
      String(nom).trim().slice(0, 200),
      String(email).trim().slice(0, 200),
      telephone ? String(telephone).trim().slice(0, 50) : null,
      profils.includes(profil) ? profil : 'Particulier',
      String(message).trim().slice(0, 5000)
    ]
  );
  res.status(201).json({ ok: true });
}));

export default router;
