<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Expand roles in staff table — use DB-driver-safe approach
        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            // PostgreSQL: drop old check constraint and add new one with expanded roles
            DB::statement("ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check");
            DB::statement("ALTER TABLE staff ADD CONSTRAINT staff_role_check CHECK (role::text = ANY (ARRAY['cashier','warehouse_manager','admin','warehouse','finance']::text[]))");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE staff MODIFY COLUMN role ENUM('cashier', 'warehouse_manager', 'admin', 'warehouse', 'finance') NOT NULL");
        }
        // SQLite: no-op (enum is just text)

        // 2. Add impersonation_logs table
        if (!Schema::hasTable('impersonation_logs')) {
            Schema::create('impersonation_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('target_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('started_at')->useCurrent();
                $table->timestamp('ended_at')->nullable();
                $table->timestamps();
            });
        }

        // 3. Update inventory_adjustments for better auditing
        if (!Schema::hasColumn('inventory_adjustments', 'old_qty')) {
            Schema::table('inventory_adjustments', function (Blueprint $table) {
                $table->integer('old_qty')->nullable();
                $table->integer('new_qty')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->dropColumn(['old_qty', 'new_qty']);
        });

        Schema::dropIfExists('impersonation_logs');

        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check");
            DB::statement("ALTER TABLE staff ADD CONSTRAINT staff_role_check CHECK (role::text = ANY (ARRAY['cashier','warehouse_manager','admin']::text[]))");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE staff MODIFY COLUMN role ENUM('cashier', 'warehouse_manager', 'admin') NOT NULL");
        }
    }
};
