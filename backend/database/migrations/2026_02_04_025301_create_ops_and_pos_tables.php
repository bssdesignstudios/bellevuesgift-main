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
        Schema::create('staff', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('email')->unique();
            $table->enum('role', ['cashier', 'warehouse_manager', 'admin']);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('registers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('location')->default('Freeport Store');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('register_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('register_id')->constrained('registers')->cascadeOnDelete();
            $table->foreignUuid('staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->decimal('opening_balance', 10, 2)->default(0);
            $table->decimal('closing_balance', 10, 2)->nullable();
            $table->decimal('expected_balance', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('pos_activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('register_id')->nullable()->constrained('registers')->nullOnDelete();
            $table->foreignUuid('staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->string('action');
            $table->json('details')->nullable();
            $table->timestamps();
        });

        Schema::create('offline_queue', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('register_id')->nullable()->constrained('registers')->nullOnDelete();
            $table->foreignUuid('staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->string('transaction_type');
            $table->json('payload');
            $table->enum('status', ['pending', 'synced', 'failed'])->default('pending');
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });

        Schema::create('repair_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('ticket_number')->unique();
            $table->string('customer_name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('preferred_contact')->default('phone');
            $table->enum('service_type', ['repair', 'installation']);
            $table->string('item_make')->nullable();
            $table->string('model_number')->nullable();
            $table->string('serial_number')->nullable();
            $table->text('problem_description');
            $table->enum('dropoff_method', ['in-store', 'pickup'])->default('in-store');
            $table->date('requested_date')->nullable();
            $table->json('photos_urls')->nullable();
            $table->boolean('deposit_required')->default(false);
            $table->decimal('deposit_amount', 10, 2)->default(0);
            $table->boolean('deposit_paid')->default(false);
            $table->text('notes')->nullable();
            $table->enum('status', ['submitted', 'received', 'diagnosing', 'awaiting_parts', 'in_progress', 'ready_for_pickup', 'completed', 'cancelled'])->default('submitted');
            $table->date('eta_date')->nullable();
            $table->json('parts_list')->nullable();
            $table->decimal('labor_hours', 10, 2)->default(0);
            $table->decimal('labor_rate', 10, 2)->default(50);
            $table->decimal('parts_cost', 10, 2)->default(0);
            $table->decimal('total_cost', 10, 2)->default(0);
            $table->foreignUuid('assigned_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->foreignUuid('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('repair_tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ticket_id')->constrained('repair_tickets')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['todo', 'doing', 'done'])->default('todo');
            $table->foreignUuid('assigned_to')->nullable()->constrained('staff')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });


        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('staff_id')->references('id')->on('staff')->nullOnDelete();
            $table->foreign('register_id')->references('id')->on('registers')->nullOnDelete();
        });

        Schema::table('loyalty_transactions', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('orders')->nullOnDelete();
        });

        // staff_id foreign key removed to avoid duplicate column error if already present
        // Schema::table('inventory_adjustments', function (Blueprint $table) {
        //     $table->foreign('staff_id')->references('id')->on('staff')->nullOnDelete();
        // });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loyalty_transactions', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['staff_id']);
            $table->dropForeign(['register_id']);
        });
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->dropForeign(['staff_id']);
        });

        Schema::dropIfExists('repair_tasks');
        Schema::dropIfExists('repair_tickets');
        Schema::dropIfExists('offline_queue');
        Schema::dropIfExists('pos_activity_logs');
        Schema::dropIfExists('register_sessions');
        Schema::dropIfExists('registers');
        Schema::dropIfExists('staff');
    }
};
