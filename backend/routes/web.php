<?php

use App\Http\Controllers\AdminMailController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\VendorController;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/categories', function () {
    try {
        $categories = Category::where('is_active', true)->orderBy('sort_order')->get();
    } catch (\Throwable) {
        $categories = [];
    }
    return Inertia::render('AllCategoriesPage', [
        'categories' => $categories
    ]);
})->name('categories');

Route::get('/', function () {
    try {
        $featuredProducts = Product::with('category')->where('is_active', true)->limit(8)->get();
    } catch (\Throwable) {
        $featuredProducts = [];
    }

    try {
        $categories = Category::where('is_active', true)->orderBy('sort_order')->get();
    } catch (\Throwable) {
        $categories = [];
    }

    return Inertia::render('HomePage', [
        'featuredProducts' => $featuredProducts,
        'categories' => $categories,
    ]);
})->name('home');

// PWA: service worker — must be served from root scope
Route::get('/sw.js', function () {
    return response()->file(public_path('build/sw.js'), [
        'Content-Type' => 'application/javascript',
        'Service-Worker-Allowed' => '/',
    ]);
});

// PWA: offline fallback — served by service worker when navigation fails
Route::get('/offline', function () {
    return response()->file(public_path('offline.html'));
});

Route::get('/shop', function () {
    try {
        $products = Product::with('category')->where('is_active', true)->get();
    } catch (\Throwable) {
        $products = [];
    }

    try {
        $categories = Category::where('is_active', true)->orderBy('sort_order')->get();
    } catch (\Throwable) {
        $categories = [];
    }

    return Inertia::render('ShopPage', [
        'products' => $products,
        'categories' => $categories,
    ]);
})->name('shop');

Route::get('/product/{slug}', function ($slug) {
    $product = Product::with(['category', 'inventory'])
        ->where('slug', $slug)
        ->where('is_active', true)
        ->first();

    return Inertia::render('ProductPage', [
        'slug' => $slug,
        'product' => $product,
    ]);
})->name('product');

Route::get('/cart', function () {
    return Inertia::render('CartPage');
})->name('cart');

Route::get('/checkout', function () {
    return Inertia::render('CheckoutPage', [
        'auth' => [
            'user' => auth()->user()
        ]
    ]);
})->name('checkout');

Route::post('/api/storefront/checkout', [\App\Http\Controllers\StorefrontCheckoutController::class, 'store']);

Route::get('/checkout/success/{id}', function ($id) {
    $order = Order::with('items')->find($id);

    return Inertia::render('CheckoutSuccessPage', [
        'id' => $id,
        'order' => $order,
        'orderItems' => $order?->items ?? [],
    ]);
})->name('checkout.success');

Route::get('/repair', function () {
    return Inertia::render('RepairPage');
})->name('repair');

Route::get('/repair/status', function () {
    return Inertia::render('RepairStatusPage');
})->name('repair.status');

Route::get('/sale', function () {
    try {
        $products = Product::with('category')->where('is_active', true)->whereNotNull('sale_price')->get();
    } catch (\Throwable) {
        $products = [];
    }
    try {
        $categories = Category::where('is_active', true)->orderBy('sort_order')->get();
    } catch (\Throwable) {
        $categories = [];
    }

    return Inertia::render('ShopPage', [
        'products' => $products,
        'categories' => $categories,
        'filter' => 'sale',
    ]);
})->name('sale');

// Auth Routes
Route::get('/login', [LoginController::class, 'create'])->name('login');
Route::post('/login', [LoginController::class, 'store'])->name('login.store');
Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');

Route::get('/gift-cards', function () {
    return Inertia::render('GiftCardsPage');
})->name('gift-cards');

Route::get('/gift-cards/balance', function () {
    return Inertia::render('GiftCardsBalancePage');
})->name('gift-cards.balance');

Route::get('/category/{slug}', function ($slug) {
    $category = Category::where('slug', $slug)->where('is_active', true)->first();
    $products = $category
        ? Product::with(['category', 'inventory'])
            ->where('category_id', $category->id)
            ->where('is_active', true)
            ->get()
        : [];

    return Inertia::render('CategoryPage', [
        'slug' => $slug,
        'category' => $category,
        'products' => $products,
    ]);
})->name('category');

