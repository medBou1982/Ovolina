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
