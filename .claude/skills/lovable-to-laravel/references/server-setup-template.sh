#!/bin/bash
set -e

# =============================================================================
# Lovable-to-Laravel: Server Setup Template
# =============================================================================
# Replace these variables before running:
#   {{APP_NAME}}      - kebab-case app name (e.g., bellevuesgift)
#   {{APP_DISPLAY}}   - display name (e.g., "Bellevue's Gift")
#   {{APP_DOMAIN}}    - domain or IP (e.g., 143.198.3.55)
#   {{APP_PATH}}      - server path (e.g., /var/www/bellevuesgift)
#   {{DB_ENGINE}}     - pgsql or mysql
#   {{DB_NAME}}       - database name (e.g., bellevuesgift)
#   {{DB_USER}}       - database user (e.g., bellevue)
#   {{DB_PORT}}       - database port (5432 for pgsql, 3306 for mysql)
#   {{GITHUB_REPO}}   - full GitHub URL (e.g., https://github.com/user/repo.git)
#   {{PHP_VERSION}}   - PHP version (e.g., 8.4)
#   {{NODE_VERSION}}  - Node.js major version (e.g., 20)
#   {{SEEDER_CLASS}}  - seeder to run (e.g., ShopSeeder or DatabaseSeeder)
# =============================================================================

echo "========================================="
echo "  {{APP_DISPLAY}} - Server Setup"
echo "========================================="

# Generate a random database password
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)
echo ""
echo "Generated DB password: $DB_PASSWORD"
echo "(Save this somewhere safe!)"
echo ""

# ---- Phase 1: Install system packages ----
echo ">>> Phase 1: Installing system packages..."
apt update && apt upgrade -y

echo ">>> Installing PHP {{PHP_VERSION}}..."
# If using Ondrej PPA (for PHP versions not in default Ubuntu repos):
# add-apt-repository -y ppa:ondrej/php && apt update
apt install -y php{{PHP_VERSION}}-fpm php{{PHP_VERSION}}-cli php{{PHP_VERSION}}-mbstring \
  php{{PHP_VERSION}}-xml php{{PHP_VERSION}}-curl php{{PHP_VERSION}}-zip php{{PHP_VERSION}}-bcmath \
  php{{PHP_VERSION}}-gd php{{PHP_VERSION}}-intl php{{PHP_VERSION}}-readline php{{PHP_VERSION}}-tokenizer

# Install DB-specific PHP extension
# FOR POSTGRESQL:
# apt install -y php{{PHP_VERSION}}-pgsql
# FOR MYSQL:
# apt install -y php{{PHP_VERSION}}-mysql
apt install -y php{{PHP_VERSION}}-pgsql php{{PHP_VERSION}}-mysql

echo ">>> Installing database server..."
# FOR POSTGRESQL:
if [ "{{DB_ENGINE}}" = "pgsql" ]; then
  apt install -y postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
fi
# FOR MYSQL:
if [ "{{DB_ENGINE}}" = "mysql" ]; then
  apt install -y mysql-server
  systemctl enable mysql
  systemctl start mysql
fi

echo ">>> Installing Nginx..."
apt install -y nginx
systemctl enable nginx

echo ">>> Installing Node.js {{NODE_VERSION}} LTS..."
curl -fsSL https://deb.nodesource.com/setup_{{NODE_VERSION}}.x | bash -
apt install -y nodejs

echo ">>> Installing Composer..."
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer

echo ">>> Installing Supervisor & Git..."
apt install -y supervisor git
systemctl enable supervisor

# ---- Phase 2: Create database ----
echo ">>> Phase 2: Setting up database..."

if [ "{{DB_ENGINE}}" = "pgsql" ]; then
  sudo -u postgres psql <<EOF
CREATE USER {{DB_USER}} WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE {{DB_NAME}} OWNER {{DB_USER}};
\c {{DB_NAME}}
GRANT ALL ON SCHEMA public TO {{DB_USER}};
EOF
fi

if [ "{{DB_ENGINE}}" = "mysql" ]; then
  mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS {{DB_NAME}} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '{{DB_USER}}'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON {{DB_NAME}}.* TO '{{DB_USER}}'@'localhost';
FLUSH PRIVILEGES;
EOF
fi

