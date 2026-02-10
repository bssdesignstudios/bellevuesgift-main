<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PosController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PosProductController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\GiftCardController;
use App\Http\Controllers\RepairTicketController;
use App\Http\Controllers\RefundController;
use App\Http\Controllers\PickupController;
use App\Http\Controllers\AdminCategoryController;
use App\Http\Controllers\AdminProductController;
use App\Http\Controllers\AdminInventoryController;
use App\Http\Controllers\AdminStaffController;
use App\Http\Controllers\AdminReportController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Auth: auth:sanctum
| Role: role:<roles> (uses RoleMiddleware)
| Throttle: throttle:<max>,<minutes>
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// ─────────────────────────────────────────────────────────────
// Storefront API (Public — read-only, no auth needed)
// ─────────────────────────────────────────────────────────────
Route::prefix('storefront')->group(function () {
    Route::get('/products', [App\Http\Controllers\ProductController::class, 'index']);
    Route::get('/categories', [App\Http\Controllers\CategoryController::class, 'index']);
});

// ─────────────────────────────────────────────────────────────
// POS API — cashier, admin, super_admin
// ─────────────────────────────────────────────────────────────
Route::prefix('pos')
    ->middleware(['auth:sanctum', 'role:cashier,admin,super_admin'])
    ->group(function () {
        Route::get('/registers', [PosController::class, 'getRegisters']);
        Route::get('/session', [PosController::class, 'getCurrentSession']);
        Route::post('/session', [PosController::class, 'openSession']);
        Route::put('/session/{session}', [PosController::class, 'closeSession']);
        Route::post('/activity', [PosController::class, 'logActivity']);
        Route::post('/checkout', [OrderController::class, 'checkout']);

        Route::get('/categories', [PosProductController::class, 'categories']);
        Route::get('/products', [PosProductController::class, 'products']);
        Route::post('/coupons/validate', [CouponController::class, 'validate']);

        // Gift card balance check — rate limited
        Route::post('/gift-cards/check', [GiftCardController::class, 'check'])
            ->middleware('throttle:10,1');

        // Refund operations — finance, admin, super_admin only
        Route::get('/refund/search', [RefundController::class, 'search'])
            ->middleware(['role:finance,admin,super_admin', 'throttle:15,1']);
        Route::post('/refund', [RefundController::class, 'process'])
            ->middleware('role:finance,admin,super_admin');

        // Repair POS operations
        Route::get('/repairs/search', [RepairTicketController::class, 'search'])
            ->middleware('throttle:15,1');
        Route::post('/repairs/complete', [RepairTicketController::class, 'complete']);
        Route::post('/repairs/collect-deposit', [RepairTicketController::class, 'collectDeposit']);
    });

// ─────────────────────────────────────────────────────────────
// Pickup API — cashier, admin, super_admin (rate limited)
// ─────────────────────────────────────────────────────────────
Route::prefix('pickup')
    ->middleware(['auth:sanctum', 'role:cashier,admin,super_admin'])
    ->group(function () {
        Route::get('/search', [PickupController::class, 'search'])
            ->middleware('throttle:10,1');
        Route::post('/verify', [PickupController::class, 'verify'])
            ->middleware('throttle:10,1');
    });

// ─────────────────────────────────────────────────────────────
// Repair API (public endpoints for customer-facing)
// ─────────────────────────────────────────────────────────────
Route::prefix('repair')->group(function () {
    Route::post('/requests', [RepairTicketController::class, 'store'])
        ->middleware('throttle:5,1');

    Route::post('/status', [RepairTicketController::class, 'show'])
        ->middleware('throttle:10,1');
});

// ─────────────────────────────────────────────────────────────
// Admin API — admin, super_admin only
// ─────────────────────────────────────────────────────────────
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'role:admin,super_admin'])
    ->group(function () {
        // Categories
        Route::get('/categories', [AdminCategoryController::class, 'index']);
        Route::post('/categories', [AdminCategoryController::class, 'store']);
        Route::put('/categories/{category}', [AdminCategoryController::class, 'update']);
        Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy']);

        // Products
        Route::get('/products', [AdminProductController::class, 'index']);
        Route::post('/products', [AdminProductController::class, 'store']);
        Route::put('/products/{product}', [AdminProductController::class, 'update']);
        Route::delete('/products/{product}', [AdminProductController::class, 'destroy']);

        // Inventory
        Route::get('/inventory', [AdminInventoryController::class, 'index']);
        Route::post('/inventory/{id}/adjust', [AdminInventoryController::class, 'adjust']);

        // Reports — also available to finance
        Route::get('/reports/dashboard', [AdminReportController::class, 'dashboard'])
            ->middleware('role:admin,finance,super_admin');

        // Staff management
        Route::get('/staff', [AdminStaffController::class, 'index']);
        Route::post('/staff', [AdminStaffController::class, 'store']);
        Route::put('/staff/{staff}', [AdminStaffController::class, 'update']);

        // Coupon CRUD
        Route::get('/coupons', [CouponController::class, 'index']);
        Route::post('/coupons', [CouponController::class, 'store']);
        Route::put('/coupons/{id}', [CouponController::class, 'update']);
        Route::put('/coupons/{id}/toggle', [CouponController::class, 'toggleActive']);
        Route::delete('/coupons/{id}', [CouponController::class, 'destroy']);

        // Gift Card CRUD
        Route::get('/gift-cards', [GiftCardController::class, 'index']);
        Route::post('/gift-cards', [GiftCardController::class, 'store']);
        Route::put('/gift-cards/{id}', [GiftCardController::class, 'update']);
        Route::put('/gift-cards/{id}/toggle', [GiftCardController::class, 'toggleActive']);
    });

// ─────────────────────────────────────────────────────────────
// Orders API — admin, finance, super_admin
// ─────────────────────────────────────────────────────────────
Route::prefix('orders')
    ->middleware(['auth:sanctum', 'role:admin,finance,super_admin'])
    ->group(function () {
        Route::get('/', [OrderController::class, 'index']);
    });
