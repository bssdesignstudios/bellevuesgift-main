<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Expand roles in staff table
        // Note: For MySQL, we often use string instead of enum if we want to change it easily, 
        // but since it's already an enum, we'll try to update it.
        // If it's SQLite (for tests), enum is just a string.
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE staff MODIFY COLUMN role ENUM('cashier', 'warehouse_manager', 'admin', 'warehouse', 'finance') NOT NULL");
        }

        // 2. Add impersonation_logs table
        Schema::create('impersonation_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('target_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
        });

        // 3. Update inventory_adjustments for better auditing
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->integer('old_qty')->nullable();
            $table->integer('new_qty')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->dropColumn(['old_qty', 'new_qty']);
        });

        Schema::dropIfExists('impersonation_logs');

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE staff MODIFY COLUMN role ENUM('cashier', 'warehouse_manager', 'admin') NOT NULL");
        }
    }
};
