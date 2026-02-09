<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Role: Builder
 * Adds pickup tracking columns and unique index on pickup_code.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Add pickup tracking columns if they don't exist
            if (!Schema::hasColumn('orders', 'picked_up_at')) {
                $table->timestamp('picked_up_at')->nullable()->after('fulfillment_method');
            }
            if (!Schema::hasColumn('orders', 'picked_up_by')) {
                $table->uuid('picked_up_by')->nullable()->after('picked_up_at');
            }

            // Add unique index on pickup_code for fast lookups and constraint
            // Use a partial unique index to allow nulls
        });

        // Add unique index (MySQL doesn't support partial indexes, so we handle nulls differently)
        // Only add if not already indexed
        try {
            Schema::table('orders', function (Blueprint $table) {
                $table->unique('pickup_code', 'orders_pickup_code_unique');
            });
        } catch (\Exception $e) {
            // Index may already exist
        }
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['picked_up_at', 'picked_up_by']);
        });

        try {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropUnique('orders_pickup_code_unique');
            });
        } catch (\Exception $e) {
            // Index may not exist
        }
    }
};
