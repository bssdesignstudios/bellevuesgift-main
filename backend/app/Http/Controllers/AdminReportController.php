<?php
/**
 * Role: Builder
 * Rationale: Handle Admin Reports.
 */

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $days = (int) $request->query('days', 7);
        $start = Carbon::now()->subDays($days)->startOfDay();
        $end = Carbon::now()->endOfDay();

        $stats = [
            'total_sales' => Order::whereBetween('created_at', [$start, $end])->where('payment_status', 'paid')->sum('total'),
            'order_count' => Order::whereBetween('created_at', [$start, $end])->where('payment_status', 'paid')->count(),
            'avg_order_value' => Order::whereBetween('created_at', [$start, $end])->where('payment_status', 'paid')->avg('total') ?? 0,

            'daily_sales' => Order::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('sum(total) as sales'),
                DB::raw('count(*) as orders'),
                DB::raw('sum(vat_amount) as vat')
            )
                ->whereBetween('created_at', [$start, $end])
                ->where('payment_status', 'paid')
                ->groupBy('date')
                ->get()
                ->map(function ($item) {
                    $item->date = Carbon::parse($item->date)->format('MMM d');
                    return $item;
                }),

            'cashier_sales' => Order::with('staff')
                ->select('staff_id', DB::raw('sum(total) as total'), DB::raw('count(*) as count'))
                ->whereBetween('created_at', [$start, $end])
                ->where('channel', 'pos')
                ->where('payment_status', 'paid')
                ->groupBy('staff_id')
                ->get()
                ->map(function ($item) {
                    return [
                        'name' => $item->staff->name ?? 'Unknown',
                        'total' => $item->total,
                        'count' => $item->count
                    ];
                }),

            'top_products' => OrderItem::with('product')
                ->select('product_id', DB::raw('sum(qty) as total_qty'), DB::raw('sum(line_total) as total_revenue'))
                ->whereBetween('created_at', [$start, $end])
                ->groupBy('product_id')
                ->orderByDesc('total_qty')
                ->limit(10)
                ->get(),

            'register_sales' => Order::with('register:id,name')
                ->select('register_id', DB::raw('sum(total) as total'), DB::raw('count(*) as count'))
                ->whereBetween('created_at', [$start, $end])
                ->where('channel', 'pos')
                ->where('payment_status', 'paid')
                ->whereNotNull('register_id')
                ->groupBy('register_id')
                ->get()
                ->map(function ($item) {
                    return [
                        'register' => $item->register->name ?? 'Unknown',
                        'total' => $item->total,
                        'count' => $item->count,
                    ];
                }),
        ];

        return response()->json($stats);
    }
}
