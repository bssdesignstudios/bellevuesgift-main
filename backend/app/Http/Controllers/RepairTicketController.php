<?php
/**
 * Role: Builder
 * Rationale: Handle Repair Tickets (submission, status check, POS operations).
 */

namespace App\Http\Controllers;

use App\Models\RepairTicket;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RepairTicketController extends Controller
{
    /**
     * Store a new repair ticket.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string',
            'phone' => 'required|string',
            'email' => 'nullable|email',
            'preferred_contact' => 'required|string',
            'service_type' => 'required|string',
            'item_make' => 'nullable|string',
            'model_number' => 'nullable|string',
            'serial_number' => 'nullable|string',
            'problem_description' => 'required|string',
            'dropoff_method' => 'required|string',
            'requested_date' => 'nullable|date',
            'deposit_required' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $ticketNumber = 'RPR-' . date('Y') . '-' . strtoupper(Str::random(6));

        $ticket = RepairTicket::create([
            'ticket_number' => $ticketNumber,
            ...$validated
        ]);

        return response()->json($ticket, 201);
    }

    /**
     * Check status of a ticket.
     */
    public function show(Request $request)
    {
        $validated = $request->validate([
            'ticket_number' => 'required|string',
        ]);

        $ticket = RepairTicket::where('ticket_number', strtoupper($validated['ticket_number']))->first();

        if (!$ticket) {
            return response()->json(['message' => 'Ticket not found'], 404);
        }

        return response()->json($ticket);
    }

    /**
     * Search for a repair ticket by ticket number (POS).
     *
     * GET /api/pos/repairs/search?ticket_number=XXX
     */
    public function search(Request $request)
    {
        $validated = $request->validate([
            'ticket_number' => 'required|string',
        ]);

        $ticket = RepairTicket::where('ticket_number', 'LIKE', '%' . strtoupper($validated['ticket_number']) . '%')
            ->first();

        if (!$ticket) {
            return response()->json(['message' => 'Repair ticket not found'], 404);
        }

        return response()->json([
            'ticket' => $ticket,
            'can_complete' => in_array($ticket->status, ['in_progress', 'ready', 'submitted']),
            'needs_deposit' => $ticket->deposit_required && !$ticket->deposit_paid,
            'is_completed' => $ticket->status === 'completed',
        ]);
    }

    /**
     * Mark a repair ticket as completed/picked up.
     * Uses DB::transaction with lockForUpdate to prevent concurrent operations.
     *
     * POST /api/pos/repairs/complete
     */
    public function complete(Request $request)
    {
        $validated = $request->validate([
            'ticket_id' => 'required|uuid|exists:repair_tickets,id',
            'staff_id' => 'required|uuid',
            'payment_method' => 'required|string',
            'amount' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated) {
            $ticket = RepairTicket::where('id', $validated['ticket_id'])
                ->lockForUpdate()
                ->first();

            if (!$ticket) {
                throw ValidationException::withMessages([
                    'ticket_id' => 'Repair ticket not found'
                ]);
            }

            if ($ticket->status === 'completed') {
                throw ValidationException::withMessages([
                    'ticket_id' => 'This repair ticket is already completed'
                ]);
            }

            // Mark as completed
            $ticket->status = 'completed';
            $ticket->payment_status = 'paid';
            $ticket->total_cost = $validated['amount'];
            $ticket->save();

            return response()->json([
                'success' => true,
                'message' => 'Repair ticket completed',
                'ticket' => $ticket->fresh(),
            ]);
        });
    }

    /**
     * Collect deposit for a repair ticket.
     *
     * POST /api/pos/repairs/collect-deposit
     */
    public function collectDeposit(Request $request)
    {
        $validated = $request->validate([
            'ticket_id' => 'required|uuid|exists:repair_tickets,id',
            'staff_id' => 'required|uuid',
            'payment_method' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
        ]);

        return DB::transaction(function () use ($validated) {
            $ticket = RepairTicket::where('id', $validated['ticket_id'])
                ->lockForUpdate()
                ->first();

            if (!$ticket) {
                throw ValidationException::withMessages([
                    'ticket_id' => 'Repair ticket not found'
                ]);
            }

            if ($ticket->deposit_paid) {
                throw ValidationException::withMessages([
                    'ticket_id' => 'Deposit has already been collected for this ticket'
                ]);
            }

            $ticket->deposit_paid = true;
            $ticket->deposit_amount = $validated['amount'];
            $ticket->save();

            return response()->json([
                'success' => true,
                'message' => 'Deposit collected successfully',
                'ticket' => $ticket->fresh(),
            ]);
        });
    }
}