# ---- Phase 3: Clone and deploy application ----
echo ">>> Phase 3: Cloning repository..."
cd /var/www
git clone {{GITHUB_REPO}} {{APP_NAME}}
cd {{APP_PATH}}/backend

echo ">>> Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader

echo ">>> Setting up environment..."
cp .env.example .env

# Update .env with production values
sed -i "s|APP_NAME=Laravel|APP_NAME=\"{{APP_DISPLAY}}\"|g" .env
sed -i "s|APP_ENV=local|APP_ENV=production|g" .env
sed -i "s|APP_DEBUG=true|APP_DEBUG=false|g" .env
sed -i "s|APP_URL=http://localhost|APP_URL=http://{{APP_DOMAIN}}|g" .env
sed -i "s|DB_CONNECTION=sqlite|DB_CONNECTION={{DB_ENGINE}}|g" .env
sed -i "s|# DB_HOST=127.0.0.1|DB_HOST=127.0.0.1|g" .env
sed -i "s|# DB_PORT=3306|DB_PORT={{DB_PORT}}|g" .env
sed -i "s|# DB_DATABASE=laravel|DB_DATABASE={{DB_NAME}}|g" .env
sed -i "s|# DB_USERNAME=root|DB_USERNAME={{DB_USER}}|g" .env
sed -i "s|# DB_PASSWORD=|DB_PASSWORD=$DB_PASSWORD|g" .env

echo ">>> Generating app key..."
php artisan key:generate

echo ">>> Running migrations..."
php artisan migrate --force

echo ">>> Seeding database..."
php artisan db:seed --class={{SEEDER_CLASS}} --force

# ---- Phase 4: Build frontend ----
echo ">>> Phase 4: Building frontend assets..."
npm install
npm run build

# ---- Phase 5: Set permissions ----
echo ">>> Phase 5: Setting permissions..."
chown -R www-data:www-data {{APP_PATH}}
chmod -R 755 {{APP_PATH}}
chmod -R 775 {{APP_PATH}}/backend/storage
chmod -R 775 {{APP_PATH}}/backend/bootstrap/cache

# ---- Phase 6: Cache Laravel config ----
echo ">>> Phase 6: Caching config..."
cd {{APP_PATH}}/backend
php artisan config:cache
php artisan route:cache
php artisan view:cache

# ---- Phase 7: Configure Nginx ----
echo ">>> Phase 7: Configuring Nginx..."
cat > /etc/nginx/sites-available/{{APP_NAME}} <<'NGINX'
server {
    listen 80;
    server_name {{APP_DOMAIN}};
    root {{APP_PATH}}/backend/public;

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
        fastcgi_pass unix:/var/run/php/php{{PHP_VERSION}}-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/{{APP_NAME}} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---- Phase 8: Configure Supervisor ----
echo ">>> Phase 8: Configuring queue worker..."
cat > /etc/supervisor/conf.d/{{APP_NAME}}-worker.conf <<'SUPERVISOR'
[program:{{APP_NAME}}-worker]
process_name=%(program_name)s_%(process_num)02d
command=php {{APP_PATH}}/backend/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
numprocs=2
redirect_stderr=true
stdout_logfile={{APP_PATH}}/backend/storage/logs/worker.log
user=www-data
SUPERVISOR

supervisorctl reread
supervisorctl update
supervisorctl start {{APP_NAME}}-worker:* || true

# ---- Phase 9: Firewall ----
echo ">>> Phase 9: Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ---- Phase 10: Generate deploy key ----
echo ">>> Phase 10: Generating SSH deploy key..."
ssh-keygen -t ed25519 -f /root/.ssh/github_deploy -N "" -C "github-actions-deploy" -q
cat /root/.ssh/github_deploy.pub >> /root/.ssh/authorized_keys

echo ""
echo "========================================="
echo "  SETUP COMPLETE!"
echo "========================================="
echo ""
echo "Site live at: http://{{APP_DOMAIN}}"
echo "Database password: $DB_PASSWORD"
echo ""
echo ">>> Add this as GitHub secret SSH_PRIVATE_KEY:"
echo ""
cat /root/.ssh/github_deploy
echo ""
echo ">>> After adding the secret, every push to main auto-deploys!"
