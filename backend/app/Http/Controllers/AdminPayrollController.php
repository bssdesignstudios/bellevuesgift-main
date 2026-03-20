<?php

namespace App\Http\Controllers;

use App\Models\PayrollLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminPayrollController extends Controller
{
    public function index(Request $request)
    {
        $query = PayrollLog::with(['user', 'approver'])
            ->orderBy('pay_period_end', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        return response()->json($query->get());
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
            'status' => 'pending',
        ]);

        return response()->json($payroll->load(['user', 'approver']), 201);
    }

    public function approve(PayrollLog $payroll)
    {
        if ($payroll->status !== 'pending') {
            return response()->json(['message' => 'Only pending payroll can be approved.'], 422);
        }

        $payroll->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
        ]);

        return response()->json($payroll->load(['user', 'approver']));
    }

    public function markPaid(PayrollLog $payroll)
    {
        if ($payroll->status !== 'approved') {
            return response()->json(['message' => 'Only approved payroll can be marked as paid.'], 422);
        }

        $payroll->update([
            'status' => 'paid',
        ]);

        return response()->json($payroll->load(['user', 'approver']));
    }
}
