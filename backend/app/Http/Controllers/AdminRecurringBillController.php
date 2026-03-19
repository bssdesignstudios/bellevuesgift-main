<?php
namespace App\Http\Controllers;

use App\Models\RecurringBill;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class AdminRecurringBillController extends Controller
{
    public function index()
    {
        $bills = RecurringBill::orderBy('next_due_date', 'asc')->get()->map(function ($bill) {
            $data = $bill->toArray();
            $data['is_overdue'] = $bill->is_active && Carbon::parse($bill->next_due_date)->isPast();
            return $data;
        });

        $stats = [
            'total_monthly' => $this->monthlyEquivalent(),
            'active_count'  => RecurringBill::where('is_active', true)->count(),
            'overdue_count' => RecurringBill::where('is_active', true)
                                  ->where('next_due_date', '<', Carbon::today())
                                  ->count(),
        ];

        return response()->json(['bills' => $bills, 'stats' => $stats]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'vendor_payee'  => 'nullable|string|max:255',
            'amount'        => 'required|numeric|min:0.01',
            'billing_cycle' => 'required|in:weekly,monthly,quarterly,yearly',
            'next_due_date' => 'required|date',
            'category'      => 'nullable|string|max:100',
            'notes'         => 'nullable|string',
            'is_active'     => 'boolean',
        ]);

        $bill = RecurringBill::create([
            ...$validated,
            'created_by' => Auth::id(),
        ]);

        return response()->json($bill, 201);
    }

    public function update(Request $request, RecurringBill $recurringBill)
    {
        $validated = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'vendor_payee'  => 'nullable|string|max:255',
            'amount'        => 'sometimes|numeric|min:0.01',
            'billing_cycle' => 'sometimes|in:weekly,monthly,quarterly,yearly',
            'next_due_date' => 'sometimes|date',
            'category'      => 'nullable|string|max:100',
            'notes'         => 'nullable|string',
            'is_active'     => 'boolean',
        ]);

        $recurringBill->update($validated);
        return response()->json($recurringBill->fresh());
    }

    public function destroy(RecurringBill $recurringBill)
    {
        $recurringBill->delete();
        return response()->json(null, 204);
    }

    public function markPaid(RecurringBill $recurringBill)
    {
        // Advance the next_due_date by one billing cycle
        $next = Carbon::parse($recurringBill->next_due_date);
        $next = match($recurringBill->billing_cycle) {
            'weekly'    => $next->addWeek(),
            'monthly'   => $next->addMonth(),
            'quarterly' => $next->addMonths(3),
            'yearly'    => $next->addYear(),
            default     => $next->addMonth(),
        };

        $recurringBill->update(['next_due_date' => $next->toDateString()]);
        return response()->json($recurringBill->fresh());
    }

    private function monthlyEquivalent(): float
    {
        $bills = RecurringBill::where('is_active', true)->get();
        $total = $bills->sum(function ($bill) {
            return match($bill->billing_cycle) {
                'weekly'    => $bill->amount * 4.33,
                'monthly'   => $bill->amount,
                'quarterly' => $bill->amount / 3,
                'yearly'    => $bill->amount / 12,
                default     => $bill->amount,
            };
        });
        return round((float) $total, 2);
    }
}
