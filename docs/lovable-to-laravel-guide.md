# Lovable-to-Laravel: Full-Stack Migration & Deployment Guide

A complete reference for migrating **Lovable AI projects** (React + Supabase SPA) to **Laravel 12 + Inertia/React** with a local database, deployed on **DigitalOcean** with automated CI/CD.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Template Variables](#template-variables)
4. [Phase 1: Project Audit](#phase-1-project-audit)
5. [Phase 2: Supabase Removal](#phase-2-supabase-removal)
6. [Phase 3: Laravel Backend Setup](#phase-3-laravel-backend-setup)
7. [Phase 4: GitHub Setup](#phase-4-github-setup)
8. [Phase 5: Server Provisioning](#phase-5-server-provisioning)
9. [Phase 6: CI/CD Pipeline](#phase-6-cicd-pipeline)
10. [Phase 7: Verification](#phase-7-verification)
11. [Supabase-to-Laravel Mapping](#supabase-to-laravel-mapping)
12. [Auth Migration Pattern](#auth-migration-pattern)
13. [Troubleshooting](#troubleshooting)
14. [SSL Setup](#ssl-setup)

---

## Overview

### What This Process Does

Lovable AI generates React SPAs that use Supabase for authentication, database, and storage. These work great for prototyping but need migration for production use cases where you want:

- Full control over your backend
- No Supabase subscription costs
- Your own server and database
- Custom business logic in PHP/Laravel
- Automated deployments via GitHub

### The Pipeline

```
Lovable AI Project (React + Supabase)
          |
          v
  [1] Audit Supabase usage
  [2] Remove Supabase, stub auth
  [3] Create Laravel 12 backend with Inertia/React
  [4] Push to GitHub with CI/CD workflow
  [5] Provision DigitalOcean server
  [6] Configure auto-deploy (push to main = live)
  [7] Verify everything works
          |
          v
Production Laravel App on DigitalOcean
```

### Prerequisites

- A Lovable AI project (with Supabase)
- A GitHub account and repo
- A DigitalOcean account (or any Ubuntu 24.04 VPS)
- SSH access to the server

---

## Architecture

### Before (Lovable)

```
Browser --> React SPA --> Supabase (Auth + PostgreSQL + Storage)
              |
         Static hosting (Lovable/Vercel/Netlify)
```

### After (Laravel)

```
Browser --> Nginx --> PHP-FPM --> Laravel 12
              |          |           |
              |          |     Inertia.js --> React Pages
              |          |           |
              |          |     PostgreSQL/MySQL (local)
              |          |           |
         Static assets   |     Supervisor (Queue Workers)
         (/build/)       |
                    php{{VERSION}}-fpm.sock
```

### Server Stack

| Component | Purpose |
|-----------|---------|
| **Nginx** | Reverse proxy, static asset serving |
| **PHP-FPM** | Runs Laravel via Unix socket |
| **PostgreSQL/MySQL** | Local database |
| **Node.js** | Builds Vite/React frontend assets |
| **Supervisor** | Manages Laravel queue workers |
| **UFW** | Firewall (ports 22, 80, 443) |
| **GitHub Actions** | Auto-deploy on push to main |

---

## Template Variables

All templates use `{{DOUBLE_BRACE}}` placeholders to avoid collision with `$shell_vars`, `${php_vars}`, and `${{ github_expressions }}`.

| Variable | Example | Used In |
|----------|---------|---------|
| `{{APP_NAME}}` | `bellevuesgift` | All templates |
| `{{APP_DISPLAY}}` | `"Bellevue's Gift"` | server-setup, .env |
| `{{APP_DOMAIN}}` | `143.198.3.55` or `myapp.com` | nginx, server-setup |
| `{{SERVER_IP}}` | `143.198.3.55` | deploy workflow |
| `{{APP_PATH}}` | `/var/www/bellevuesgift` | All templates |
| `{{DB_ENGINE}}` | `pgsql` or `mysql` | server-setup |
| `{{DB_NAME}}` | `bellevuesgift` | server-setup |
| `{{DB_USER}}` | `bellevue` | server-setup |
| `{{DB_PORT}}` | `5432` or `3306` | server-setup |
| `{{GITHUB_REPO}}` | `https://github.com/user/repo.git` | server-setup |
| `{{PHP_VERSION}}` | `8.4` | All templates |
| `{{NODE_VERSION}}` | `20` | server-setup |
| `{{SEEDER_CLASS}}` | `DatabaseSeeder` | server-setup |

---

## Phase 1: Project Audit

### Run the Audit Script

```bash
bash .claude/skills/lovable-to-laravel/scripts/supabase-audit.sh /path/to/project
```

### What It Finds

1. **Lovable fingerprint** — checks for `@supabase/supabase-js` and `lovable-tagger` in package.json
2. **Client files** — the `integrations/supabase/` directory with client.ts, types.ts, etc.
3. **Supabase config** — `supabase/config.toml`, edge functions, SQL migrations
4. **All files importing Supabase** — categorized as auth contexts, hooks, page components
5. **Database tables** — extracted from `.from('table_name')` calls
6. **Auth patterns** — which `supabase.auth.*` methods are used
7. **Environment variables** — `VITE_SUPABASE_URL`, etc.

### Use the Report To

- Create a Laravel migration for each table found
- Plan an API controller for each table
- Know which auth patterns need replacement
- Estimate migration scope

---

## Phase 2: Supabase Removal

### Step 1: Stub the Client

Replace `src/integrations/supabase/client.ts`:

```typescript
/// <reference types="vite/client" />
export const isSupabaseConfigured = false;
export const supabase = null as any;
```

**Why:** Every page that imports `supabase` will get `null` instead of crashing on missing env vars. Pages only break when they actually try to call `.from()` or `.auth`, and those are lazy-loaded.

### Step 2: Stub Auth Contexts

Any context using `supabase.auth.getSession()` on mount will hang forever. Replace with:

```tsx
export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading] = useState(false); // NOT true — renders immediately
  return (
    <AuthContext.Provider value={{
      user: null, session: null, loading,
      signIn: async () => ({ error: null }),
      signOut: async () => {},
      // ... other stubs
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Critical:** The `loading` state MUST default to `false`. If it starts as `true`, the app shows a spinner forever since Supabase never responds.

### Step 3: Remove Dependencies

```bash
npm uninstall @supabase/supabase-js lovable-tagger
rm -rf supabase/
```

### Step 4: Verify Build

```bash
npm run build
```

**Common build failures:**
- Missing UI packages (`sonner`, `@radix-ui/*`, etc.) — install them
- Type errors from null supabase — the `as any` cast handles most

---

## Phase 3: Laravel Backend Setup

### Create the Backend

```bash
composer create-project laravel/laravel backend
cd backend
composer require inertiajs/inertia-laravel
npm install @inertiajs/react react react-dom
```

### Migrations

For each table from the audit, create a migration. Map Supabase SQL types:

| Supabase | Laravel |
|----------|---------|
| `uuid` | `$table->uuid('id')->primary()` |
| `text` | `$table->text('col')` |
| `varchar(255)` | `$table->string('col')` |
| `integer` | `$table->integer('col')` |
| `numeric(10,2)` | `$table->decimal('col', 10, 2)` |
| `boolean` | `$table->boolean('col')` |
| `timestamptz` | `$table->timestamp('col')` |
| `jsonb` | `$table->json('col')` |
| `text[]` | `$table->json('col')` (store as JSON array) |

### Authentication

Create role-based auth:

```php
// app/Http/Middleware/RoleMiddleware.php
public function handle($request, Closure $next, ...$roles) {
    if (!in_array($request->user()->role, $roles)) {
        abort(403);
    }
    return $next($request);
}
```

### Seeders

Create test users:

```php
User::create([
    'name' => 'Admin User',
    'email' => 'admin@yourapp.com',
    'password' => Hash::make('password'),
    'role' => 'admin',
]);
```

---

## Phase 4: GitHub Setup

### Initialize and Push

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin {{GITHUB_REPO}}
git branch -M main
git push -u origin main
```

### Create Deploy Workflow

Copy `.claude/skills/lovable-to-laravel/references/deploy-workflow-template.yml` to `.github/workflows/deploy.yml` and replace all `{{VARIABLES}}`.

### Create Manual Deploy Script

Create `deploy.sh` at project root for manual fallback deployments.

---

## Phase 5: Server Provisioning

### Option A: Fresh Droplet

1. Create Ubuntu 24.04 droplet on DigitalOcean (2GB+ RAM recommended)
2. Copy `server-setup-template.sh`, replace all variables
3. SSH in and run the script

### Option B: Existing Server

Run the setup script phases individually, skipping what's already installed.

### What the Script Does (10 Phases)

1. **Install packages** — PHP, DB server, Nginx, Node.js, Composer, Supervisor, Git
2. **Create database** — user + database with auto-generated password
3. **Clone & deploy** — repo, composer install, .env config, key generate, migrate, seed
4. **Build frontend** — npm install + npm run build
5. **Set permissions** — www-data ownership, 755/775
6. **Cache config** — artisan config/route/view cache
7. **Configure Nginx** — virtual host with PHP-FPM
8. **Configure Supervisor** — 2 queue workers
9. **Configure firewall** — UFW allow SSH + Nginx
10. **Generate deploy key** — ed25519 SSH key for GitHub Actions

---

## Phase 6: CI/CD Pipeline

### How It Works

```
Developer pushes to main
        |
GitHub Actions triggers deploy.yml
        |
SSH into server using deploy key
        |
git pull → composer install → npm build → migrate → cache → reload PHP-FPM
        |
Site updated automatically (~1-2 minutes)
```

### Setup Steps

1. The server setup script generates the deploy key at `/root/.ssh/github_deploy`
2. Go to `{{GITHUB_REPO}}/settings/secrets/actions`
3. Create secret `SSH_PRIVATE_KEY` with the private key content
4. Push a change to `main` to test

### Important: safe.directory

The deploy script includes `git config --global --add safe.directory {{APP_PATH}}` because after `chown -R www-data:www-data`, git considers the directory "dubiously owned" and refuses to operate without this config.

---

## Phase 7: Verification

### Checklist

- [ ] `http://{{APP_DOMAIN}}` loads the storefront
- [ ] Staff login works at `/staff/login`
- [ ] Admin panel at `/admin` shows all menu items
- [ ] POS at `/pos` shows products and cart
- [ ] Push to GitHub triggers auto-deploy
- [ ] `supervisorctl status` shows workers running
- [ ] Default passwords changed
- [ ] SSL configured (see below)

---

## Supabase-to-Laravel Mapping

### Database Operations

| Supabase | Laravel API | Controller Method |
|----------|-------------|-------------------|
| `supabase.from('items').select('*')` | `GET /api/items` | `index()` |
| `supabase.from('items').select('*').eq('id', id)` | `GET /api/items/{id}` | `show($id)` |
| `supabase.from('items').insert({...})` | `POST /api/items` | `store(Request)` |
| `supabase.from('items').update({...}).eq('id', id)` | `PUT /api/items/{id}` | `update(Request, $id)` |
| `supabase.from('items').delete().eq('id', id)` | `DELETE /api/items/{id}` | `destroy($id)` |
| `supabase.from('items').select('*').order('name')` | `GET /api/items?sort=name` | `index()` with sort |
| `supabase.from('items').select('*').range(0, 9)` | `GET /api/items?page=1` | `index()` with pagination |

### Authentication

| Supabase | Laravel |
|----------|---------|
| `supabase.auth.signInWithPassword({email, password})` | `POST /login` (session auth) |
| `supabase.auth.signUp({email, password})` | `POST /register` |
| `supabase.auth.signOut()` | `POST /logout` |
| `supabase.auth.getSession()` | Inertia shared data: `usePage().props.auth.user` |
| `supabase.auth.onAuthStateChange()` | Inertia reactive props (auto-updates on page visits) |
| `supabase.auth.getUser()` | `auth()->user()` in controller |

### Storage

| Supabase | Laravel |
|----------|---------|
| `supabase.storage.from('bucket').upload(path, file)` | `$request->file('image')->store('path', 'public')` |
| `supabase.storage.from('bucket').getPublicUrl(path)` | `Storage::url($path)` |

---

## Auth Migration Pattern

### Before (Supabase — hangs with loading=true)

```tsx
// This blocks the entire app when Supabase isn't configured
const [loading, setLoading] = useState(true);
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setUser(data.session?.user ?? null);
    setLoading(false); // Never reached if Supabase is gone
  });
}, []);
if (loading) return <Spinner />; // Stuck here forever
```

### After (Laravel via Inertia — instant render)

```tsx
// Uses Inertia's server-provided props — no async wait needed
import { usePage } from '@inertiajs/react';

export function useAuth() {
  const { auth } = usePage().props;
  return {
    user: auth.user,
    loading: false, // Always false — data comes from server
  };
}
```

---

## Troubleshooting

### White Screen (React Not Mounting)

**Cause:** An auth context wraps the entire app tree and hangs with `loading=true`.
**Fix:** Stub the auth context with `loading = false` (see Phase 2).
**Debug:** Check browser console, inspect `#app` element children count.

### 502 Bad Gateway

**Cause:** Nginx can't reach PHP-FPM.
**Fix:** Verify socket path matches: `ls /var/run/php/php{{PHP_VERSION}}-fpm.sock`

### npm run build: Missing Dependencies

**Cause:** Lovable projects often use packages not listed in package.json.
**Fix:** Grep all imports, install missing ones:
```bash
grep -roh "from ['\"][^'\"]*['\"]" src/ | sort -u
```

### git: dubious ownership

**Cause:** Files owned by www-data, git run as root.
**Fix:** `git config --global --add safe.directory {{APP_PATH}}`

### Site Not Accessible

**Cause:** UFW firewall blocking port 80.
**Fix:** `ufw allow 'Nginx Full'`

### Deploy Key Rejected

**Cause:** Wrong key in GitHub secret, or public key not in authorized_keys.
**Fix:** Re-generate key, verify public key is in `/root/.ssh/authorized_keys`.

### Migration Fails

**Cause:** Database not created, or wrong credentials in .env.
**Fix:** Verify with `psql -U {{DB_USER}} -d {{DB_NAME}}` (pgsql) or `mysql -u {{DB_USER}} -p {{DB_NAME}}` (mysql).

---

## SSL Setup

After DNS is pointed to your server (not needed for IP-only access):

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

Certbot automatically:
- Obtains a Let's Encrypt certificate
- Configures Nginx for HTTPS
- Sets up auto-renewal via cron

For IP-only setups, use a self-signed certificate or skip SSL until a domain is configured.

---

## Template Files Reference

All templates are in `.claude/skills/lovable-to-laravel/references/`:

| Template | Purpose |
|----------|---------|
| `server-setup-template.sh` | Full server provisioning script |
| `deploy-workflow-template.yml` | GitHub Actions CI/CD workflow |
| `nginx-template.conf` | Nginx virtual host config |
| `supervisor-template.conf` | Queue worker config |

The audit script is in `.claude/skills/lovable-to-laravel/scripts/`:

| Script | Purpose |
|--------|---------|
| `supabase-audit.sh` | Scans project for all Supabase references |

---

*This guide was created from the real-world migration of the Bellevue's Gift retail management application from Lovable AI to Laravel 12 + Inertia/React, deployed on DigitalOcean.*
