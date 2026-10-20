import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, signToken } from '../auth.js';
import { upload, imageUrl } from '../upload.js';
import { wrap, uniqueSlug, toBool, toInt, removeUpload } from '../utils.js';
import { lireSite, validerSite, ecrireSite } from '../infosSite.js';

const router = Router();

// ---------- Connexion ----------

// Limite simple contre les essais de mot de passe en rafale
const tentatives = new Map();
function tropDeTentatives(ip) {
  const now = Date.now();
  const t = (tentatives.get(ip) || []).filter((d) => now - d < 15 * 60 * 1000);
  tentatives.set(ip, t);
  return t.length >= 10;
}

router.post('/auth/login', wrap(async (req, res) => {
  const ip = req.ip;
  if (tropDeTentatives(ip)) {
    return res.status(429).json({ error: 'Trop de tentatives, réessayez dans 15 minutes' });
  }
  const { email, motDePasse } = req.body || {};
  const { rows } = await query('SELECT * FROM admins WHERE email = $1', [String(email || '').trim().toLowerCase()]);
  const admin = rows[0];
  const ok = admin && (await bcrypt.compare(String(motDePasse || ''), admin.mot_de_passe));
  if (!ok) {
    tentatives.get(ip).push(Date.now());
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  res.json({ token: signToken(admin), admin: { id: admin.id, email: admin.email } });
}));

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ admin: req.admin });
});

// Tout ce qui suit est réservé aux admins connectés
router.use('/admin', requireAuth);

// ---------- Produits ----------

function produitFields(body) {
  return {
    nom: String(body.nom || '').trim(),
    resume: String(body.resume || '').trim(),
    description: String(body.description || '').trim(),
    points_forts: String(body.points_forts || '').trim(),
    formats: String(body.formats || '').trim(),
    nutrition: String(body.nutrition || '').trim(),
    couleur_jaune: /^#[0-9a-fA-F]{6}$/.test(body.couleur_jaune || '') ? body.couleur_jaune : '#F2A20C',
    actif: toBool(body.actif),
    ordre: toInt(body.ordre) ?? 0
  };
}

router.get('/admin/produits', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT p.*, (SELECT COUNT(*)::int FROM recettes r WHERE r.produit_id = p.id) AS nb_recettes
     FROM produits p ORDER BY p.ordre, p.nom`
  );
  res.json(rows);
}));

router.get('/admin/produits/:id', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM produits WHERE id = $1', [toInt(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Produit introuvable' });
  res.json(rows[0]);
}));

router.post('/admin/produits', upload.single('image'), wrap(async (req, res) => {
  const f = produitFields(req.body);
  if (!f.nom) {
    await removeUpload(imageUrl(req.file));
    return res.status(400).json({ error: 'Le nom est obligatoire' });
  }
  const slug = await uniqueSlug(query, 'produits', req.body.slug || f.nom);
  const { rows } = await query(
    `INSERT INTO produits (nom, slug, resume, description, points_forts, formats, nutrition, couleur_jaune, image, actif, ordre)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [f.nom, slug, f.resume, f.description, f.points_forts, f.formats, f.nutrition, f.couleur_jaune, imageUrl(req.file), f.actif, f.ordre]
  );
  res.status(201).json(rows[0]);
}));

router.put('/admin/produits/:id', upload.single('image'), wrap(async (req, res) => {
  const id = toInt(req.params.id);
  const { rows: old } = await query('SELECT * FROM produits WHERE id = $1', [id]);
  if (!old[0]) {
    await removeUpload(imageUrl(req.file));
    return res.status(404).json({ error: 'Produit introuvable' });
  }
  const f = produitFields(req.body);
  if (!f.nom) {
    await removeUpload(imageUrl(req.file));
    return res.status(400).json({ error: 'Le nom est obligatoire' });
  }
  const slug = await uniqueSlug(query, 'produits', req.body.slug || f.nom, id);
  let image = old[0].image;
  if (req.file) image = imageUrl(req.file);
  else if (toBool(req.body.supprimer_image, false)) image = null;

  const { rows } = await query(
    `UPDATE produits SET nom=$1, slug=$2, resume=$3, description=$4, points_forts=$5, formats=$6, nutrition=$7,
       couleur_jaune=$8, image=$9, actif=$10, ordre=$11, modifie_le=NOW()
     WHERE id=$12 RETURNING *`,
    [f.nom, slug, f.resume, f.description, f.points_forts, f.formats, f.nutrition, f.couleur_jaune, image, f.actif, f.ordre, id]
  );
  if (image !== old[0].image) await removeUpload(old[0].image);
  res.json(rows[0]);
}));

