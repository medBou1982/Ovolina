#!/usr/bin/env bash
# Sauvegarde quotidienne : base PostgreSQL + photos envoyées depuis l'administration.
# Installé par installer.sh dans /usr/local/bin/ovolina-sauvegarde et lancé chaque nuit à 3 h 15.
# Les 14 dernières sauvegardes sont gardées dans /var/backups/ovolina.
set -euo pipefail
umask 077

DOSSIER=/var/backups/ovolina
APP=/var/www/ovolina
GARDER=14
DATE=$(date +%Y-%m-%d_%H%M)

mkdir -p "$DOSSIER"
chmod 700 "$DOSSIER"

sudo -u postgres pg_dump -Fc ovolina > "$DOSSIER/base_$DATE.dump"
tar -czf "$DOSSIER/photos_$DATE.tar.gz" -C "$APP/server" uploads

# Supprime les plus anciennes
ls -1t "$DOSSIER"/base_*.dump 2>/dev/null | tail -n +$((GARDER + 1)) | xargs -r rm -f
ls -1t "$DOSSIER"/photos_*.tar.gz 2>/dev/null | tail -n +$((GARDER + 1)) | xargs -r rm -f

echo "Sauvegarde terminée : $DOSSIER (base_$DATE.dump, photos_$DATE.tar.gz)"
