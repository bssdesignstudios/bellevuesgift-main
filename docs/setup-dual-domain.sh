#!/bin/bash
# ==============================================
# Bellevue Dual-Domain Server Setup
# Run this on the DigitalOcean droplet as root
# ==============================================
set -e

echo ">>> Step 1: Back up current Nginx config"
cp /etc/nginx/sites-available/bellevuesgift /etc/nginx/sites-available/bellevuesgift.bak.$(date +%s)

echo ">>> Step 2: Deploy new Nginx config"
# The new config should already be at /var/www/bellevuesgift/docs/nginx-dual-domain.conf
# after a git pull
cp /var/www/bellevuesgift/docs/nginx-dual-domain.conf /etc/nginx/sites-available/bellevuesgift

echo ">>> Step 3: Test Nginx config"
nginx -t
if [ $? -ne 0 ]; then
    echo "ERROR: Nginx config test failed! Restoring backup..."
    cp /etc/nginx/sites-available/bellevuesgift.bak.* /etc/nginx/sites-available/bellevuesgift
    exit 1
fi

echo ">>> Step 4: Reload Nginx"
systemctl reload nginx

echo ">>> Step 5: Install Certbot (if not already installed)"
apt install -y certbot python3-certbot-nginx 2>/dev/null || true

echo ">>> Step 6: Get SSL cert for bellevuegifts.com"
echo "    (If this fails, DNS may not have propagated yet. Wait and retry.)"
certbot --nginx -d bellevuegifts.com -d www.bellevuegifts.com --non-interactive --agree-tos --email bellevuegifts242@gmail.com || echo "WARNING: bellevuegifts.com SSL failed. Try again later."

echo ">>> Step 7: Get SSL cert for bellevuepos.cloud"
certbot --nginx -d bellevuepos.cloud -d www.bellevuepos.cloud --non-interactive --agree-tos --email bellevuegifts242@gmail.com || echo "WARNING: bellevuepos.cloud SSL failed. Try again later."

echo ">>> Step 8: Update .env"
cd /var/www/bellevuesgift/backend
sed -i 's|APP_URL=.*|APP_URL=https://bellevuegifts.com|' .env
# Add SESSION_SECURE_COOKIE if not present
grep -q 'SESSION_SECURE_COOKIE' .env || echo 'SESSION_SECURE_COOKIE=true' >> .env
sed -i 's|SESSION_SECURE_COOKIE=.*|SESSION_SECURE_COOKIE=true|' .env

echo ">>> Step 9: Clear Laravel caches"
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo ""
echo "========================================="
echo "  DUAL-DOMAIN SETUP COMPLETE"
echo "========================================="
echo ""
echo "  Storefront: https://bellevuegifts.com"
echo "  POS:        https://bellevuepos.cloud"
echo ""
echo "  Test both URLs in your browser!"
echo ""
