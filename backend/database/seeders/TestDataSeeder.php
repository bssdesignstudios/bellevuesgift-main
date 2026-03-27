<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TestDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Test Customer ─────────────────────────────────────────────
        $customer = Customer::firstOrCreate(
            ['email' => 'test@bellevuegifts.com'],
            [
                'name'           => 'Test Customer',
                'phone'          => '2420000001',
                'address'        => '1 Test Lane, Freeport',
                'island'         => 'Grand Bahama',
                'account_type'   => 'personal',
                'customer_tier'  => 'retail',
                'is_active'      => true,
            ]
        );
        $this->command->info("Customer: {$customer->name} ({$customer->id})");

        // Also create a business customer
        $bizCustomer = Customer::firstOrCreate(
            ['email' => 'testbiz@bellevuegifts.com'],
            [
                'name'           => 'Test Business Ltd.',
                'phone'          => '2420000002',
                'address'        => '2 Commerce Blvd, Nassau',
                'island'         => 'New Providence',
                'account_type'   => 'business',
                'business_name'  => 'Test Business Ltd.',
                'contact_person' => 'Jane Smith',
                'vat_number'     => 'VAT-TEST-001',
                'customer_tier'  => 'wholesale',
                'is_active'      => true,
            ]
        );
        $this->command->info("Business Customer: {$bizCustomer->name} ({$bizCustomer->id})");

        // ── 2. Pick a product for line items (or create a dummy one) ─────
        $product = Product::first();

        $itemData = $product
            ? [
                'product_id'  => $product->id,
                'sku'         => $product->sku ?? 'TEST-SKU',
                'description' => $product->name,
                'qty'         => 2,
                'unit_price'  => (float) $product->price,
                'tax_amount'  => round((float) $product->price * 2 * 0.075, 2),
                'discount_amount' => 0,
                'line_total'  => round((float) $product->price * 2 * 1.075, 2),
            ]
            : [
                'product_id'  => null,
                'sku'         => 'TEST-001',
                'description' => 'Gift Basket – Large Assorted',
                'qty'         => 2,
                'unit_price'  => 49.99,
                'tax_amount'  => 7.50,
                'discount_amount' => 0,
                'line_total'  => 107.48,
            ];

        $subtotal = $itemData['unit_price'] * $itemData['qty'];
        $tax      = $itemData['tax_amount'];
        $total    = $itemData['line_total'];

        // ── 3. Test Quote ────────────────────────────────────────────────
        $quoteNumber = 'QUO-TEST-' . strtoupper(Str::random(4));
        $quote = Quote::firstOrCreate(
            ['quote_number' => $quoteNumber],
            [
                'customer_id' => $customer->id,
                'status'      => 'sent',
                'issued_at'   => now()->subDays(3),
                'valid_until' => now()->addDays(14),
                'notes'       => 'Test quote — created by TestDataSeeder. Feel free to delete.',
                'subtotal'    => $subtotal,
                'tax_total'   => $tax,
                'discount_total' => 0,
                'total'       => $total,
            ]
        );

        if ($quote->wasRecentlyCreated) {
            QuoteItem::create(array_merge($itemData, ['quote_id' => $quote->id]));
            $this->command->info("Quote: {$quote->quote_number} ({$quote->id}) — total \${$total}");
        } else {
            $this->command->info("Quote already exists: {$quote->quote_number}");
        }

        // ── 4. Test Invoice ──────────────────────────────────────────────
        $invoiceNumber = 'INV-TEST-' . strtoupper(Str::random(4));
        $invoice = Invoice::firstOrCreate(
            ['invoice_number' => $invoiceNumber],
            [
                'customer_id'  => $customer->id,
                'quote_id'     => $quote->id,
                'status'       => 'sent',
                'issued_at'    => now()->subDays(2),
                'due_date'     => now()->addDays(28),
                'notes'        => 'Test invoice — created by TestDataSeeder. Feel free to delete.',
                'subtotal'     => $subtotal,
                'tax_total'    => $tax,
                'discount_total' => 0,
                'total'        => $total,
                'amount_paid'  => 0,
                'balance_due'  => $total,
            ]
        );

        if ($invoice->wasRecentlyCreated) {
            InvoiceItem::create(array_merge($itemData, ['invoice_id' => $invoice->id]));
            $this->command->info("Invoice: {$invoice->invoice_number} ({$invoice->id}) — total \${$total}");
        } else {
            $this->command->info("Invoice already exists: {$invoice->invoice_number}");
        }

        $this->command->info('');
        $this->command->info('✅ Test data seeded successfully.');
        $this->command->info("   Customer:  {$customer->name}  →  /admin/customers");
        $this->command->info("   Quote:     {$quote->quote_number}  →  /admin/quotes");
        $this->command->info("   Invoice:   {$invoice->invoice_number}  →  /admin/invoices");
    }
}
