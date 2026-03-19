<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('payroll_logs')) return;
        Schema::create('payroll_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('pay_period_start');
            $table->date('pay_period_end');
            $table->decimal('total_hours', 8, 2)->default(0);
            $table->decimal('pay_rate', 10, 2)->nullable();
            $table->decimal('gross_pay', 10, 2)->default(0);
            $table->decimal('amount', 10, 2)->default(0);
            $table->enum('status', ['draft', 'pending', 'approved', 'paid'])->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('payroll_logs');
    }
};
