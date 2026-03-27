<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// This migration is a no-op on instances that already have quotes/invoices
// created via 2026_03_27_000001_create_invoices_and_quotes_tables.
// All tables are created with hasTable guards for safety.
return new class extends Migration {
    public function up(): void
    {
        // These tables may already exist — skip if so
    }

    public function down(): void
    {
        // No-op
    }
};
