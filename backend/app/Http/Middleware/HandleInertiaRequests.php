<?php

namespace App\Http\Middleware;

use App\Models\Staff;
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

        return [
            ...parent::share($request),
            'auth' => [
                'staff' => $isStaff ? array_merge([
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                ], $this->getStaffUuid($user)) : null,
                'customer' => $isCustomer ? [
                    'id'    => $user->id,
                    'name'  => $customerName,
                    'email' => $user->email,
                ] : null,
            ],
        ];
    }

    private function getStaffUuid($user): array
    {
        $staff = Staff::where('user_id', $user->id)->first();
        return $staff ? ['staff_uuid' => $staff->id] : [];
    }
}
