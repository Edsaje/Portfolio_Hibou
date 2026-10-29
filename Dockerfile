# ==============================================================================
# Portfolio Quentin Beaud — Dockerfile Léger & Sécurisé (Apache + PHP 8.3)
# Prise en charge des fichiers statiques, ROMs, WASM et API PHP de score/tracking
# ==============================================================================

FROM php:8.3-apache

# Activation des modules Apache indispensables (MIME WASM, compression, headers sécurité)
RUN a2enmod rewrite headers expires deflate mime

# Configuration Apache AllowOverride et prise en compte du .htaccess
RUN { \
        echo '<Directory /var/www/html>'; \
        echo '    Options -Indexes +FollowSymLinks'; \
        echo '    AllowOverride All'; \
        echo '    Require all granted'; \
        echo '</Directory>'; \
    } > /etc/apache2/conf-available/override.conf \
    && a2enconf override

# Configuration PHP pour téléversement de sauvegardes (PS1 / NDS jusqu'à 64 Mo)
RUN { \
        echo 'upload_max_filesize = 64M'; \
        echo 'post_max_size = 64M'; \
        echo 'memory_limit = 256M'; \
        echo 'max_execution_time = 120'; \
    } > /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/html

# Copie de l'intégralité du site et des assets (WASM, ROMs, API)
COPY . /var/www/html/

# Script d'initialisation et de persistance des données API
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Droits initiaux
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]
