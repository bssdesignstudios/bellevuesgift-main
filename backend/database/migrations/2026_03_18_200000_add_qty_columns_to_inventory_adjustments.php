<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->integer('old_qty')->default(0)->after('qty_change');
            $table->integer('new_qty')->default(0)->after('old_qty');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->dropColumn(['old_qty', 'new_qty']);
        });
    }
};
