<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Create inventory records for any product that doesn't have one
        $products = DB::table('products')
            ->whereNotIn('id', DB::table('inventory')->pluck('product_id'))
            ->pluck('id');

        foreach ($products as $productId) {
            DB::table('inventory')->insert([
                'id'            => \Illuminate\Support\Str::uuid(),
                'product_id'    => $productId,
                'qty_on_hand'   => 0,
                'qty_reserved'  => 0,
                'reorder_level' => 0,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Not reversible — don't drop inventory records on rollback
    }
};
