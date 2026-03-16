---
name: lovable-to-laravel
description: "Full-stack migration and deployment pipeline. Use when the user wants to migrate a Lovable AI project (React/Supabase SPA) to a Laravel backend with MySQL/PostgreSQL and deploy to DigitalOcean. Triggers on: 'migrate from lovable', 'convert supabase to laravel', 'deploy to digitalocean', 'lovable to production', 'full stack migration', 'remove supabase', 'push to server', 'deploy laravel app'."
---

# Lovable-to-Laravel: Full-Stack Migration & Deployment Pipeline

Takes any **Lovable AI project** (React + Supabase SPA) and converts it to a **Laravel 12 + Inertia/React** app with a local database (PostgreSQL or MySQL), then deploys it to a **DigitalOcean** droplet with **GitHub Actions** auto-deploy.

## Before Starting — Gather These From the User

| Variable | Example | Description |
|----------|---------|-------------|
| `{{APP_NAME}}` | `bellevuesgift` | kebab-case, used for directories and configs |
| `{{APP_DISPLAY}}` | `"Bellevue's Gift"` | Display name for .env and UI |
| `{{APP_DOMAIN}}` | `143.198.3.55` | Domain or IP address |
| `{{SERVER_IP}}` | `143.198.3.55` | DigitalOcean droplet IP |
| `{{DB_ENGINE}}` | `pgsql` | `pgsql` or `mysql` |
| `{{DB_NAME}}` | `bellevuesgift` | Database name |
| `{{DB_USER}}` | `bellevue` | Database username |
| `{{DB_PORT}}` | `5432` | 5432 for pgsql, 3306 for mysql |
| `{{GITHUB_REPO}}` | `https://github.com/user/repo.git` | GitHub repo URL |
| `{{PHP_VERSION}}` | `8.4` | PHP version to install |
| `{{NODE_VERSION}}` | `20` | Node.js major version |
| `{{APP_PATH}}` | `/var/www/bellevuesgift` | Server install path |
| `{{SEEDER_CLASS}}` | `DatabaseSeeder` | Seeder class to run |

---

## Phase 1: Project Audit

Run the audit script to catalog all Supabase usage:

```bash
bash .claude/skills/lovable-to-laravel/scripts/supabase-audit.sh /path/to/project
```

This produces a report showing:
- All files importing from `@supabase/supabase-js` or `@/integrations/supabase/client`
- Database tables referenced via `supabase.from('table_name')`
- Auth patterns used (`getSession`, `signInWithPassword`, `signUp`, `signOut`, `onAuthStateChange`)
- Supabase edge functions and migrations
- Environment variables referencing Supabase

**Use this report to plan** which tables need Laravel migrations, which auth patterns need replacement, and which pages need API endpoint rewiring.

---

## Phase 2: Supabase Removal

### 2.1 Stub the Supabase Client

Replace `src/integrations/supabase/client.ts` with:

```typescript
/// <reference types="vite/client" />
// Supabase has been removed - using Laravel backend instead
// This file exists as a stub to prevent import errors
export const isSupabaseConfigured = false;
export const supabase = null as any;
```

### 2.2 Rewrite Auth Contexts as Passthrough Providers

Any context that calls `supabase.auth.*` on mount will hang forever with `loading=true`. Replace with a passthrough that:
- Sets `loading = false` immediately (use `useState(false)`)
- Renders `{children}` without conditions
- Provides stub methods that return `{ error: null }`
- Eventually these stubs get replaced with `fetch('/api/...')` calls to the Laravel backend

### 2.3 Clean Up Dependencies

```bash
# Remove from package.json
npm uninstall @supabase/supabase-js lovable-tagger

# Remove Supabase directory
rm -rf supabase/

# Remove env vars
# Delete VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from all .env files
```

### 2.4 Verify Build Still Works

```bash
npm run build
```

If build fails, check for missing dependencies. Run a comprehensive import audit:

```bash
grep -roh "from ['\"][^'\"]*['\"]" src/ | sort -u | grep -v "^\./\|^@/"
```

Install any missing packages found.

---

## Phase 3: Laravel Backend Setup

### 3.1 Create Laravel Project

```bash
composer create-project laravel/laravel backend
cd backend
composer require inertiajs/inertia-laravel
npm install @inertiajs/react react react-dom
```

### 3.2 Database Migrations

For each table found in the Phase 1 audit, create a Laravel migration:

```bash
php artisan make:migration create_{{table_name}}_table
```

Reference the `supabase/migrations/*.sql` files for column definitions. Map Supabase types to Laravel:
- `uuid` → `$table->uuid('id')->primary()`
- `text` → `$table->text('column')`
- `timestamptz` → `$table->timestamp('column')`
- `jsonb` → `$table->json('column')`
- `boolean` → `$table->boolean('column')`

