<?php
/**
 * Role: Builder
 * Rationale: Handle Product management in the Laravel backend.
 */

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category']);

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|uuid|exists:categories,id',
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|unique:products,slug',
            'sku' => 'required|string|unique:products,sku',
            'barcode' => 'nullable|string',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'tax_class' => 'nullable|string',
            'image_url' => 'nullable|string',
            'card_color' => 'nullable|string',
            'hex_code' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(5);
        }

        $product = Product::create($validated);

        Inventory::create([
            'product_id'    => $product->id,
            'qty_on_hand'   => 0,
            'qty_reserved'  => 0,
            'reorder_level' => 0,
        ]);

        return response()->json($product, 201);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'category_id' => 'sometimes|nullable|uuid|exists:categories,id',
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|unique:products,slug,' . $product->id,
            'sku' => 'sometimes|required|string|unique:products,sku,' . $product->id,
            'barcode' => 'sometimes|nullable|string',
            'description' => 'sometimes|nullable|string',
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
}
