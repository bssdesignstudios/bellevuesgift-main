<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PosController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PosProductController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\GiftCardController;
use App\Http\Controllers\RepairTicketController;
use App\Http\Controllers\AdminCategoryController;
use App\Http\Controllers\AdminProductController;
use App\Http\Controllers\AdminInventoryController;
use App\Http\Controllers\AdminStaffController;
use App\Http\Controllers\AdminReportController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\AdminCustomerController;
use App\Http\Controllers\AdminGiftCardController;
use App\Http\Controllers\AdminCouponController;
use App\Http\Controllers\AdminRepairTicketController;
use App\Http\Controllers\RegisterController;
use App\Http\Controllers\VendorController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Storefront API (Public)
Route::prefix('storefront')->group(function () {
    Route::get('/products', [App\Http\Controllers\ProductController::class, 'index']);
    Route::get('/categories', [App\Http\Controllers\CategoryController::class, 'index']);
});

// Public order tracking
Route::get('/orders/track', function (Request $request) {
    $search = $request->input('q');
    if (!$search) {
        return response()->json(['order' => null]);
    }

    $order = \App\Models\Order::where('order_number', $search)
        ->orWhere('pickup_code', strtoupper($search))
        ->first();

    return response()->json(['order' => $order]);
});

// POS API
Route::prefix('pos')->group(function () {
    Route::get('/registers', [PosController::class, 'getRegisters']);
    Route::get('/session', [PosController::class, 'getCurrentSession']);
    Route::post('/session', [PosController::class, 'openSession']);
    Route::put('/session/{session}', [PosController::class, 'closeSession']);
    Route::post('/activity', [PosController::class, 'logActivity']);
    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::get('/orders/lookup', [OrderController::class, 'lookup']);
    Route::patch('/orders/{id}/pickup', [OrderController::class, 'markPickedUp']);
    Route::post('/orders/{id}/payment', [OrderController::class, 'collectPayment']);
    Route::post('/orders/{id}/refund', [OrderController::class, 'refund']);

    Route::get('/categories', [PosProductController::class, 'categories']);
    Route::get('/products', [PosProductController::class, 'products']);
    Route::post('/coupons/validate', [CouponController::class, 'validate']);
    Route::post('/check-gift-card', [GiftCardController::class, 'check']);

    Route::get('/repair-tickets/lookup', [RepairTicketController::class, 'posLookup']);
    Route::patch('/repair-tickets/{id}/pickup', [RepairTicketController::class, 'markPickedUp']);
    Route::patch('/repair-tickets/{id}/deposit', [RepairTicketController::class, 'collectDeposit']);
    Route::post('/repair-tickets/{id}/payment', [RepairTicketController::class, 'collectPayment']);
});

// Repair API
Route::prefix('repair')->group(function () {
    Route::post('/requests', [RepairTicketController::class, 'store']);
    Route::post('/status', [RepairTicketController::class, 'show']);
});

