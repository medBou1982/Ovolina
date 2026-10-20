import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

// "Œufs Jaune Orange !" -> "oeufs-jaune-orange"
export function slugify(text) {
  return String(text)
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'element';
}

// Trouve un slug libre dans une table (ajoute -2, -3… si besoin)
export async function uniqueSlug(query, table, base, excludeId = null) {
  const root = slugify(base);
  let slug = root;
  for (let i = 2; ; i++) {
    const { rows } = await query(
      `SELECT id FROM ${table} WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)`,
      [slug, excludeId]
    );
    if (rows.length === 0) return slug;
    slug = `${root}-${i}`;
  }
}

export function toBool(v, fallback = true) {
  if (v === undefined || v === null || v === '') return fallback;
  return v === true || v === 'true' || v === '1' || v === 'on';
}

export function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export async function removeUpload(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(imagePath));
  await fs.unlink(file).catch(() => {});
}

// Enveloppe les routes async pour transmettre les erreurs à Express
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
