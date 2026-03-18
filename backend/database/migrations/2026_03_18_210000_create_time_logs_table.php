<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('staff_id')->nullable();
            $table->foreign('staff_id')->references('id')->on('users')->nullOnDelete();
            $table->string('staff_name');
            $table->timestamp('clock_in');
            $table->timestamp('clock_out')->nullable();
            $table->decimal('hours', 5, 2)->nullable();
            $table->string('task')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['in_progress', 'completed', 'pending_review'])->default('in_progress');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_logs');
    }
};
