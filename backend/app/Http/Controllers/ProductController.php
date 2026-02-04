<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'inventory']);

        if ($request->has('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', $search)
                    ->orWhere('barcode', $search);
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('sku_prefix')) {
            $query->where('sku', 'like', $request->input('sku_prefix') . '%');
        }

        $products = $query->orderBy('name')->limit(50)->get();

        if ($request->wantsJson()) {
            return response()->json($products);
        }

        return Inertia::render('admin/AdminProducts', [
            'products' => $products,
            'categories' => Category::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:products,slug',
            'sku' => 'required|string|max:100|unique:products,sku',
            'barcode' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'cost' => 'nullable|numeric|min:0',
            'markup_percentage' => 'nullable|numeric|min:0',
            'vendor' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'tax_class' => 'nullable|string|max:50',
            'image_url' => 'nullable|string|max:500',
            'card_color' => 'nullable|string|max:50',
            'hex_code' => 'nullable|string|max:7',
            'is_active' => 'boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = strtolower(preg_replace('/[^a-z0-9]+/', '-', $validated['name']));
        }

        $product = Product::create($validated);

        return response()->json($product, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:products,slug,' . $id,
            'sku' => 'required|string|max:100|unique:products,sku,' . $id,
            'barcode' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'cost' => 'nullable|numeric|min:0',
            'markup_percentage' => 'nullable|numeric|min:0',
            'vendor' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'tax_class' => 'nullable|string|max:50',
            'image_url' => 'nullable|string|max:500',
            'card_color' => 'nullable|string|max:50',
            'hex_code' => 'nullable|string|max:7',
            'is_active' => 'boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = strtolower(preg_replace('/[^a-z0-9]+/', '-', $validated['name']));
        }

        $product = Product::findOrFail($id);
        $product->update($validated);

        return response()->json($product);
    }

    public function destroy(string $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json(null, 204);
    }
}
