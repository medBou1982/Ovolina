#!/usr/bin/env bash
# Met le site en ligne à jour avec la dernière version de GitHub.
# Installé par installer.sh : il suffit de taper   sudo ovolina-maj
set -euo pipefail

APP=/var/www/ovolina
UTILISATEUR=ovolina
etape() { printf '\n\033[1;32m▶ %s\033[0m\n' "$1"; }

[ "$(id -u)" -eq 0 ] || { echo "Lancez ce script avec sudo : sudo ovolina-maj"; exit 1; }

etape "Sauvegarde avant mise à jour"
/usr/local/bin/ovolina-sauvegarde || echo "(sauvegarde impossible, on continue)"

etape "Récupération de la dernière version"
cd "$APP"
AVANT=$(sudo -u "$UTILISATEUR" git rev-parse --short HEAD)
sudo -u "$UTILISATEUR" git pull --ff-only
APRES=$(sudo -u "$UTILISATEUR" git rev-parse --short HEAD)
if [ "$AVANT" = "$APRES" ] && [ "${1:-}" != "--forcer" ]; then
  echo "Déjà à jour ($APRES). Rien à faire. (Ajoutez --forcer pour tout reconstruire quand même.)"
  exit 0
fi

etape "Mise à jour des outils du serveur"
install -m 755 "$APP/deploy/mettre-a-jour.sh" /usr/local/bin/ovolina-maj
install -m 755 "$APP/deploy/sauvegarde.sh" /usr/local/bin/ovolina-sauvegarde
if ! cmp -s "$APP/deploy/ovolina.service" /etc/systemd/system/ovolina.service; then
  cp "$APP/deploy/ovolina.service" /etc/systemd/system/ovolina.service
  systemctl daemon-reload
fi

etape "Installation des dépendances"
sudo -u "$UTILISATEUR" -H npm --prefix server install --omit=dev --no-audit --no-fund
sudo -u "$UTILISATEUR" -H npm --prefix client install --no-audit --no-fund

etape "Compilation du site"
sudo -u "$UTILISATEUR" -H npm --prefix client run build

etape "Redémarrage"
systemctl restart ovolina
sleep 3
if curl -fsS http://127.0.0.1:4000/api/site > /dev/null; then
  printf '\n\033[1;32m✔ Site à jour : %s → %s\033[0m\n' "$AVANT" "$APRES"
else
  echo "⚠ Le site ne répond pas. Consultez les journaux : sudo journalctl -u ovolina -n 50"
  exit 1
fi
