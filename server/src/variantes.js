// Conditionnements (sous-produits) : un même produit vendu en boîte de 6, de 12, en plateau de 30…
import { pool, query } from './db.js';
import { imageUrl } from './upload.js';
import { removeUpload, toBool, toInt } from './utils.js';

export const LIBELLES = ['Boîte', 'Plateau', 'Étui', 'Sachet', 'Carton', 'Vrac'];

const COLONNES = 'id, produit_id, libelle, quantite, reference, image, actif, ordre';

// Variantes de plusieurs produits d'un coup : { [produit_id]: [...] }
export async function variantesPar(produitIds, seulementActives) {
  if (!produitIds.length) return {};
  const { rows } = await query(
    `SELECT ${COLONNES} FROM variantes
     WHERE produit_id = ANY($1::int[]) ${seulementActives ? 'AND actif' : ''}
     ORDER BY ordre, quantite, id`,
    [produitIds]
  );
  const parProduit = {};
  for (const v of rows) (parProduit[v.produit_id] ||= []).push(v);
  return parProduit;
}

export async function avecVariantes(produits, seulementActives) {
  const parProduit = await variantesPar(produits.map((p) => p.id), seulementActives);
  return produits.map((p) => ({ ...p, variantes: parProduit[p.id] || [] }));
}

// Lit et vérifie la liste envoyée par le formulaire (champ "variantes", en JSON)
export function validerVariantes(brut) {
  if (brut === undefined) return { liste: null }; // champ absent : on ne touche à rien
  let liste;
  try { liste = JSON.parse(brut); } catch { return { erreur: 'Liste des conditionnements illisible' }; }
  if (!Array.isArray(liste)) return { erreur: 'Liste des conditionnements illisible' };
  if (liste.length > 20) return { erreur: '20 conditionnements maximum par produit' };
  const propre = [];
  for (const v of liste) {
    const quantite = toInt(v?.quantite);
    const libelle = String(v?.libelle ?? '').trim().slice(0, 40) || 'Boîte';
    if (!quantite || quantite < 1 || quantite > 10000) return { erreur: `Nombre d’œufs invalide pour « ${libelle} »` };
    propre.push({
      id: toInt(v?.id),
      libelle,
      quantite,
      reference: String(v?.reference ?? '').trim().slice(0, 60),
      actif: toBool(v?.actif),
      supprimer_image: toBool(v?.supprimer_image, false),
      fichier: typeof v?.fichier === 'string' ? v.fichier : null
    });
  }
  return { liste: propre };
}

// Remplace les conditionnements d'un produit par ceux du formulaire.
// Les lignes existantes (avec id) sont mises à jour, les nouvelles ajoutées, les absentes supprimées.
export async function enregistrerVariantes(produitId, liste, fichiers = []) {
  if (!liste) return;
  const { rows: existantes } = await query(`SELECT ${COLONNES} FROM variantes WHERE produit_id = $1`, [produitId]);
  const parId = new Map(existantes.map((v) => [v.id, v]));
  const imagesASupprimer = [];
  const gardees = new Set();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [ordre, v] of liste.entries()) {
      const ancienne = v.id ? parId.get(v.id) : null;
      const fichier = v.fichier ? fichiers.find((f) => f.fieldname === v.fichier) : null;
      let image = ancienne?.image ?? null;
      if (fichier) image = imageUrl(fichier);
      else if (v.supprimer_image) image = null;
      if (ancienne && ancienne.image && ancienne.image !== image) imagesASupprimer.push(ancienne.image);

      if (ancienne) {
        gardees.add(ancienne.id);
        await client.query(
          'UPDATE variantes SET libelle=$1, quantite=$2, reference=$3, image=$4, actif=$5, ordre=$6 WHERE id=$7',
          [v.libelle, v.quantite, v.reference, image, v.actif, ordre, ancienne.id]
        );
      } else {
        await client.query(
          'INSERT INTO variantes (produit_id, libelle, quantite, reference, image, actif, ordre) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [produitId, v.libelle, v.quantite, v.reference, image, v.actif, ordre]
        );
      }
    }
    for (const v of existantes) {
      if (gardees.has(v.id)) continue;
      await client.query('DELETE FROM variantes WHERE id = $1', [v.id]);
      if (v.image) imagesASupprimer.push(v.image);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  for (const img of imagesASupprimer) await removeUpload(img);
}

// Une fois : transforme l'ancien champ texte "formats" (ex. "Plateau de 30, Boîte de 6") en conditionnements
export async function migrerFormats() {
  const { rows } = await query(
    `SELECT p.id, p.formats FROM produits p
     WHERE p.formats <> '' AND NOT EXISTS (SELECT 1 FROM variantes v WHERE v.produit_id = p.id)`
  );
  for (const p of rows) {
    const morceaux = p.formats.split(',').map((m) => m.trim()).filter(Boolean);
    let ordre = 0;
    for (const m of morceaux) {
      const n = m.match(/\d+/);
      if (!n) continue;
      const libelle = m.replace(/\s*(de|d’|d')?\s*\d+.*$/i, '').trim() || 'Boîte';
      await query('INSERT INTO variantes (produit_id, libelle, quantite, ordre) VALUES ($1, $2, $3, $4)', [p.id, libelle, parseInt(n[0], 10), ordre++]);
    }
    await query(`UPDATE produits SET formats = '' WHERE id = $1`, [p.id]);
  }
}
