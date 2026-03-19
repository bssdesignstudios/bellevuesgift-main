<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminExpenseController extends Controller
{
    public function index()
    {
        return response()->json(Expense::orderBy('date', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'        => 'nullable|string|max:255',
            'vendor_payee' => 'nullable|string|max:255',
            'category'     => 'required|string',
            'amount'       => 'required|numeric|min:0',
            'notes'        => 'nullable|string',
            'date'         => 'required|date',
        ]);

        $staffId = \App\Models\Staff::where('user_id', Auth::id())->value('id');

        $expense = Expense::create([
            ...$validated,
            'staff_id' => $staffId,
        ]);

        return response()->json($expense, 201);
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'title'        => 'nullable|string|max:255',
            'vendor_payee' => 'nullable|string|max:255',
            'category'     => 'required|string',
            'amount'       => 'required|numeric|min:0',
            'notes'        => 'nullable|string',
            'date'         => 'required|date',
        ]);
        $expense->update($validated);
        return response()->json($expense->fresh());
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();
        return response()->json(['message' => 'Expense deleted']);
    }
}
