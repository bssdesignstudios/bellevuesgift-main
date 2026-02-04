<?php
/**
 * Role: Builder
 * Rationale: Handle POS product and category data fetching.
 */

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;

class PosProductController extends Controller
{
    public function categories()
    {
        return response()->json(Category::where('is_active', true)->orderBy('sort_order')->get());
    }

    public function products(Request $request)
    {
        $query = Product::with('inventory')->where('is_active', true);

        if ($request->has('category_id') && $request->query('category_id') !== 'all') {
            $query->where('category_id', $request->query('category_id'));
        }

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', '=', $search);
            });
        }

        return response()->json($query->orderBy('name')->limit(100)->get());
    }
}
