// Crée les tables, le premier compte admin et les données de départ.
// Sans risque à relancer : rien n'est écrasé.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, query } from '../src/db.js';
import { preparerBase } from '../src/infosSite.js';
import { migrerFormats } from '../src/variantes.js';


const PRODUITS = [
  {
    nom: 'Jaune Orange', slug: 'jaune-orange', couleur: '#EE8A1C',
    resume: 'Jaune orange intense, riche en carotène.',
    description: 'Un jaune d’une couleur orange intense, riche en carotène. Beau dans l’assiette et gourmand en bouche.',
    points: 'Riche en carotène\nCouleur orange intense\nTraçabilité de la ferme à l’assiette',
    formats: 'Plateau de 30'
  },
  {
    nom: 'Jaune Jaune', slug: 'jaune-jaune', couleur: '#F4C51F',
    resume: 'Naturellement riche en vitamine A.',
    description: 'Des œufs naturellement riches en vitamine A, pour une alimentation équilibrée au quotidien.',
    points: 'Naturellement riche en vitamine A\nTraçabilité de la ferme à l’assiette',
    formats: 'Plateau de 30'
  },
  {
    nom: 'Oméga 3', slug: 'omega-3', couleur: '#F2A20C',
    resume: 'Naturellement riche en oméga 3.',
    description: 'Des œufs naturellement riches en oméga 3.',
    points: 'Naturellement riche en oméga 3\nTraçabilité de la ferme à l’assiette',
    formats: 'Plateau de 30'
  },
  {
    nom: 'OVO+', slug: 'ovo-plus', couleur: '#F2A20C',
    resume: 'Riches en vitamines, savoureux et équilibrés.',
    description: 'Des œufs riches en vitamines, savoureux et équilibrés.',
    points: 'Riches en vitamines\nSavoureux et équilibrés',
    formats: ''
  }
];

const RECETTES = [
  {
    titre: 'Chakchouka', slug: 'chakchouka', categorie: 'Plats', produit: 'jaune-orange',
    resume: 'Des œufs pochés dans une sauce tomate et poivrons. Un classique généreux à partager.',
    temps: 30, personnes: 4, difficulte: 'Facile',
    ingredients: '4 œufs Ovolina Jaune Orange\n4 tomates mûres\n2 poivrons verts\n1 oignon, 2 gousses d’ail\n1 c. à soupe de harissa\nHuile d’olive, sel, carvi',
    etapes: 'Faites revenir l’oignon et l’ail émincés dans l’huile d’olive à feu moyen.\nAjoutez les poivrons en lanières, puis les tomates, la harissa et le carvi. Laissez mijoter 15 minutes.\nCreusez quatre puits dans la sauce et cassez-y les œufs.\nCouvrez et laissez cuire 5 à 7 minutes, jusqu’à ce que le blanc soit pris. Servez avec du pain.'
  },
  {
    titre: 'Omelette aux herbes', slug: 'omelette-aux-herbes', categorie: 'Plats', produit: 'jaune-jaune',
    resume: 'Une omelette baveuse aux herbes fraîches, prête en 10 minutes.',
    temps: 10, personnes: 2, difficulte: 'Facile',
    ingredients: '4 œufs Ovolina Jaune Jaune\n1 petit bouquet de persil\nQuelques brins de menthe\n1 noix de beurre\nSel, poivre',
    etapes: 'Battez les œufs avec le sel, le poivre et les herbes ciselées.\nFaites fondre le beurre dans une poêle à feu moyen.\nVersez les œufs et remuez doucement jusqu’à ce qu’ils soient presque pris.\nRepliez l’omelette et servez aussitôt.'
  },
  {
    titre: 'Flan aux œufs', slug: 'flan-aux-oeufs', categorie: 'Desserts', produit: 'jaune-orange',
    resume: 'Un flan onctueux nappé de caramel.',
    temps: 50, personnes: 6, difficulte: 'Moyen',
    ingredients: '4 œufs Ovolina Jaune Orange\n50 cl de lait\n100 g de sucre\n1 gousse de vanille\nPour le caramel : 80 g de sucre',
    etapes: 'Préparez un caramel et versez-le dans un moule.\nFaites chauffer le lait avec la vanille.\nFouettez les œufs avec le sucre puis ajoutez le lait chaud petit à petit.\nVersez dans le moule et faites cuire 40 minutes au bain-marie à 160 °C.\nLaissez refroidir puis réservez au frais avant de démouler.'
  }
];

async function main() {
  console.log('1/3 Création des tables et des infos du site…');
  await preparerBase();

  console.log('2/3 Compte administrateur…');
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const motDePasse = process.env.ADMIN_PASSWORD || '';
  if (!email || motDePasse.length < 8) {
    console.log('   ADMIN_EMAIL / ADMIN_PASSWORD (8 caractères min.) absents de .env : aucun compte créé.');
  } else {
    const { rowCount } = await query(
      `INSERT INTO admins (email, mot_de_passe) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`,
      [email, await bcrypt.hash(motDePasse, 10)]
    );
    console.log(rowCount ? `   Compte créé : ${email}` : `   Le compte ${email} existe déjà (inchangé).`);
  }

  console.log('3/3 Données de départ…');
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM produits');
  if (rows[0].n > 0) {
    console.log('   Des produits existent déjà : rien n’est ajouté.');
  } else {
    const ids = {};
    for (const [i, p] of PRODUITS.entries()) {
      const r = await query(
        `INSERT INTO produits (nom, slug, resume, description, points_forts, formats, couleur_jaune, ordre)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [p.nom, p.slug, p.resume, p.description, p.points, p.formats, p.couleur, i + 1]
      );
      ids[p.slug] = r.rows[0].id;
    }
    for (const [i, r] of RECETTES.entries()) {
      await query(
        `INSERT INTO recettes (titre, slug, categorie, resume, temps_preparation, personnes, difficulte,
           ingredients, etapes, produit_id, ordre)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [r.titre, r.slug, r.categorie, r.resume, r.temps, r.personnes, r.difficulte, r.ingredients, r.etapes, ids[r.produit], i + 1]
      );
    }
    await migrerFormats(); // « Plateau de 30 » devient un conditionnement
    console.log(`   ${PRODUITS.length} produits et ${RECETTES.length} recettes ajoutés.`);
  }

  console.log('Base prête.');
}

main()
  .catch((e) => {
    console.error('Échec :', e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
