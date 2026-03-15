<?php

namespace App\Http\Controllers;

use App\Models\Register;
use App\Models\User;
use Illuminate\Http\Request;

class RegisterController extends Controller
{
    public function index()
    {
        $registers = Register::with(['assignedStaff' => function ($q) {
            $q->select('users.id', 'users.name', 'users.email', 'users.role');
        }, 'activeSession'])
            ->orderBy('name')
            ->get();

        return response()->json($registers);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:registers,name',
            'location' => 'nullable|string|max:255',
        ]);

        $register = Register::create([
            'name' => $validated['name'],
            'location' => $validated['location'] ?? 'Freeport Store',
            'is_active' => true,
        ]);

        return response()->json($register->load('assignedStaff'), 201);
    }

    public function update(Request $request, $id)
    {
        $register = Register::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:registers,name,' . $register->id,
            'location' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $register->update($validated);

        return response()->json($register->load('assignedStaff'));
    }

    public function assignStaff(Request $request, $id)
    {
        $register = Register::findOrFail($id);

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $register->assignedStaff()->sync($validated['user_ids']);

        return response()->json($register->load('assignedStaff'));
    }
}
