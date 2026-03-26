<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Production data-fix: products that were saved with cost = 0.00 (not NULL)
 * had their price forcibly recalculated to $0.00 by the Product saving hook.
 *
 * Safe fix: set cost = NULL where cost = 0 AND the product is not a gift card.
 * This removes the bad cost value so future saves no longer trigger the hook,
 * while leaving price as-is (admin must correct prices manually in the UI).
 *
 * Gift-card products (SKU prefix GC-) are excluded because their prices are
 * always correct and they never use the cost/markup fields.
 */
return new class extends Migration {
    public function up(): void
    {
        DB::table('products')
            ->where('cost', 0)
            ->where('sku', 'not like', 'GC-%')
            ->update(['cost' => null]);
    }

    public function down(): void
    {
        // No rollback: we cannot safely restore cost = 0 because
        // that was the value causing the pricing bug in the first place.
    }
};
