<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_number')->unique();
            $table->foreignUuid('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->uuid('staff_id')->nullable(); // Will link to staff table later
            $table->uuid('register_id')->nullable(); // Will link to registers later
            $table->enum('channel', ['web', 'pos']);
            $table->enum('status', ['pending', 'confirmed', 'picking', 'ready', 'picked_up', 'shipped', 'delivered', 'cancelled', 'refunded'])->default('pending');
            $table->enum('fulfillment_method', ['pickup', 'island_delivery', 'mailboat'])->default('pickup');
            $table->enum('payment_status', ['pending', 'paid', 'pay_later', 'refunded', 'partial'])->default('pending');
            $table->enum('payment_method', ['cash', 'card', 'split', 'gift_card', 'pay_later'])->nullable();
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('vat_amount', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('pickup_code')->nullable();
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('sku');
            $table->string('name');
            $table->integer('qty')->default(1);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('line_total', 10, 2);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->enum('method', ['cash', 'card', 'gift_card']);
            $table->string('reference')->nullable();
            $table->timestamps();
        });

        Schema::create('gift_cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->decimal('balance', 10, 2)->default(0);
            $table->decimal('initial_balance', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->enum('discount_type', ['percent', 'fixed']);
            $table->decimal('value', 10, 2);
            $table->decimal('min_order_amount', 10, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('start_at')->nullable();
            $table->timestamp('end_at')->nullable();
            $table->timestamps();
        });

        Schema::create('store_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key')->unique();
            $table->text('value');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_settings');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('gift_cards');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