Route::get('/orders/{id}', function ($id) {
    $order = Order::with(['items', 'customer'])->find($id);

    return Inertia::render('OrderPage', [
        'id' => $id,
        'order' => $order,
    ]);
})->name('orders.show');

Route::middleware(['auth'])->get('/staff/profile', function () {
    return Inertia::render('StaffProfilePage');
})->name('staff.profile');

Route::get('/staff/login', function () {
    return Inertia::render('StaffLoginPage');
})->name('staff.login');

Route::post('/staff/login', [AuthController::class, 'login'])->name('staff.login.post');
Route::post('/pos/pin-login', [AuthController::class, 'pinLogin'])->name('pos.pin-login');
Route::post('/staff/logout', [AuthController::class, 'logout'])->name('staff.logout');

// POS login page (PIN-based)
Route::get('/pos/login', function () {
    return Inertia::render('PosLoginPage');
})->name('pos.login');

Route::get('/not-authorized', function () {
    return Inertia::render('NotAuthorizedPage');
})->name('not-authorized');

Route::get('/account/login', function () {
    return Inertia::render('account/AccountLoginPage');
})->name('account.login');

Route::get('/account/register', function () {
    return Inertia::render('account/AccountRegisterPage');
})->name('account.register');

Route::post('/account/register', [\App\Http\Controllers\CustomerRegisterController::class, 'store'])->name('account.register.post');

Route::get('/account', function () {
    return Inertia::render('account/AccountDashboardPage');
})->name('account.dashboard');

Route::get('/account/orders', function () {
    return Inertia::render('account/AccountOrdersPage');
})->name('account.orders');

Route::get('/account/orders/{orderNumber}', function ($orderNumber) {
    return Inertia::render('account/AccountOrderDetailPage', ['orderNumber' => $orderNumber]);
})->name('account.orders.detail');

Route::get('/account/addresses', function () {
    return Inertia::render('account/AccountAddressesPage');
})->name('account.addresses');

Route::get('/account/tracking', function () {
    return Inertia::render('account/AccountTrackingPage');
})->name('account.tracking');

Route::get('/account/wishlist', function () {
    return Inertia::render('account/AccountWishlistPage');
})->name('account.wishlist');

Route::get('/account/gift-cards', function () {
    return Inertia::render('account/AccountGiftCardsPage');
})->name('account.gift-cards');

Route::get('/account/forgot-password', function () {
    return Inertia::render('account/AccountForgotPasswordPage');
})->name('account.forgot-password');

Route::post('/forgot-password', function (Request $request) {
    $request->validate(['email' => 'required|email']);

    $user = \App\Models\User::where('email', $request->email)->first();

    if (!$user) {
        // Don't reveal whether email exists
        return response()->json(['message' => 'If that email exists, a reset link has been sent.']);
    }

    try {
        // Try to send reset link using Laravel's built-in
        $status = \Illuminate\Support\Facades\Password::sendResetLink(
            $request->only('email')
        );

        return response()->json(['message' => 'If that email exists, a reset link has been sent.']);
    } catch (\Throwable $e) {
        // Mail not configured — return helpful message
        return response()->json([
            'message' => 'Password reset is not available. Please contact your administrator.'
        ], 503);
    }
})->name('forgot-password');

// Password reset callback — email link lands here
Route::get('/reset-password/{token}', function (string $token) {
    return Inertia::render('account/AccountResetPasswordPage', [
        'token' => $token,
        'email' => request()->query('email', ''),
    ]);
})->name('password.reset');

Route::post('/reset-password', function (Request $request) {
    $request->validate([
        'token'                 => 'required',
        'email'                 => 'required|email',
        'password'              => 'required|string|min:8|confirmed',
        'password_confirmation' => 'required',
    ]);

    try {
        $status = \Illuminate\Support\Facades\Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill(['password' => \Illuminate\Support\Facades\Hash::make($password)])->save();
            }
        );

        if ($status === \Illuminate\Support\Facades\Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password reset successfully.']);
        }

        return response()->json(['message' => 'This reset link is invalid or has expired.'], 422);
    } catch (\Throwable $e) {
        return response()->json(['message' => 'Password reset failed. Please try again.'], 500);
    }
})->name('password.update');

Route::get('/account/profile', function () {
    return Inertia::render('account/AccountProfilePage');
})->name('account.profile');

