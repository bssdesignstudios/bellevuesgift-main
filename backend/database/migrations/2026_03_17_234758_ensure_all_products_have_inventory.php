<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Product;
use App\Models\Inventory;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Ensure every product has an inventory record
        $products = Product::all();
        foreach ($products as $product) {
            Inventory::firstOrCreate(
                ['product_id' => $product->id],
                [
                    'location' => 'Main Warehouse',
                    'qty_on_hand' => 0,
                    'qty_reserved' => 0,
                    'reorder_level' => 5,
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No easy way to reverse this without potentially deleting valid records
    }
};
