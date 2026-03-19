<?php

namespace App\Http\Controllers;

use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminTimesheetController extends Controller
{
    public function index(Request $request)
    {
        $query = Timesheet::with('user')->orderBy('date', 'desc')->orderBy('clock_in', 'desc');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->query('date_to'));
        }

        if ($request->filled('search')) {
            $s = $request->query('search');
            $query->where(function ($q) use ($s) {
                $q->where('task', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%")
                  ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$s}%"));
            });
        }

        $perPage = min((int) $request->query('per_page', 50), 200);

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'   => 'required|exists:users,id',
            'date'      => 'required|date',
            'clock_in'  => 'required|date_format:H:i',
            'clock_out' => 'nullable|date_format:H:i|after:clock_in',
            'task'      => 'nullable|string|max:255',
            'notes'     => 'nullable|string',
            'hours'     => 'nullable|numeric|min:0',
        ]);

        // Auto-compute hours if not provided and clock_out is given
        if (!isset($validated['hours']) && isset($validated['clock_out'])) {
            $in  = \Carbon\Carbon::parse($validated['date'] . ' ' . $validated['clock_in']);
            $out = \Carbon\Carbon::parse($validated['date'] . ' ' . $validated['clock_out']);
            $validated['hours'] = round($out->diffInMinutes($in) / 60, 2);
        }

        $timesheet = Timesheet::create($validated);

        return response()->json($timesheet->load('user'), 201);
    }

    public function update(Request $request, Timesheet $timesheet)
    {
        $validated = $request->validate([
            'user_id'   => 'sometimes|exists:users,id',
            'date'      => 'sometimes|date',
            'clock_in'  => 'sometimes|date_format:H:i',
            'clock_out' => 'sometimes|nullable|date_format:H:i',
            'task'      => 'sometimes|nullable|string|max:255',
            'notes'     => 'sometimes|nullable|string',
            'hours'     => 'sometimes|nullable|numeric|min:0',
        ]);

        // Re-compute hours if times changed
        $date    = $validated['date']      ?? $timesheet->date->format('Y-m-d');
        $clockIn = $validated['clock_in']  ?? $timesheet->clock_in;
        $clockOut = $validated['clock_out'] ?? $timesheet->clock_out;

        if (!isset($validated['hours']) && $clockIn && $clockOut) {
            $in  = \Carbon\Carbon::parse($date . ' ' . $clockIn);
            $out = \Carbon\Carbon::parse($date . ' ' . $clockOut);
            $validated['hours'] = round($out->diffInMinutes($in) / 60, 2);
        }

        $timesheet->update($validated);

        return response()->json($timesheet->load('user'));
    }

    public function destroy(Timesheet $timesheet)
    {
        $timesheet->delete();
        return response()->json(null, 204);
    }

    /**
     * Return staff users for the searchable dropdown.
     */
    public function staff()
    {
        $staff = User::whereNotIn('role', ['customer'])
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'role', 'email']);

        return response()->json($staff);
    }
}