// POS (Admin, Cashier, Warehouse)
Route::middleware(['auth', 'role:admin,cashier,warehouse,warehouse_manager'])->group(function () {
    Route::get('/pos', function () {
        return Inertia::render('POSPage');
    })->name('pos');

    Route::get('/api/pos/categories', [PosController::class, 'getCategories']);
    Route::get('/api/pos/products', [PosController::class, 'getProducts']);
    Route::post('/api/pos/check-gift-card', [PosController::class, 'checkGiftCard']);
});

// API Routes (for frontend data access)
Route::middleware(['auth'])->group(function () {
    // Categories API
    Route::get('/api/categories', [CategoryController::class, 'index']);
    Route::post('/api/categories', [CategoryController::class, 'store']);
    Route::put('/api/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/api/categories/{id}', [CategoryController::class, 'destroy']);
    Route::patch('/api/categories/{id}/toggle-active', [CategoryController::class, 'toggleActive']);

    // Products API
    Route::get('/api/products', [ProductController::class, 'index']);
    Route::post('/api/products', [ProductController::class, 'store']);
    Route::put('/api/products/{id}', [ProductController::class, 'update']);
    Route::delete('/api/products/{id}', [ProductController::class, 'destroy']);

    // Inventory API
    Route::get('/api/inventory', [InventoryController::class, 'index']);
    Route::post('/api/inventory/{productId}/adjust', [InventoryController::class, 'adjust']);
    Route::post('/api/inventory/bulk-adjust', [InventoryController::class, 'bulkAdjust']);

    // Staff API
    Route::get('/api/staff', [StaffController::class, 'index']);
    Route::post('/api/staff', [StaffController::class, 'store']);
    Route::put('/api/staff/{id}', [StaffController::class, 'update']);
    Route::patch('/api/staff/{id}/toggle-active', [StaffController::class, 'toggleActive']);

    // Vendors API
    Route::get('/api/vendors', [VendorController::class, 'index']);
    Route::post('/api/vendors', [VendorController::class, 'store']);
    Route::put('/api/vendors/{id}', [VendorController::class, 'update']);
    Route::delete('/api/vendors/{id}', [VendorController::class, 'destroy']);

    // Orders API
    Route::post('/api/orders', [OrderController::class, 'store']);
    Route::get('/api/orders', [OrderController::class, 'index']);
    Route::patch('/api/orders/{id}/status', [OrderController::class, 'updateStatus']);

});

