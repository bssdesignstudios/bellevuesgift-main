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
        Schema::table('payments', function (Blueprint $table) {
            $table->uuid('order_id')->nullable()->change();
            $table->foreignUuid('repair_ticket_id')->nullable()->after('order_id')->constrained('repair_tickets')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['repair_ticket_id']);
            $table->dropColumn('repair_ticket_id');
            $table->uuid('order_id')->nullable(false)->change();
        });
    }
};
