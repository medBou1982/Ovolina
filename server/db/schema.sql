-- Schéma de la base Ovolina (PostgreSQL)

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produits (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  resume TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  points_forts TEXT NOT NULL DEFAULT '',   -- un point par ligne
  formats TEXT NOT NULL DEFAULT '',        -- séparés par des virgules
  nutrition TEXT NOT NULL DEFAULT '',      -- une ligne par valeur : "Énergie : 140 kcal"
  couleur_jaune TEXT NOT NULL DEFAULT '#F2A20C',
  image TEXT,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  ordre INT NOT NULL DEFAULT 0,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recettes (
  id SERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'Plats',  -- Entrées, Plats, Desserts
  resume TEXT NOT NULL DEFAULT '',
  image TEXT,
  temps_preparation INT,                    -- en minutes
  personnes INT,
  difficulte TEXT NOT NULL DEFAULT 'Facile',
  ingredients TEXT NOT NULL DEFAULT '',     -- un ingrédient par ligne
  etapes TEXT NOT NULL DEFAULT '',          -- une étape par ligne
  produit_id INT REFERENCES produits(id) ON DELETE SET NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  ordre INT NOT NULL DEFAULT 0,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  profil TEXT NOT NULL DEFAULT 'Particulier',
  message TEXT NOT NULL,
  traite BOOLEAN NOT NULL DEFAULT FALSE,
  recu_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recettes_produit_idx ON recettes(produit_id);
CREATE INDEX IF NOT EXISTS messages_recu_idx ON messages(recu_le DESC);

-- Informations générales du site (email, téléphone, réseaux sociaux…)
CREATE TABLE IF NOT EXISTS parametres (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL DEFAULT ''
);

-- Sites de production affichés dans le contact et le pied de page
CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  ville TEXT NOT NULL,
  adresse TEXT NOT NULL DEFAULT '',
  ordre INT NOT NULL DEFAULT 0
);

-- Chiffres clés de la page d'accueil
CREATE TABLE IF NOT EXISTS chiffres (
  id SERIAL PRIMARY KEY,
  valeur INT NOT NULL DEFAULT 0,
  suffixe TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  ordre INT NOT NULL DEFAULT 0
);

-- Conditionnements d'un produit (boîte de 6, plateau de 30…)
CREATE TABLE IF NOT EXISTS variantes (
  id SERIAL PRIMARY KEY,
  produit_id INT NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL DEFAULT 'Boîte',   -- type d'emballage : Boîte, Plateau, Étui…
  quantite INT NOT NULL,                   -- nombre d'œufs dans l'emballage
  reference TEXT NOT NULL DEFAULT '',      -- code article ou EAN (facultatif)
  image TEXT,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  ordre INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS variantes_produit_idx ON variantes(produit_id);

-- Articles du blog
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'Actualités',
  extrait TEXT NOT NULL DEFAULT '',          -- court résumé affiché dans les listes
  contenu TEXT NOT NULL DEFAULT '',          -- texte de l'article (mise en forme simple)
  image TEXT,
  auteur TEXT NOT NULL DEFAULT 'L’équipe Ovolina',
  publie BOOLEAN NOT NULL DEFAULT FALSE,     -- faux = brouillon, invisible sur le site
  publie_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS articles_publie_idx ON articles(publie, publie_le DESC);

-- Vidéo YouTube d'une recette : seul l'identifiant de la vidéo est stocké (ex. dQw4w9WgXcQ)
ALTER TABLE recettes ADD COLUMN IF NOT EXISTS video_youtube TEXT;
