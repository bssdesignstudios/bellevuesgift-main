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

        // Prepend maintenance-mode check globally on web routes.
        // The middleware itself excludes /admin, /pos, /staff, /warehouse, /kiosk.
        $middleware->web(prepend: [
            \App\Http\Middleware\StorefrontMaintenance::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
