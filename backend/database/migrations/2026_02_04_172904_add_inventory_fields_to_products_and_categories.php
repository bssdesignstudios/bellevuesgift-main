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
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cost', 10, 2)->nullable()->after('description');
            $table->integer('markup_percentage')->default(0)->after('cost');
            $table->string('vendor')->nullable()->after('markup_percentage');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->string('sku_prefix')->nullable()->after('slug');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['cost', 'markup_percentage', 'vendor']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('sku_prefix');
        });
    }
};
