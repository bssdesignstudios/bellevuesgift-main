<?php

namespace App\Http\Controllers;

use App\Models\DocumentEmailLog;
use Illuminate\Http\Request;

class AdminEmailLogController extends Controller
{
    public function index(Request $request)
    {
        $logs = DocumentEmailLog::query()
            ->orderBy('sent_at', 'desc')
            ->get();

        return response()->json(['logs' => $logs]);
    }
}
