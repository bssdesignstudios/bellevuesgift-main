<?php
/**
 * Role: Builder
 * Rationale: Handle Product management in the Laravel backend.
 */

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'inventory']);

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%")
                    ->orWhere('barcode', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->query('category_id'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->query('is_active') === 'true');
        }

        if ($request->filled('on_sale') && $request->query('on_sale') === 'true') {
            $query->whereNotNull('sale_price')->where('sale_price', '>', 0);
        }

        if ($request->filled('stock')) {
            $stock = $request->query('stock');
            $query->whereHas('inventory', function ($q) use ($stock) {
                if ($stock === 'out') {
                    $q->where('qty_on_hand', '<=', 0);
                } elseif ($stock === 'low') {
                    $q->whereColumn('qty_on_hand', '<=', 'reorder_level')->where('qty_on_hand', '>', 0);
                } elseif ($stock === 'in') {
                    $q->whereColumn('qty_on_hand', '>', 'reorder_level');
                }
            });
        }

        $sortBy = $request->query('sort', 'name');
        $sortDir = $request->query('dir', 'asc');
        $allowedSorts = ['name', 'price', 'sku', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderBy('name');
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|uuid|exists:categories,id',
            'vendor_id' => 'nullable|uuid|exists:vendors,id',
            'vendor' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|unique:products,slug',
            'sku' => 'required|string|unique:products,sku',
            'barcode' => 'nullable|string',
            'description' => 'nullable|string',
            'cost' => 'nullable|numeric|min:0',
            'markup_percentage' => 'nullable|numeric|min:0',
            'price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'tax_class' => 'nullable|string',
            'image_url' => 'nullable|string',
            'card_color' => 'nullable|string',
            'hex_code' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($validated) {
            if (empty($validated['slug'])) {
                $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(5);
            }

            $product = Product::create($validated);

            // Automatically create inventory record
            Inventory::create([
                'product_id' => $product->id,
                'location' => 'Main Warehouse',
                'qty_on_hand' => 0,
                'qty_reserved' => 0,
                'reorder_level' => 5,
            ]);

            return response()->json($product, 201);
        });
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'category_id' => 'sometimes|nullable|uuid|exists:categories,id',
            'vendor_id' => 'sometimes|nullable|uuid|exists:vendors,id',
            'vendor' => 'sometimes|nullable|string|max:255',
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|unique:products,slug,' . $product->id,
            'sku' => 'sometimes|required|string|unique:products,sku,' . $product->id,
            'barcode' => 'sometimes|nullable|string',
            'description' => 'sometimes|nullable|string',
            'cost' => 'sometimes|nullable|numeric|min:0',
            'markup_percentage' => 'sometimes|nullable|numeric|min:0',
            'price' => 'sometimes|required|numeric|min:0',
            'sale_price' => 'sometimes|nullable|numeric|min:0',
            'tax_class' => 'sometimes|nullable|string',
            'image_url' => 'sometimes|nullable|string',
            'card_color' => 'sometimes|nullable|string',
            'hex_code' => 'sometimes|nullable|string',
            'is_active' => 'sometimes|required|boolean',
        ]);

        $product->update($validated);

        return response()->json($product);
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(null, 204);
    }

    public function toggleActive(Request $request, Product $product)
    {
        $product->update(['is_active' => $request->has('is_active') ? (bool) $request->is_active : !$product->is_active]);
        return response()->json($product);
    }
}
