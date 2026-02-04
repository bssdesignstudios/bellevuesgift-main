<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::query();

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $categories = $query->orderBy('sort_order')->get();

        if ($request->wantsJson()) {
            return response()->json($categories);
        }

        return Inertia::render('admin/AdminCategories', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:categories,slug',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = strtolower(preg_replace('/[^a-z0-9]+/', '-', $validated['name']));
        }

        $category = Category::create($validated);

        return response()->json($category, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:categories,slug,' . $id,
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = strtolower(preg_replace('/[^a-z0-9]+/', '-', $validated['name']));
        }

        $category = Category::findOrFail($id);
        $category->update($validated);

        return response()->json($category);
    }

    public function destroy(string $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $category->delete();

        return response()->json(null, 204);
    }

    public function toggleActive(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $category = Category::findOrFail($id);
        $category->update(['is_active' => $request->boolean('is_active')]);

        return response()->json($category);
    }
}
