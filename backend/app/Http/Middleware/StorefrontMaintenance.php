<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * StorefrontMaintenance
 *
 * When MAINTENANCE_MODE=true, all public/customer-facing routes return a
 * branded 503 Coming Soon page.  Internal tools are never affected:
 *   /admin   /pos   /staff   /warehouse   /kiosk   /login
 *   /ops     /up    /sw.js   /offline    /api/admin   /api/pos
 *
 * Toggle:
 *   .env → MAINTENANCE_MODE=true   (enable)
 *   .env → MAINTENANCE_MODE=false  (disable / default)
 *   After changing, run: php artisan config:cache
 */
class StorefrontMaintenance
{
    /**
     * Path prefixes that bypass maintenance mode.
     * All other GET routes will receive the Coming Soon page.
     */
    private const BYPASS_PREFIXES = [
        '/admin',
        '/pos',
        '/staff',
        '/warehouse',
        '/kiosk',
        '/login',
        '/logout',
        '/not-authorized',
        '/api/admin',
        '/api/pos',
        '/api/storefront/checkout',  // Allow checkout API to pass through for any active sessions
        '/up',                        // Laravel health check
        '/ops',                       // Ops/cache endpoints
        '/sw.js',                     // Service worker
        '/offline',                   // PWA offline fallback
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Feature disabled — pass through normally
        if (! config('app.maintenance_mode', false)) {
            return $next($request);
        }

        $path = $request->getPathInfo();

        // Allow internal/operational paths through
        foreach (self::BYPASS_PREFIXES as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix . '/')) {
                return $next($request);
            }
        }

        // For Inertia (SPA) requests, render the maintenance page via Inertia
        // so the app shell is preserved and the page transition is smooth.
        // Return 503 so crawlers know the site is temporarily unavailable.
        return Inertia::render('MaintenancePage')
            ->toResponse($request)
            ->setStatusCode(Response::HTTP_SERVICE_UNAVAILABLE);
    }
}
