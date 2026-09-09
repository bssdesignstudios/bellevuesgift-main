<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Move the storefront Coming Soon switch into the database and turn it ON.
 *
 * Until now the flag lived only in .env, and .github/workflows/deploy.yml
 * rewrote it to false on every deploy — so the public storefront was live
 * despite docs/agent-control/EXECUTION_PROTOCOL.md:103-104 requiring Coming
 * Soon mode until launch.
 *
 * After this runs, Admin → Settings → "Coming Soon Page" is the only thing
 * that changes the state. This migration does not run again, so an admin
 * turning the storefront on later is not undone by a subsequent deploy.
 */
return new class extends Migration
{
    public function up(): void
    {
        $existing = DB::table('store_settings')->where('key', 'maintenance_mode')->first();

        if ($existing) {
            DB::table('store_settings')
                ->where('key', 'maintenance_mode')
                ->update(['value' => '1', 'updated_at' => now()]);

            return;
        }

        DB::table('store_settings')->insert([
            'id' => (string) Str::uuid(),
            'key' => 'maintenance_mode',
            'value' => '1',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('store_settings')->where('key', 'maintenance_mode')->update([
            'value' => '0',
            'updated_at' => now(),
        ]);
    }
};
