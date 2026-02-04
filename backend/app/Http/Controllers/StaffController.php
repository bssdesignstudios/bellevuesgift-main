<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->input('role'));
        }

        $staff = $query->orderBy('name')->get();

        return response()->json($staff);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:admin,cashier,warehouse,warehouse_manager,finance',
            'password' => 'required|string|min:8',
            'is_active' => 'boolean',
        ]);

        $validated['password'] = bcrypt($validated['password']);

        $staff = User::create($validated);

        return response()->json($staff, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'role' => 'required|in:admin,cashier,warehouse,warehouse_manager,finance',
            'is_active' => 'boolean',
        ]);

        $staff = User::findOrFail($id);

        if ($request->has('password') && $request->filled('password')) {
            $validated['password'] = bcrypt($validated['password']);
        }

        $staff->update($validated);

        return response()->json($staff);
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
