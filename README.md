# Ovolina — site web et administration

Site vitrine Ovolina avec une interface d'administration simple.

- **Front** : React (Vite) dans `client/`
- **Serveur** : Node.js (Express) dans `server/`
- **Base de données** : PostgreSQL

## Ce que fait le site

**Site public** : Accueil, Produits, fiche produit, Recettes (filtre par catégorie), fiche recette, Blog (liste par catégorie, article avec partage), Contact (le formulaire enregistre les messages en base).

**Administration** (`/admin`) :
- Connexion par email + mot de passe
- Produits : ajouter, modifier, masquer, supprimer, photo, ordre d'affichage
- Photos : recadrage intégré à chaque envoi (format, zoom, déplacement, centrage, rotation, taille finale), enregistrées en WebP allégé
- Conditionnements de chaque produit (boîte de 6, de 12, plateau de 30…) : nombre d'œufs, référence, photo, visibilité
- Recettes : idem, avec catégorie, ingrédients, étapes, produit utilisé et story vidéo YouTube (Shorts), dont le lien n'est jamais affiché aux visiteurs
- Messages : lecture, « traité / nouveau », réponse par email, suppression
- Blog : articles avec image, catégorie, résumé, texte mis en forme (intertitres, listes, gras, liens), aperçu, brouillon, publication immédiate ou programmée
- Infos du site : email, téléphone, réseaux sociaux, adresses des sites, chiffres clés de l'accueil
- Changement du mot de passe

## Prérequis

- Node.js 18 ou plus récent
- PostgreSQL 14 ou plus récent

## Installation (en local)

**1. Créer la base PostgreSQL**

```sql
CREATE USER ovolina WITH PASSWORD 'un-mot-de-passe';
CREATE DATABASE ovolina OWNER ovolina;
```

**2. Configurer le serveur**

```bash
cd server
cp .env.example .env
```

Ouvrez `server/.env` et renseignez :
- `DATABASE_URL` : l'adresse de la base (ex. `postgres://ovolina:un-mot-de-passe@localhost:5432/ovolina`)
- `JWT_SECRET` : une longue chaîne aléatoire (ex. résultat de `openssl rand -hex 32`)
- `ADMIN_EMAIL` et `ADMIN_PASSWORD` : le premier compte administrateur (8 caractères minimum)

**3. Installer et initialiser**

À la racine du projet :

```bash
npm run installer   # installe les dépendances du serveur et du site
npm run db:init     # crée les tables, le compte admin et les 4 gammes d'œufs
```

`db:init` peut être relancé sans risque : il ne supprime ni n'écrase rien.

Après une mise à jour du code (`git pull`), il suffit de redémarrer le serveur : il crée lui-même les nouvelles tables éventuelles, sans toucher aux données existantes.

**4. Lancer en développement** (deux terminaux)

```bash
npm run dev:serveur   # API sur http://localhost:4000
npm run dev:site      # site sur http://localhost:5173
```

Site : http://localhost:5173 · Administration : http://localhost:5173/admin

## Mise en production

```bash
npm run build   # compile le site React dans client/dist
npm start       # le serveur Node sert l'API ET le site sur le port de .env
```

Un seul processus Node à héberger (VPS, Render, Railway…). Placez-le derrière HTTPS (Nginx, Caddy ou l'hébergeur). Pour qu'il redémarre seul, utilisez par exemple `pm2 start server/src/index.js --name ovolina`.

À sauvegarder régulièrement : la base PostgreSQL (`pg_dump`) **et** le dossier `server/uploads/` (photos envoyées depuis l'admin).

## Personnaliser

- **Coordonnées, réseaux sociaux, sites, chiffres clés** : dans l'administration, menu « Infos du site »
- **Logo** : `client/public/logo.png`
- **Photos fixes** (accueil, bannières) : `client/public/images/` (voir `A_LIRE.txt`)
- **Couleurs** : variables en haut de `client/src/styles.css`

## Structure

```
ovolina/
├── client/                 Site React
│   ├── public/             logo, favicon, photos fixes
│   └── src/
│       ├── pages/          pages publiques
│       ├── admin/          écrans d'administration
│       ├── components/     en-tête, pied de page, cartes, vagues…
│       ├── api.js          appels au serveur
│       ├── SiteContext.jsx infos du site chargées depuis la base
│       └── styles.css      design (couleurs Ovolina)
└── server/                 Serveur Node.js
    ├── db/schema.sql       tables PostgreSQL
    ├── db/init.js          création des tables + données de départ
    ├── src/routes/         API publique et API admin
    └── uploads/            photos envoyées depuis l'admin
```

## API

| Méthode | Adresse | Accès |
| --- | --- | --- |
| GET | `/api/produits`, `/api/produits/:slug` | public |
| GET | `/api/recettes?categorie=Plats`, `/api/recettes/:slug` | public |
| GET | `/api/site` (coordonnées, réseaux, sites, chiffres) | public |
| GET | `/api/articles?categorie=Conseils`, `/api/articles/:slug` | public |
| POST | `/api/contact` | public |
| POST | `/api/auth/login` | public |
| GET/POST/PUT/DELETE | `/api/admin/produits[/:id]` | admin |
| GET/POST/PUT/DELETE | `/api/admin/recettes[/:id]` | admin |
| GET/PATCH/DELETE | `/api/admin/messages[/:id]` | admin |
| PUT | `/api/admin/site` | admin |
| GET/POST/PUT/DELETE | `/api/admin/articles[/:id]` | admin |
| POST | `/api/admin/mot-de-passe` | admin |

Les routes admin attendent l'en-tête `Authorization: Bearer <jeton>` reçu à la connexion (valable 7 jours).
