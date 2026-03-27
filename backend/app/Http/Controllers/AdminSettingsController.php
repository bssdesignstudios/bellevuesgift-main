<?php

namespace App\Http\Controllers;

use App\Models\StoreSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class AdminSettingsController extends Controller
{
    /**
     * Returns settings as [{key, value}] array — sidebar uses this to
     * determine module visibility via key="module.*" entries.
     */
    public function show()
    {
        StoreSetting::ensureModuleFlagsExist();

        $settings = StoreSetting::all(['key', 'value'])->toArray();

        // Also surface the maintenance flag as a synthetic setting
        $settings[] = [
            'key'   => 'maintenance_mode',
            'value' => config('app.maintenance_mode', false) ? '1' : '0',
        ];

        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key'   => 'required|string',
            'settings.*.value' => 'required|string',
        ]);

        foreach ($validated['settings'] as $item) {
            StoreSetting::updateOrCreate(['key' => $item['key']], ['value' => $item['value']]);
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
