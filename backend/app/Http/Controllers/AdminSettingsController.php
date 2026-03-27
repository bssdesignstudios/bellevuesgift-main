<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class AdminSettingsController extends Controller
{
    public function show()
    {
        return response()->json([
            'maintenance_mode' => config('app.maintenance_mode', false),
        ]);
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
