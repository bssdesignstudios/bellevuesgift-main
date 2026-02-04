<?php
/**
 * Role: Builder
 * Rationale: Handle Repair Tickets (submission and status check).
 */

namespace App\Http\Controllers;

use App\Models\RepairTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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
}
