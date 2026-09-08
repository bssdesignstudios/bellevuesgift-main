<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Enable session auth on API routes so auth:web guard works (Inertia SPA — no Sanctum)
        $middleware->api(prepend: [
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Session\Middleware\StartSession::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \App\Http\Middleware\PosDomainRedirect::class,
        ]);

        $middleware->alias([
            'role'                   => \App\Http\Middleware\RoleMiddleware::class,
            'storefront.maintenance' => \App\Http\Middleware\StorefrontMaintenance::class,
        ]);

        // Prepend the Coming Soon check to BOTH route groups.
        // The middleware itself excludes /admin, /pos, /staff, /warehouse,
        // /kiosk and the whole bellevuepos.cloud host.
        // NOTE: routes/api.php is bound to the `api` group, so registering this
        // on `web` alone left the entire API serving live catalogue data —
        // including wholesale cost — with Coming Soon mode switched on.
        $middleware->web(prepend: [
            \App\Http\Middleware\StorefrontMaintenance::class,
        ]);

        $middleware->api(prepend: [
            \App\Http\Middleware\StorefrontMaintenance::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
