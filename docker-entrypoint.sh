#!/bin/sh
set -e

# Dossier persistant pour les données dynamiques de l'API (scores, stats, jetons de sécurité, sauvegardes)
STORAGE_DIR="/var/www/storage"
mkdir -p "$STORAGE_DIR"
mkdir -p "$STORAGE_DIR/saves"

# Fichiers dynamiques gérés par l'API
DATA_FILES="scores.json rate_limits.json stats.json track_rate_limits.json .secret .admin_pass"

for file in $DATA_FILES; do
    # Si le fichier n'existe pas dans le volume persistant mais existe dans le projet initial
    if [ ! -f "$STORAGE_DIR/$file" ] && [ -f "/var/www/html/api/$file" ]; then
        cp "/var/www/html/api/$file" "$STORAGE_DIR/$file"
    fi

    # Création du fichier vide s'il n'existe nulle part (sauf .admin_pass pour permettre la configuration initiale)
    if [ ! -f "$STORAGE_DIR/$file" ] && [ "$file" != ".admin_pass" ]; then
        touch "$STORAGE_DIR/$file"
    fi

    # Création du lien symbolique depuis /var/www/html/api vers le stockage persistant
    rm -f "/var/www/html/api/$file"
    ln -sf "$STORAGE_DIR/$file" "/var/www/html/api/$file"
done

# Attribution des droits au serveur Apache
chown -R www-data:www-data "$STORAGE_DIR" /var/www/html/api

exec "$@"
