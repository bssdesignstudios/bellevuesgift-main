<?php

namespace App\Http\Controllers;

use App\Models\StoreSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

class AdminSettingsController extends Controller
{
    public function show()
    {
        // Ensure module flags exist in the DB
        if (Schema::hasTable('store_settings')) {
            StoreSetting::ensureModuleFlagsExist();

            $settings = StoreSetting::all()->map(fn($s) => [
                'key'   => $s->key,
                'value' => $s->value,
            ])->toArray();

            // Add maintenance mode from env
            $settings[] = [
                'key'   => 'maintenance_mode',
                'value' => config('app.maintenance_mode', false) ? '1' : '0',
            ];

            return response()->json($settings);
        }

        // Fallback if store_settings table doesn't exist
        return response()->json([
            ['key' => 'maintenance_mode', 'value' => config('app.maintenance_mode', false) ? '1' : '0'],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings'         => 'required|array|min:1',
            'settings.*.key'   => 'required|string',
            'settings.*.value' => 'required|string',
        ]);

        foreach ($validated['settings'] as $setting) {
            StoreSetting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value']]
            );
        }

        return response()->json(['message' => 'Settings saved']);
    }

    public function toggleMaintenance(Request $request)
    {
        $request->validate([
            'enabled' => 'required|boolean',
        ]);

        $enabled = $request->boolean('enabled');
        $envFile = base_path('.env');
        $content = file_get_contents($envFile);

        if (str_contains($content, 'MAINTENANCE_MODE=')) {
            $content = preg_replace('/^MAINTENANCE_MODE=.*/m', 'MAINTENANCE_MODE=' . ($enabled ? 'true' : 'false'), $content);
        } else {
            $content .= "\nMAINTENANCE_MODE=" . ($enabled ? 'true' : 'false') . "\n";
        }

        file_put_contents($envFile, $content);

        Artisan::call('config:clear');

        return response()->json(['maintenance_mode' => $enabled]);
    }
}
