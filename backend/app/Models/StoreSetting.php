<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * StoreSetting — key/value settings row.
 *
 * ⚠️ THE TWO SCHEMAS. 2026_02_04_025242_create_order_management_tables.php
 * declares store_settings with a uuid `id` primary key, and local sqlite has
 * exactly that — NOT NULL, no default. PRODUCTION POSTGRES DOES NOT: the live
 * table has no `id` column at all, so its key is `key`. The table there was
 * clearly not created by that migration.
 *
 * Every WRITE in this class therefore goes through the query builder and adds
 * `id` only when the column actually exists. Do not switch these back to
 * Eloquent creates or add a uuid trait — an insert carrying `id` dies on
 * production, and one omitting it dies locally. This is the only shape that
 * survives both, and ModuleGate calls ensureModuleFlagsExist() on every
 * /admin and /pos/login request, so getting it wrong takes the POS down.
 */
class StoreSetting extends Model
{
    protected $table = 'store_settings';

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Storefront Coming Soon mode. Stored in the database — NOT in .env — so
     * that the Admin → Settings toggle is the single source of truth and no
     * deploy can silently republish the storefront.
     */
    public const MAINTENANCE_KEY = 'maintenance_mode';

    private const MODULE_DEFAULTS = [
        'module_dashboard' => '1',
        'module_pos' => '1',
        'module_registers' => '1',
        'module_inventory' => '1',
        'module_products' => '1',
        'module_categories' => '1',
        'module_orders' => '1',
        'module_repairs' => '1',
        'module_customers' => '1',
        'module_vendors' => '1',
        'module_staff' => '1',
        'module_discounts' => '1',
        'module_reports' => '1',
        'module_expenses' => '1',
        'module_settings' => '1',
        'module_help' => '1',
        'module_gift_cards' => '0',
        'module_timesheets' => '0',
        'module_payroll' => '0',
        'module_quotes' => '0',
        'module_invoices' => '0',
        'module_statements' => '0',
        'module_advanced_platform' => '0',
    ];

    /** Per-request memo so the middleware does not re-query on every lookup. */
    private static ?bool $maintenanceMemo = null;

    /** Per-request memo for the schema difference described in the class docblock. */
    private static ?bool $hasIdColumn = null;

    private static function hasIdColumn(): bool
    {
        if (self::$hasIdColumn === null) {
            try {
                self::$hasIdColumn = Schema::hasColumn('store_settings', 'id');
            } catch (\Throwable $e) {
                self::$hasIdColumn = false;
            }
        }

        return self::$hasIdColumn;
    }

    /** Build an insert row that suits whichever schema this environment has. */
    private static function row(string $key, string $value): array
    {
        $row = [
            'key' => $key,
            'value' => $value,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (self::hasIdColumn()) {
            $row['id'] = (string) Str::uuid();
        }

        return $row;
    }

    /**
     * Insert any missing module flag rows.
     *
     * Reads the existing keys once and only writes what is actually missing —
     * this runs on every admin/POS request via ModuleGate, so the old
     * 23-firstOrCreate loop was 23 selects + 23 potential inserts per request.
     */
    public static function ensureModuleFlagsExist(): void
    {
        $existing = DB::table('store_settings')->pluck('key')->all();
        $missing = array_diff_key(self::MODULE_DEFAULTS, array_flip($existing));

        foreach ($missing as $key => $value) {
            DB::table('store_settings')->insertOrIgnore(self::row($key, $value));
        }
    }

    public static function isModuleEnabled(string $module): bool
    {
        $key = 'module_' . $module;
        $default = self::MODULE_DEFAULTS[$key] ?? '1';
        $value = DB::table('store_settings')->where('key', $key)->value('value');

        return self::normalizeBool($value ?? $default);
    }

    /**
     * Is the public storefront currently showing the Coming Soon page?
     *
     * No row yet (fresh install) falls back to the MAINTENANCE_MODE env flag.
     * A database ERROR fails CLOSED — see the catch block for why.
     */
    public static function isMaintenanceMode(): bool
    {
        if (self::$maintenanceMemo !== null) {
            return self::$maintenanceMemo;
        }

        $fallback = (bool) config('app.maintenance_mode', false);

        try {
            if (! Schema::hasTable('store_settings')) {
                return self::$maintenanceMemo = $fallback;
            }

            $value = DB::table('store_settings')->where('key', self::MAINTENANCE_KEY)->value('value');

            return self::$maintenanceMemo = $value === null
                ? $fallback
                : self::normalizeBool($value);
        } catch (\Throwable $e) {
            // Fail CLOSED. If the settings table cannot be read the app is
            // already unwell, and serving a broken storefront to the public is
            // worse than serving the Coming Soon page. Staff tools are
            // unaffected: they match BYPASS_PREFIXES before this is consulted.
            report($e);

            return self::$maintenanceMemo = true;
        }
    }

    public static function setMaintenanceMode(bool $enabled): bool
    {
        $value = $enabled ? '1' : '0';

        $updated = DB::table('store_settings')
            ->where('key', self::MAINTENANCE_KEY)
            ->update(['value' => $value, 'updated_at' => now()]);

        if ($updated === 0) {
            DB::table('store_settings')->insertOrIgnore(self::row(self::MAINTENANCE_KEY, $value));
        }

        self::$maintenanceMemo = null;

        return self::isMaintenanceMode();
    }

    private static function normalizeBool(string $value): bool
    {
        $normalized = strtolower(trim($value));

        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }
}
