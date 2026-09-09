<?php

namespace App\Http\Controllers;

use App\Models\StoreSetting;
use Illuminate\Http\Request;
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

            // Coming Soon mode lives in store_settings, not .env — make sure
            // the row the switch binds to is always present and authoritative.
            $settings = array_values(array_filter(
                $settings,
                fn ($s) => $s['key'] !== StoreSetting::MAINTENANCE_KEY
            ));

            $settings[] = [
                'key'   => StoreSetting::MAINTENANCE_KEY,
                'value' => StoreSetting::isMaintenanceMode() ? '1' : '0',
            ];

            return response()->json($settings);
        }

        // Fallback if store_settings table doesn't exist
        return response()->json([
            ['key' => StoreSetting::MAINTENANCE_KEY, 'value' => StoreSetting::isMaintenanceMode() ? '1' : '0'],
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

        try {
            // Persisted in store_settings — a deploy can no longer reset this.
            $effective = StoreSetting::setMaintenanceMode($request->boolean('enabled'));
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Could not save the Coming Soon setting. Nothing was changed.',
            ], 500);
        }

        // Report the state read back from storage, never the requested value.
        return response()->json(['maintenance_mode' => $effective]);
    }
}
