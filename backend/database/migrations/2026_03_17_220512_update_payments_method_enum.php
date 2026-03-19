<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = \Illuminate\Support\Facades\DB::getDriverName();
        if ($driver === 'pgsql') {
            // PostgreSQL: drop the check constraint to allow any string value
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check");
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE payments ALTER COLUMN method TYPE varchar(255)");
        } else {
            Schema::table('payments', function (Blueprint $table) {
                $table->string('method')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->enum('method', ['cash', 'card', 'gift_card'])->change();
        });
    }
};
