<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fix orders table enum constraints that block POS checkout.
 *
 * - fulfillment_method: add 'in_store' (POS sends this for walk-in sales)
 * - status: add 'completed' and 'ready_for_pickup' (used by checkout controller)
 */
return new class extends Migration {
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            // Convert fulfillment_method enum to varchar so any value is accepted
            DB::statement("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_method_check");
            DB::statement("ALTER TABLE orders ALTER COLUMN fulfillment_method TYPE varchar(255)");

            // Convert status enum to varchar so new statuses are accepted
            DB::statement("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");
            DB::statement("ALTER TABLE orders ALTER COLUMN status TYPE varchar(255)");

            // Convert payment_status enum to varchar
            DB::statement("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check");
            DB::statement("ALTER TABLE orders ALTER COLUMN payment_status TYPE varchar(255)");

            // Convert channel enum to varchar (in case we add more channels)
            DB::statement("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_channel_check");
            DB::statement("ALTER TABLE orders ALTER COLUMN channel TYPE varchar(255)");

            // Convert payment_method enum to varchar (already done for payments table, now for orders)
            DB::statement("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check");
            DB::statement("ALTER TABLE orders ALTER COLUMN payment_method TYPE varchar(255)");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY COLUMN fulfillment_method VARCHAR(255) DEFAULT 'pickup'");
            DB::statement("ALTER TABLE orders MODIFY COLUMN status VARCHAR(255) DEFAULT 'pending'");
            DB::statement("ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(255) DEFAULT 'pending'");
            DB::statement("ALTER TABLE orders MODIFY COLUMN channel VARCHAR(255)");
            DB::statement("ALTER TABLE orders MODIFY COLUMN payment_method VARCHAR(255) NULL");
        }
    }

    public function down(): void
    {
        // Not reverting — expanding enums is safe
    }
};
