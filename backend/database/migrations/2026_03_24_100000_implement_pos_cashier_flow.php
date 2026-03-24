<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Enhance register_sessions
        if (Schema::hasTable('register_sessions')) {
            Schema::table('register_sessions', function (Blueprint $table) {
                if (!Schema::hasColumn('register_sessions', 'status')) {
                    $table->string('status')->default('open')->index();
                }
                if (!Schema::hasColumn('register_sessions', 'closed_by_user_id')) {
                    $table->foreignId('closed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn('register_sessions', 'variance')) {
                    $table->decimal('variance', 10, 2)->nullable();
                }
            });
        }

        // 2. Cashier change/break logs
        if (!Schema::hasTable('pos_cashier_logs')) {
            Schema::create('pos_cashier_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('register_session_id');
                $table->foreign('register_session_id')->references('id')->on('register_sessions')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('action'); // login, logout, switch_out, switch_in, break_start, break_end
                $table->timestamp('acted_at')->useCurrent();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // 3. Refund Approvals
        if (!Schema::hasTable('pos_refund_approvals')) {
            Schema::create('pos_refund_approvals', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('register_session_id')->nullable();
                $table->foreign('register_session_id')->references('id')->on('register_sessions')->nullOnDelete();
                $table->foreignId('cashier_user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('admin_user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
                $table->decimal('refund_amount', 10, 2);
                $table->string('reason', 500)->nullable();
                $table->timestamp('approved_at')->useCurrent();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_refund_approvals');
        Schema::dropIfExists('pos_cashier_logs');

        Schema::table('register_sessions', function (Blueprint $table) {
            $table->dropColumn(['status', 'closed_by_user_id', 'variance']);
        });
    }
};