### 3.3 Models, Controllers, Routes

For each `supabase.from('table')` call, create:
- **Model**: `php artisan make:model TableName`
- **Controller**: `php artisan make:controller TableNameController --resource`
- **API Route**: Add to `routes/api.php`

### 3.4 Authentication

Create staff authentication with role-based access:
- `AuthController` with `login()` and `logout()` methods
- `RoleMiddleware` to check user roles (admin, cashier, warehouse_manager)
- Login page rendered via Inertia

### 3.5 Move React Pages

Copy pages from `src/pages/` into `backend/resources/js/Pages/`:
- Update imports (remove supabase, use Inertia `usePage()` for server data)
- Replace `supabase.from().select()` with Inertia page props or `fetch('/api/...')`

### 3.6 Seeders

Create seeders for initial data (staff accounts, products, categories, etc.):
```bash
php artisan make:seeder {{SEEDER_CLASS}}
```

---

## Phase 4: GitHub Setup

### 4.1 Initialize Repository

```bash
git init
git add .
git commit -m "Initial commit: {{APP_DISPLAY}} - Laravel 12 + Inertia/React"
git remote add origin {{GITHUB_REPO}}
git branch -M main
git push -u origin main
```

### 4.2 Create CI/CD Workflow

Copy the deploy workflow template and replace variables:

**Source:** `.claude/skills/lovable-to-laravel/references/deploy-workflow-template.yml`
**Destination:** `.github/workflows/deploy.yml`

Replace: `{{SERVER_IP}}`, `{{APP_PATH}}`, `{{PHP_VERSION}}`

### 4.3 Create Manual Deploy Script

Create `deploy.sh` at project root:

```bash
#!/bin/bash
set -e
git config --global --add safe.directory {{APP_PATH}}
cd {{APP_PATH}}
git pull origin main
cd backend
composer install --no-dev --optimize-autoloader
npm install && npm run build
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan queue:restart
sudo systemctl reload php{{PHP_VERSION}}-fpm
chown -R www-data:www-data {{APP_PATH}}
echo "Deployed successfully"
```

---

## Phase 5: Server Provisioning

### 5.1 Prepare Setup Script

Copy the server setup template and replace ALL variables:

**Source:** `.claude/skills/lovable-to-laravel/references/server-setup-template.sh`

Replace all `{{VARIABLE}}` placeholders with actual values from the user.

### 5.2 Run on Server

SSH into the DigitalOcean droplet and execute the script. It handles:
1. System packages (PHP, DB, Nginx, Node, Composer, Supervisor)
2. Database creation with auto-generated password
3. Repo clone, dependency install, .env configuration
4. App key generation, migrations, seeding
5. Frontend build (`npm install && npm run build`)
6. File permissions (www-data ownership)
7. Laravel cache (config, routes, views)
8. Nginx configuration
9. Supervisor queue workers (2 processes)
10. UFW firewall (SSH + HTTP/HTTPS)
11. SSH deploy key generation

### 5.3 Common Issues

- **git dubious ownership**: Add `git config --global --add safe.directory {{APP_PATH}}` before any git commands
- **npm build fails**: Check for missing dependencies, install them, commit to repo
- **White screen**: Check if any auth context hangs with `loading=true` — stub it out
- **502 Bad Gateway**: Check PHP-FPM socket path matches Nginx config
- **Firewall blocking**: Run `ufw allow 'Nginx Full'`

---

## Phase 6: CI/CD Pipeline

### 6.1 The deploy key was generated by the setup script. Display it:

```bash
cat /root/.ssh/github_deploy
```

### 6.2 Add to GitHub

Navigate to: `{{GITHUB_REPO}}/settings/secrets/actions`
- Create secret: `SSH_PRIVATE_KEY`
- Paste the entire private key content

### 6.3 Test Auto-Deploy

Push a small change to `main` and verify:
1. GitHub Actions triggers
2. SSH connection succeeds
3. Code pulls, builds, and caches
4. Site updates automatically

---

## Phase 7: Verification Checklist

- [ ] Site loads at `http://{{APP_DOMAIN}}`
- [ ] All seeded staff accounts can log in
- [ ] Admin dashboard shows products/categories/orders
- [ ] POS page works for cashier role
- [ ] API endpoints return JSON (`/api/storefront/products`)
- [ ] Queue workers running: `supervisorctl status`
- [ ] Auto-deploy works end-to-end (push to main → site updates)
- [ ] No Supabase references remain: `grep -r "supabase" src/` returns nothing
- [ ] Change default passwords for production!
- [ ] Set up SSL: `apt install certbot python3-certbot-nginx && certbot --nginx -d {{APP_DOMAIN}}`
