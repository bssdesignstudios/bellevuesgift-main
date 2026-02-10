<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Role: Builder
 * Rationale: Create gift card transactions table for ledger-based balance tracking.
 * This ensures balance is computed from transaction history, not mutated directly.
 */
return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('gift_card_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('gift_card_id')->constrained('gift_cards')->cascadeOnDelete();
            $table->foreignUuid('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignUuid('staff_id')->nullable();
            $table->decimal('amount', 10, 2); // Positive for credit, negative for debit
            $table->enum('type', ['credit', 'debit', 'adjustment']);
            $table->string('description')->nullable();
            $table->string('reference')->nullable(); // e.g., order number, adjustment reason
            $table->timestamps();

            // Index for balance computation queries
            $table->index(['gift_card_id', 'created_at']);
        });

        // Add unique index to orders.pickup_code (if not null)
        Schema::table('orders', function (Blueprint $table) {
            $table->index('pickup_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['pickup_code']);
        });

        Schema::dropIfExists('gift_card_transactions');
    }
};
