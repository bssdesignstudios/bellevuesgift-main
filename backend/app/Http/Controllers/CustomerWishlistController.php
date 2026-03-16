<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerWishlistController extends Controller
{
    private function getCustomerRecord(Request $request)
    {
        $user = $request->user();
        return DB::table('customers')->where('email', $user->email)->first();
    }

    public function index(Request $request)
    {
        $customer = $this->getCustomerRecord($request);
        if (!$customer) {
            return response()->json([]);
        }

        // Check if wishlists table exists; if not return empty gracefully
        try {
            $items = DB::table('wishlists')
                ->where('customer_id', $customer->id)
                ->join('products', 'wishlists.product_id', '=', 'products.id')
                ->select(
                    'wishlists.id',
                    'products.id as product_id',
                    'products.name',
                    'products.slug',
                    'products.price',
                    'products.sale_price',
                    'products.image_url',
                    'products.sku'
                )
                ->get()
                ->map(function ($row) {
                    return [
                        'id'      => $row->id,
                        'product' => [
                            'id'         => $row->product_id,
                            'name'       => $row->name,
                            'slug'       => $row->slug,
                            'price'      => $row->price,
                            'sale_price' => $row->sale_price,
                            'image_url'  => $row->image_url,
                            'sku'        => $row->sku,
                        ]
                    ];
                });

            return response()->json($items);
        } catch (\Exception $e) {
            // Wishlist table not yet migrated
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $customer = $this->getCustomerRecord($request);
        if (!$customer) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $validated = $request->validate([
            'product_id' => 'required|uuid|exists:products,id',
        ]);

        // Upsert — don't duplicate
        $existing = DB::table('wishlists')
            ->where('customer_id', $customer->id)
            ->where('product_id', $validated['product_id'])
            ->first();

        if ($existing) {
            return response()->json($existing, 200);
        }

        $id = (string) Str::uuid();
        DB::table('wishlists')->insert([
            'id'          => $id,
            'customer_id' => $customer->id,
            'product_id'  => $validated['product_id'],
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json(DB::table('wishlists')->where('id', $id)->first(), 201);
    }

    public function destroy(Request $request, string $id)
    {
        $customer = $this->getCustomerRecord($request);
        if (!$customer) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        DB::table('wishlists')
            ->where('id', $id)
            ->where('customer_id', $customer->id)
            ->delete();

        return response()->json(['message' => 'Removed from wishlist']);
    }
}
