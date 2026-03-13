#!/bin/bash
set -e

echo "========================================="
echo "  Bellevue's Gift - Server Setup Script"
echo "========================================="

# Generate a random database password
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)
echo ""
echo "Generated DB password: $DB_PASSWORD"
echo "(Save this somewhere safe!)"
echo ""

# ---- Phase 1: Install packages ----
echo ">>> Installing system packages..."
apt update && apt upgrade -y

echo ">>> Installing PHP 8.3..."
apt install -y php8.4-fpm php8.4-cli php8.4-pgsql php8.4-mbstring \
  php8.4-xml php8.4-curl php8.4-zip php8.4-bcmath php8.4-gd \
  php8.4-intl php8.4-readline php8.4-tokenizer

echo ">>> Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

echo ">>> Installing Nginx..."
apt install -y nginx
systemctl enable nginx

echo ">>> Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo ">>> Installing Composer..."
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer

echo ">>> Installing Supervisor..."
apt install -y supervisor
systemctl enable supervisor

echo ">>> Installing Git..."
apt install -y git

# ---- Phase 2: Create database ----
echo ">>> Setting up PostgreSQL database..."
sudo -u postgres psql <<EOF
CREATE USER bellevue WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE bellevuesgift OWNER bellevue;
\c bellevuesgift
GRANT ALL ON SCHEMA public TO bellevue;
EOF

# ---- Phase 3: Clone and deploy ----
echo ">>> Cloning repository..."
cd /var/www
git clone https://github.com/bssdesignstudios/bellevuesgift-main.git bellevuesgift
cd /var/www/bellevuesgift/backend

echo ">>> Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader

echo ">>> Setting up environment..."
cp .env.example .env

# Update .env with production values
sed -i "s|APP_NAME=Laravel|APP_NAME=\"Bellevue's Gift\"|g" .env
sed -i "s|APP_ENV=local|APP_ENV=production|g" .env
sed -i "s|APP_DEBUG=true|APP_DEBUG=false|g" .env
sed -i "s|APP_URL=http://localhost|APP_URL=http://143.198.3.55|g" .env
sed -i "s|DB_CONNECTION=sqlite|DB_CONNECTION=pgsql|g" .env
sed -i "s|# DB_HOST=127.0.0.1|DB_HOST=127.0.0.1|g" .env
sed -i "s|# DB_PORT=3306|DB_PORT=5432|g" .env
sed -i "s|# DB_DATABASE=laravel|DB_DATABASE=bellevuesgift|g" .env
sed -i "s|# DB_USERNAME=root|DB_USERNAME=bellevue|g" .env
sed -i "s|# DB_PASSWORD=|DB_PASSWORD=$DB_PASSWORD|g" .env

echo ">>> Generating app key..."
php artisan key:generate

echo ">>> Running migrations..."
php artisan migrate --force

echo ">>> Seeding database..."
php artisan db:seed --force

echo ">>> Building frontend assets..."
npm install
npm run build

echo ">>> Setting permissions..."
chown -R www-data:www-data /var/www/bellevuesgift
chmod -R 755 /var/www/bellevuesgift
chmod -R 775 /var/www/bellevuesgift/backend/storage
chmod -R 775 /var/www/bellevuesgift/backend/bootstrap/cache

echo ">>> Caching Laravel config..."
cd /var/www/bellevuesgift/backend
php artisan config:cache
php artisan route:cache
php artisan view:cache

# ---- Phase 4: Configure Nginx ----
echo ">>> Configuring Nginx..."
cat > /etc/nginx/sites-available/bellevuesgift <<'NGINX'
server {
    listen 80;
    server_name 143.198.3.55;
    root /var/www/bellevuesgift/backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php index.html;
    charset utf-8;

    client_max_body_size 20M;

    location /build/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/bellevuesgift /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---- Phase 5: Configure Supervisor ----
echo ">>> Configuring queue worker..."
cat > /etc/supervisor/conf.d/bellevuesgift-worker.conf <<'SUPERVISOR'
[program:bellevuesgift-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/bellevuesgift/backend/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/bellevuesgift/backend/storage/logs/worker.log
user=www-data
SUPERVISOR

supervisorctl reread
supervisorctl update
supervisorctl start bellevuesgift-worker:*

# ---- Phase 6: Generate deploy key for GitHub Actions ----
echo ">>> Generating SSH deploy key..."
ssh-keygen -t ed25519 -f /root/.ssh/deploy_key -N "" -q
cat /root/.ssh/deploy_key.pub >> /root/.ssh/authorized_keys

echo ""
echo "========================================="
echo "  SETUP COMPLETE!"
echo "========================================="
echo ""
echo "Your site should be live at: http://143.198.3.55"
echo ""
echo "Database password: $DB_PASSWORD"
echo ""
echo ">>> IMPORTANT: Copy the deploy key below and add it as a"
echo ">>> GitHub secret named SSH_PRIVATE_KEY in your repo settings:"
echo ">>> https://github.com/bssdesignstudios/bellevuesgift-main/settings/secrets/actions"
echo ""
echo "--- BEGIN DEPLOY KEY (copy everything below until END) ---"
cat /root/.ssh/deploy_key
echo ""
echo "--- END DEPLOY KEY ---"
echo ""
echo "After adding the secret, every push to main will auto-deploy!"
