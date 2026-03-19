<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('payroll_logs')) {
            return;
        }

        Schema::table('payroll_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('payroll_logs', 'total_hours')) {
                $table->decimal('total_hours', 8, 2)->default(0)->after('pay_period_end');
            }
            if (!Schema::hasColumn('payroll_logs', 'pay_rate')) {
                $table->decimal('pay_rate', 10, 2)->nullable()->after('total_hours');
            }
            if (!Schema::hasColumn('payroll_logs', 'gross_pay')) {
                $table->decimal('gross_pay', 10, 2)->default(0)->after('pay_rate');
            }
            if (!Schema::hasColumn('payroll_logs', 'notes')) {
                $table->text('notes')->nullable()->after('gross_pay');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('payroll_logs')) {
            return;
        }

        Schema::table('payroll_logs', function (Blueprint $table) {
            $columns = ['total_hours', 'pay_rate', 'gross_pay', 'notes'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('payroll_logs', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
