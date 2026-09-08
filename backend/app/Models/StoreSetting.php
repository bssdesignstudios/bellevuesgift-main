<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * StoreSetting — key/value settings row.
 *
 * NOTE ON THE PRIMARY KEY: the store_settings table's real primary key is a
 * uuid `id` column (see 2026_02_04_025242_create_order_management_tables.php)
 * which is NOT NULL and has no database default. This model previously declared
 * $primaryKey = 'key', so every insert omitted `id` and threw a NOT NULL
 * violation — which took out /admin/* and /pos/login, because ModuleGate calls
 * ensureModuleFlagsExist() on every request. Keep HasUuid on this model.
 */
class StoreSetting extends Model
{
    use \App\Traits\HasUuid;

    protected $table = 'store_settings';

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

    /**
     * Insert any missing module flag rows.
     *
     * Reads the existing keys once and only writes what is actually missing —
     * this runs on every admin/POS request via ModuleGate, so the old
     * 23-firstOrCreate loop was 23 selects + 23 potential inserts per request.
     */
    public static function ensureModuleFlagsExist(): void
    {
        $existing = static::query()->pluck('key')->all();
        $missing = array_diff_key(self::MODULE_DEFAULTS, array_flip($existing));

        foreach ($missing as $key => $value) {
            static::firstOrCreate(['key' => $key], ['value' => $value]);
        }
    }

    public static function isModuleEnabled(string $module): bool
    {
        $key = 'module_' . $module;
        $default = self::MODULE_DEFAULTS[$key] ?? '1';
        $value = static::query()->where('key', $key)->value('value');

        return self::normalizeBool($value ?? $default);
    }

    /**
     * Is the public storefront currently showing the Coming Soon page?
     *
     * Falls back to the MAINTENANCE_MODE env flag when the settings table or
     * row is not available, so a database blip can never 500 every request.
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

            $value = static::query()->where('key', self::MAINTENANCE_KEY)->value('value');

            return self::$maintenanceMemo = $value === null
                ? $fallback
                : self::normalizeBool($value);
        } catch (\Throwable $e) {
            return self::$maintenanceMemo = $fallback;
        }
    }

    public static function setMaintenanceMode(bool $enabled): bool
    {
        static::updateOrCreate(
            ['key' => self::MAINTENANCE_KEY],
            ['value' => $enabled ? '1' : '0']
        );

        self::$maintenanceMemo = null;

        return self::isMaintenanceMode();
    }

    private static function normalizeBool(string $value): bool
    {
        $normalized = strtolower(trim($value));

        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }
}
