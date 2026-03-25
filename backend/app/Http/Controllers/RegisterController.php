<?php

namespace App\Http\Controllers;

use App\Models\Register;
use App\Models\RegisterSession;
use App\Models\User;
use App\Models\PosActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use Illuminate\Http\Request;

class RegisterController extends Controller
{
    public function index()
    {
        $registers = Register::with(['assignedStaff' => function ($q) {
            $q->select('users.id', 'users.name', 'users.email', 'users.role');
        }, 'activeSession'])
            ->orderBy('name')
            ->get();

        $today = Carbon::today();

        return response()->json($registers->map(function ($reg) use ($today) {
            $data = $reg->toArray();

            // Today's operational metrics
            $todayOrders = \App\Models\Order::where('register_id', $reg->id)
                ->whereDate('created_at', $today)
                ->where('payment_status', 'paid')
                ->get();

            $data['today_sales'] = $todayOrders->sum('total');
            $data['today_orders'] = $todayOrders->count();

            $lastOrder = \App\Models\Order::where('register_id', $reg->id)
                ->orderByDesc('created_at')
                ->first();
            $data['last_transaction_at'] = $lastOrder?->created_at;

            if ($reg->activeSession) {
                $openedAt = Carbon::parse($reg->activeSession->opened_at);
                $data['session_duration_minutes'] = (int) $openedAt->diffInMinutes(now());
            } else {
                $data['session_duration_minutes'] = null;
            }

            return $data;
        }));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:registers,name',
            'location' => 'nullable|string|max:255',
        ]);

        $register = Register::create([
            'name' => $validated['name'],
            'location' => $validated['location'] ?? 'Freeport Store',
            'is_active' => true,
        ]);

        return response()->json($register->load('assignedStaff'), 201);
    }

    public function update(Request $request, $id)
    {
        $register = Register::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:registers,name,' . $register->id,
            'location' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $register->update($validated);

        return response()->json($register->load('assignedStaff'));
    }

    public function assignStaff(Request $request, $id)
    {
        $register = Register::findOrFail($id);

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $register->assignedStaff()->sync($validated['user_ids']);

        return response()->json($register->load('assignedStaff'));
    }

    /**
     * Fetch activity logs for a specific register (for admin dashboard).
     */
    public function activityLogs(Request $request, $id)
    {
        $register = Register::findOrFail($id);

        $activityLogs = [];

        // POS activity logs (session open/close events)
        if (Schema::hasTable('pos_activity_logs')) {
            $activityLogs = PosActivityLog::where('register_id', $register->id)
                ->orderByDesc('created_at')
                ->limit(50)
                ->get()
                ->map(function ($log) {
                    return [
                        'type'       => 'activity',
                        'action'     => $log->action,
                        'details'    => $log->details,
                        'staff_id'   => $log->staff_id,
                        'staff_name' => optional($log->staff)->name ?? 'Unknown',
                        'occurred_at'=> $log->created_at?->toIso8601String(),
                    ];
                })
                ->toArray();
        }

        // Cashier change logs (switch_in, switch_out, force_close)
        $cashierLogs = [];
        if (Schema::hasTable('pos_cashier_logs')) {
            $sessionIds = RegisterSession::where('register_id', $register->id)
                ->pluck('id');

            $cashierLogs = DB::table('pos_cashier_logs')
                ->join('users', 'users.id', '=', 'pos_cashier_logs.user_id')
                ->whereIn('pos_cashier_logs.register_session_id', $sessionIds)
                ->select(
                    'pos_cashier_logs.action',
                    'pos_cashier_logs.notes',
                    'pos_cashier_logs.acted_at as occurred_at',
                    'users.name as staff_name'
                )
                ->orderByDesc('pos_cashier_logs.acted_at')
                ->limit(50)
                ->get()
                ->map(function ($log) {
                    return [
                        'type'       => 'cashier',
                        'action'     => $log->action,
                        'details'    => $log->notes ? ['notes' => $log->notes] : null,
                        'staff_name' => $log->staff_name,
                        'occurred_at'=> $log->occurred_at,
                    ];
                })
                ->toArray();
        }

        // Merge and sort all logs by occurred_at desc
        $merged = array_merge($activityLogs, $cashierLogs);
        usort($merged, fn ($a, $b) => strcmp($b['occurred_at'] ?? '', $a['occurred_at'] ?? ''));

        // Session history
        $sessions = RegisterSession::where('register_id', $register->id)
            ->orderByDesc('opened_at')
            ->limit(20)
            ->get()
            ->map(function ($s) {
                return [
                    'id'              => $s->id,
                    'opened_at'       => $s->opened_at?->toIso8601String(),
                    'closed_at'       => $s->closed_at?->toIso8601String(),
                    'opening_balance' => (float) $s->opening_balance,
                    'closing_balance' => (float) ($s->closing_balance ?? 0),
                    'status'          => $s->status ?? ($s->closed_at ? 'closed' : 'open'),
                ];
            });

        return response()->json([
            'logs'     => array_slice($merged, 0, 50),
            'sessions' => $sessions,
        ]);
    }

    /**
     * Admin force-close a register session (no cashier needed).
     */
    public function forceClose(Request $request, $id)
    {
        $validated = $request->validate([
            'admin_pin' => 'required|string',
        ]);

        $admin = User::where('pos_pin', $validated['admin_pin'])
            ->whereIn('role', ['admin', 'manager', 'super_admin'])
            ->first();

        if (!$admin) {
            return response()->json(['message' => 'Invalid Admin PIN'], 403);
        }

        $register = Register::findOrFail($id);
        $session  = RegisterSession::where('register_id', $register->id)
            ->whereNull('closed_at')
            ->latest('opened_at')
            ->first();

        if (!$session) {
            return response()->json(['message' => 'No active session found for this register'], 404);
        }

        $updateData = ['closed_at' => Carbon::now()];
        if (Schema::hasColumn('register_sessions', 'status'))          $updateData['status']             = 'closed';
        if (Schema::hasColumn('register_sessions', 'closed_by_user_id')) $updateData['closed_by_user_id'] = $admin->id;

        $session->update($updateData);

        if (Schema::hasTable('pos_cashier_logs')) {
            DB::table('pos_cashier_logs')->insert([
                'id'                  => (string) \Illuminate\Support\Str::uuid(),
                'register_session_id' => $session->id,
                'user_id'             => $admin->id,
                'action'              => 'force_close',
                'acted_at'            => Carbon::now(),
                'notes'               => 'Force closed from Admin Dashboard.',
                'created_at'          => Carbon::now(),
                'updated_at'          => Carbon::now(),
            ]);
        }

        return response()->json(['message' => 'Register session force-closed.', 'session_id' => $session->id]);
    }
}
