<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Requests from these domains will receive stateful API authentication
    | cookies. These are used for SPA auth — the Inertia frontend calls
    | /api/* routes with session cookies instead of Bearer tokens.
    |
    */

    'stateful' => explode(',', env(
        'SANCTUM_STATEFUL_DOMAINS',
        implode(',', [
            'localhost',
            'localhost:8000',
            'localhost:5173',
            '127.0.0.1',
            '127.0.0.1:8000',
            parse_url(env('APP_URL', 'http://localhost'), PHP_URL_HOST),
            'bellevue.gifts',
            'www.bellevue.gifts',
            'bellevuepos.cloud',
            'www.bellevuepos.cloud',
        ])
    )),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    |
    | This array contains the authentication guards that will be checked when
    | Sanctum is trying to authenticate an incoming request. If none of the
    | guards is able to authenticate the request, the default guard will be
    | used.
    |
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | This value controls the number of minutes until an issued token will be
    | considered expired. If this value is null, personal access tokens do
    | not expire. This won't tweak the lifetime of first-party sessions.
    |
    */

    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    |
    | Sanctum can prefix new tokens in order to take advantage of numerous
    | security scanning initiatives maintained for six different token
    | formats and alert you if tokens are checked into source control.
    |
    */

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    |
    | When authenticating your first-party "stateful" requests, Sanctum will
    | search for a valid session cookie first, and will check for a Bearer
    | token second. You may configure the middleware that is run when a
    | request is made.
    |
    */

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];
