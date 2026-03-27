<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;
use App\Models\Category;
use App\Models\Product;
use App\Models\Inventory;
use App\Models\Customer;
use App\Models\Staff;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Expense;
use App\Models\CustomerLedgerEntry;

class SeedTestData extends Command
{
    protected $signature   = 'bellevue:seed-test';
    protected $description = 'Seed demo data: customers, quotes, invoices, ledger entries, expenses';

    public function handle(): int
    {
        $this->info('Seeding demo data…');

        // ── CATEGORIES ─────────────────────────────────────────────────────
        $catElec = Category::firstOrCreate(['name' => 'Electronics'],
            ['slug' => 'electronics', 'is_active' => true, 'sort_order' => 1]);

        $catHome = Category::firstOrCreate(['name' => 'Home & Office'],
            ['slug' => 'home-office', 'is_active' => true, 'sort_order' => 2]);

        $catGifts = Category::firstOrCreate(['name' => 'Gifts & Stationery'],
            ['slug' => 'gifts-stationery', 'is_active' => true, 'sort_order' => 3]);

        $this->line("  ✓ Categories: Electronics, Home & Office, Gifts & Stationery");

        // ── PRODUCTS ───────────────────────────────────────────────────────
        $products = [
            Product::firstOrCreate(['sku' => 'ELEC-WH-001'], [
                'category_id' => $catElec->id, 'name' => 'Wireless Headphones',
                'slug' => 'wireless-headphones', 'cost' => 45.00, 'price' => 89.99,
                'markup_percentage' => 100, 'is_active' => true,
                'description' => 'Premium wireless headphones with noise cancellation.',
            ]),
            Product::firstOrCreate(['sku' => 'ELEC-BT-002'], [
                'category_id' => $catElec->id, 'name' => 'Bluetooth Speaker',
                'slug' => 'bluetooth-speaker', 'cost' => 28.00, 'price' => 55.00,
                'markup_percentage' => 96, 'is_active' => true,
                'description' => 'Portable Bluetooth speaker, waterproof.',
            ]),
            Product::firstOrCreate(['sku' => 'HOME-DS-003'], [
                'category_id' => $catHome->id, 'name' => 'Desk Organiser Set',
                'slug' => 'desk-organiser-set', 'cost' => 12.00, 'price' => 27.50,
                'markup_percentage' => 129, 'is_active' => true,
                'description' => '5-piece bamboo desk organiser set.',
            ]),
            Product::firstOrCreate(['sku' => 'GIFT-NB-004'], [
                'category_id' => $catGifts->id, 'name' => 'Hardcover Notebook A5',
                'slug' => 'hardcover-notebook-a5', 'cost' => 4.50, 'price' => 12.00,
                'markup_percentage' => 167, 'is_active' => true,
                'description' => 'Premium A5 hardcover ruled notebook.',
            ]),
            Product::firstOrCreate(['sku' => 'ELEC-USB-005'], [
                'category_id' => $catElec->id, 'name' => 'USB-C Hub 7-in-1',
                'slug' => 'usbc-hub-7in1', 'cost' => 18.00, 'price' => 39.99,
                'markup_percentage' => 122, 'is_active' => true,
                'description' => 'USB-C hub with HDMI, USB 3.0 x3, SD card reader.',
            ]),
        ];

        foreach ($products as $p) {
            Inventory::firstOrCreate(['product_id' => $p->id],
                ['qty_on_hand' => rand(15, 50), 'reorder_level' => 5]);
        }
        $this->line("  ✓ Products & Inventory: " . count($products) . " items");

        // ── STAFF ──────────────────────────────────────────────────────────
        $staff = Staff::firstOrCreate(['email' => 'john.smith@bellevuegifts.com'], [
            'name' => 'John Smith', 'role' => 'cashier', 'is_active' => true,
        ]);

        // ── CUSTOMERS ──────────────────────────────────────────────────────
        $customersData = [
            [
                'email' => 'jane.doe@example.com', 'name' => 'Jane Doe',
                'phone' => '2421234567', 'address' => '12 Pioneers Way, Freeport',
                'island' => 'Grand Bahama', 'account_type' => 'personal', 'customer_tier' => 'retail',
            ],
            [
                'email' => 'marcus.brown@constructco.bs', 'name' => 'Marcus Brown',
                'phone' => '2423456789', 'address' => '45 Marketplace Rd, Nassau',
                'island' => 'New Providence', 'account_type' => 'business', 'customer_tier' => 'corporate',
            ],
            [
                'email' => 'keisha.wells@gmail.com', 'name' => 'Keisha Wells',
                'phone' => '2425678901', 'address' => '8 Coral Close, Freeport',
                'island' => 'Grand Bahama', 'account_type' => 'personal', 'customer_tier' => 'retail',
            ],
            [
                'email' => 'dolphin.supplies@bssbiz.com', 'name' => 'Dolphin Office Supplies Ltd',
                'phone' => '2427890123', 'address' => '100 Bay St, Nassau',
                'island' => 'New Providence', 'account_type' => 'business', 'customer_tier' => 'corporate',
            ],
            [
                'email' => 'pedro.albury@hotmail.com', 'name' => 'Pedro Albury',
                'phone' => '2424321098', 'address' => '3 Sunrise Ave, Abaco',
                'island' => 'Abaco', 'account_type' => 'personal', 'customer_tier' => 'retail',
            ],
        ];

        $customers = [];
        foreach ($customersData as $cd) {
            $customers[] = Customer::firstOrCreate(['email' => $cd['email']], $cd);
        }
        $this->line("  ✓ Customers: " . count($customers) . " accounts");

        // ── QUOTES & INVOICES ──────────────────────────────────────────────
        // Helper: build a quote + convert to invoice + ledger entries
        $made = 0;

        $scenarios = [
            // [customer, product, qty, unit_price, tax%, discount, status, days_ago_issued, amount_paid]
            [$customers[0], $products[0], 2, 89.99, 10, 0,     'paid',    30, 197.98],
            [$customers[0], $products[3], 5, 12.00,  0, 5,     'overdue',  8, 30.00],
            [$customers[1], $products[4], 3, 39.99,  7.5, 0,   'paid',    25, 128.97],
            [$customers[1], $products[2], 4, 27.50,  7.5, 10,  'sent',    12, 0],
            [$customers[2], $products[1], 1, 55.00, 10, 0,     'paid',    45, 60.50],
            [$customers[2], $products[0], 1, 89.99, 10, 15,    'overdue', 20, 50.00],
            [$customers[3], $products[4], 6, 39.99,  7.5, 20,  'paid',    60, 237.14],
            [$customers[3], $products[2], 8, 27.50,  7.5, 0,   'sent',     5, 0],
            [$customers[4], $products[3], 3, 12.00,  0, 0,     'paid',    15, 36.00],
            [$customers[4], $products[1], 2, 55.00, 10, 5,     'overdue', 10, 60.00],
        ];

        $year = now()->year;

        foreach ($scenarios as $i => $s) {
            [$cust, $prod, $qty, $unitPrice, $taxPct, $disc, $invStatus, $daysAgo, $amtPaid] = $s;

            $qNum = 'Q-' . $year . '-' . str_pad(100 + $i, 4, '0', STR_PAD_LEFT);
            $iNum = 'INV-' . $year . '-' . str_pad(100 + $i, 4, '0', STR_PAD_LEFT);

            $sub  = round($qty * $unitPrice, 2);
            $tax  = round($sub * ($taxPct / 100), 2);
            $total = round($sub + $tax - $disc, 2);

            $quote = Quote::firstOrCreate(['quote_number' => $qNum], [
                'customer_id'    => $cust->id,
                'status'         => 'accepted',
                'issued_date'    => now()->subDays($daysAgo + 5)->toDateString(),
                'valid_until'    => now()->subDays($daysAgo)->addDays(30)->toDateString(),
                'subtotal'       => $sub,
                'tax_total'      => $tax,
                'discount_total' => $disc,
                'total'          => $total,
            ]);

            QuoteItem::firstOrCreate(['quote_id' => $quote->id, 'product_id' => $prod->id], [
                'description' => $prod->name,
                'qty'         => $qty,
                'unit_price'  => $unitPrice,
                'tax_rate'    => $taxPct,
                'discount'    => $disc,
                'line_total'  => $total,
            ]);

            $invoice = Invoice::firstOrCreate(['invoice_number' => $iNum], [
                'customer_id'    => $cust->id,
                'quote_id'       => $quote->id,
                'status'         => $invStatus,
                'issued_date'    => now()->subDays($daysAgo)->toDateString(),
                'due_date'       => now()->subDays($daysAgo)->addDays(14)->toDateString(),
                'subtotal'       => $sub,
                'tax_total'      => $tax,
                'discount_total' => $disc,
                'total'          => $total,
                'amount_paid'    => $amtPaid,
            ]);

            InvoiceItem::firstOrCreate(['invoice_id' => $invoice->id, 'product_id' => $prod->id], [
                'description' => $prod->name,
                'qty'         => $qty,
                'unit_price'  => $unitPrice,
                'tax_rate'    => $taxPct,
                'discount'    => $disc,
                'line_total'  => $total,
            ]);

            // Ledger entries
            $existing = CustomerLedgerEntry::where('customer_id', $cust->id)
                ->where('reference_id', $invoice->id)->count();

            if ($existing === 0) {
                $runBal = CustomerLedgerEntry::where('customer_id', $cust->id)
                    ->orderBy('entry_date', 'desc')->value('balance_after') ?? 0;

                $runBal += $total;
                CustomerLedgerEntry::create([
                    'customer_id'    => $cust->id,
                    'entry_type'     => 'charge',
                    'reference_type' => 'invoice',
                    'reference_id'   => $invoice->id,
                    'amount'         => $total,
                    'balance_after'  => $runBal,
                    'notes'          => "Invoice {$iNum} issued",
                    'entry_date'     => now()->subDays($daysAgo)->toDateString(),
                ]);

                if ($amtPaid > 0) {
                    $runBal -= $amtPaid;
                    CustomerLedgerEntry::create([
                        'customer_id'    => $cust->id,
                        'entry_type'     => 'payment',
                        'reference_type' => 'invoice',
                        'reference_id'   => $invoice->id,
                        'amount'         => -$amtPaid,
                        'balance_after'  => $runBal,
                        'notes'          => $invStatus === 'paid' ? 'Payment in full' : 'Partial payment received',
                        'entry_date'     => now()->subDays(max(1, $daysAgo - 5))->toDateString(),
                    ]);
                }
            }

            $made++;
        }

        $this->line("  ✓ Quotes & Invoices: {$made} sets (with ledger entries)");

        // ── EXPENSES ───────────────────────────────────────────────────────
        $expenses = [
            ['title' => 'Office Supplies — March', 'vendor_payee' => 'Office World Bahamas',
             'category' => 'supplies', 'amount' => 125.50, 'notes' => 'Pens, paper, printer ink'],
            ['title' => 'Store Electricity Bill', 'vendor_payee' => 'BPL',
             'category' => 'utilities', 'amount' => 340.00, 'notes' => 'March 2026 electricity'],
            ['title' => 'Packaging & Bags Restock', 'vendor_payee' => 'Bahamas Packaging Co.',
             'category' => 'supplies', 'amount' => 88.75, 'notes' => 'Gift bags, tissue paper, boxes'],
            ['title' => 'Internet & Phone Bill', 'vendor_payee' => 'BTC',
             'category' => 'utilities', 'amount' => 135.00, 'notes' => 'Monthly service'],
        ];

        foreach ($expenses as $e) {
            Expense::firstOrCreate(['title' => $e['title']], array_merge($e, [
                'date'     => now()->subDays(rand(1, 20))->toDateString(),
                'staff_id' => $staff->id,
            ]));
        }
        $this->line("  ✓ Expenses: " . count($expenses) . " entries");

        $this->newLine();
        $this->info('All demo data seeded successfully.');
        $this->newLine();
        $this->line('  Test URLs:');
        $this->line('  → https://bellevuegifts.com/admin/customers');
        $this->line('  → https://bellevuegifts.com/admin/quotes');
        $this->line('  → https://bellevuegifts.com/admin/invoices');
        $this->line('  → https://bellevuegifts.com/admin/statements');
        $this->line('  → https://bellevuegifts.com/admin/expenses');

        return self::SUCCESS;
    }
}
