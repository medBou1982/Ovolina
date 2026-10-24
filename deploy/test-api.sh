#!/usr/bin/env bash
# Test de bout en bout du site lancé (utilisé par la vérification automatique GitHub).
# Usage : bash deploy/test-api.sh [adresse]   (par défaut http://127.0.0.1:4000)
set -uo pipefail

URL=${1:-http://127.0.0.1:4000}
EMAIL=${ADMIN_EMAIL:-admin@ovolina.test}
MDP=${ADMIN_PASSWORD:-MotDePasseTest1}
T=$(mktemp -d)
ok=0; ko=0

verifier() { # verifier "description" condition...
  local nom=$1; shift
  if "$@" >/dev/null 2>&1; then ok=$((ok + 1)); echo "  ✔ $nom"; else
    ko=$((ko + 1)); echo "  ✖ $nom"
    # Sur GitHub, chaque échec apparaît aussi comme une alerte lisible sans ouvrir le journal
    [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error title=Test échoué::$nom (réponse : $(head -c 300 "$T/corps" 2>/dev/null | tr '\n' ' '))"
  fi
}
code() { curl -s -o "$T/corps" -w '%{http_code}' "$@"; }
corps() { cat "$T/corps"; }
egal() { [ "$1" = "$2" ]; }

# Petite image PNG 2×2 pour tester les envois de photos
printf 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DwHwyBDCYGAEvNBvp3zqxJAAAAAElFTkSuQmCC' | base64 -d > "$T/photo.png"
# Sous Windows (Git Bash), curl a besoin du chemin au format Windows
PHOTO=$(cygpath -m "$T/photo.png" 2>/dev/null || echo "$T/photo.png")

echo "Attente du serveur…"
for i in $(seq 1 30); do curl -fs "$URL/api/site" >/dev/null && break; sleep 1; done

echo "Site public"
verifier "GET /api/site répond" egal "$(code "$URL/api/site")" 200
verifier "4 chiffres clés" egal "$(corps | jq '.chiffres | length')" 4
verifier "3 sites" egal "$(corps | jq '.sites | length')" 3
verifier "GET /api/produits : 4 produits" egal "$(code "$URL/api/produits"; corps | jq length)" "2004"
verifier "conditionnement migré (Jaune Orange, plateau de 30)" egal "$(corps | jq -r '.[] | select(.slug=="jaune-orange") | .variantes[0].quantite')" 30
verifier "fiche produit + recettes liées" egal "$(code "$URL/api/produits/jaune-orange"; corps | jq '.recettes | length > 0')" "200true"
verifier "produit inconnu : 404" egal "$(code "$URL/api/produits/nexiste-pas")" 404
verifier "GET /api/recettes : 3 recettes" egal "$(code "$URL/api/recettes"; corps | jq length)" "2003"
verifier "filtre recettes par catégorie" egal "$(code "$URL/api/recettes?categorie=Desserts"; corps | jq length)" "2001"
verifier "fiche recette + produit utilisé" egal "$(code "$URL/api/recettes/chakchouka"; corps | jq -r '.produit.slug')" "200jaune-orange"
verifier "GET /api/articles : 2 articles d'exemple" egal "$(code "$URL/api/articles"; corps | jq length)" "2002"
verifier "article + temps de lecture + suggestions" egal "$(code "$URL/api/articles/comment-bien-conserver-vos-oeufs"; corps | jq '(.minutes >= 1) and (.suggestions | length == 1)')" "200true"

echo "Formulaire de contact"
verifier "message incomplet refusé (400)" egal "$(code -X POST -H 'Content-Type: application/json' -d '{"nom":"A"}' "$URL/api/contact")" 400
verifier "message valide accepté (201)" egal "$(code -X POST -H 'Content-Type: application/json' -d '{"nom":"Test CI","email":"ci@exemple.tn","message":"Bonjour, ceci est un test."}' "$URL/api/contact")" 201

echo "Connexion administrateur"
verifier "mauvais mot de passe refusé (401)" egal "$(code -X POST -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"motDePasse\":\"faux\"}" "$URL/api/auth/login")" 401
code -X POST -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"motDePasse\":\"$MDP\"}" "$URL/api/auth/login" >/dev/null
JETON=$(corps | jq -r '.token // empty')
verifier "bon mot de passe : jeton reçu" test -n "$JETON"
A=(-H "Authorization: Bearer $JETON")
verifier "admin sans jeton refusé (401)" egal "$(code "$URL/api/admin/produits")" 401
verifier "admin avec jeton : liste des produits" egal "$(code "${A[@]}" "$URL/api/admin/produits"; corps | jq length)" "2004"
verifier "messages : 1 nouveau" egal "$(code "${A[@]}" "$URL/api/admin/messages/nouveaux"; corps | jq .total)" "2001"

echo "Produit avec photo et conditionnements"
VAR='[{"libelle":"Boite","quantite":6,"reference":"CI-06","actif":true,"fichier":"img_v_0"},{"libelle":"Plateau","quantite":30,"actif":false}]'
code "${A[@]}" -F nom="Produit CI" -F resume="Test" -F actif=true -F "image=@$PHOTO;type=image/png" -F "img_v_0=@$PHOTO;type=image/png" -F "variantes=$VAR" "$URL/api/admin/produits" > "$T/c"
verifier "création avec photo (201)" egal "$(cat "$T/c")" 201
ID=$(corps | jq -r .id); IMG=$(corps | jq -r .image); IMGV=$(corps | jq -r '.variantes[0].image')
verifier "slug généré" egal "$(corps | jq -r .slug)" "produit-ci"
verifier "2 conditionnements enregistrés" egal "$(corps | jq '.variantes | length')" 2
verifier "photo du produit servie" egal "$(code "$URL$IMG")" 200
verifier "photo du conditionnement servie" egal "$(code "$URL$IMGV")" 200
verifier "conditionnement masqué absent du site public" egal "$(code "$URL/api/produits/produit-ci"; corps | jq '.variantes | length')" "2001"
verifier "quantité invalide refusée (400)" egal "$(code "${A[@]}" -X PUT -F nom="Produit CI" -F 'variantes=[{"libelle":"Boite","quantite":0}]' "$URL/api/admin/produits/$ID")" 400
verifier "modification sans renvoyer la photo : photo conservée" egal "$(code "${A[@]}" -X PUT -F nom="Produit CI modifié" -F actif=true "$URL/api/admin/produits/$ID"; corps | jq -r .image)" "200$IMG"

echo "Recette avec story vidéo"
RID=$(curl -s "${A[@]}" "$URL/api/admin/recettes" | jq -r '.[] | select(.slug=="chakchouka") | .id')
verifier "lien YouTube accepté, seul l'identifiant est gardé" egal "$(code "${A[@]}" -X PUT -F titre=Chakchouka -F categorie=Plats -F actif=true -F video_youtube="https://youtube.com/shorts/dQw4w9WgXcQ?feature=share" "$URL/api/admin/recettes/$RID"; corps | jq -r .video_youtube)" "200dQw4w9WgXcQ"
verifier "lien vidéo invalide refusé (400)" egal "$(code "${A[@]}" -X PUT -F titre=Chakchouka -F video_youtube="https://vimeo.com/1" "$URL/api/admin/recettes/$RID")" 400
verifier "vidéo visible sur la fiche publique" egal "$(code "$URL/api/recettes/chakchouka"; corps | jq -r .video_youtube)" "200dQw4w9WgXcQ"

echo "Blog"
verifier "brouillon créé" egal "$(code "${A[@]}" -F titre="Brouillon CI" -F publie=false "$URL/api/admin/articles")" 201
verifier "brouillon invisible sur le site" egal "$(code "$URL/api/articles/brouillon-ci")" 404
verifier "article publié visible" egal "$(code "${A[@]}" -F titre="Publie CI" -F publie=true -F "contenu=## Titre\n- point" "$URL/api/admin/articles" >/dev/null; code "$URL/api/articles/publie-ci")" 200

echo "Infos du site"
SITE=$(curl -s "$URL/api/site" | jq '.chiffres[0].valeur = 25 | .reseaux.facebook = "https://www.facebook.com/ovolina"')
verifier "enregistrement des infos du site" egal "$(code "${A[@]}" -X PUT -H 'Content-Type: application/json' -d "$SITE" "$URL/api/admin/site"; corps | jq '.chiffres[0].valeur')" "20025"
verifier "réseau sans https refusé (400)" egal "$(code "${A[@]}" -X PUT -H 'Content-Type: application/json' -d '{"reseaux":{"facebook":"facebook.com/x"}}' "$URL/api/admin/site")" 400

echo "Suppression"
verifier "suppression du produit (204)" egal "$(code "${A[@]}" -X DELETE "$URL/api/admin/produits/$ID")" 204
verifier "sa photo est supprimée du disque" egal "$(code "$URL$IMG")" 404
verifier "photo du conditionnement supprimée aussi" egal "$(code "$URL$IMGV")" 404

echo "Pages du site compilé"
verifier "accueil (HTML + écran de démarrage)" egal "$(code "$URL/"; corps | grep -c 'id="splash"')" "2001"
verifier "page interne servie par le routeur React" egal "$(code "$URL/recettes/chakchouka")" 200
ASSET=$(curl -s "$URL/" | grep -o '/assets/[^"]*\.js' | head -1)
verifier "fichiers compilés mis en cache 1 an" bash -c "curl -sI '$URL$ASSET' | grep -qi 'max-age=31536000'"
verifier "index.html jamais en cache" bash -c "curl -sI '$URL/' | grep -qi 'no-cache'"

echo
echo "Résultat : $ok réussis, $ko échoués"
[ -n "${GITHUB_ACTIONS:-}" ] && echo "::notice title=Tests de bout en bout::$ok réussis, $ko échoués"
rm -rf "$T"
[ "$ko" -eq 0 ]
