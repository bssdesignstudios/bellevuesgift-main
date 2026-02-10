# Code Structure Agent: Evidence Report

## Summary

The Bellevue Gifts codebase is a **hybrid architecture** with two parallel implementations:

1. **Legacy Lovable SPA** (`src/`) - React + Vite + Supabase
2. **Laravel Backend** (`backend/`) - Laravel 11 + Inertia.js + React

## Evidence

### File Counts

| Directory | TypeScript/TSX Files | PHP Files |
|-----------|---------------------|-----------|
| `src/` | 131 | 0 |
| `backend/resources/js/` | 131 | 0 |
| `backend/app/` | 0 | ~50 |

### Key Entry Points

| Component | Location | Lines |
|-----------|----------|-------|
| SPA Entry | `src/main.tsx` | 6 |
| SPA Router | `src/App.tsx` | 167 |
| Laravel Entry | `backend/resources/js/app.tsx` | TBD |
| Laravel Routes | `backend/routes/web.php` | 363 |

### Directory Structure

```
bellevuegifts-main/
├── backend/                    # Laravel 11 Application
│   ├── app/Http/Controllers/   # Controllers
│   ├── app/Models/             # Eloquent Models
│   ├── database/migrations/    # 15 migrations
│   ├── database/seeders/       # ShopSeeder.php
│   ├── resources/js/Pages/     # Inertia React pages
│   │   ├── admin/              # Admin pages
│   │   ├── account/            # Customer account pages
│   │   ├── kiosk/              # Kiosk pages
│   │   └── *.tsx               # 24 top-level pages
│   └── routes/web.php          # Route definitions
│
├── src/                        # Legacy Lovable SPA
│   ├── App.tsx                 # React Router config
│   ├── contexts/               # Auth, Cart, CustomerAuth
│   ├── integrations/supabase/  # Supabase client
│   ├── lib/                    # Utilities
│   ├── pages/                  # Page components
│   │   ├── admin/              # Admin pages
│   │   ├── account/            # Account pages
│   │   ├── kiosk/              # Kiosk pages
│   │   └── *.tsx               # Top-level pages
│   └── components/             # Shared components
│
├── supabase/                   # Supabase config
│   ├── migrations/             # 6 SQL migration files
│   └── functions/              # Edge functions
│
├── package.json                # Root dependencies
├── vite.config.ts              # Vite + PWA config
└── tailwind.config.ts          # Tailwind config
```

### Dependencies

**Frontend (package.json):**
- React 18.3.1
- React Router DOM 6.30.1
- @inertiajs/react 2.3.13
- @supabase/supabase-js 2.93.3
- Tailwind CSS 3.4.17
- Radix UI (full suite)
- Tanstack Query 5.83.0
- Framer Motion 12.29.2
- Recharts 2.15.4
- vite-plugin-pwa 1.2.0

### Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite bundler + PWA plugin |
| `tailwind.config.ts` | Tailwind CSS theme |
| `tsconfig.json` | TypeScript config |
| `backend/composer.json` | PHP dependencies |
| `backend/.env` | Environment variables |

## Recommendations

1. **Consolidate to Laravel** - Remove legacy SPA, keep Laravel + Inertia
2. **Remove Supabase** - Use Laravel database exclusively
3. **Unify Components** - Share UI components between pages
