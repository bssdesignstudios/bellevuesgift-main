<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\TimeLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class AdminStaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::where('role', '!=', 'customer')
            ->orderBy('name');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%");
            });
        }

        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') $query->where('is_active', true);
            if ($request->status === 'inactive') $query->where('is_active', false);
        }

        $staff = $query->get()->makeVisible('pos_pin');

        return response()->json($staff);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:cashier,warehouse,warehouse_manager,admin,finance',
            'password' => 'required|string|min:6',
            'is_active' => 'nullable|boolean',
            'pos_pin' => 'nullable|string|size:4|unique:users,pos_pin',
        ]);

        $validated['password'] = bcrypt($validated['password']);
        $validated['is_active'] = $validated['is_active'] ?? true;

        $staff = User::create($validated);

        return response()->json($staff, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $staff = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $staff->id,
            'role' => 'sometimes|required|in:cashier,warehouse,warehouse_manager,admin,finance',
            'is_active' => 'sometimes|boolean',
            'pos_pin' => 'nullable|string|size:4|unique:users,pos_pin,' . $staff->id,
        ]);

        if ($request->filled('password')) {
            $request->validate(['password' => 'string|min:6']);
            $validated['password'] = bcrypt($request->input('password'));
        }

        if ($request->has('pos_pin') && $request->input('pos_pin') === '') {
            $validated['pos_pin'] = null;
        }

        $staff->update($validated);

        return response()->json($staff);
    }

    public function destroy(string $id): JsonResponse
    {
        $staff = User::findOrFail($id);

        if (Auth::id() == $staff->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
        }

        $staff->delete();

        return response()->json(['message' => 'Staff member deleted.']);
    }

    public function toggleActive(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $staff = User::findOrFail($id);
        $staff->update(['is_active' => $request->boolean('is_active')]);

        return response()->json($staff);
    }
}
