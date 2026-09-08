<?php

namespace App\Http\Middleware;

use App\Models\StoreSetting;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * StorefrontMaintenance
 *
 * When Coming Soon mode is on, every public/customer-facing route on
 * bellevuegifts.com returns a branded 503 Coming Soon page. Internal tools are
 * never affected:
 *   /admin   /pos   /staff   /warehouse   /kiosk   /login
 *   /up      /sw.js /offline /api/admin   /api/pos
 *
 * The whole of bellevuepos.cloud is exempt — the POS terminal keeps trading
 * while the online store is closed.
 *
 * Toggle: Admin → Settings → "Coming Soon Page". The state lives in the
 * store_settings table (see StoreSetting::MAINTENANCE_KEY), NOT in .env, so a
 * deploy cannot silently republish the storefront. MAINTENANCE_MODE in .env is
 * only the fallback default when that row does not exist.
 *
 * This middleware is prepended to BOTH the web and api groups (bootstrap/app.php).
 * Registering it on web alone left every route in routes/api.php serving live
 * catalogue data — including wholesale cost — with the gate switched on.
 */
class StorefrontMaintenance
{
    /** Hostnames that are never gated, whatever the setting says. */
    private const EXEMPT_HOSTS = [
        'bellevuepos.cloud',
        'www.bellevuepos.cloud',
    ];

    /**
     * Path prefixes that bypass Coming Soon mode.
     * All other routes receive the Coming Soon page.
     */
    private const BYPASS_PREFIXES = [
        '/admin',
        '/pos',
        '/staff',
        '/warehouse',
        '/kiosk',
        '/login',
        '/logout',
        '/forgot-password',
        '/reset-password',
        '/not-authorized',
        '/api/admin',
        '/api/pos',
        '/up',                        // Laravel health check
        '/sw.js',                     // Service worker
        '/offline',                   // PWA offline fallback
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // The POS domain is never gated.
        if (in_array($request->getHost(), self::EXEMPT_HOSTS, true)) {
            return $next($request);
        }

        if (! StoreSetting::isMaintenanceMode()) {
            return $next($request);
        }

        $path = $request->getPathInfo();

        // Allow internal/operational paths through
        foreach (self::BYPASS_PREFIXES as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix . '/')) {
                return $next($request);
            }
        }

        // XHR/API callers get JSON, not an HTML page they cannot parse.
        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()
                ->json(['message' => 'Our online store is temporarily unavailable.'], Response::HTTP_SERVICE_UNAVAILABLE)
                ->header('Retry-After', '86400')
                ->header('Cache-Control', 'no-store');
        }

        // For Inertia (SPA) requests, render via Inertia so the page transition
        // is smooth. 503 tells crawlers the site is temporarily unavailable —
        // it is the correct signal for a storefront that will launch.
        return Inertia::render('MaintenancePage')
            ->toResponse($request)
            ->setStatusCode(Response::HTTP_SERVICE_UNAVAILABLE)
            ->withHeaders([
                'Retry-After' => '86400',
                'Cache-Control' => 'no-store, no-cache, must-revalidate',
            ]);
    }
}
