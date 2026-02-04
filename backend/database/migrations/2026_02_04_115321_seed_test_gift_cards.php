<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        $testCards = [
            [
                'code' => 'BVC-TEST-25',
                'initial_balance' => 25.00,
                'balance' => 25.00,
                'is_active' => true,
            ],
            [
                'code' => 'BVC-TEST-50',
                'initial_balance' => 50.00,
                'balance' => 50.00,
                'is_active' => true,
            ],
            [
                'code' => 'BVC-USED-100',
                'initial_balance' => 100.00,
                'balance' => 45.50,
                'is_active' => true,
            ],
            [
                'code' => 'BVC-VOID-10',
                'initial_balance' => 10.00,
                'balance' => 0.00,
                'is_active' => false,
            ],
        ];

        foreach ($testCards as $card) {
            DB::table('gift_cards')->insert(array_merge($card, [
                'id' => (string) Str::uuid(),
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    public function down(): void
    {
        DB::table('gift_cards')->where('code', 'like', 'BVC-%')->delete();
    }
};
