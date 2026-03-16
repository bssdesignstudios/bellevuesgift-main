<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerAddressController extends Controller
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

        $addresses = DB::table('customer_addresses')
            ->where('customer_id', $customer->id)
            ->orderByDesc('is_default')
            ->get();

        return response()->json($addresses);
    }

    public function store(Request $request)
    {
        $customer = $this->getCustomerRecord($request);
        if (!$customer) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $validated = $request->validate([
            'label'         => 'required|string|max:50',
            'address_line1' => 'required|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city'          => 'required|string|max:100',
            'island'        => 'required|string|max:100',
            'postal_code'   => 'nullable|string|max:20',
            'phone'         => 'nullable|string|max:30',
            'is_default'    => 'boolean',
        ]);

        if (!empty($validated['is_default'])) {
            DB::table('customer_addresses')
                ->where('customer_id', $customer->id)
                ->update(['is_default' => false]);
        }

        $id = DB::table('customer_addresses')->insertGetId([
            'id'            => Str::uuid()->toString(),
            'customer_id'   => $customer->id,
            'label'         => $validated['label'],
            'address_line1' => $validated['address_line1'],
            'address_line2' => $validated['address_line2'] ?? null,
            'city'          => $validated['city'],
            'island'        => $validated['island'],
            'postal_code'   => $validated['postal_code'] ?? null,
            'phone'         => $validated['phone'] ?? null,
            'is_default'    => !empty($validated['is_default']),
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        return response()->json(DB::table('customer_addresses')->where('id', $id)->first(), 201);
    }

    public function update(Request $request, string $id)
    {
        $customer = $this->getCustomerRecord($request);
        if (!$customer) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $address = DB::table('customer_addresses')
            ->where('id', $id)
            ->where('customer_id', $customer->id)
            ->first();

        if (!$address) {
            return response()->json(['message' => 'Address not found'], 404);
        }

        $validated = $request->validate([
            'label'         => 'required|string|max:50',
            'address_line1' => 'required|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city'          => 'required|string|max:100',
            'island'        => 'required|string|max:100',
            'postal_code'   => 'nullable|string|max:20',
            'phone'         => 'nullable|string|max:30',
            'is_default'    => 'boolean',
        ]);

        if (!empty($validated['is_default'])) {
            DB::table('customer_addresses')
                ->where('customer_id', $customer->id)
                ->update(['is_default' => false]);
        }

        DB::table('customer_addresses')->where('id', $id)->update([
            'label'         => $validated['label'],
            'address_line1' => $validated['address_line1'],
            'address_line2' => $validated['address_line2'] ?? null,
            'city'          => $validated['city'],
            'island'        => $validated['island'],
            'postal_code'   => $validated['postal_code'] ?? null,
            'phone'         => $validated['phone'] ?? null,
            'is_default'    => !empty($validated['is_default']),
            'updated_at'    => now(),
        ]);

        return response()->json(DB::table('customer_addresses')->where('id', $id)->first());
    }

    public function destroy(Request $request, string $id)
    {
        $customer = $this->getCustomerRecord($request);
        if (!$customer) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $deleted = DB::table('customer_addresses')
            ->where('id', $id)
            ->where('customer_id', $customer->id)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Address not found'], 404);
        }

        return response()->json(['message' => 'Address deleted']);
    }

    public function setDefault(Request $request, string $id)
    {
        $customer = $this->getCustomerRecord($request);
        if (!$customer) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $address = DB::table('customer_addresses')
            ->where('id', $id)
            ->where('customer_id', $customer->id)
            ->first();

        if (!$address) {
            return response()->json(['message' => 'Address not found'], 404);
        }

        // Unset all defaults then set the new one
        DB::table('customer_addresses')
            ->where('customer_id', $customer->id)
            ->update(['is_default' => false]);

        DB::table('customer_addresses')->where('id', $id)->update(['is_default' => true]);

        return response()->json(['message' => 'Default address updated']);
    }
}
