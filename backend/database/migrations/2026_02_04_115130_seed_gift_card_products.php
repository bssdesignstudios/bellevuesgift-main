<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        $categoryId = (string) Str::uuid();

        // Create Category
        DB::table('categories')->insert([
            'id' => $categoryId,
            'name' => 'Gift Cards',
            'slug' => 'gift-cards',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $giftCards = [
            [
                'name' => 'Bellevue Gift Card - $25',
                'slug' => 'bellevue-gift-card-25',
                'sku' => 'GC-BEL-25',
                'price' => 25.00,
                'card_color' => 'blue',
                'hex_code' => '#3b82f6', // blue-500
            ],
            [
                'name' => 'Bellevue Gift Card - $50',
                'slug' => 'bellevue-gift-card-50',
                'sku' => 'GC-BEL-50',
                'price' => 50.00,
                'card_color' => 'green',
                'hex_code' => '#10b981', // emerald-500
            ],
            [
                'name' => 'Bellevue Gift Card - $100',
                'slug' => 'bellevue-gift-card-100',
                'sku' => 'GC-BEL-100',
                'price' => 100.00,
                'card_color' => 'purple',
                'hex_code' => '#8b5cf6', // violet-500
            ],
            [
                'name' => 'Bellevue Gift Card - $250',
                'slug' => 'bellevue-gift-card-250',
                'sku' => 'GC-BEL-250',
                'price' => 250.00,
                'card_color' => 'amber',
                'hex_code' => '#f59e0b', // amber-500
            ],
        ];

        foreach ($giftCards as $card) {
            $productId = (string) Str::uuid();
            DB::table('products')->insert(array_merge($card, [
                'id' => $productId,
                'category_id' => $categoryId,
                'description' => 'Give the gift of choice with a Bellevue Gift Card. Valid for all products online and in-store.',
                'image_url' => null, // We can use the hex_code for a dynamic card
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]));

            // Add virtual inventory
            DB::table('inventory')->insert([
                'id' => (string) Str::uuid(),
                'product_id' => $productId,
                'qty_on_hand' => 9999, // Virtual product
                'reorder_level' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('products')->where('sku', 'like', 'GC-BEL-%')->delete();
        DB::table('categories')->where('slug', 'gift-cards')->delete();
    }
};
