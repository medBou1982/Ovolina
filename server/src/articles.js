// Blog : catégories, temps de lecture, articles d'exemple
import { query } from './db.js';

export const CATEGORIES_BLOG = ['Actualités', 'Conseils', 'Nutrition', 'Recettes', 'Coulisses'];

// Temps de lecture en minutes (200 mots par minute)
export const SQL_MINUTES = `GREATEST(1, ROUND(COALESCE(array_length(regexp_split_to_array(trim(contenu), '\\s+'), 1), 0) / 200.0))::int AS minutes`;

const EXEMPLES = [
  {
    titre: 'Comment bien conserver vos œufs',
    slug: 'comment-bien-conserver-vos-oeufs',
    categorie: 'Conseils',
    extrait: 'Réfrigérateur ou placard, pointe en bas ou en haut ? Quelques gestes simples pour garder vos œufs frais plus longtemps.',
    contenu: `Un œuf bien conservé garde tout son goût et toutes ses qualités. Voici les bons réflexes à adopter à la maison.

## Gardez-les dans leur emballage

L'emballage protège les œufs des chocs et des odeurs du réfrigérateur. Il permet aussi de garder sous les yeux la **date de consommation**.

## Une température stable

- Rangez-les dans le réfrigérateur, sur une étagère plutôt que dans la porte, où la température varie à chaque ouverture.
- Évitez de les sortir puis de les remettre au froid plusieurs fois.
- Sortez-les quelques minutes avant de les utiliser en pâtisserie : ils se mélangent mieux.

## Ne les lavez pas avant de les ranger

La coquille possède une protection naturelle. La laver juste avant de cuisiner suffit.

## Le test de fraîcheur

Plongez l'œuf dans un verre d'eau : s'il reste au fond, il est très frais. S'il se redresse, consommez-le rapidement et bien cuit.`
  },
  {
    titre: 'Pourquoi la couleur du jaune change-t-elle ?',
    slug: 'pourquoi-la-couleur-du-jaune-change',
    categorie: 'Nutrition',
    extrait: 'Jaune pâle ou orange intense : la couleur du jaune dépend surtout de l’alimentation des poules. On vous explique.',
    contenu: `Tous les jaunes d'œufs n'ont pas la même couleur. Cette différence s'explique avant tout par **l'alimentation des poules**.

## Une question de pigments naturels

Les céréales, le maïs ou certaines plantes apportent des pigments naturels, les caroténoïdes. Plus l'alimentation en contient, plus le jaune est orangé.

## Et pour le goût ?

Un jaune plus coloré n'est pas forcément plus nutritif, mais il rend les plats plus appétissants : pâtes fraîches, pâtisseries, omelettes…

## Chez Ovolina

C'est tout le principe de nos deux gammes :

- **Jaune Orange**, à la couleur intense, riche en carotène ;
- **Jaune Jaune**, naturellement riche en vitamine A.

À vous de choisir selon vos envies et vos recettes !`
  }
];

// Ajoute les articles d'exemple une seule fois (même si on les supprime ensuite)
export async function exemplesArticles() {
  const deja = await query(`SELECT 1 FROM parametres WHERE cle = 'articles_exemples'`);
  if (deja.rows.length) return;
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM articles');
  if (rows[0].n === 0) {
    for (const [i, a] of EXEMPLES.entries()) {
      await query(
        `INSERT INTO articles (titre, slug, categorie, extrait, contenu, publie, publie_le)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW() - ($6 || ' days')::interval) ON CONFLICT (slug) DO NOTHING`,
        [a.titre, a.slug, a.categorie, a.extrait, a.contenu, String(i * 3)]
      );
    }
  }
  // Marqueur posé seulement une fois les articles ajoutés : ils ne reviendront pas si on les supprime
  await query(`INSERT INTO parametres (cle, valeur) VALUES ('articles_exemples', 'ok') ON CONFLICT (cle) DO NOTHING`);
}
