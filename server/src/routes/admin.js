import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, signToken } from '../auth.js';
import { upload, uploadPlusieurs, imageUrl } from '../upload.js';
import { avecVariantes, validerVariantes, enregistrerVariantes } from '../variantes.js';
import { CATEGORIES_BLOG, SQL_MINUTES } from '../articles.js';
import { idYoutube } from '../youtube.js';
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
    nutrition: String(body.nutrition || '').trim(),
    couleur_jaune: /^#[0-9a-fA-F]{6}$/.test(body.couleur_jaune || '') ? body.couleur_jaune : '#F2A20C',
    actif: toBool(body.actif),
    ordre: toInt(body.ordre) ?? 0
  };
}

const fichiersDe = (req) => req.files || [];
const imageProduit = (req) => fichiersDe(req).find((f) => f.fieldname === 'image');
async function nettoyerEnvois(req) {
  for (const f of fichiersDe(req)) await removeUpload(imageUrl(f));
}

// Enveloppe une route d'envoi de photos : en cas d'erreur, les fichiers reçus sont supprimés
const avecEnvois = (fn) => wrap(async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    await nettoyerEnvois(req);
    throw e;
  }
});

router.get('/admin/produits', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT p.*, (SELECT COUNT(*)::int FROM recettes r WHERE r.produit_id = p.id) AS nb_recettes
     FROM produits p ORDER BY p.ordre, p.nom`
  );
  res.json(await avecVariantes(rows, false));
}));

router.get('/admin/produits/:id', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM produits WHERE id = $1', [toInt(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Produit introuvable' });
  res.json((await avecVariantes(rows, false))[0]);
}));

router.post('/admin/produits', uploadPlusieurs, avecEnvois(async (req, res) => {
  const f = produitFields(req.body);
  const { liste, erreur } = validerVariantes(req.body.variantes);
  if (!f.nom || erreur) {
    await nettoyerEnvois(req);
    return res.status(400).json({ error: erreur || 'Le nom est obligatoire' });
  }
  const slug = await uniqueSlug(query, 'produits', req.body.slug || f.nom);
  const { rows } = await query(
    `INSERT INTO produits (nom, slug, resume, description, points_forts, nutrition, couleur_jaune, image, actif, ordre)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [f.nom, slug, f.resume, f.description, f.points_forts, f.nutrition, f.couleur_jaune, imageUrl(imageProduit(req)), f.actif, f.ordre]
  );
  await enregistrerVariantes(rows[0].id, liste, fichiersDe(req));
  res.status(201).json((await avecVariantes(rows, false))[0]);
}));

router.put('/admin/produits/:id', uploadPlusieurs, avecEnvois(async (req, res) => {
  const id = toInt(req.params.id);
  const { rows: old } = await query('SELECT * FROM produits WHERE id = $1', [id]);
  if (!old[0]) {
    await nettoyerEnvois(req);
    return res.status(404).json({ error: 'Produit introuvable' });
  }
  const f = produitFields(req.body);
  const { liste, erreur } = validerVariantes(req.body.variantes);
  if (!f.nom || erreur) {
    await nettoyerEnvois(req);
    return res.status(400).json({ error: erreur || 'Le nom est obligatoire' });
  }
  const slug = await uniqueSlug(query, 'produits', req.body.slug || f.nom, id);
  let image = old[0].image;
  if (imageProduit(req)) image = imageUrl(imageProduit(req));
  else if (toBool(req.body.supprimer_image, false)) image = null;

  const { rows } = await query(
    `UPDATE produits SET nom=$1, slug=$2, resume=$3, description=$4, points_forts=$5, nutrition=$6,
       couleur_jaune=$7, image=$8, actif=$9, ordre=$10, modifie_le=NOW()
     WHERE id=$11 RETURNING *`,
    [f.nom, slug, f.resume, f.description, f.points_forts, f.nutrition, f.couleur_jaune, image, f.actif, f.ordre, id]
  );
  await enregistrerVariantes(id, liste, fichiersDe(req));
  if (image !== old[0].image) await removeUpload(old[0].image);
  res.json((await avecVariantes(rows, false))[0]);
}));

