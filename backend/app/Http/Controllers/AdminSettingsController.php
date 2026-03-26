<?php

namespace App\Http\Controllers;

use App\Models\StoreSetting;
use Illuminate\Http\Request;

class AdminSettingsController extends Controller
{
    public function index()
    {
        StoreSetting::ensureModuleFlagsExist();
        return StoreSetting::query()
            ->orderBy('key')
            ->get(['id', 'key', 'value', 'updated_at']);
    }

    public function upsert(Request $request)
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:120'],
            'value' => ['nullable', 'string'],
        ]);

        $setting = StoreSetting::updateOrCreate(
            ['key' => $data['key']],
            ['value' => $data['value'] ?? '']
        );

        return response()->json($setting, 200);
    }
}
