<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Phase 2A: Extend repair_tickets for backend walk-in intake and technician workflow.
     *
     * Uses Schema::hasColumn guards throughout - safe to run even if some columns
     * were added by a previous migration or a manual ALTER.
     */
    public function up(): void
    {
        Schema::table('repair_tickets', function (Blueprint $table) {
            // Intake metadata
            if (!Schema::hasColumn('repair_tickets', 'intake_source')) {
                $table->string('intake_source')->default('walk-in')->after('notes');
            }
            if (!Schema::hasColumn('repair_tickets', 'priority')) {
                $table->string('priority')->default('normal')->after('intake_source');
            }

            // Device classification (separate from service_type = repair/installation)
            if (!Schema::hasColumn('repair_tickets', 'device_type')) {
                $table->string('device_type')->nullable()->after('service_type');
            }

            // Walk-in intake fields
            if (!Schema::hasColumn('repair_tickets', 'accessories')) {
                $table->text('accessories')->nullable()->after('problem_description');
            }
            if (!Schema::hasColumn('repair_tickets', 'condition_notes')) {
                $table->text('condition_notes')->nullable()->after('accessories');
            }

            // Cost fields
            if (!Schema::hasColumn('repair_tickets', 'estimated_cost')) {
                $table->decimal('estimated_cost', 10, 2)->nullable()->after('condition_notes');
            }

            // Staff notes (internal, not shown to customer)
            if (!Schema::hasColumn('repair_tickets', 'internal_notes')) {
                $table->text('internal_notes')->nullable()->after('notes');
            }

            // Technician assignment
            if (!Schema::hasColumn('repair_tickets', 'assigned_staff_id')) {
                // staff.id is uuid
                $table->uuid('assigned_staff_id')->nullable()->after('internal_notes');
            }
            if (!Schema::hasColumn('repair_tickets', 'assigned_at')) {
                $table->timestamp('assigned_at')->nullable()->after('assigned_staff_id');
            }

            // Audit: who created this ticket from the backend (users.id = bigint)
            if (!Schema::hasColumn('repair_tickets', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('assigned_at');
            }

            // Payment tracking directly on ticket (avoids touching orders/payments table)
            if (!Schema::hasColumn('repair_tickets', 'amount_paid')) {
                $table->decimal('amount_paid', 10, 2)->default(0)->after('created_by');
            }
            if (!Schema::hasColumn('repair_tickets', 'payment_status')) {
                // unpaid | partial | paid
                $table->string('payment_status')->default('unpaid')->after('amount_paid');
            }
        });

        // Audit / event log for repair tickets
        if (!Schema::hasTable('repair_ticket_logs')) {
            Schema::create('repair_ticket_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('repair_ticket_id');
                $table->unsignedBigInteger('user_id')->nullable(); // users.id (bigint)
                $table->string('action');                          // status_changed, technician_assigned, payment_recorded, etc.
                $table->json('details')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('repair_ticket_id')
                    ->references('id')->on('repair_tickets')
                    ->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_ticket_logs');

        Schema::table('repair_tickets', function (Blueprint $table) {
            $columns = [
                'intake_source', 'priority', 'device_type', 'accessories',
                'condition_notes', 'estimated_cost', 'internal_notes',
                'assigned_staff_id', 'assigned_at', 'created_by',
                'amount_paid', 'payment_status',
            ];
            foreach ($columns as $col) {
                if (Schema::hasColumn('repair_tickets', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
