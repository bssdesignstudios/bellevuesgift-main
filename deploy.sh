#!/bin/bash
set -e

echo "Deploying Bellevue's Gift..."

cd /var/www/bellevuesgift
git pull origin main

cd backend

echo "Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader

echo "Installing Node dependencies and building assets..."
npm install
npm run build

echo "Running migrations..."
php artisan migrate --force

echo "Caching config, routes, and views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Restarting queue workers..."
php artisan queue:restart

echo "Reloading PHP-FPM..."
sudo systemctl reload php8.3-fpm

echo "Deployment complete!"
