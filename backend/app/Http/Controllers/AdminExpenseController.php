<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminExpenseController extends Controller
{
    public function index()
    {
        return response()->json(Expense::with('staff')->orderBy('date', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'date' => 'required|date',
        ]);

        $expense = Expense::create([
            ...$validated,
            'staff_id' => Auth::id(),
        ]);

        return response()->json($expense, 201);
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();
        return response()->json(['message' => 'Expense deleted']);
    }
}
