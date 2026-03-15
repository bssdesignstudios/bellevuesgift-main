<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate a staff member.
     * Only users with a staff role (admin | cashier | warehouse) may log in here.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        // Only staff roles are allowed through this endpoint
        $staffRoles = ['admin', 'cashier', 'warehouse', 'warehouse_manager', 'finance'];
        if (! in_array($user->role, $staffRoles)) {
            throw ValidationException::withMessages([
                'email' => ['This account does not have staff access.'],
            ]);
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        $staffRecord = $this->resolveStaff($user);

        return response()->json([
            'staff' => [
                'id' => $user->id,
                'staff_uuid' => $staffRecord->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * Authenticate a staff member via 4-digit POS PIN.
     */
    public function pinLogin(Request $request)
    {
        $request->validate([
            'pin' => ['required', 'string', 'size:4'],
        ]);

        $user = User::where('pos_pin', $request->pin)
            ->where('is_active', true)
            ->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'pin' => ['Invalid PIN.'],
            ]);
        }

        // Only cashier and admin can use POS PIN login
        $posRoles = ['admin', 'cashier'];
        if (! in_array($user->role, $posRoles)) {
            throw ValidationException::withMessages([
                'pin' => ['This account does not have POS access.'],
            ]);
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        $staffRecord = $this->resolveStaff($user);

        return response()->json([
            'staff' => [
                'id' => $user->id,
                'staff_uuid' => $staffRecord->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * Find or create the staff record for a user, returning the staff UUID.
     */
    private function resolveStaff(User $user): Staff
    {
        return Staff::firstOrCreate(
            ['user_id' => $user->id],
            [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_active' => true,
            ]
        );
    }

    /**
     * Log the current user out.
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }
}
