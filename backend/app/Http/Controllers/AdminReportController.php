<?php
/**
 * Role: Builder
 * Rationale: Handle Admin Reports.
 */

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Inventory;
use App\Models\RepairTicket;
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

        // Daily sales with POS vs Web breakdown
        $dailySalesRaw = Order::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('sum(total) as sales'),
                DB::raw('count(*) as orders'),
                DB::raw('sum(vat_amount) as vat'),
                DB::raw("sum(CASE WHEN channel = 'pos' THEN total ELSE 0 END) as pos_total"),
                DB::raw("sum(CASE WHEN channel = 'web' THEN total ELSE 0 END) as web_total"),
                DB::raw("sum(CASE WHEN channel = 'pos' THEN 1 ELSE 0 END) as pos_count"),
                DB::raw("sum(CASE WHEN channel = 'web' THEN 1 ELSE 0 END) as web_count")
            )
            ->whereBetween('created_at', [$start, $end])
            ->where('payment_status', 'paid')
            ->groupBy('date')
            ->get()
            ->map(function ($item) {
                $item->date = Carbon::parse($item->date)->format('M d');
                return $item;
            });

        // Inventory summary
        $inventoryItems = Inventory::all();
        $totalItems = $inventoryItems->count();
        $lowStockItems = $inventoryItems->filter(fn($i) => $i->qty_on_hand > 0 && $i->qty_on_hand <= $i->reorder_level)->count();
        $outOfStockItems = $inventoryItems->filter(fn($i) => $i->qty_on_hand <= 0)->count();
        $totalValue = $inventoryItems->sum(function ($i) {
            return $i->qty_on_hand * (optional($i->product)->price ?? 0);
        });

        // Repair analytics
        $openRepairs = RepairTicket::whereNotIn('status', ['completed', 'picked_up', 'cancelled'])->count();
        $statusCounts = RepairTicket::select('status', DB::raw('count(*) as cnt'))
            ->groupBy('status')
            ->pluck('cnt', 'status')
            ->toArray();

        // Average turnaround (days from created to completed)
        $avgTurnaround = RepairTicket::whereIn('status', ['completed', 'picked_up'])
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('AVG(DATEDIFF(updated_at, created_at)) as avg_days')
            ->value('avg_days') ?? 0;

        // Top customers by order total in period
        $topCustomers = Order::with('customer:id,name,email')
            ->select('customer_id', DB::raw('sum(total) as total_spent'), DB::raw('count(*) as order_count'))
            ->whereBetween('created_at', [$start, $end])
            ->where('payment_status', 'paid')
            ->whereNotNull('customer_id')
            ->groupBy('customer_id')
            ->orderByDesc('total_spent')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->customer->name ?? 'Unknown',
                    'email' => $item->customer->email ?? '',
                    'order_count' => $item->order_count,
                    'total_spent' => $item->total_spent,
                ];
            });

        $stats = [
            'total_sales' => Order::whereBetween('created_at', [$start, $end])->where('payment_status', 'paid')->sum('total'),
            'order_count' => Order::whereBetween('created_at', [$start, $end])->where('payment_status', 'paid')->count(),
            'avg_order_value' => Order::whereBetween('created_at', [$start, $end])->where('payment_status', 'paid')->avg('total') ?? 0,

            'daily_sales' => $dailySalesRaw,

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

            'inventory_summary' => [
                'totalItems' => $totalItems,
                'lowStockItems' => $lowStockItems,
                'outOfStockItems' => $outOfStockItems,
                'totalValue' => round((float) $totalValue, 2),
            ],

            'repair_analytics' => [
                'openTickets' => $openRepairs,
                'avgTurnaround' => round((float) $avgTurnaround, 1),
                'statusCounts' => $statusCounts,
            ],

            'top_customers' => $topCustomers,
        ];

        return response()->json($stats);
    }
}
