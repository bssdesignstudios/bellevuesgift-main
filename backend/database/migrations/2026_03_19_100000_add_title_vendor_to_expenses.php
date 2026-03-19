<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            if (!Schema::hasColumn('expenses', 'title')) {
                $table->string('title')->nullable()->after('id');
            }
            if (!Schema::hasColumn('expenses', 'vendor_payee')) {
                $table->string('vendor_payee')->nullable()->after('title');
            }
        });
    }
    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn(['title', 'vendor_payee']);
        });
    }
};
