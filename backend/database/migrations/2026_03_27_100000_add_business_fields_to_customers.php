<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'account_type')) {
                $table->string('account_type')->default('personal')->after('is_favorite');
            }
            if (!Schema::hasColumn('customers', 'business_name')) {
                $table->string('business_name')->nullable()->after('account_type');
            }
            if (!Schema::hasColumn('customers', 'contact_person')) {
                $table->string('contact_person')->nullable()->after('business_name');
            }
            if (!Schema::hasColumn('customers', 'vat_number')) {
                $table->string('vat_number')->nullable()->after('contact_person');
            }
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumnIfExists(['account_type', 'business_name', 'contact_person', 'vat_number']);
        });
    }
};