// Admin (Admin only)
// Admin Routing Group
Route::middleware(['auth'])->prefix('admin')->group(function () {

    // 1. Common / Overview (Admin + Finance)
    Route::middleware(['role:admin,finance'])->group(function () {
        Route::get('/', function () {
            $dashboard = app(\App\Http\Controllers\OperationsDashboardController::class)->getData();
            return Inertia::render('admin/AdminOverview', [
                'dashboard' => $dashboard,
            ]);
        })->name('admin');

        Route::get('/reports', function () {
            return Inertia::render('admin/AdminReports');
        })->name('admin.reports');

        Route::get('/orders', function () {
            return Inertia::render('admin/AdminOrders');
        })->name('admin.orders');

        Route::get('/repairs', function () {
            return Inertia::render('admin/AdminRepairTickets');
        })->name('admin.repairs');

        Route::get('/repairs/intake', function () {
            return Inertia::render('admin/AdminRepairIntake');
        })->name('admin.repairs.intake');

        Route::get('/gift-cards', function () {
            return Inertia::render('admin/AdminGiftCards');
        })->name('admin.gift-cards');

        Route::get('/customers', function () {
            return Inertia::render('admin/AdminCustomers');
        })->name('admin.customers');

        Route::get('/vendors', function () {
            return Inertia::render('admin/AdminVendors');
        })->name('admin.vendors');

        Route::get('/discounts', function () {
            return Inertia::render('admin/AdminDiscounts');
        })->name('admin.discounts');

        // New Finance Modules
        Route::get('/timesheets', function () {
            return Inertia::render('admin/AdminTimesheets');
        })->name('admin.timesheets');

        Route::get('/petty-cash', function () {
            return Inertia::render('admin/AdminPettyCash');
        })->name('admin.petty-cash');

        Route::get('/recurring-invoices', function () {
            return Inertia::render('admin/AdminRecurringInvoices');
        })->name('admin.recurring-invoices');

        Route::get('/expenses', function () {
            return Inertia::render('admin/AdminFinance', ['defaultTab' => 'expenses']);
        })->name('admin.expenses');

        Route::get('/payroll', function () {
            return Inertia::render('admin/AdminFinance', ['defaultTab' => 'payroll']);
        })->name('admin.payroll');
    });

    // 2. Warehouse Operations (Admin + Warehouse + Finance for Inventory visibility)
    Route::middleware(['role:admin,warehouse,warehouse_manager,finance'])->group(function () {
        Route::get('/inventory', function () {
            return Inertia::render('admin/AdminInventory');
        })->name('admin.inventory');
    });

    // 3. Product Catalog (Admin + Warehouse)
    Route::middleware(['role:admin,warehouse,warehouse_manager'])->group(function () {
        Route::get('/products', function () {
            return Inertia::render('admin/AdminProducts');
        })->name('admin.products');

        Route::get('/categories', function () {
            return Inertia::render('admin/AdminCategories');
        })->name('admin.categories');
    });

    // 4. Staff Management & Registers (Strictly Admin)
    Route::middleware(['role:admin'])->group(function () {
        Route::get('/staff', function () {
            return Inertia::render('admin/AdminStaff');
        })->name('admin.staff');

        Route::get('/registers', function () {
            return Inertia::render('admin/AdminRegisters');
        })->name('admin.registers');

        Route::get('/settings', function () {
            return Inertia::render('admin/AdminSettings');
        })->name('admin.settings');

        Route::get('/quotes', function () {
            return Inertia::render('admin/AdminQuotes');
        })->name('admin.quotes');

        Route::get('/invoices', function () {
            return Inertia::render('admin/AdminInvoices');
        })->name('admin.invoices');
    });

    // 5. SOP (All authenticated admin-panel roles)
    Route::middleware(['role:admin,finance,warehouse,warehouse_manager'])->group(function () {
        Route::get('/sop', function () {
            return Inertia::render('admin/AdminSOP');
        })->name('admin.sop');
    });

    // 6. Mail health-check (Admin only — never exposes credentials)
    Route::middleware(['role:admin'])->group(function () {
        Route::get('/mail/status', [AdminMailController::class, 'status'])->name('admin.mail.status');
        Route::post('/mail/test', [AdminMailController::class, 'test'])->name('admin.mail.test');
    });
});

// Warehouse view (Admin + Warehouse Manager)
Route::middleware(['auth', 'role:admin,warehouse_manager'])->group(function () {
    Route::get('/warehouse', function () {
        return Inertia::render('admin/AdminInventory');
    })->name('warehouse');
});

// Kiosk entry points
Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/kiosk/admin', function () {
        return Inertia::render('kiosk/AdminKiosk');
    })->name('kiosk.admin');
});

Route::middleware(['auth', 'role:admin,cashier'])->group(function () {
    Route::get('/kiosk/cashier', function () {
        return Inertia::render('kiosk/CashierKiosk');
    })->name('kiosk.cashier');
});

Route::middleware(['auth', 'role:admin,warehouse_manager'])->group(function () {
    Route::get('/kiosk/warehouse', function () {
        return Inertia::render('kiosk/WarehouseKiosk');
    })->name('kiosk.warehouse');
});

Route::get('/about', function () {
    return Inertia::render('AboutPage');
})->name('about');

Route::get('/track-order', function () {
    return Inertia::render('TrackOrderPage');
})->name('track-order');

Route::get('/contact', function () {
    return Inertia::render('ContactPage');
})->name('contact');

Route::get('/faq', function () {
    return Inertia::render('FAQPage');
})->name('faq');

Route::get('/shipping', function () {
    return Inertia::render('ShippingPage');
})->name('shipping');

Route::get('/returns', function () {
    return Inertia::render('ReturnsPage');
})->name('returns');

// Temporary: clear opcache (remove after deploy)
Route::get('/ops/clear-cache', function () {
    if (function_exists('opcache_reset')) {
        opcache_reset();
    }
    \Illuminate\Support\Facades\Artisan::call('view:clear');
    \Illuminate\Support\Facades\Artisan::call('config:clear');
    \Illuminate\Support\Facades\Artisan::call('route:clear');
    return response()->json(['status' => 'cleared', 'time' => now()->toDateTimeString()]);
});

// Fallback
Route::fallback(function () {
    return Inertia::render('NotFound');
});