// Admin API
Route::prefix('admin')->group(function () {
    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store']);
    Route::put('/categories/{category}', [AdminCategoryController::class, 'update']);
    Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy']);
    Route::patch('/categories/{category}/toggle-active', [AdminCategoryController::class, 'toggleActive']);

    Route::get('/products', [AdminProductController::class, 'index']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::put('/products/{product}', [AdminProductController::class, 'update']);
    Route::delete('/products/{product}', [AdminProductController::class, 'destroy']);

    Route::get('/inventory', [AdminInventoryController::class, 'index']);
    Route::post('/inventory/{id}/adjust', [AdminInventoryController::class, 'adjust']);
    Route::patch('/inventory/{id}', [AdminInventoryController::class, 'update']);

    Route::get('/reports/dashboard', [AdminReportController::class, 'dashboard']);

    Route::get('/staff', [AdminStaffController::class, 'index']);
    Route::post('/staff', [AdminStaffController::class, 'store']);
    Route::put('/staff/{id}', [AdminStaffController::class, 'update']);
    Route::delete('/staff/{id}', [AdminStaffController::class, 'destroy']);
    Route::patch('/staff/{id}/toggle-active', [AdminStaffController::class, 'toggleActive']);

    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);

    Route::get('/customers', [AdminCustomerController::class, 'index']);

    Route::get('/gift-cards', [AdminGiftCardController::class, 'index']);
    Route::post('/gift-cards', [AdminGiftCardController::class, 'store']);
    Route::patch('/gift-cards/{id}/toggle-active', [AdminGiftCardController::class, 'toggleActive']);

    Route::get('/coupons', [AdminCouponController::class, 'index']);
    Route::post('/coupons', [AdminCouponController::class, 'store']);
    Route::put('/coupons/{id}', [AdminCouponController::class, 'update']);
    Route::delete('/coupons/{id}', [AdminCouponController::class, 'destroy']);
    Route::patch('/coupons/{id}/toggle-active', [AdminCouponController::class, 'toggleActive']);

    Route::get('/repair-tickets', [AdminRepairTicketController::class, 'index']);
    Route::patch('/repair-tickets/{id}/status', [AdminRepairTicketController::class, 'updateStatus']);
    Route::patch('/repair-tickets/{id}/billing', [AdminRepairTicketController::class, 'updateBilling']);
    Route::get('/repair-tickets/{id}/tasks', [AdminRepairTicketController::class, 'tasks']);
    Route::post('/repair-tickets/{id}/tasks', [AdminRepairTicketController::class, 'addTask']);
    Route::patch('/repair-tickets/{id}/tasks/{taskId}', [AdminRepairTicketController::class, 'updateTask']);
    Route::get('/repair-tickets/staff', [AdminRepairTicketController::class, 'staff']);
    Route::get('/repair-tickets/{id}/payments', [AdminRepairTicketController::class, 'listPayments']);
    Route::post('/repair-tickets/{id}/payments', [AdminRepairTicketController::class, 'recordPayment']);

    Route::get('/registers', [RegisterController::class, 'index']);
    Route::post('/registers', [RegisterController::class, 'store']);
    Route::put('/registers/{id}', [RegisterController::class, 'update']);
    Route::post('/registers/{id}/assign', [RegisterController::class, 'assignStaff']);

    Route::get('/vendors', [VendorController::class, 'index']);
    Route::post('/vendors', [VendorController::class, 'store']);

    Route::get('/expenses', [App\Http\Controllers\AdminExpenseController::class, 'index']);
    Route::post('/expenses', [App\Http\Controllers\AdminExpenseController::class, 'store']);
    Route::delete('/expenses/{expense}', [App\Http\Controllers\AdminExpenseController::class, 'destroy']);
    Route::get('/payroll', [App\Http\Controllers\AdminPayrollController::class, 'index']);
    Route::post('/payroll', [App\Http\Controllers\AdminPayrollController::class, 'store']);
    Route::post('/payroll/{payroll}/approve', [App\Http\Controllers\AdminPayrollController::class, 'approve']);

    Route::post('/impersonate', [App\Http\Controllers\AuthController::class, 'impersonate']);
    Route::post('/impersonate/stop', [App\Http\Controllers\AuthController::class, 'stopImpersonation']);
});

// Customer API
Route::middleware('auth:sanctum')->prefix('customer')->group(function () {
    Route::get('/dashboard', [App\Http\Controllers\CustomerAccountController::class, 'dashboard']);
    Route::get('/orders', [App\Http\Controllers\CustomerAccountController::class, 'orders']);
    Route::get('/orders/{orderNumber}', [App\Http\Controllers\CustomerAccountController::class, 'orderDetail']);
    Route::get('/gift-cards', [App\Http\Controllers\CustomerAccountController::class, 'giftCards']);
    Route::post('/change-password', [App\Http\Controllers\CustomerAccountController::class, 'changePassword']);

    // Addresses
    Route::get('/addresses', [App\Http\Controllers\CustomerAddressController::class, 'index']);
    Route::post('/addresses', [App\Http\Controllers\CustomerAddressController::class, 'store']);
    Route::put('/addresses/{id}', [App\Http\Controllers\CustomerAddressController::class, 'update']);
    Route::delete('/addresses/{id}', [App\Http\Controllers\CustomerAddressController::class, 'destroy']);
    Route::post('/addresses/{id}/set-default', [App\Http\Controllers\CustomerAddressController::class, 'setDefault']);

    // Wishlist
    Route::get('/wishlist', [App\Http\Controllers\CustomerWishlistController::class, 'index']);
    Route::post('/wishlist', [App\Http\Controllers\CustomerWishlistController::class, 'store']);
    Route::delete('/wishlist/{id}', [App\Http\Controllers\CustomerWishlistController::class, 'destroy']);
});

// Order tracking - public (by order number or pickup code)
Route::get('/customer/orders/track', [App\Http\Controllers\CustomerAccountController::class, 'trackOrder']);
