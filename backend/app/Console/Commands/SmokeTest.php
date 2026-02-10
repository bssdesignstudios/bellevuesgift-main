<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Order;
use App\Models\Product;
use App\Models\GiftCard;
use App\Models\Inventory;

class SmokeTest extends Command
{
    protected $signature = 'bellevue:smoke-test';
    protected $description = 'Run smoke tests to verify critical business logic';

    private int $pass = 0;
    private int $fail = 0;

    public function handle(): int
    {
        $this->info('');
        $this->info('╔═══════════════════════════════════════════╗');
        $this->info('║   Bellevue Gifts — Smoke Test Suite       ║');
        $this->info('╚═══════════════════════════════════════════╝');
        $this->info('');

        $this->testIdempotency();
        $this->testGiftCardLedger();
        $this->testUniqueConstraints();
        $this->testRoleMiddlewareExists();

        $this->info('');
        $this->info("═══════════════════════════════════════════");
        $this->info("Results: {$this->pass} PASS / {$this->fail} FAIL");
        $this->info("═══════════════════════════════════════════");

        return $this->fail > 0 ? 1 : 0;
    }

    private function assert(string $label, bool $condition): void
    {
        if ($condition) {
            $this->pass++;
            $this->line("  ✅ PASS: {$label}");
        } else {
            $this->fail++;
            $this->error("  ❌ FAIL: {$label}");
        }
    }

    private function testIdempotency(): void
    {
        $this->info('');
        $this->info('▶ Test 1: Order Idempotency (client_txn_id)');

        $clientTxnId = 'SMOKE-TEST-' . Str::uuid();

        // Find a valid product to use
        $product = Product::first();
        if (!$product) {
            $this->assert('Product exists for test', false);
            return;
        }

        // Find or create a valid staff record (orders FK references staff.id)
        $staff = \App\Models\Staff::where('role', 'cashier')->first()
            ?? \App\Models\Staff::where('role', 'admin')->first();
        if (!$staff) {
            // Create a staff record for testing
            $user = \App\Models\User::first();
            if (!$user) {
                $this->assert('User exists for staff creation', false);
                return;
            }
            $staff = \App\Models\Staff::create([
                'user_id' => $user->id,
                'name' => 'Smoke Test Cashier',
                'email' => 'smoke-cashier@test.com',
                'role' => 'cashier',
                'is_active' => true,
            ]);
        }

        $payload = [
            'channel' => 'pos',
            'payment_method' => 'cash',
            'fulfillment_method' => 'in_store',
            'staff_id' => $staff->id,
            'subtotal' => 10.00,
            'discount_amount' => 0,
            'vat_amount' => 0.70,
            'total' => 10.70,
            'client_txn_id' => $clientTxnId,
            'items' => [
                [
                    'product_id' => $product->id,
                    'qty' => 1,
                    'unit_price' => 10.00,
                    'line_total' => 10.00,
                ]
            ],
        ];

        // First call — should create the order
        $controller = app(\App\Http\Controllers\OrderController::class);
        $request1 = \Illuminate\Http\Request::create('/api/pos/checkout', 'POST', $payload);
        $response1 = $controller->checkout($request1);
        $data1 = json_decode($response1->getContent(), true);
        $status1 = $response1->getStatusCode();

        $this->assert('First checkout returns 201', $status1 === 201);
        $this->assert('First checkout has order', isset($data1['order']['id']));
        $this->assert('First checkout idempotent=false', ($data1['idempotent'] ?? null) === false);

        // Second call with same client_txn_id — should return existing
        $request2 = \Illuminate\Http\Request::create('/api/pos/checkout', 'POST', $payload);
        $response2 = $controller->checkout($request2);
        $data2 = json_decode($response2->getContent(), true);
        $status2 = $response2->getStatusCode();

        $this->assert('Second checkout returns 200 (not 201)', $status2 === 200);
        $this->assert('Second checkout idempotent=true', ($data2['idempotent'] ?? null) === true);
        $this->assert('Same order returned both times', ($data1['order']['id'] ?? 'a') === ($data2['order']['id'] ?? 'b'));

        // Verify only 1 order exists
        $count = Order::where('client_txn_id', $clientTxnId)->count();
        $this->assert("Only 1 order in DB with this txn_id ($count)", $count === 1);

        // Cleanup
        $orderId = $data1['order']['id'] ?? null;
        if ($orderId) {
            \App\Models\OrderItem::where('order_id', $orderId)->delete();
            \App\Models\Payment::where('order_id', $orderId)->delete();
            Order::where('id', $orderId)->delete();
        }
    }

