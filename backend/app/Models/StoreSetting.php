<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreSetting extends Model
{
    protected $table = 'store_settings';

    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
    ];

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

    public static function ensureModuleFlagsExist(): void
    {
        foreach (self::MODULE_DEFAULTS as $key => $value) {
            self::firstOrCreate(['key' => $key], ['value' => $value]);
        }
    }

    public static function isModuleEnabled(string $module): bool
    {
        $key = 'module_' . $module;
        $default = self::MODULE_DEFAULTS[$key] ?? '1';
        $value = self::query()->where('key', $key)->value('value');
        return self::normalizeBool($value ?? $default);
    }

    private static function normalizeBool(string $value): bool
    {
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }
}
