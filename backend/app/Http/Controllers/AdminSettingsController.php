<?php

namespace App\Http\Controllers;

use App\Models\StoreSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminSettingsController extends Controller
{
    /**
     * Get all settings (key/value pairs).
     */
    public function index()
    {
        // Ensure module flags exist with defaults
        StoreSetting::ensureModuleFlagsExist();

        $settings = StoreSetting::orderBy('key')->get()
            ->mapWithKeys(fn($s) => [$s->key => $s->value]);

        return response()->json($settings);
    }

    /**
     * Bulk update settings.
     * Expects JSON body: { "key1": "value1", "key2": "value2", ... }
     */
    public function update(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
        ]);

        foreach ($request->settings as $key => $value) {
            StoreSetting::updateOrCreate(
                ['key' => $key],
                ['value' => (string) $value]
            );
        }

        $settings = StoreSetting::orderBy('key')->get()
            ->mapWithKeys(fn($s) => [$s->key => $s->value]);

        return response()->json($settings);
    }

    /**
     * Get module flags only.
     */
    public function modules()
    {
        StoreSetting::ensureModuleFlagsExist();

        $modules = StoreSetting::where('key', 'like', 'module.%')
            ->get()
            ->mapWithKeys(fn($s) => [
                str_replace('module.', '', $s->key) => in_array(strtolower($s->value), ['1', 'true', 'yes', 'on']),
            ]);

        return response()->json($modules);
    }

    /**
     * Toggle a single module on/off.
     */
    public function toggleModule(Request $request, string $module)
    {
        $key = 'module.' . $module;

        $setting = StoreSetting::where('key', $key)->first();

        if (!$setting) {
            return response()->json(['message' => 'Module not found'], 404);
        }

        $currentlyEnabled = in_array(strtolower($setting->value), ['1', 'true', 'yes', 'on']);
        $setting->update(['value' => $currentlyEnabled ? '0' : '1']);

        return response()->json([
            'module' => $module,
            'enabled' => !$currentlyEnabled,
        ]);
    }
}
