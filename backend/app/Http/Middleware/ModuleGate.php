<?php

namespace App\Http\Middleware;

use App\Models\StoreSetting;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ModuleGate
{
    private const PATH_MODULES = [
        ['/api/admin/settings', 'settings'],
        ['/api/admin/gift-cards', 'gift_cards'],
        ['/api/admin/timesheets', 'timesheets'],
        ['/api/admin/payroll', 'payroll'],
        ['/api/admin/orders', 'orders'],
        ['/api/admin/repairs', 'repairs'],
        ['/api/admin/customers', 'customers'],
        ['/api/admin/vendors', 'vendors'],
        ['/api/admin/staff', 'staff'],
        ['/api/admin/registers', 'registers'],
        ['/api/admin/discounts', 'discounts'],
        ['/api/admin/reports', 'reports'],
        ['/api/admin/expenses', 'expenses'],
        ['/api/admin/inventory', 'inventory'],
        ['/api/admin/products', 'products'],
        ['/api/admin/categories', 'categories'],
        ['/api/admin/sop', 'help'],
        ['/admin/settings', 'settings'],
        ['/admin/gift-cards', 'gift_cards'],
        ['/admin/timesheets', 'timesheets'],
        ['/admin/payroll', 'payroll'],
        ['/admin/orders', 'orders'],
        ['/admin/repairs', 'repairs'],
        ['/admin/customers', 'customers'],
        ['/admin/vendors', 'vendors'],
        ['/admin/staff', 'staff'],
        ['/admin/registers', 'registers'],
        ['/admin/discounts', 'discounts'],
        ['/admin/reports', 'reports'],
        ['/admin/expenses', 'expenses'],
        ['/admin/inventory', 'inventory'],
        ['/admin/products', 'products'],
        ['/admin/categories', 'categories'],
        ['/admin/sop', 'help'],
        ['/admin', 'dashboard'],
        ['/pos/login', 'pos'],
        ['/pos', 'pos'],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        StoreSetting::ensureModuleFlagsExist();

        $module = $this->resolveModule($request->getPathInfo());
        if ($module && !StoreSetting::isModuleEnabled($module)) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Module disabled'], 403);
            }

            return Inertia::render('NotAuthorizedPage')
                ->toResponse($request)
                ->setStatusCode(Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }

    private function resolveModule(string $path): ?string
    {
        foreach (self::PATH_MODULES as [$prefix, $module]) {
            if ($path === $prefix || str_starts_with($path, $prefix . '/')) {
                return $module;
            }
        }

        return null;
    }
}
