FROM php:8.4-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
    git unzip sqlite3 coreutils findutils gawk tar libzip-dev libsqlite3-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev libxml2-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_sqlite zip gd \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www
COPY . .
COPY docker/entrypoint.sh /usr/local/bin/cryma-entrypoint

RUN composer install --no-dev --optimize-autoloader \
    && composer check-platform-reqs --no-dev

RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views \
    storage/logs storage/app/private storage/app/public bootstrap/cache /data \
    && rm -f public/storage \
    && ln -s ../storage/app/public public/storage \
    && chown -R www-data:www-data storage bootstrap/cache /data \
    && chmod 755 /usr/local/bin/cryma-entrypoint

ENV DB_CONNECTION=sqlite DB_DATABASE=/data/database.sqlite
EXPOSE 10000
USER www-data
ENTRYPOINT ["/usr/local/bin/cryma-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=10000"]