router.delete('/admin/produits/:id', wrap(async (req, res) => {
  const { rows } = await query('DELETE FROM produits WHERE id = $1 RETURNING image', [toInt(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Produit introuvable' });
  await removeUpload(rows[0].image);
  res.status(204).end();
}));

// ---------- Recettes ----------

const CATEGORIES = ['Entrées', 'Plats', 'Desserts'];
const DIFFICULTES = ['Facile', 'Moyen', 'Difficile'];

function recetteFields(body) {
  return {
    titre: String(body.titre || '').trim(),
    categorie: CATEGORIES.includes(body.categorie) ? body.categorie : 'Plats',
    resume: String(body.resume || '').trim(),
    temps_preparation: toInt(body.temps_preparation),
    personnes: toInt(body.personnes),
    difficulte: DIFFICULTES.includes(body.difficulte) ? body.difficulte : 'Facile',
    ingredients: String(body.ingredients || '').trim(),
    etapes: String(body.etapes || '').trim(),
    produit_id: toInt(body.produit_id),
    actif: toBool(body.actif),
    ordre: toInt(body.ordre) ?? 0
  };
}

router.get('/admin/recettes', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT r.*, p.nom AS produit_nom FROM recettes r LEFT JOIN produits p ON p.id = r.produit_id
     ORDER BY r.ordre, r.cree_le DESC`
  );
  res.json(rows);
}));

router.get('/admin/recettes/:id', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM recettes WHERE id = $1', [toInt(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Recette introuvable' });
  res.json(rows[0]);
}));

router.post('/admin/recettes', upload.single('image'), wrap(async (req, res) => {
  const f = recetteFields(req.body);
  if (!f.titre) {
    await removeUpload(imageUrl(req.file));
    return res.status(400).json({ error: 'Le titre est obligatoire' });
  }
  const slug = await uniqueSlug(query, 'recettes', req.body.slug || f.titre);
  const { rows } = await query(
    `INSERT INTO recettes (titre, slug, categorie, resume, image, temps_preparation, personnes, difficulte,
       ingredients, etapes, produit_id, actif, ordre)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [f.titre, slug, f.categorie, f.resume, imageUrl(req.file), f.temps_preparation, f.personnes, f.difficulte,
     f.ingredients, f.etapes, f.produit_id, f.actif, f.ordre]
  );
  res.status(201).json(rows[0]);
}));

router.put('/admin/recettes/:id', upload.single('image'), wrap(async (req, res) => {
  const id = toInt(req.params.id);
  const { rows: old } = await query('SELECT * FROM recettes WHERE id = $1', [id]);
  if (!old[0]) {
    await removeUpload(imageUrl(req.file));
    return res.status(404).json({ error: 'Recette introuvable' });
  }
  const f = recetteFields(req.body);
  if (!f.titre) {
    await removeUpload(imageUrl(req.file));
    return res.status(400).json({ error: 'Le titre est obligatoire' });
  }
  const slug = await uniqueSlug(query, 'recettes', req.body.slug || f.titre, id);
  let image = old[0].image;
  if (req.file) image = imageUrl(req.file);
  else if (toBool(req.body.supprimer_image, false)) image = null;

  const { rows } = await query(
    `UPDATE recettes SET titre=$1, slug=$2, categorie=$3, resume=$4, image=$5, temps_preparation=$6, personnes=$7,
       difficulte=$8, ingredients=$9, etapes=$10, produit_id=$11, actif=$12, ordre=$13, modifie_le=NOW()
     WHERE id=$14 RETURNING *`,
    [f.titre, slug, f.categorie, f.resume, image, f.temps_preparation, f.personnes, f.difficulte,
     f.ingredients, f.etapes, f.produit_id, f.actif, f.ordre, id]
  );
  if (image !== old[0].image) await removeUpload(old[0].image);
  res.json(rows[0]);
}));

router.delete('/admin/recettes/:id', wrap(async (req, res) => {
  const { rows } = await query('DELETE FROM recettes WHERE id = $1 RETURNING image', [toInt(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Recette introuvable' });
  await removeUpload(rows[0].image);
  res.status(204).end();
}));

// ---------- Messages ----------

router.get('/admin/messages', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM messages ORDER BY recu_le DESC');
  res.json(rows);
}));

router.get('/admin/messages/nouveaux', wrap(async (req, res) => {
  const { rows } = await query('SELECT COUNT(*)::int AS total FROM messages WHERE NOT traite');
  res.json(rows[0]);
}));

router.patch('/admin/messages/:id', wrap(async (req, res) => {
  const { rows } = await query(
    'UPDATE messages SET traite = $1 WHERE id = $2 RETURNING *',
    [toBool(req.body?.traite), toInt(req.params.id)]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Message introuvable' });
  res.json(rows[0]);
}));

router.delete('/admin/messages/:id', wrap(async (req, res) => {
  const { rowCount } = await query('DELETE FROM messages WHERE id = $1', [toInt(req.params.id)]);
  if (!rowCount) return res.status(404).json({ error: 'Message introuvable' });
  res.status(204).end();
}));

// ---------- Infos du site ----------

router.put('/admin/site', wrap(async (req, res) => {
  const { donnees, erreur } = validerSite(req.body);
  if (erreur) return res.status(400).json({ error: erreur });
  await ecrireSite(donnees);
  res.json(await lireSite());
}));

// ---------- Mot de passe ----------

router.post('/admin/mot-de-passe', wrap(async (req, res) => {
  const { actuel, nouveau } = req.body || {};
  if (!nouveau || String(nouveau).length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' });
  }
  const { rows } = await query('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
  if (!rows[0] || !(await bcrypt.compare(String(actuel || ''), rows[0].mot_de_passe))) {
    return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
  }
  await query('UPDATE admins SET mot_de_passe = $1 WHERE id = $2', [await bcrypt.hash(String(nouveau), 10), req.admin.id]);
  res.json({ ok: true });
}));

export default router;
