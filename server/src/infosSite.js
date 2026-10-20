// Informations générales du site : coordonnées, réseaux sociaux, sites, chiffres clés
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, query } from './db.js';
import { migrerFormats } from './variantes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = path.resolve(__dirname, '..', 'db', 'schema.sql');

export const RESEAUX = ['facebook', 'instagram', 'linkedin', 'youtube'];

const DEFAUTS = {
  parametres: { email: 'contact@ovolina.com', telephone: '+216 74 696 500' },
  sites: [
    { ville: 'Sfax', adresse: 'Route de Gabès Km 20, Nakta 3060 Mahres' },
    { ville: 'Grombalia', adresse: 'Zone Artisanale 8030 Grombalia' },
    { ville: 'Djerba', adresse: 'El Groo, Ajim 4166 Djerba' }
  ],
  chiffres: [
    { valeur: 20, suffixe: '+', label: 'Gouvernorats', detail: '' },
    { valeur: 150, suffixe: '+', label: 'Grandes surfaces', detail: '' },
    { valeur: 900, suffixe: '+', label: 'Supérettes', detail: '' },
    { valeur: 130, suffixe: '+', label: 'Commerciaux', detail: 'à votre service' }
  ]
};

// Crée les tables manquantes et remplit les infos du site la première fois.
// Sans risque à relancer : rien n'est écrasé.
export async function preparerBase() {
  await query(fs.readFileSync(SCHEMA, 'utf8'));
  await migrerFormats();
  for (const [cle, valeur] of Object.entries(DEFAUTS.parametres)) {
    await query('INSERT INTO parametres (cle, valeur) VALUES ($1, $2) ON CONFLICT (cle) DO NOTHING', [cle, valeur]);
  }
  const s = await query('SELECT COUNT(*)::int AS n FROM sites');
  if (s.rows[0].n === 0) {
    for (const [i, x] of DEFAUTS.sites.entries()) {
      await query('INSERT INTO sites (ville, adresse, ordre) VALUES ($1, $2, $3)', [x.ville, x.adresse, i]);
    }
  }
  const c = await query('SELECT COUNT(*)::int AS n FROM chiffres');
  if (c.rows[0].n === 0) {
    for (const [i, x] of DEFAUTS.chiffres.entries()) {
      await query('INSERT INTO chiffres (valeur, suffixe, label, detail, ordre) VALUES ($1, $2, $3, $4, $5)', [x.valeur, x.suffixe, x.label, x.detail, i]);
    }
  }
}

export async function lireSite() {
  const [p, s, c] = await Promise.all([
    query('SELECT cle, valeur FROM parametres'),
    query('SELECT id, ville, adresse FROM sites ORDER BY ordre, id'),
    query('SELECT id, valeur, suffixe, label, detail FROM chiffres ORDER BY ordre, id')
  ]);
  const prm = Object.fromEntries(p.rows.map((r) => [r.cle, r.valeur]));
  const telephone = prm.telephone || '';
  return {
    email: prm.email || '',
    telephone,
    telephoneLien: telephone.replace(/[^\d+]/g, ''),
    reseaux: Object.fromEntries(RESEAUX.map((r) => [r, prm[r] || ''])),
    sites: s.rows,
    chiffres: c.rows
  };
}

const texte = (v, max = 300) => String(v ?? '').trim().slice(0, max);

// Vérifie les données envoyées par l'admin. Renvoie { donnees } ou { erreur }.
export function validerSite(body = {}) {
  const email = texte(body.email, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erreur: 'Email invalide' };
  const telephone = texte(body.telephone, 50);

  const reseaux = {};
  for (const r of RESEAUX) {
    const url = texte(body.reseaux?.[r], 500);
    if (url && !/^https?:\/\/\S+$/i.test(url)) return { erreur: `Adresse ${r} invalide : elle doit commencer par https://` };
    reseaux[r] = url;
  }

  const sites = [];
  for (const s of Array.isArray(body.sites) ? body.sites.slice(0, 20) : []) {
    const ville = texte(s?.ville, 100);
    const adresse = texte(s?.adresse, 300);
    if (!ville && !adresse) continue;
    if (!ville) return { erreur: 'Chaque site doit avoir un nom de ville' };
    sites.push({ ville, adresse });
  }

  const chiffres = [];
  for (const c of Array.isArray(body.chiffres) ? body.chiffres.slice(0, 12) : []) {
    const label = texte(c?.label, 80);
    if (!label && (c?.valeur === '' || c?.valeur == null)) continue;
    if (!label) return { erreur: 'Chaque chiffre doit avoir un libellé' };
    const valeur = parseInt(c?.valeur, 10);
    if (!Number.isFinite(valeur) || valeur < 0) return { erreur: `Valeur invalide pour « ${label} »` };
    chiffres.push({ valeur, suffixe: texte(c?.suffixe, 5), label, detail: texte(c?.detail, 80) });
  }

  return { donnees: { email, telephone, reseaux, sites, chiffres } };
}

// Enregistre tout en une seule transaction : soit tout passe, soit rien ne change
export async function ecrireSite({ email, telephone, reseaux, sites, chiffres }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const params = { email, telephone, ...reseaux };
    for (const [cle, valeur] of Object.entries(params)) {
      await client.query(
        'INSERT INTO parametres (cle, valeur) VALUES ($1, $2) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur',
        [cle, valeur]
      );
    }
    await client.query('DELETE FROM sites');
    for (const [i, s] of sites.entries()) {
      await client.query('INSERT INTO sites (ville, adresse, ordre) VALUES ($1, $2, $3)', [s.ville, s.adresse, i]);
    }
    await client.query('DELETE FROM chiffres');
    for (const [i, c] of chiffres.entries()) {
      await client.query(
        'INSERT INTO chiffres (valeur, suffixe, label, detail, ordre) VALUES ($1, $2, $3, $4, $5)',
        [c.valeur, c.suffixe, c.label, c.detail, i]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
