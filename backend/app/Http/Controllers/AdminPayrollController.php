<?php

namespace App\Http\Controllers;

use App\Models\PayrollLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminPayrollController extends Controller
{
    public function index()
    {
        return response()->json(PayrollLog::with(['user', 'approver'])->orderBy('pay_period_end', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'          => 'required|exists:users,id',
            'amount'           => 'required|numeric|min:0',
            'pay_period_start' => 'required|date',
            'pay_period_end'   => 'required|date|after_or_equal:pay_period_start',
            'total_hours'      => 'nullable|numeric|min:0',
            'pay_rate'         => 'nullable|numeric|min:0',
            'gross_pay'        => 'nullable|numeric|min:0',
            'notes'            => 'nullable|string',
        ]);

        $payroll = PayrollLog::create([
            ...$validated,
            'status' => $validated['status'] ?? 'pending',
        ]);

        return response()->json($payroll, 201);
    }

    public function approve(PayrollLog $payroll)
    {
        $payroll->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
        ]);

        return response()->json($payroll);
    }
}
