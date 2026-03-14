<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class AdminStaffController extends Controller
{
    public function index(): JsonResponse
    {
        $staff = User::where('role', '!=', 'customer')
            ->orderBy('name')
            ->get();

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
        ]);

        if ($request->filled('password')) {
            $request->validate(['password' => 'string|min:6']);
            $validated['password'] = bcrypt($request->input('password'));
        }

        $staff->update($validated);

        return response()->json($staff);
    }

    public function destroy(string $id): JsonResponse
    {
        $staff = User::findOrFail($id);

        // Prevent deleting yourself
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