router.delete('/admin/produits/:id', wrap(async (req, res) => {
  const id = toInt(req.params.id);
  const { rows: imgs } = await query('SELECT image FROM variantes WHERE produit_id = $1 AND image IS NOT NULL', [id]);
  const { rows } = await query('DELETE FROM produits WHERE id = $1 RETURNING image', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Produit introuvable' });
  await removeUpload(rows[0].image);
  for (const v of imgs) await removeUpload(v.image);
  res.status(204).end();
}));

// ---------- Recettes ----------

const CATEGORIES = ['Entrées', 'Plats', 'Desserts'];
const DIFFICULTES = ['Facile', 'Moyen', 'Difficile'];

function recetteFields(body) {
  const video = idYoutube(body.video_youtube);
  return {
    video_youtube: video || null,
    videoInvalide: video === null,
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
  if (f.videoInvalide) {
    await removeUpload(imageUrl(req.file));
    return res.status(400).json({ error: 'Lien YouTube non reconnu : collez l’adresse de la vidéo (youtube.com/watch?v=… ou youtu.be/…)' });
  }
  const slug = await uniqueSlug(query, 'recettes', req.body.slug || f.titre);
  const { rows } = await query(
    `INSERT INTO recettes (titre, slug, categorie, resume, image, temps_preparation, personnes, difficulte,
       ingredients, etapes, produit_id, actif, ordre, video_youtube)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [f.titre, slug, f.categorie, f.resume, imageUrl(req.file), f.temps_preparation, f.personnes, f.difficulte,
     f.ingredients, f.etapes, f.produit_id, f.actif, f.ordre, f.video_youtube]
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
  if (f.videoInvalide) {
    await removeUpload(imageUrl(req.file));
    return res.status(400).json({ error: 'Lien YouTube non reconnu : collez l’adresse de la vidéo (youtube.com/watch?v=… ou youtu.be/…)' });
  }
  const slug = await uniqueSlug(query, 'recettes', req.body.slug || f.titre, id);
  let image = old[0].image;
  if (req.file) image = imageUrl(req.file);
  else if (toBool(req.body.supprimer_image, false)) image = null;

  const { rows } = await query(
    `UPDATE recettes SET titre=$1, slug=$2, categorie=$3, resume=$4, image=$5, temps_preparation=$6, personnes=$7,
       difficulte=$8, ingredients=$9, etapes=$10, produit_id=$11, actif=$12, ordre=$13, video_youtube=$14, modifie_le=NOW()
     WHERE id=$15 RETURNING *`,
    [f.titre, slug, f.categorie, f.resume, image, f.temps_preparation, f.personnes, f.difficulte,
     f.ingredients, f.etapes, f.produit_id, f.actif, f.ordre, f.video_youtube, id]
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

// ---------- Blog ----------

function articleFields(body) {
  const date = body.publie_le ? new Date(body.publie_le) : new Date();
  return {
    titre: String(body.titre || '').trim().slice(0, 200),
    categorie: CATEGORIES_BLOG.includes(body.categorie) ? body.categorie : 'Actualités',
    extrait: String(body.extrait || '').trim().slice(0, 400),
    contenu: String(body.contenu || '').trim().slice(0, 100000),
    auteur: String(body.auteur || '').trim().slice(0, 100) || 'L’équipe Ovolina',
    publie: toBool(body.publie, false),
    publie_le: Number.isNaN(date.getTime()) ? new Date() : date
  };
}

router.get('/admin/articles', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT id, titre, slug, categorie, extrait, image, auteur, publie, publie_le, modifie_le, ${SQL_MINUTES}
     FROM articles ORDER BY publie_le DESC`
  );
  res.json(rows);
}));

router.get('/admin/articles/:id', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM articles WHERE id = $1', [toInt(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Article introuvable' });
  res.json(rows[0]);
}));

router.post('/admin/articles', upload.single('image'), wrap(async (req, res) => {
  const f = articleFields(req.body);
  if (!f.titre) {
    await removeUpload(imageUrl(req.file));
    return res.status(400).json({ error: 'Le titre est obligatoire' });
  }
  const slug = await uniqueSlug(query, 'articles', req.body.slug || f.titre);
  const { rows } = await query(
    `INSERT INTO articles (titre, slug, categorie, extrait, contenu, image, auteur, publie, publie_le)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [f.titre, slug, f.categorie, f.extrait, f.contenu, imageUrl(req.file), f.auteur, f.publie, f.publie_le]
  );
  res.status(201).json(rows[0]);
}));

router.put('/admin/articles/:id', upload.single('image'), wrap(async (req, res) => {
  const id = toInt(req.params.id);
  const { rows: old } = await query('SELECT * FROM articles WHERE id = $1', [id]);
  if (!old[0]) {
    await removeUpload(imageUrl(req.file));
    return res.status(404).json({ error: 'Article introuvable' });
  }
  const f = articleFields(req.body);
  if (!f.titre) {
    await removeUpload(imageUrl(req.file));
    return res.status(400).json({ error: 'Le titre est obligatoire' });
  }
  const slug = await uniqueSlug(query, 'articles', req.body.slug || f.titre, id);
  let image = old[0].image;
  if (req.file) image = imageUrl(req.file);
  else if (toBool(req.body.supprimer_image, false)) image = null;
  const { rows } = await query(
    `UPDATE articles SET titre=$1, slug=$2, categorie=$3, extrait=$4, contenu=$5, image=$6, auteur=$7,
       publie=$8, publie_le=$9, modifie_le=NOW()
     WHERE id=$10 RETURNING *`,
    [f.titre, slug, f.categorie, f.extrait, f.contenu, image, f.auteur, f.publie, f.publie_le, id]
  );
  if (image !== old[0].image) await removeUpload(old[0].image);
  res.json(rows[0]);
}));

router.delete('/admin/articles/:id', wrap(async (req, res) => {
  const { rows } = await query('DELETE FROM articles WHERE id = $1 RETURNING image', [toInt(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Article introuvable' });
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
