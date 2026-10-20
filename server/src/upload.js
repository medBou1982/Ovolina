import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { UPLOAD_DIR } from './utils.js';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${TYPES[file.mimetype]}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (TYPES[file.mimetype]) cb(null, true);
    else cb(Object.assign(new Error('Image JPG, PNG ou WebP uniquement'), { status: 400 }));
  }
});

export const imageUrl = (file) => (file ? `/uploads/${path.basename(file.path)}` : null);
