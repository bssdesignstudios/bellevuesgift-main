<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\Category;
use Illuminate\Support\Str;

class OrderIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    private User $cashier;
    private \App\Models\Staff $staff;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->cashier = User::create([
            'name' => 'Test Cashier',
            'email' => 'test-cashier-' . Str::random(6) . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'cashier',
        ]);

        $this->staff = \App\Models\Staff::create([
            'user_id' => $this->cashier->id,
            'name' => 'Test Staff',
            'email' => $this->cashier->email,
            'role' => 'cashier',
            'is_active' => true,
        ]);

        $category = Category::create([
            'name' => 'Test Category',
            'slug' => 'test-cat-' . Str::random(6),
        ]);

        $this->product = Product::create([
            'name' => 'Test Product',
            'slug' => 'test-product-' . Str::random(6),
            'sku' => 'TST-' . Str::random(6),
            'price' => 10.00,
            'category_id' => $category->id,
            'status' => 'active',
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function checkout_creates_order_on_first_call()
    {
        $payload = $this->makePayload();

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('idempotent', false);
        $this->assertDatabaseCount('orders', 1);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function checkout_returns_existing_order_on_duplicate_client_txn_id()
    {
        $clientTxnId = 'TEST-' . Str::uuid();
        $payload = $this->makePayload($clientTxnId);

        // First call creates
        $response1 = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload);
        $response1->assertStatus(201);
        $orderId1 = $response1->json('order.id');

        // Second call returns existing
        $response2 = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload);
        $response2->assertStatus(200);
        $response2->assertJsonPath('idempotent', true);
        $orderId2 = $response2->json('order.id');

        // Same order
        $this->assertEquals($orderId1, $orderId2);

        // Only 1 order in DB
        $this->assertEquals(1, Order::where('client_txn_id', $clientTxnId)->count());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function checkout_without_client_txn_id_creates_new_orders()
    {
        $payload = $this->makePayload(null);

        $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload)
            ->assertStatus(201);

        $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload)
            ->assertStatus(201);

        // Two orders should exist
        $this->assertDatabaseCount('orders', 2);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function checkout_requires_authentication()
    {
        $payload = $this->makePayload();

        $this->postJson('/api/pos/checkout', $payload)
            ->assertStatus(401);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function checkout_requires_cashier_role()
    {
        $finance = User::create([
            'name' => 'Finance User',
            'email' => 'finance-' . Str::random(6) . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'finance',
        ]);

        $payload = $this->makePayload();

        $this->actingAs($finance)
            ->postJson('/api/pos/checkout', $payload)
            ->assertStatus(403);
    }

    private function makePayload(?string $clientTxnId = 'default'): array
    {
        return [
            'channel' => 'pos',
            'payment_method' => 'cash',
            'fulfillment_method' => 'in_store',
            'staff_id' => (string) $this->staff->id,
            'subtotal' => 10.00,
            'discount_amount' => 0,
            'vat_amount' => 0.70,
            'total' => 10.70,
            'client_txn_id' => $clientTxnId === 'default' ? 'TEST-' . Str::uuid() : $clientTxnId,
            'items' => [
                [
                    'product_id' => (string) $this->product->id,
                    'qty' => 1,
                    'unit_price' => 10.00,
                    'line_total' => 10.00,
                ]
            ],
        ];
    }
}
