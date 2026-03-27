<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('customer_ledger_entries')) {
            Schema::create('customer_ledger_entries', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
                $table->enum('entry_type', ['charge', 'payment', 'credit', 'adjustment']);
                $table->string('reference_type')->nullable();
                $table->uuid('reference_id')->nullable();
                $table->decimal('amount', 10, 2);
                $table->decimal('balance_after', 10, 2)->nullable();
                $table->text('notes')->nullable();
                $table->date('entry_date')->useCurrent();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_ledger_entries');
    }
};
