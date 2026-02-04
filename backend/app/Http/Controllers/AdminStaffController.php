<?php
/**
 * Role: Builder
 * Rationale: Handle Staff management in the Laravel backend.
 */

namespace App\Http\Controllers;

use App\Models\Staff;
use Illuminate\Http\Request;

class AdminStaffController extends Controller
{
    public function index()
    {
        return response()->json(Staff::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:staff,email',
            'role' => 'required|in:cashier,warehouse,warehouse_manager,admin,finance',
            'is_active' => 'nullable|boolean',
        ]);

        $staff = Staff::create($validated);

        return response()->json($staff, 201);
    }

    public function update(Request $request, Staff $staff)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:staff,email,' . $staff->id,
            'role' => 'sometimes|required|in:cashier,warehouse,warehouse_manager,admin,finance',
            'is_active' => 'sometimes|required|boolean',
        ]);

        $staff->update($validated);

        return response()->json($staff);
    }
}
