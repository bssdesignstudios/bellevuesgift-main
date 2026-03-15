<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('repair_tickets')) {
            return;
        }
        Schema::create('repair_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('ticket_number')->unique();
            $table->string('customer_name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('preferred_contact')->default('phone');
            $table->string('service_type')->default('repair');
            $table->string('item_make')->nullable();
            $table->string('model_number')->nullable();
            $table->string('serial_number')->nullable();
            $table->text('problem_description');
            $table->string('dropoff_method')->default('in-store');
            $table->date('requested_date')->nullable();
            $table->boolean('deposit_required')->default(false);
            $table->text('notes')->nullable();
            $table->string('status')->default('submitted');
            $table->timestamp('eta_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('repair_tickets');
    }
};
