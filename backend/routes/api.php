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
use App\Http\Controllers\AdminTimesheetController;
use App\Http\Controllers\AdminSettingsController;
use App\Http\Controllers\QuoteController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\AdminLedgerController;
use App\Http\Controllers\AdminDocumentEmailController;
use App\Http\Controllers\AdminEmailLogController;

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

Route::middleware('auth:web')->get('/user', function (Request $request) {
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
    Route::post('/session/join', [PosController::class, 'joinSession']);
    Route::post('/session/switch-cashier', [PosController::class, 'switchCashier']);
    Route::post('/session/close-register', [PosController::class, 'closeRegister']);
    Route::post('/session/force-close', [PosController::class, 'forceCloseRegister']);
    Route::post('/session/refund-approval', [PosController::class, 'approveRefund']);
    Route::get('/session/{session}/summary', [PosController::class, 'shiftSummary']);

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

// Admin API — protected: requires authenticated staff session
Route::middleware(['auth:web', \App\Http\Middleware\ModuleGate::class])->prefix('admin')->group(function () {
    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store']);
    Route::put('/categories/{category}', [AdminCategoryController::class, 'update']);
    Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy']);
    Route::patch('/categories/{category}/toggle-active', [AdminCategoryController::class, 'toggleActive']);

    Route::get('/products', [AdminProductController::class, 'index']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::put('/products/{product}', [AdminProductController::class, 'update']);
    Route::delete('/products/{product}', [AdminProductController::class, 'destroy']);
    Route::patch('/products/{product}/toggle-active', [AdminProductController::class, 'toggleActive']);

    Route::get('/inventory', [AdminInventoryController::class, 'index']);
    Route::get('/inventory/movements', [AdminInventoryController::class, 'movements']);
    Route::get('/inventory/reorder', [AdminInventoryController::class, 'reorder']);
    Route::post('/inventory/batch-receive', [AdminInventoryController::class, 'batchReceive']);
    Route::post('/inventory/{inventory}/adjust', [AdminInventoryController::class, 'adjust']);
    Route::patch('/inventory/{inventory}', [AdminInventoryController::class, 'update']);

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
    Route::get('/customers/{customer}', [AdminCustomerController::class, 'show']);
    Route::post('/customers/{id}/send-password-reset', [AdminCustomerController::class, 'sendPasswordReset']);

    Route::get('/gift-cards', [AdminGiftCardController::class, 'index']);
    Route::post('/gift-cards', [AdminGiftCardController::class, 'store']);
    Route::put('/gift-cards/{id}', [AdminGiftCardController::class, 'update']);
    Route::patch('/gift-cards/{id}/toggle-active', [AdminGiftCardController::class, 'toggleActive']);

    Route::get('/coupons', [AdminCouponController::class, 'index']);
    Route::post('/coupons', [AdminCouponController::class, 'store']);
    Route::put('/coupons/{id}', [AdminCouponController::class, 'update']);
    Route::delete('/coupons/{id}', [AdminCouponController::class, 'destroy']);
    Route::patch('/coupons/{id}/toggle-active', [AdminCouponController::class, 'toggleActive']);

    Route::get('/repair-tickets', [AdminRepairTicketController::class, 'index']);
    Route::post('/repair-tickets', [AdminRepairTicketController::class, 'store']);
    Route::get('/repair-tickets/staff', [AdminRepairTicketController::class, 'staff']); // before {id} wildcard
    Route::get('/repair-tickets/{id}', [AdminRepairTicketController::class, 'show']);
    Route::put('/repair-tickets/{id}', [AdminRepairTicketController::class, 'update']);
    Route::patch('/repair-tickets/{id}/status', [AdminRepairTicketController::class, 'updateStatus']);
    Route::get('/repair-tickets/{id}/logs', [AdminRepairTicketController::class, 'logs']);
    Route::get('/repair-tickets/{id}/tasks', [AdminRepairTicketController::class, 'tasks']);
    Route::post('/repair-tickets/{id}/tasks', [AdminRepairTicketController::class, 'addTask']);
    Route::patch('/repair-tickets/{id}/tasks/{taskId}', [AdminRepairTicketController::class, 'updateTask']);
    Route::post('/repair-tickets/{id}/payment', [AdminRepairTicketController::class, 'recordPayment']);

    Route::get('/registers', [RegisterController::class, 'index']);
    Route::post('/registers', [RegisterController::class, 'store']);
    Route::put('/registers/{id}', [RegisterController::class, 'update']);
    Route::post('/registers/{id}/assign', [RegisterController::class, 'assignStaff']);
    Route::get('/registers/{id}/activity-logs', [RegisterController::class, 'activityLogs']);
    Route::post('/registers/{id}/force-close', [RegisterController::class, 'forceClose']);

    Route::get('/vendors', [VendorController::class, 'index']);
    Route::post('/vendors', [VendorController::class, 'store']);
    Route::put('/vendors/{id}', [VendorController::class, 'update']);
    Route::delete('/vendors/{id}', [VendorController::class, 'destroy']);

    Route::get('/expenses', [App\Http\Controllers\AdminExpenseController::class, 'index']);
    Route::post('/expenses', [App\Http\Controllers\AdminExpenseController::class, 'store']);
    Route::put('/expenses/{expense}', [App\Http\Controllers\AdminExpenseController::class, 'update']);
    Route::delete('/expenses/{expense}', [App\Http\Controllers\AdminExpenseController::class, 'destroy']);
    Route::get('/payroll', [App\Http\Controllers\AdminPayrollController::class, 'index']);
    Route::post('/payroll', [App\Http\Controllers\AdminPayrollController::class, 'store']);
    Route::post('/payroll/{payroll}/approve', [App\Http\Controllers\AdminPayrollController::class, 'approve']);
    Route::post('/payroll/{payroll}/mark-paid', [App\Http\Controllers\AdminPayrollController::class, 'markPaid']);

    Route::get('/recurring-bills', [App\Http\Controllers\AdminRecurringBillController::class, 'index']);
    Route::post('/recurring-bills', [App\Http\Controllers\AdminRecurringBillController::class, 'store']);
    Route::put('/recurring-bills/{recurringBill}', [App\Http\Controllers\AdminRecurringBillController::class, 'update']);
    Route::delete('/recurring-bills/{recurringBill}', [App\Http\Controllers\AdminRecurringBillController::class, 'destroy']);
    Route::post('/recurring-bills/{recurringBill}/mark-paid', [App\Http\Controllers\AdminRecurringBillController::class, 'markPaid']);

    Route::get('/settings', [AdminSettingsController::class, 'index']);
    Route::post('/settings', [AdminSettingsController::class, 'upsert']);

    Route::post('/impersonate', [App\Http\Controllers\AuthController::class, 'impersonate']);
    Route::post('/impersonate/stop', [App\Http\Controllers\AuthController::class, 'stopImpersonation']);

    Route::get('/quotes', [QuoteController::class, 'index']);
    Route::post('/quotes', [QuoteController::class, 'store']);
    Route::get('/quotes/{id}', [QuoteController::class, 'show']);
    Route::put('/quotes/{id}', [QuoteController::class, 'update']);
    Route::delete('/quotes/{id}', [QuoteController::class, 'destroy']);

    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::put('/invoices/{id}', [InvoiceController::class, 'update']);
    Route::post('/invoices/{id}/payments', [InvoiceController::class, 'recordPayment']);
    Route::post('/quotes/{id}/convert', [InvoiceController::class, 'convertFromQuote']);

    Route::get('/ledger-entries', [AdminLedgerController::class, 'index']);

    Route::post('/quotes/{id}/email', [AdminDocumentEmailController::class, 'sendQuote']);
    Route::post('/invoices/{id}/email', [AdminDocumentEmailController::class, 'sendInvoice']);
    Route::post('/statements/email', [AdminDocumentEmailController::class, 'sendStatement']);

    Route::get('/email-logs', [AdminEmailLogController::class, 'index']);

    // Timesheets
    Route::get('/timesheets', [AdminTimesheetController::class, 'index']);
    Route::post('/timesheets', [AdminTimesheetController::class, 'store']);
    Route::post('/timesheets/clock-in', [AdminTimesheetController::class, 'clockIn']);
    Route::post('/timesheets/{timeLog}/clock-out', [AdminTimesheetController::class, 'clockOut']);
    Route::patch('/timesheets/{timeLog}', [AdminTimesheetController::class, 'update']);
    Route::delete('/timesheets/{timeLog}', [AdminTimesheetController::class, 'destroy']);

    // Settings
    Route::get('/settings', [App\Http\Controllers\AdminSettingsController::class, 'show']);
    Route::post('/settings/maintenance', [App\Http\Controllers\AdminSettingsController::class, 'toggleMaintenance']);

    // Quotes
    Route::get('/quotes', [App\Http\Controllers\AdminQuoteController::class, 'index']);
    Route::post('/quotes', [App\Http\Controllers\AdminQuoteController::class, 'store']);
    Route::get('/quotes/{id}', [App\Http\Controllers\AdminQuoteController::class, 'show']);
    Route::put('/quotes/{id}', [App\Http\Controllers\AdminQuoteController::class, 'update']);
    Route::delete('/quotes/{id}', [App\Http\Controllers\AdminQuoteController::class, 'destroy']);
    Route::post('/quotes/{id}/convert-to-invoice', [App\Http\Controllers\AdminQuoteController::class, 'convertToInvoice']);

    // Invoices
    Route::get('/invoices', [App\Http\Controllers\AdminInvoiceController::class, 'index']);
    Route::post('/invoices', [App\Http\Controllers\AdminInvoiceController::class, 'store']);
    Route::get('/invoices/{id}', [App\Http\Controllers\AdminInvoiceController::class, 'show']);
    Route::put('/invoices/{id}', [App\Http\Controllers\AdminInvoiceController::class, 'update']);
    Route::delete('/invoices/{id}', [App\Http\Controllers\AdminInvoiceController::class, 'destroy']);
});

// Staff Profile API — any authenticated staff user
Route::middleware('auth:web')->prefix('profile')->group(function () {
    Route::get('/', [App\Http\Controllers\StaffProfileController::class, 'show']);
    Route::put('/', [App\Http\Controllers\StaffProfileController::class, 'update']);
    Route::post('/password', [App\Http\Controllers\StaffProfileController::class, 'changePassword']);
});

// Customer API
Route::middleware('auth:web')->prefix('customer')->group(function () {
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
