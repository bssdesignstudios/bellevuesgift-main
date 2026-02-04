<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::unprepared("
            CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq START 1;

            CREATE OR REPLACE FUNCTION generate_order_number()
            RETURNS text
            LANGUAGE plpgsql
            AS $$
            DECLARE
                new_order_num text;
                year text;
            BEGIN
                year := to_char(now(), 'YYYY');
                -- Select next value from sequence
                new_order_num := 'BLV-' || year || '-' || lpad(nextval('orders_order_number_seq')::text, 6, '0');
                RETURN new_order_num;
            END;
            $$;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::unprepared("
            DROP FUNCTION IF EXISTS generate_order_number();
            DROP SEQUENCE IF EXISTS orders_order_number_seq;
        ");
    }
};