    private function testGiftCardLedger(): void
    {
        $this->info('');
        $this->info('▶ Test 2: Gift Card Ledger');

        $code = 'SMOKE-GC-' . strtoupper(Str::random(6));

        try {
            $gc = DB::transaction(function () use ($code) {
                $gc = GiftCard::create([
                    'code' => $code,
                    'initial_balance' => 50.00,
                    'balance' => 50.00,
                    'is_active' => true,
                ]);

                // Credit via ledger (adds 50 initial + 25 credit = should track in ledger)
                $gc->credit(50.00, null, null, 'Initial balance');
                $gc->credit(25.00, null, null, 'Smoke test credit');

                return $gc->fresh();
            });

            $this->assert('Gift card created', $gc !== null);
            // Ledger has 2 transactions: +50 + +25 = 75
            $this->assert('Balance reflects credits (75.00)', abs($gc->computed_balance - 75.00) < 0.01);

            // Attempt redeem
            GiftCard::redeem($code, 20.00, null, null);
            $gc->refresh();

            // Ledger: +50 +25 -20 = 55
            $this->assert('After redeem balance is 55.00', abs($gc->computed_balance - 55.00) < 0.01);

            // Cleanup
            \App\Models\GiftCardTransaction::where('gift_card_id', $gc->id)->delete();
            $gc->delete();

        } catch (\Exception $e) {
            $this->assert('Gift card ledger test threw no exceptions: ' . $e->getMessage(), false);
        }
    }

    private function testUniqueConstraints(): void
    {
        $this->info('');
        $this->info('▶ Test 3: Unique Constraints');

        // Check client_txn_id unique index
        $indexes = DB::select("PRAGMA index_list('orders')");
        $hasClientTxnUnique = collect($indexes)
            ->contains(fn($idx) => $idx->name === 'orders_client_txn_id_unique' && $idx->unique === 1);
        $this->assert('orders.client_txn_id has UNIQUE index', $hasClientTxnUnique);

        // Check pickup_code unique
        $hasPickupUnique = collect($indexes)
            ->contains(fn($idx) => $idx->name === 'orders_pickup_code_unique' && $idx->unique === 1);
        $this->assert('orders.pickup_code has UNIQUE index', $hasPickupUnique);

        // Check gift_cards.code unique
        $gcIndexes = DB::select("PRAGMA index_list('gift_cards')");
        $hasGcCodeUnique = collect($gcIndexes)
            ->contains(fn($idx) => $idx->name === 'gift_cards_code_unique' && $idx->unique === 1);
        $this->assert('gift_cards.code has UNIQUE index', $hasGcCodeUnique);
    }

    private function testRoleMiddlewareExists(): void
    {
        $this->info('');
        $this->info('▶ Test 4: Security Infrastructure');

        $this->assert(
            'RoleMiddleware class exists',
            class_exists(\App\Http\Middleware\RoleMiddleware::class)
        );

        // Check that POS routes have auth:sanctum
        $routes = app('router')->getRoutes();
        $posCheckout = $routes->getByAction(\App\Http\Controllers\OrderController::class . '@checkout');
        if ($posCheckout) {
            $middleware = $posCheckout->middleware();
            $this->assert('POS checkout has auth:sanctum', in_array('auth:sanctum', $middleware));
            $hasRole = collect($middleware)->contains(fn($m) => str_starts_with($m, 'role:'));
            $this->assert('POS checkout has role middleware', $hasRole);
        } else {
            $this->assert('POS checkout route found', false);
        }
    }
}
