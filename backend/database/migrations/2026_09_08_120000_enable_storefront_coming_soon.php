<?php

use App\Models\StoreSetting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Move the storefront Coming Soon switch into the database and turn it ON.
 *
 * Until now the flag lived only in .env, and .github/workflows/deploy.yml
 * rewrote it to false on every deploy — so the public storefront was live
 * despite docs/agent-control/EXECUTION_PROTOCOL.md:103-104 requiring Coming
 * Soon mode until launch.
 *
 * ⚠️ The first version of this migration hard-coded an `id` in the insert and
 * FAILED on production: the live PostgreSQL store_settings table has no `id`
 * column, while local sqlite has a uuid primary key that is NOT NULL with no
 * default. The column list is therefore built from the schema at runtime.
 * See the class docblock on App\Models\StoreSetting.
 *
 * After this runs, Admin → Settings → "Coming Soon Page" is the only thing
 * that changes the state.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('store_settings')) {
            return;
        }

        $updated = DB::table('store_settings')
            ->where('key', StoreSetting::MAINTENANCE_KEY)
            ->update(['value' => '1', 'updated_at' => now()]);

        if ($updated > 0) {
            return;
        }

        $row = [
            'key' => StoreSetting::MAINTENANCE_KEY,
            'value' => '1',
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('store_settings', 'id')) {
            $row['id'] = (string) Str::uuid();
        }

        DB::table('store_settings')->insertOrIgnore($row);
    }

    public function down(): void
    {
        if (! Schema::hasTable('store_settings')) {
            return;
        }

        DB::table('store_settings')
            ->where('key', StoreSetting::MAINTENANCE_KEY)
            ->update(['value' => '0', 'updated_at' => now()]);
    }
};
