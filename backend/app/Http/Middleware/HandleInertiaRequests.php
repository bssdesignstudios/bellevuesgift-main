<?php

namespace App\Http\Middleware;

use App\Models\Staff;
use App\Models\StoreSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $staffRoles = ['admin', 'cashier', 'warehouse', 'warehouse_manager', 'finance'];
        $isStaff = $user && in_array($user->role, $staffRoles);

        // A customer is any logged-in user who does NOT have a staff role
        $isCustomer = $user && !$isStaff;

        // For customers, look up their name from the customers table (more reliable source)
        $customerName = null;
        if ($isCustomer) {
            $customerRecord = DB::table('customers')->where('email', $user->email)->first();
            $customerName = $customerRecord?->name ?? $user->name;
        }

        // Load module flags for staff users (controls sidebar visibility)
        $modules = null;
        if ($isStaff) {
            $modules = DB::table('store_settings')
                ->where('key', 'like', 'module.%')
                ->pluck('value', 'key')
                ->mapWithKeys(fn($value, $key) => [
                    str_replace('module.', '', $key) => in_array(strtolower($value), ['1', 'true', 'yes', 'on']),
                ])
                ->toArray();
        }

        return [
            ...parent::share($request),
            'auth' => [
                'staff' => $isStaff ? array_merge([
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                    'impersonated_by_admin_id' => $request->session()->get('admin_id'),
                ], $this->getStaffUuid($user)) : null,
                'customer' => $isCustomer ? [
                    'id'    => $user->id,
                    'name'  => $customerName,
                    'email' => $user->email,
                ] : null,
            ],
            'modules' => $modules,
        ];
    }

    private function getStaffUuid($user): array
    {
        $staff = Staff::where('user_id', $user->id)->first();
        return $staff ? ['staff_uuid' => $staff->id] : [];
    }
}
