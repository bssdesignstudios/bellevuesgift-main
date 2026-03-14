<?php

namespace App\Http\Controllers;

use App\Models\RepairTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
                $q->where('ticket_number', 'ilike', "%{$search}%")
                  ->orWhere('customer_name', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->limit(200)->get());
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        $ticket = RepairTicket::findOrFail($id);
        $ticket->update(['status' => $validated['status']]);

        return response()->json($ticket->fresh());
    }

    public function tasks($id)
    {
        $tasks = DB::table('repair_tasks')
            ->where('repair_ticket_id', $id)
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

        $task = DB::table('repair_tasks')->insertGetId([
            'id' => \Illuminate\Support\Str::uuid(),
            'repair_ticket_id' => $id,
            'description' => $validated['description'],
            'assigned_to' => $validated['assigned_to'] ?? null,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $task], 201);
    }

    public function updateTask(Request $request, $id, $taskId)
    {
        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        DB::table('repair_tasks')
            ->where('id', $taskId)
            ->update([
                'status' => $validated['status'],
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
}
