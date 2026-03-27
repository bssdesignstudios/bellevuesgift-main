<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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

    private const MODULE_DEFAULTS = [
        'module.dashboard'         => '1',
        'module.pos'               => '1',
        'module.registers'         => '1',
        'module.inventory'         => '1',
        'module.products'          => '1',
        'module.categories'        => '1',
        'module.orders'            => '1',
        'module.repairs'           => '1',
        'module.customers'         => '1',
        'module.vendors'           => '1',
        'module.staff'             => '1',
        'module.discounts'         => '1',
        'module.reports'           => '1',
        'module.expenses'          => '1',
        'module.settings'          => '1',
        'module.help'              => '1',
        'module.gift_cards'        => '0',
        'module.timesheets'        => '0',
        'module.payroll'           => '0',
        'module.quotes'            => '0',
        'module.invoices'          => '0',
        'module.statements'        => '0',
        'module.advanced_platform' => '0',
    ];

    public static function ensureModuleFlagsExist(): void
    {
        foreach (self::MODULE_DEFAULTS as $key => $value) {
            self::firstOrCreate(['key' => $key], ['value' => $value]);
        }
    }

    public static function isModuleEnabled(string $module): bool
    {
        $key = 'module.' . $module;
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
