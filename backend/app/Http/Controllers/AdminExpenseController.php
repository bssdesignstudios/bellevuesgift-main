<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Staff;
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

        // expenses.staff_id is a UUID FK to the staff table; look up the staff record for the current user
        $staffId = Staff::where('user_id', Auth::id())->value('id');

        $expense = Expense::create([
            ...$validated,
            'staff_id' => $staffId,
        ]);

        return response()->json($expense, 201);
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();
        return response()->json(['message' => 'Expense deleted']);
    }
}
