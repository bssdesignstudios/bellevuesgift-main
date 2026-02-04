<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\GiftCard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Password;

class StorefrontCheckoutController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer' => 'required|array',
            'customer.name' => 'required|string',
            'customer.email' => 'nullable|email',
            'customer.phone' => 'required|string',
            'customer.island' => 'nullable|string',
            'customer.address' => 'nullable|string',
            'items' => 'required|array|min:1',
            'fulfillment_method' => 'required|string',
            'payment_option' => 'required|string', // 'now', 'later'
            'subtotal' => 'required|numeric',
            'discount' => 'nullable|numeric',
            'vat_amount' => 'required|numeric',
            'total' => 'required|numeric',
        ]);

        return DB::transaction(function () use ($validated) {
            // 1. Handle User/Customer
            $user = null;
            if (!empty($validated['customer']['email'])) {
                $user = User::where('email', $validated['customer']['email'])->first();

                if (!$user) {
                    // Create new user (Client)
                    // Generate a random password
                    $password = Str::random(10);

                    $user = User::create([
                        'name' => $validated['customer']['name'],
                        'email' => $validated['customer']['email'],
                        'password' => Hash::make($password),
                        'role' => 'client', // Default role for storefront users
                        // We could store phone/island/address in existing 'customers' table or add fields to 'users'
                        // For now assuming we link to a Customer record or just use User
                    ]);

                    // Send Password Reset / Welcome Email
                    // Ideally we use a Notification, but triggering Password Reset is a quick way to invite them
                    try {
                        $token = Password::createToken($user);
                        $user->sendPasswordResetNotification($token);
                    } catch (\Exception $e) {
                        // Log error but don't fail order
                    }
                }
            }

            // Sync with 'customers' table (if separate from users table)
            // Assuming we still use the 'customers' table for the Order relation
            $customerRecord = DB::table('customers')->where('email', $validated['customer']['email'])->first();

            if (!$customerRecord && !empty($validated['customer']['phone'])) {
                $customerRecord = DB::table('customers')->where('phone', $validated['customer']['phone'])->first();
            }

            if (!$customerRecord) {
                $customerId = Str::uuid()->toString();
                DB::table('customers')->insert([
                    'id' => $customerId,
                    'name' => $validated['customer']['name'],
                    'email' => $validated['customer']['email'],
                    'phone' => $validated['customer']['phone'],
                    'island' => $validated['customer']['island'] ?? 'Grand Bahama',
                    'address' => $validated['customer']['address'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $customerId = $customerRecord->id;
                // Update address if provided
                if (!empty($validated['customer']['address'])) {
                    DB::table('customers')->where('id', $customerId)->update([
                        'address' => $validated['customer']['address']
                    ]);
                }
            }

            // 2. Create Order
            // Generate order number
            $count = Order::count() + 1;
            $orderNumber = 'WEB-' . date('Y') . '-' . str_pad($count, 6, '0', STR_PAD_LEFT);

            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_id' => $customerId, // Linking to customer record
                'channel' => 'web',
                'status' => 'pending',
                'fulfillment_method' => $validated['fulfillment_method'],
                'payment_status' => $validated['payment_option'] === 'now' ? 'paid' : 'pending',
                'payment_method' => $validated['payment_option'] === 'now' ? 'card' : 'pay_later',
                'subtotal' => $validated['subtotal'],
                'discount_amount' => $validated['discount'] ?? 0,
                'vat_amount' => $validated['vat_amount'],
                'total' => $validated['total'],
                'notes' => 'Web Order',
            ]);

            // 3. Create Order Items
            foreach ($validated['items'] as $item) {
                // Ensure product exists
                $dbProduct = Product::find($item['product']['id']);

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product']['id'],
                    'sku' => $dbProduct ? $dbProduct->sku : 'UNKNOWN',
                    'name' => $item['product']['name'],
                    'qty' => $item['qty'],
                    'unit_price' => $item['product']['sale_price'] ?? $item['product']['price'],
                    'line_total' => ($item['product']['sale_price'] ?? $item['product']['price']) * $item['qty']
                ]);

                // Handle Gift Cards
                if ($dbProduct && str_starts_with($dbProduct->sku, 'GC-BEL-')) {
                    $value = (float) $dbProduct->price;
                    if ($value > 0) {
                        for ($i = 0; $i < $item['qty']; $i++) {
                            $code = 'BEL-' . strtoupper(Str::random(6)) . '-' . strtoupper(Str::random(3));
                            GiftCard::create([
                                'code' => $code,
                                'initial_balance' => $value,
                                'balance' => $value,
                                'is_active' => $validated['payment_option'] === 'now', // Only activate if paid
                                'customer_id' => $customerId,
                                'notes' => "Purchased via Web Order {$orderNumber}"
                            ]);
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'order_id' => $order->id,
                'redirect' => route('checkout.success', ['id' => $order->id])
            ]);
        });
    }
}
