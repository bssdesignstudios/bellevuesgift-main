<?php

namespace App\Http\Controllers;

use App\Models\RepairTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminRepairTicketController extends Controller
{
    public function index(Request $request)
    {
        $query = RepairTicket::orderBy('created_at', 'desc');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return response()->json($query->limit(200)->get());
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status'   => 'sometimes|string',
            'eta_date' => 'sometimes|nullable|date',
            'notes'    => 'sometimes|nullable|string',
        ]);

        $ticket = RepairTicket::findOrFail($id);
        $ticket->update(array_filter($validated, fn($v) => $v !== null));

        return response()->json($ticket->fresh());
    }

    public function tasks($id)
    {
        $tasks = DB::table('repair_tasks')
            ->where('ticket_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($tasks);
    }

    public function addTask(Request $request, $id)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|uuid',
        ]);

        $uuid = (string) Str::uuid();

        DB::table('repair_tasks')->insert([
            'id'          => $uuid,
            'ticket_id'   => $id,
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'assigned_to' => $validated['assigned_to'] ?? null,
            'status'      => 'todo',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $task = DB::table('repair_tasks')->where('id', $uuid)->first();

        return response()->json($task, 201);
    }

    public function updateTask(Request $request, $id, $taskId)
    {
        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        DB::table('repair_tasks')
            ->where('id', $taskId)
            ->update([
                'status'     => $validated['status'],
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'Updated']);
    }

    public function staff()
    {
        $staff = DB::table('users')
            ->where('is_active', true)
            ->select('id', 'name', 'role')
            ->get();

        return response()->json($staff);
    }

    /**
     * Update billing details (labour, parts, deposit) for a ticket.
     * Automatically recalculates total_cost.
     */
    public function updateBilling(Request $request, $id)
    {
        $validated = $request->validate([
            'labor_hours'    => 'nullable|numeric|min:0',
            'labor_rate'     => 'nullable|numeric|min:0',
            'parts_cost'     => 'nullable|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'deposit_paid'   => 'nullable|boolean',
        ]);

        $ticket = RepairTicket::findOrFail($id);

        $laborHours = $validated['labor_hours'] ?? $ticket->labor_hours ?? 0;
        $laborRate  = $validated['labor_rate']  ?? $ticket->labor_rate  ?? 0;
        $partsCost  = $validated['parts_cost']  ?? $ticket->parts_cost  ?? 0;
        $totalCost  = ($laborHours * $laborRate) + $partsCost;

        $ticket->update(array_merge($validated, ['total_cost' => $totalCost]));

        return response()->json($ticket->fresh());
    }

    /**
     * List payments recorded against this repair ticket.
     */
    public function listPayments($id)
    {
        RepairTicket::findOrFail($id);

        $payments = DB::table('payments')
            ->where('repair_ticket_id', $id)
            ->select('id', 'amount', 'method as payment_method', 'note', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($payments);
    }

    /**
     * Record a payment (deposit or final) against a repair ticket.
     */
    public function recordPayment(Request $request, $id)
    {
        $ticket = RepairTicket::findOrFail($id);

        $validated = $request->validate([
            'amount'         => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:cash,card,gift_card,check',
            'note'           => 'nullable|string',
        ]);

        $paymentId = (string) Str::uuid();

        DB::table('payments')->insert([
            'id'               => $paymentId,
            'repair_ticket_id' => $id,
            'order_id'         => null,
            'amount'           => $validated['amount'],
            'method'           => $validated['payment_method'],
            'status'           => 'completed',
            'note'             => $validated['note'] ?? null,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        // Auto-mark deposit as paid if total paid >= deposit amount
        if ($ticket->deposit_amount > 0 && !$ticket->deposit_paid) {
            $totalPaid = DB::table('payments')
                ->where('repair_ticket_id', $id)
                ->sum('amount');
            if ($totalPaid >= $ticket->deposit_amount) {
                $ticket->update(['deposit_paid' => true]);
            }
        }

        return response()->json([
            'message'    => 'Payment recorded',
            'payment_id' => $paymentId,
            'ticket'     => $ticket->fresh(),
        ], 201);
    }
}
