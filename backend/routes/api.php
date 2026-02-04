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

// POS API
Route::prefix('pos')->group(function () {
    Route::get('/registers', [PosController::class, 'getRegisters']);
    Route::get('/session', [PosController::class, 'getCurrentSession']);
    Route::post('/session', [PosController::class, 'openSession']);
    Route::put('/session/{session}', [PosController::class, 'closeSession']);
    Route::post('/activity', [PosController::class, 'logActivity']);
    Route::post('/checkout', [OrderController::class, 'checkout']);

    Route::get('/categories', [PosProductController::class, 'categories']);
    Route::get('/products', [PosProductController::class, 'products']);
    Route::post('/coupons/validate', [CouponController::class, 'validate']);
    Route::post('/gift-cards/check', [GiftCardController::class, 'check']);
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

    Route::get('/products', [AdminProductController::class, 'index']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::put('/products/{product}', [AdminProductController::class, 'update']);
    Route::delete('/products/{product}', [AdminProductController::class, 'destroy']);

    Route::get('/inventory', [AdminInventoryController::class, 'index']);
    Route::post('/inventory/{id}/adjust', [AdminInventoryController::class, 'adjust']);
    Route::get('/reports/dashboard', [AdminReportController::class, 'dashboard']);

    Route::get('/staff', [AdminStaffController::class, 'index']);
    Route::post('/staff', [AdminStaffController::class, 'store']);
    Route::put('/staff/{staff}', [AdminStaffController::class, 'update']);
});
