<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class PosDomainRedirect
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->getHost() === 'bellevuepos.cloud'
            && $request->path() === '/'
            && !$request->ajax()
            && !$request->wantsJson()) {
            // Authenticated POS users go straight to POS, others to PIN login
            return redirect(Auth::check() ? '/pos' : '/pos/login');
        }

        return $next($request);
    }
}
