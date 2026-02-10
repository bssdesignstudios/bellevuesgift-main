# Deliverable A — Live Deployment Workflow (DigitalOcean)

## A1) Production Runbook

---

### 1) Preflight Checks (Local + CI)

#### 1. Lock release commit

Ensure release candidate commit exists and is tagged:

```bash
git rev-parse --short HEAD
git status                    # must be clean
git tag v1.0-rc1 <COMMIT>
git push origin v1.0-rc1
```

#### 2. CI gates

```bash
composer validate
composer install --no-interaction --prefer-dist
npm ci
npm run build
php artisan test               # or smoke suite
php artisan route:list         # ensure routes compile
```

Ensure artifacts are reproducible (no untracked build output committed).

#### 3. Secrets / env readiness

Confirm production `.env` exists on droplet and includes:

| Key | Required Value |
|-----|---------------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` | *(droplet host or 127.0.0.1)* |
| `DB_PORT` | `3306` |
| `DB_DATABASE` | `bellevue_gifts` |
| `DB_USERNAME` | *(production user)* |
| `DB_PASSWORD` | *(production password)* |
| `DEMO_MODE` | `false` |

Also confirm:
- Sanctum/session/cookie domains correct
- `APP_URL` matches production domain

---

### 2) Build Steps (on droplet)

We build on droplet (simple and reliable), unless you run a build artifact pipeline.

Per release:

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache || true
```

---

### 3) Migration Strategy (safe order, downtime avoidance)

**Rule:** migrations are the riskiest part; run them after new code is in place but before switching the symlink (or immediately after switch if the app can tolerate it).

**Safe default strategy (low downtime):**

1. Put new release in place (not live).
2. Run:
   ```bash
   php artisan migrate --force
   ```
3. Switch symlink to new release.
4. Restart/reload workers.

> If you ever ship "breaking migrations" (column drops / type changes), you need a multi-step expand/contract migration plan — but this RC ships no breaking changes, so we document the safe protocol only.

---

### 4) Zero/Low-Downtime Release Structure (releases + shared + rollback)

Use a standard Capistrano-style layout:

```
/var/www/bellevue/
  current -> /var/www/bellevue/releases/20260209_210500
  releases/
    20260209_210500/
    20260209_203000/
  shared/
    .env
    storage/
    public/storage -> shared/storage/app/public (via storage:link in each release)
```

#### Shared items
- `/var/www/bellevue/shared/.env`
- `/var/www/bellevue/shared/storage` (logs, cache, sessions if file-based)

#### Per release
1. Copy code into a timestamped folder
2. Symlink shared `.env` and `storage`
3. Run build + caches in the release directory
4. Atomically switch `current` symlink
5. Reload `php-fpm` and queues

**Rollback** is simply repointing `current` to the previous release and reloading services.

---

### 5) Queue/Workers + Scheduler

**Recommended:** Supervisor (simplest on DO), or systemd units.

#### Supervisor

Worker program example:

```ini
[program:bellevue-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/bellevue/current/artisan queue:work --sleep=1 --tries=3 --timeout=90
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/bellevue-worker.log
```

Manage:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart bellevue-worker:*
```

#### Scheduler

Cron (classic):

```cron
* * * * * cd /var/www/bellevue/current && php artisan schedule:run >> /dev/null 2>&1
```

Or systemd timer (optional).

---

### 6) Nginx + PHP-FPM Sanity Checks

```bash
# 1. Confirm PHP version matches target
php -v

# 2. php-fpm running
sudo systemctl status php8.2-fpm

# 3. Nginx config test + reload
sudo nginx -t
sudo systemctl reload nginx
```

#### Confirm Nginx points to:

```nginx
root /var/www/bellevue/current/public;
```

#### Confirm correct PHP socket:

```nginx
fastcgi_pass unix:/run/php/php8.2-fpm.sock;
```

---

### 7) Post-Deploy Smoke Checks (routes, auth, POS critical paths)

#### Automated

```bash
php artisan bellevue:smoke-test
php artisan route:list | grep -E "api/pos|api/pickup|api/refund|api/repair"
```

#### Manual (browser)

| Check | Expected |
|-------|----------|
| `/` storefront loads | ✅ |
| `/staff/login` works | ✅ |
| Cashier can access `/pos` | ✅ |
| Cashier blocked from `/admin` | ✅ (redirect or 403) |
| POS → Pickup verify by `pickup_code` | ✅ |
| POS → Refund flow completes | ✅ |
| POS → Repair deposit / complete flows | ✅ |
| Demo/kiosk blocked when `DEMO_MODE=false` | ✅ (404) |

---

### 8) Rollback Procedure (exact commands)

Rollback should be fast, predictable, and reversible:

```bash
# 1. Identify previous release
ls -1 /var/www/bellevue/releases | tail

# 2. Switch symlink
ln -sfn /var/www/bellevue/releases/<PREV_RELEASE> /var/www/bellevue/current

# 3. Reload services
sudo systemctl reload php8.2-fpm
sudo systemctl reload nginx
sudo supervisorctl restart bellevue-worker:*

# 4. Confirm health
curl -s -o /dev/null -w "%{http_code}" https://pos.bellevuegifts.com/
curl -s -o /dev/null -w "%{http_code}" https://pos.bellevuegifts.com/staff/login
```

> **Note:** if you ran irreversible migrations, rollback may require DB rollback/restore. The above rollback assumes DB is backwards-compatible for the RC.

---

## A2) One-Command Deploy Script

Save as `/var/www/bellevue/deploy.sh` and `chmod +x deploy.sh`.

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/bellevue"
RELEASES="$APP_DIR/releases"
SHARED="$APP_DIR/shared"
TS="$(date +%Y%m%d_%H%M%S)"
NEW_RELEASE="$RELEASES/$TS"
REPO_URL="git@github.com:bssdesignstudios/bellevuesgift-main.git"
BRANCH="release/v1.0-release-candidate"
PHP_FPM_SERVICE="php8.2-fpm"   # adjust to match server
WORKERS="bellevue-worker:*"    # supervisor group

echo "==> Create release dir"
mkdir -p "$NEW_RELEASE" "$RELEASES" "$SHARED"

echo "==> Checkout code"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$NEW_RELEASE"

echo "==> Link shared env + storage"
ln -sfn "$SHARED/.env" "$NEW_RELEASE/backend/.env"
rm -rf "$NEW_RELEASE/backend/storage"
ln -sfn "$SHARED/storage" "$NEW_RELEASE/backend/storage"

echo "==> Install PHP deps (no-dev)"
cd "$NEW_RELEASE/backend"
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

echo "==> Install Node deps + build assets"
npm ci
npm run build

echo "==> Laravel caches"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache || true

echo "==> Run migrations (safe)"
php artisan migrate --force

echo "==> Storage link (idempotent)"
php artisan storage:link || true

echo "==> Atomic symlink switch"
ln -sfn "$NEW_RELEASE/backend" "$APP_DIR/current"

echo "==> Reload services"
sudo systemctl reload "$PHP_FPM_SERVICE"
sudo systemctl reload nginx
sudo supervisorctl restart "$WORKERS" || true

echo "==> Smoke tests"
php artisan bellevue:smoke-test || true

echo "==> Done: $TS"
echo "==> Release: $NEW_RELEASE"
echo "==> Rollback: ln -sfn <PREV> $APP_DIR/current && sudo systemctl reload $PHP_FPM_SERVICE && sudo systemctl reload nginx"
```
