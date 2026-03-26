<?php

namespace App\Http\Controllers;

use App\Models\RepairTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminRepairTicketController extends Controller
{
    // ─── Listing ────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = RepairTicket::orderBy('created_at', 'desc');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('technician') && $request->technician !== 'all') {
            $query->where('assigned_staff_id', $request->technician);
        }

        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'ilike', "%{$search}%")
                  ->orWhere('customer_name', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->limit(200)->get());
    }

    // ─── Walk-in Intake ─────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name'       => 'required|string|max:255',
            'phone'               => 'required|string|max:50',
            'email'               => 'nullable|email|max:255',
            'device_type'         => 'nullable|string|max:100',
            'item_make'           => 'nullable|string|max:100',
            'model_number'        => 'nullable|string|max:100',
            'serial_number'       => 'nullable|string|max:100',
            'problem_description' => 'required|string',
            'accessories'         => 'nullable|string',
            'condition_notes'     => 'nullable|string',
            'estimated_cost'      => 'nullable|numeric|min:0',
            'internal_notes'      => 'nullable|string',
            'priority'            => 'nullable|in:low,normal,urgent',
        ]);

        $ticketNumber = 'RPR-' . date('Y') . '-' . strtoupper(Str::random(6));

        $ticket = RepairTicket::create([
            ...$validated,
            'ticket_number'    => $ticketNumber,
            'status'           => 'received',
            'intake_source'    => 'walk-in',
            'priority'         => $validated['priority'] ?? 'normal',
            'created_by'       => $request->user()?->id,
            'preferred_contact' => 'phone',
            'service_type'     => 'repair',
        ]);

        return response()->json($ticket, 201);
    }

    // ─── Single Ticket ───────────────────────────────────────────────────────────

    public function show($id)
    {
        $ticket = RepairTicket::findOrFail($id);

        if ($ticket->assigned_staff_id) {
            $ticket->assigned_technician = DB::table('staff')
                ->where('id', $ticket->assigned_staff_id)
                ->select('id', 'name')
                ->first();
        } else {
            $ticket->assigned_technician = null;
        }

        return response()->json($ticket);
    }

    // ─── Full Update ─────────────────────────────────────────────────────────────

    public function update(Request $request, $id)
    {
        $ticket = RepairTicket::findOrFail($id);

        $validated = $request->validate([
            'status'            => 'nullable|string',
            'assigned_staff_id' => 'nullable|uuid|exists:staff,id',
            'estimated_cost'    => 'nullable|numeric|min:0',
            'total_cost'        => 'nullable|numeric|min:0',
            'labor_hours'       => 'nullable|numeric|min:0',
            'labor_rate'        => 'nullable|numeric|min:0',
            'parts_cost'        => 'nullable|numeric|min:0',
            'eta_date'          => 'nullable|date',
            'notes'             => 'nullable|string',
            'internal_notes'    => 'nullable|string',
            'priority'          => 'nullable|in:low,normal,urgent',
        ]);

        // Track technician assignment timestamp
        if (
            !empty($validated['assigned_staff_id']) &&
            $validated['assigned_staff_id'] !== $ticket->assigned_staff_id
        ) {
            $validated['assigned_at'] = now();

            DB::table('repair_ticket_logs')->insert([
                'id'               => (string) Str::uuid(),
                'repair_ticket_id' => $ticket->id,
                'user_id'          => $request->user()?->id,
                'action'           => 'technician_assigned',
                'details'          => json_encode(['assigned_staff_id' => $validated['assigned_staff_id']]),
                'created_at'       => now(),
            ]);
        }

        // Log status change
        if (!empty($validated['status']) && $validated['status'] !== $ticket->status) {
            DB::table('repair_ticket_logs')->insert([
                'id'               => (string) Str::uuid(),
                'repair_ticket_id' => $ticket->id,
                'user_id'          => $request->user()?->id,
                'action'           => 'status_changed',
                'details'          => json_encode(['from' => $ticket->status, 'to' => $validated['status']]),
                'created_at'       => now(),
            ]);
        }

        $ticket->update(array_filter($validated, fn($v) => $v !== null));

        return response()->json($ticket->fresh());
    }

    // ─── Status-only Update (preserves existing frontend call) ──────────────────

    public function updateStatus(Request $request, $id)
    {
        $ticket = RepairTicket::findOrFail($id);

        $validated = $request->validate([
            'status'   => 'nullable|string',
            'eta_date' => 'nullable|date',
            'notes'    => 'nullable|string',
        ]);

        if (!empty($validated['status']) && $validated['status'] !== $ticket->status) {
            DB::table('repair_ticket_logs')->insert([
                'id'               => (string) Str::uuid(),
                'repair_ticket_id' => $ticket->id,
                'user_id'          => $request->user()?->id,
                'action'           => 'status_changed',
                'details'          => json_encode(['from' => $ticket->status, 'to' => $validated['status']]),
                'created_at'       => now(),
            ]);
        }

        $ticket->update(array_filter($validated, fn($v) => $v !== null));

        return response()->json($ticket->fresh());
    }

    // ─── Payment ─────────────────────────────────────────────────────────────────

    public function recordPayment(Request $request, $id)
    {
        $ticket = RepairTicket::findOrFail($id);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:cash,card,gift_card',
            'notes'  => 'nullable|string',
        ]);

        $newAmountPaid = (float) $ticket->amount_paid + (float) $validated['amount'];
        $total = max((float) ($ticket->total_cost ?? 0), (float) ($ticket->estimated_cost ?? 0), 0.01);
        $paymentStatus = $newAmountPaid >= $total ? 'paid' : 'partial';

        $ticket->update([
            'amount_paid'    => $newAmountPaid,
            'payment_status' => $paymentStatus,
        ]);

        if ($paymentStatus === 'paid' && !in_array($ticket->status, ['completed', 'cancelled'])) {
            $ticket->update(['status' => 'completed']);
        }

        DB::table('repair_ticket_logs')->insert([
            'id'               => (string) Str::uuid(),
            'repair_ticket_id' => $ticket->id,
            'user_id'          => $request->user()?->id,
            'action'           => 'payment_recorded',
            'details'          => json_encode([
                'amount'         => $validated['amount'],
                'method'         => $validated['method'],
                'payment_status' => $paymentStatus,
                'notes'          => $validated['notes'] ?? null,
            ]),
            'created_at' => now(),
        ]);

        return response()->json($ticket->fresh());
    }

    // ─── Logs / Timeline ─────────────────────────────────────────────────────────

    public function logs($id)
    {
        $logs = DB::table('repair_ticket_logs')
            ->where('repair_ticket_id', $id)
            ->leftJoin('users', 'users.id', '=', 'repair_ticket_logs.user_id')
            ->select(
                'repair_ticket_logs.id',
                'repair_ticket_logs.action',
                'repair_ticket_logs.details',
                'repair_ticket_logs.created_at',
                'users.name as user_name'
            )
            ->orderBy('repair_ticket_logs.created_at', 'desc')
            ->get()
            ->map(function ($row) {
                $row->details = json_decode($row->details, true);
                return $row;
            });

        return response()->json($logs);
    }

    // ─── Tasks ───────────────────────────────────────────────────────────────────

    public function tasks($id)
    {
        // Column is ticket_id (from ops_and_pos migration) — was incorrectly repair_ticket_id
        $tasks = DB::table('repair_tasks')
            ->where('ticket_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($tasks);
    }

    public function addTask(Request $request, $id)
    {
        $validated = $request->validate([
            'description' => 'required|string',
            'assigned_to' => 'nullable|uuid',
        ]);

        DB::table('repair_tasks')->insert([
            'id'          => (string) Str::uuid(),
            'ticket_id'   => $id,               // fixed: was repair_ticket_id
            'title'       => substr($validated['description'], 0, 100),
            'description' => $validated['description'],
            'assigned_to' => $validated['assigned_to'] ?? null,
            'status'      => 'todo',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json(['message' => 'Task added'], 201);
    }

    public function updateTask(Request $request, $id, $taskId)
    {
        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        DB::table('repair_tasks')
            ->where('id', $taskId)
            ->update(['status' => $validated['status'], 'updated_at' => now()]);

        return response()->json(['message' => 'Updated']);
    }

    // ─── Staff list for technician assignment ────────────────────────────────────

    public function staff()
    {
        $staff = DB::table('staff')
            ->where('is_active', true)
            ->select('id', 'name', 'role')
            ->orderBy('name')
            ->get();

        return response()->json($staff);
    }
}
