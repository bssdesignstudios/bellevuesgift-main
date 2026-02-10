<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('repair_tickets', function (Blueprint $table) {
            if (!Schema::hasColumn('repair_tickets', 'deposit_paid')) {
                $table->boolean('deposit_paid')->default(false)->after('deposit_required');
            }
            if (!Schema::hasColumn('repair_tickets', 'deposit_amount')) {
                $table->decimal('deposit_amount', 10, 2)->nullable()->after('deposit_paid');
            }
            if (!Schema::hasColumn('repair_tickets', 'total_cost')) {
                $table->decimal('total_cost', 10, 2)->nullable()->after('deposit_amount');
            }
            if (!Schema::hasColumn('repair_tickets', 'payment_status')) {
                $table->string('payment_status')->default('pending')->after('total_cost');
            }
        });
    }

    public function down(): void
    {
        Schema::table('repair_tickets', function (Blueprint $table) {
            $columns = [];
            foreach (['deposit_paid', 'deposit_amount', 'total_cost', 'payment_status'] as $col) {
                if (Schema::hasColumn('repair_tickets', $col)) {
                    $columns[] = $col;
                }
            }
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
