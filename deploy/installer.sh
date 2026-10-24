#!/usr/bin/env bash
# =====================================================================
#  Installation du site Ovolina sur un serveur neuf (OVH VPS ou Public Cloud)
#  Systèmes pris en charge : Ubuntu 22.04 / 24.04, Debian 12
#
#  Utilisation, connecté en SSH au serveur :
#    sudo apt update && sudo apt install -y git
#    sudo git clone https://github.com/medBou1982/Ovolina.git /var/www/ovolina
#    sudo bash /var/www/ovolina/deploy/installer.sh
#
#  Le script pose quelques questions (nom de domaine, email, mot de passe admin),
#  puis installe tout : Node.js, PostgreSQL, Nginx, HTTPS, pare-feu, sauvegardes.
#  On peut le relancer sans risque : il ne supprime ni n'écrase les données.
# =====================================================================
set -euo pipefail
cd /

APP=/var/www/ovolina
DEPOT=https://github.com/medBou1982/Ovolina.git
UTILISATEUR=ovolina
BASE=ovolina
NODE_MAJEUR=22

etape() { printf '\n\033[1;32m▶ %s\033[0m\n' "$1"; }
info()  { printf '  %s\n' "$1"; }
alerte(){ printf '\033[1;33m  ⚠ %s\033[0m\n' "$1"; }
stop()  { printf '\033[1;31m✖ %s\033[0m\n' "$1"; exit 1; }

# ---------- Vérifications ----------
[ "$(id -u)" -eq 0 ] || stop "Lancez ce script avec sudo : sudo bash $0"
. /etc/os-release
case "$ID" in ubuntu|debian) ;; *) stop "Système non pris en charge ($PRETTY_NAME). Utilisez Ubuntu 22.04/24.04 ou Debian 12." ;; esac

# ---------- Questions ----------
etape "Configuration"
if [ -z "${DOMAINE:-}" ]; then
  echo "  Nom de domaine du site, sans http ni www (ex. ovolina.tn ou nouveau.ovolina.tn)."
  echo "  Laissez vide pour un premier test avec l'adresse IP du serveur."
  read -rp "  Domaine : " DOMAINE
fi
DOMAINE=$(echo "${DOMAINE:-}" | tr '[:upper:]' '[:lower:]' | sed -E 's#^https?://##; s#^www\.##; s#/.*$##')

if [ -z "${EMAIL_ADMIN:-}" ]; then
  read -rp "  Email du compte administrateur (sert aussi pour le certificat HTTPS) : " EMAIL_ADMIN
