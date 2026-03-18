<?php

namespace App\Http\Controllers;

use App\Models\TimeLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminTimesheetController extends Controller
{
    public function index(Request $request)
    {
        $query = TimeLog::query()->latest('clock_in');

        if ($request->filled('search')) {
            $s = $request->query('search');
            $query->where(function ($q) use ($s) {
                $q->where('staff_name', 'like', "%{$s}%")
                  ->orWhere('task', 'like', "%{$s}%");
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('clock_in', '>=', $request->query('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('clock_in', '<=', $request->query('date_to'));
        }

        $logs = $query->limit(100)->get();

        $today = Carbon::today();
        $stats = [
            'today_hours'     => (float) TimeLog::whereDate('clock_in', $today)->sum('hours'),
            'active_staff'    => TimeLog::whereNull('clock_out')->count(),
            'pending_reviews' => TimeLog::where('status', 'pending_review')->count(),
            'avg_shift'       => round((float) TimeLog::where('status', 'completed')->avg('hours'), 1),
        ];

        return response()->json(['logs' => $logs, 'stats' => $stats]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'staff_name' => 'required|string|max:255',
            'clock_in'   => 'required|date',
            'clock_out'  => 'nullable|date|after:clock_in',
            'task'       => 'nullable|string|max:255',
            'notes'      => 'nullable|string',
        ]);

        if (!empty($validated['clock_out'])) {
            $in  = Carbon::parse($validated['clock_in']);
            $out = Carbon::parse($validated['clock_out']);
            $validated['hours']  = round($out->diffInMinutes($in) / 60, 2);
            $validated['status'] = 'completed';
        }

        $log = TimeLog::create(array_merge($validated, [
            'staff_id' => auth()->id(),
        ]));

        return response()->json($log, 201);
    }

    public function clockIn(Request $request)
    {
        $request->validate(['task' => 'nullable|string|max:255']);

        $user = auth()->user();
        $log  = TimeLog::create([
            'staff_id'   => $user?->id,
            'staff_name' => $user?->name ?? 'Staff',
            'clock_in'   => now(),
            'task'       => $request->input('task'),
            'status'     => 'in_progress',
        ]);

        return response()->json($log, 201);
    }

    public function clockOut(Request $request, TimeLog $timeLog)
    {
        $out   = now();
        $hours = round($timeLog->clock_in->diffInMinutes($out) / 60, 2);

        $timeLog->update([
            'clock_out' => $out,
            'hours'     => $hours,
            'status'    => 'completed',
        ]);

        return response()->json($timeLog->fresh());
    }

    public function update(Request $request, TimeLog $timeLog)
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:in_progress,completed,pending_review',
            'task'   => 'sometimes|nullable|string|max:255',
            'notes'  => 'sometimes|nullable|string',
            'hours'  => 'sometimes|nullable|numeric|min:0',
        ]);

        $timeLog->update($validated);
        return response()->json($timeLog->fresh());
    }

    public function destroy(TimeLog $timeLog)
    {
        $timeLog->delete();
        return response()->json(null, 204);
    }
}
