// Crée un compte administrateur ou change son mot de passe (en cas d'oubli).
// Sur le serveur :  sudo ovolina-admin
// Le mot de passe est demandé sans s'afficher à l'écran.
import 'dotenv/config';
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { pool, query } from '../src/db.js';

function demander(question, masque = false) {
  return new Promise((ok) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (masque) rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (r) => { rl.close(); if (masque) process.stdout.write('\n'); ok(r.trim()); });
  });
}

async function main() {
  const email = (process.env.NOUVEL_EMAIL || await demander('Email du compte administrateur : ')).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email invalide');
  const mdp = process.env.NOUVEAU_MDP || await demander('Nouveau mot de passe (8 caractères minimum) : ', true);
  if (mdp.length < 8) throw new Error('Mot de passe trop court (8 caractères minimum)');
  if (!process.env.NOUVEAU_MDP && mdp !== await demander('Confirmez le mot de passe : ', true)) throw new Error('Les deux mots de passe sont différents');

  const hash = await bcrypt.hash(mdp, 10);
  const { rows } = await query(
    `INSERT INTO admins (email, mot_de_passe) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET mot_de_passe = EXCLUDED.mot_de_passe
     RETURNING (xmax = 0) AS cree`,
    [email, hash]
  );
  console.log(rows[0].cree ? `Compte créé : ${email}` : `Mot de passe changé pour ${email}`);
}

main()
  .catch((e) => { console.error('Échec :', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