fi
EMAIL_ADMIN=$(echo "$EMAIL_ADMIN" | tr '[:upper:]' '[:lower:]' | xargs)
[[ "$EMAIL_ADMIN" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || stop "Email invalide : $EMAIL_ADMIN"

DEJA_INSTALLE=0
[ -f "$APP/server/.env" ] && DEJA_INSTALLE=1
if [ "$DEJA_INSTALLE" -eq 0 ] && [ -z "${MDP_ADMIN:-}" ]; then
  while true; do
    read -rsp "  Mot de passe administrateur (8 caractères minimum) : " MDP_ADMIN; echo
    read -rsp "  Confirmez le mot de passe : " MDP2; echo
    [ "${#MDP_ADMIN}" -ge 8 ] || { alerte "Trop court, recommencez."; continue; }
    [ "$MDP_ADMIN" = "$MDP2" ] || { alerte "Les deux mots de passe sont différents, recommencez."; continue; }
    break
  done
fi

# ---------- Paquets système ----------
etape "Installation des logiciels (quelques minutes)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q sudo ca-certificates curl gnupg git nginx postgresql ufw certbot python3-certbot-nginx openssl cron

NODE_ACTUEL=$(command -v node >/dev/null && node -p 'process.versions.node.split(".")[0]' || echo 0)
if [ "$NODE_ACTUEL" -lt 18 ]; then
  info "Installation de Node.js $NODE_MAJEUR…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJEUR}.x" | bash -
  apt-get install -y -q nodejs
fi
info "Node.js $(node -v), npm $(npm -v)"

# ---------- Utilisateur et code ----------
etape "Récupération du site"
id "$UTILISATEUR" >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin "$UTILISATEUR"
if [ ! -d "$APP/.git" ]; then
  mkdir -p "$(dirname "$APP")"
  git clone "$DEPOT" "$APP"
fi
chown -R "$UTILISATEUR:$UTILISATEUR" "$APP"
mkdir -p "$APP/server/uploads" && chown "$UTILISATEUR:$UTILISATEUR" "$APP/server/uploads"
info "Code dans $APP (version $(sudo -u "$UTILISATEUR" git -C "$APP" rev-parse --short HEAD))"

# ---------- PostgreSQL ----------
etape "Base de données PostgreSQL"
systemctl enable --now postgresql >/dev/null 2>&1 || service postgresql start
ROLE_EXISTE=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$UTILISATEUR'" || true)
if [ "$DEJA_INSTALLE" -eq 1 ] && [ "$ROLE_EXISTE" = "1" ]; then
  info "Base déjà configurée : rien n'est modifié."
else
  MDP_BASE=$(openssl rand -hex 24)
  if [ "$ROLE_EXISTE" = "1" ]; then
    sudo -u postgres psql -qc "ALTER ROLE $UTILISATEUR WITH LOGIN PASSWORD '$MDP_BASE'"
  else
    sudo -u postgres psql -qc "CREATE ROLE $UTILISATEUR WITH LOGIN PASSWORD '$MDP_BASE'"
  fi
  BASE_EXISTE=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$BASE'" || true)
  [ "$BASE_EXISTE" = "1" ] || sudo -u postgres createdb -O "$UTILISATEUR" "$BASE"
  info "Base « $BASE » prête (mot de passe généré automatiquement)."
fi

# ---------- Fichier .env ----------
etape "Configuration du serveur"
if [ "$DEJA_INSTALLE" -eq 0 ]; then
  umask 077
  cat > "$APP/server/.env" <<EOF
DATABASE_URL=postgres://$UTILISATEUR:$MDP_BASE@localhost:5432/$BASE
JWT_SECRET=$(openssl rand -hex 32)
PORT=4000
HOST=127.0.0.1
ADMIN_EMAIL=$EMAIL_ADMIN
ADMIN_PASSWORD=$MDP_ADMIN
EOF
  umask 022
  chown "$UTILISATEUR:$UTILISATEUR" "$APP/server/.env"
  chmod 600 "$APP/server/.env"
  info "server/.env créé (lisible uniquement par le site)."
else
  grep -q '^HOST=' "$APP/server/.env" || echo "HOST=127.0.0.1" >> "$APP/server/.env"
  # Compte de base recréé (cas rare) : on met à jour son mot de passe dans le fichier
  if [ -n "${MDP_BASE:-}" ]; then
    sed -i "s#^DATABASE_URL=.*#DATABASE_URL=postgres://$UTILISATEUR:$MDP_BASE@localhost:5432/$BASE#" "$APP/server/.env"
  fi
  info "server/.env déjà présent : conservé."
fi

# ---------- Dépendances, compilation, base ----------
etape "Installation des dépendances et compilation du site"
sudo -u "$UTILISATEUR" -H npm --prefix "$APP/server" install --omit=dev --no-audit --no-fund
sudo -u "$UTILISATEUR" -H npm --prefix "$APP/client" install --no-audit --no-fund
sudo -u "$UTILISATEUR" -H npm --prefix "$APP/client" run build

etape "Création des tables et du compte administrateur"
( cd "$APP/server" && sudo -u "$UTILISATEUR" -H npm run db:init )
# Le mot de passe admin n'a plus rien à faire dans le fichier une fois le compte créé
sed -i 's/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=/' "$APP/server/.env"

# ---------- Service ----------
etape "Démarrage automatique du site"
cp "$APP/deploy/ovolina.service" /etc/systemd/system/ovolina.service
systemctl daemon-reload
systemctl enable ovolina >/dev/null 2>&1
systemctl restart ovolina
for i in $(seq 1 15); do
  curl -fsS http://127.0.0.1:4000/api/site >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS http://127.0.0.1:4000/api/site >/dev/null || stop "Le site ne démarre pas. Journaux : sudo journalctl -u ovolina -n 50"
info "Le site tourne (service « ovolina »)."

# ---------- Nginx ----------
etape "Configuration de Nginx"
IP_PUBLIQUE=$(curl -4 -fsS --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
if [ -n "$DOMAINE" ]; then
  # www. est toujours accepté ; il n'aura le HTTPS que si son DNS pointe aussi vers ce serveur
  DOMAINES="$DOMAINE www.$DOMAINE"
else
  DOMAINES="_"
fi
sed "s/__DOMAINES__/$DOMAINES/" "$APP/deploy/nginx.conf" > /etc/nginx/sites-available/ovolina
ln -sf /etc/nginx/sites-available/ovolina /etc/nginx/sites-enabled/ovolina
rm -f /etc/nginx/sites-enabled/default
nginx -t -q
systemctl enable --now nginx >/dev/null 2>&1
systemctl reload nginx

# ---------- Pare-feu ----------
etape "Pare-feu"
if [ "${PAS_DE_PAREFEU:-0}" = "1" ]; then
  info "Pare-feu ignoré (PAS_DE_PAREFEU=1)."
else
  # On autorise le port SSH réellement utilisé, pour ne jamais se couper l'accès
  for p in $(sshd -T 2>/dev/null | awk '/^port /{print $2}'); do ufw allow "$p/tcp" >/dev/null; done
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null
  ufw allow 'Nginx Full' >/dev/null
  ufw --force enable >/dev/null
  info "Ouverts : SSH, HTTP (80), HTTPS (443). Tout le reste est fermé (PostgreSQL et Node ne sont pas exposés)."
fi

# ---------- HTTPS ----------
HTTPS=0
if [ -n "$DOMAINE" ]; then
  etape "Certificat HTTPS (Let's Encrypt)"
  ARGS=()
  for d in $DOMAINES; do
    IP_DNS=$(getent ahostsv4 "$d" | awk 'NR==1{print $1}' || true)
    if [ "$IP_DNS" = "$IP_PUBLIQUE" ]; then
      ARGS+=(-d "$d")
    elif [ "$d" = "$DOMAINE" ]; then
      alerte "$d ne pointe pas encore vers ce serveur (DNS : ${IP_DNS:-aucune adresse}, serveur : $IP_PUBLIQUE)."
    else
      info "$d ne pointe pas vers ce serveur : sans HTTPS pour l'instant (normal si vous ne l'utilisez pas)."
    fi
  done
  if [ "${#ARGS[@]}" -gt 0 ]; then
    if certbot --nginx --non-interactive --agree-tos --redirect -m "$EMAIL_ADMIN" "${ARGS[@]}"; then
      HTTPS=1
      info "HTTPS activé. Le certificat se renouvelle tout seul."
    else
      alerte "Certificat refusé. Vous pourrez réessayer avec : sudo certbot --nginx -d $DOMAINE"
    fi
  else
    alerte "Configurez d'abord le DNS (voir le guide), puis relancez simplement ce script."
  fi
fi

# ---------- Sauvegardes et outils ----------
etape "Sauvegardes automatiques et commande de mise à jour"
install -m 755 "$APP/deploy/sauvegarde.sh" /usr/local/bin/ovolina-sauvegarde
install -m 755 "$APP/deploy/mettre-a-jour.sh" /usr/local/bin/ovolina-maj
echo "15 3 * * * root /usr/local/bin/ovolina-sauvegarde >> /var/log/ovolina-sauvegarde.log 2>&1" > /etc/cron.d/ovolina-sauvegarde
chmod 644 /etc/cron.d/ovolina-sauvegarde
/usr/local/bin/ovolina-sauvegarde >/dev/null && info "Première sauvegarde faite dans /var/backups/ovolina (puis chaque nuit à 3 h 15)."

# ---------- Résumé ----------
if [ "$HTTPS" -eq 1 ]; then ADRESSE="https://$DOMAINE"; elif [ -n "$DOMAINE" ]; then ADRESSE="http://$DOMAINE"; else ADRESSE="http://$IP_PUBLIQUE"; fi
printf '\n\033[1;32m══════════════════════════════════════════════\033[0m\n'
printf '\033[1;32m  ✔ Ovolina est en ligne\033[0m\n'
printf '\033[1;32m══════════════════════════════════════════════\033[0m\n'
echo "  Site            : $ADRESSE"
echo "  Administration  : $ADRESSE/admin   ($EMAIL_ADMIN)"
echo
echo "  Mettre à jour   : sudo ovolina-maj"
echo "  Voir les logs   : sudo journalctl -u ovolina -f"
echo "  Redémarrer      : sudo systemctl restart ovolina"
echo "  Sauvegardes     : /var/backups/ovolina"
echo
