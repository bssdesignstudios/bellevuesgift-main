<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Inventory;
use App\Models\TimeLog;
use App\Models\RepairTicket;
use App\Models\OrderItem;
use Carbon\Carbon;

class OperationsDashboardController extends Controller
{
    /**
     * Return today-scoped dashboard data for Inertia props.
     */
    public function getData(): array
    {
        $today = Carbon::today();

        // TODAY'S BUSINESS
        $salesToday = Order::whereDate('created_at', $today)
            ->where('payment_status', 'paid')->sum('total');
        $ordersToday = Order::whereDate('created_at', $today)
            ->where('payment_status', 'paid')->count();
        $lowStockCount = Inventory::where('qty_on_hand', '>', 0)
            ->whereColumn('qty_on_hand', '<=', 'reorder_level')->count();
        $outOfStockCount = Inventory::where('qty_on_hand', '<=', 0)->count();
        // TimeLog model: status='in_progress' + clock_out null = currently on shift
        $staffOnShift = TimeLog::where('status', 'in_progress')
            ->whereNull('clock_out')->count();

        // ACTIONS NEEDED
        $pendingOrders = Order::where('status', 'pending')->count();
        $openRepairs = RepairTicket::whereNotIn('status', ['completed', 'cancelled'])->count();

        // QUICK INSIGHTS — Top Product today (by qty sold)
        $topProduct = OrderItem::whereHas('order', fn($q) =>
                $q->whereDate('created_at', $today)->where('payment_status', 'paid'))
            ->selectRaw('name, SUM(qty) as qty_sold')
            ->groupBy('name')
            ->orderByDesc('qty_sold')
            ->first();

        // Top Cashier today — uses Order->staff() belongsTo relationship
        $topCashierRow = Order::with('staff')
            ->whereDate('created_at', $today)
            ->where('payment_status', 'paid')
            ->whereNotNull('staff_id')
            ->selectRaw('staff_id, SUM(total) as revenue')
            ->groupBy('staff_id')
            ->orderByDesc('revenue')
            ->first();

        return [
            'sales_today' => (float) $salesToday,
            'orders_today' => $ordersToday,
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount,
            'staff_on_shift' => $staffOnShift,
            'pending_orders' => $pendingOrders,
            'open_repairs' => $openRepairs,
            'top_product' => $topProduct
                ? ['name' => $topProduct->name, 'qty_sold' => (int) $topProduct->qty_sold]
                : null,
            'top_cashier' => $topCashierRow
                ? ['name' => $topCashierRow->staff->name ?? 'Unknown', 'revenue' => (float) $topCashierRow->revenue]
                : null,
        ];
    }
}
