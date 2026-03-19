<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('recurring_bills')) return;
        Schema::create('recurring_bills', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('vendor_payee')->nullable();
            $table->decimal('amount', 10, 2);
            $table->enum('billing_cycle', ['weekly', 'monthly', 'quarterly', 'yearly'])->default('monthly');
            $table->date('next_due_date');
            $table->string('category')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('recurring_bills');
    }
};
