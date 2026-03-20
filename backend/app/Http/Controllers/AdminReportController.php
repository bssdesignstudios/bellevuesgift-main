<?php
/**
 * Role: Builder
 * Rationale: Handle Admin Reports — business intelligence for managers and finance.
 */

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Inventory;
use App\Models\RepairTicket;
use App\Models\Category;
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

        // Previous period for trend comparison
        $prevStart = Carbon::now()->subDays($days * 2)->startOfDay();
        $prevEnd = Carbon::now()->subDays($days)->startOfDay();

        // ── SUMMARY STATS ──
        $currentSales = (float) Order::whereBetween('created_at', [$start, $end])
            ->where('payment_status', 'paid')->sum('total');
        $currentOrders = Order::whereBetween('created_at', [$start, $end])
            ->where('payment_status', 'paid')->count();
        $currentAvg = $currentOrders > 0 ? round($currentSales / $currentOrders, 2) : 0;

        $prevSales = (float) Order::whereBetween('created_at', [$prevStart, $prevEnd])
            ->where('payment_status', 'paid')->sum('total');
        $prevOrders = Order::whereBetween('created_at', [$prevStart, $prevEnd])
            ->where('payment_status', 'paid')->count();
        $prevAvg = $prevOrders > 0 ? round($prevSales / $prevOrders, 2) : 0;

        // ── DAILY SALES with POS vs Web breakdown ──
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
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => Carbon::parse($item->date)->format('M d'),
                    'sales' => (float) $item->sales,
                    'orders' => (int) $item->orders,
                    'vat' => (float) $item->vat,
                    'pos_total' => (float) $item->pos_total,
                    'web_total' => (float) $item->web_total,
                    'pos_count' => (int) $item->pos_count,
                    'web_count' => (int) $item->web_count,
                ];
            });

        // ── CASHIER PERFORMANCE ──
        $cashierSales = Order::with('staff')
            ->select('staff_id', DB::raw('sum(total) as total'), DB::raw('count(*) as count'))
            ->whereBetween('created_at', [$start, $end])
            ->where('channel', 'pos')
            ->where('payment_status', 'paid')
            ->groupBy('staff_id')
            ->orderByDesc('total')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->staff->name ?? 'Unknown',
                    'total' => (float) $item->total,
                    'count' => (int) $item->count,
                    'avg_value' => $item->count > 0 ? round($item->total / $item->count, 2) : 0,
                ];
            });

        // ── TOP PRODUCTS ──
        $topProducts = OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
            ->leftJoin('products', 'order_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->select(
                'order_items.product_id',
                'order_items.name as item_name',
                'products.name as product_name',
                'products.sku',
                'categories.name as category_name',
                DB::raw('sum(order_items.qty) as total_qty'),
                DB::raw('sum(order_items.line_total) as total_revenue')
            )
            ->whereBetween('orders.created_at', [$start, $end])
            ->where('orders.payment_status', 'paid')
            ->groupBy('order_items.product_id', 'order_items.name', 'products.name', 'products.sku', 'categories.name')
            ->orderByDesc('total_qty')
            ->limit(15)
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->product_name ?? $item->item_name ?? 'Unknown',
                    'sku' => $item->sku ?? '',
                    'category' => $item->category_name ?? 'Uncategorized',
                    'total_qty' => (int) $item->total_qty,
                    'total_revenue' => (float) $item->total_revenue,
                ];
            });

        // ── CATEGORY PERFORMANCE ──
        $categoryPerformance = OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
            ->leftJoin('products', 'order_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->select(
                'categories.id as category_id',
                'categories.name as category_name',
                DB::raw('count(DISTINCT orders.id) as order_count'),
                DB::raw('sum(order_items.qty) as units_sold'),
                DB::raw('sum(order_items.line_total) as revenue')
            )
            ->whereBetween('orders.created_at', [$start, $end])
            ->where('orders.payment_status', 'paid')
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get()
            ->map(function ($item) {
                return [
                    'category' => $item->category_name ?? 'Uncategorized',
                    'order_count' => (int) $item->order_count,
                    'units_sold' => (int) $item->units_sold,
                    'revenue' => (float) $item->revenue,
                ];
            });

        // ── REGISTER SALES ──
        $registerSales = Order::with('register:id,name')
            ->select('register_id', DB::raw('sum(total) as total'), DB::raw('count(*) as count'))
            ->whereBetween('created_at', [$start, $end])
            ->where('channel', 'pos')
            ->where('payment_status', 'paid')
            ->whereNotNull('register_id')
            ->groupBy('register_id')
            ->orderByDesc('total')
            ->get()
            ->map(function ($item) {
                return [
                    'register' => $item->register->name ?? 'Unknown',
                    'total' => (float) $item->total,
                    'count' => (int) $item->count,
                    'avg_value' => $item->count > 0 ? round($item->total / $item->count, 2) : 0,
                ];
            });

        // ── PAYMENT METHOD BREAKDOWN ──
        $paymentMethods = Order::select(
                'payment_method',
                DB::raw('count(*) as count'),
                DB::raw('sum(total) as total')
            )
            ->whereBetween('created_at', [$start, $end])
            ->where('payment_status', 'paid')
            ->whereNotNull('payment_method')
            ->groupBy('payment_method')
            ->orderByDesc('total')
            ->get()
            ->map(function ($item) {
                return [
                    'method' => $item->payment_method,
                    'count' => (int) $item->count,
                    'total' => (float) $item->total,
                ];
            });

        // ── INVENTORY SUMMARY ──
        $inventoryItems = Inventory::with('product')->get();
        $totalItems = $inventoryItems->count();
        $lowStockItems = $inventoryItems->filter(fn($i) => $i->qty_on_hand > 0 && $i->qty_on_hand <= $i->reorder_level)->count();
        $outOfStockItems = $inventoryItems->filter(fn($i) => $i->qty_on_hand <= 0)->count();
        $totalValue = $inventoryItems->sum(function ($i) {
            return $i->qty_on_hand * (optional($i->product)->price ?? 0);
        });

        // ── REPAIR ANALYTICS ──
        $openRepairs = RepairTicket::whereNotIn('status', ['completed', 'picked_up', 'cancelled'])->count();
        $statusCounts = RepairTicket::select('status', DB::raw('count(*) as cnt'))
            ->groupBy('status')
            ->pluck('cnt', 'status')
            ->toArray();

        // PG-compatible turnaround: EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400
        $avgTurnaround = RepairTicket::whereIn('status', ['completed', 'picked_up'])
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days')
            ->value('avg_days') ?? 0;

        // ── TOP CUSTOMERS ──
        $topCustomers = Order::with('customer:id,name,email,phone,customer_tier')
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
                    'phone' => $item->customer->phone ?? '',
                    'tier' => $item->customer->customer_tier ?? 'retail',
                    'order_count' => (int) $item->order_count,
                    'total_spent' => (float) $item->total_spent,
                    'avg_order' => $item->order_count > 0
                        ? round($item->total_spent / $item->order_count, 2)
                        : 0,
                ];
            });

        // ── DISCOUNT STATS ──
        $totalDiscountOrders = Order::whereBetween('created_at', [$start, $end])
            ->where('discount_amount', '>', 0)->count();
        $totalDiscountValue = Order::whereBetween('created_at', [$start, $end])
            ->where('discount_amount', '>', 0)->sum('discount_amount');

        $discountStats = [
            'orders_with_discount' => $totalDiscountOrders,
            'total_discount_value' => round((float) $totalDiscountValue, 2),
            'active_coupons' => DB::table('coupons')->where('is_active', true)->count(),
            'total_coupons' => DB::table('coupons')->count(),
        ];

        // ── GIFT CARD STATS ──
        $giftCardStats = [
            'sold' => \App\Models\GiftCard::whereBetween('created_at', [$start, $end])->count(),
            'total_issued' => (float) \App\Models\GiftCard::whereBetween('created_at', [$start, $end])->sum('initial_balance'),
            'total_redeemed' => (float) \App\Models\GiftCard::sum(DB::raw('initial_balance - balance')),
            'active_count' => \App\Models\GiftCard::where('is_active', true)->count(),
        ];

        // ── CHANNEL SUMMARY ──
        $channelSummary = Order::select(
                'channel',
                DB::raw('count(*) as orders'),
                DB::raw('sum(total) as revenue')
            )
            ->whereBetween('created_at', [$start, $end])
            ->where('payment_status', 'paid')
            ->groupBy('channel')
            ->get()
            ->map(fn($item) => [
                'channel' => $item->channel,
                'orders' => (int) $item->orders,
                'revenue' => (float) $item->revenue,
            ]);

        $stats = [
            'total_sales' => $currentSales,
            'order_count' => $currentOrders,
            'avg_order_value' => $currentAvg,

            // Trend comparison (previous period)
            'prev_total_sales' => $prevSales,
            'prev_order_count' => $prevOrders,
            'prev_avg_order_value' => $prevAvg,

            'daily_sales' => $dailySalesRaw,
            'cashier_sales' => $cashierSales,
            'top_products' => $topProducts,
            'category_performance' => $categoryPerformance,
            'register_sales' => $registerSales,
            'payment_methods' => $paymentMethods,
            'channel_summary' => $channelSummary,

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
            'gift_card_stats' => $giftCardStats,
            'discount_stats' => $discountStats,
        ];

        return response()->json($stats);
    }
}
