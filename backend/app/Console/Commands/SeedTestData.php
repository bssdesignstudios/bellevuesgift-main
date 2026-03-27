<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
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

        // Detect schema variant (Postgres prod vs SQLite dev)
        $quoteHasIssuedDate = Schema::hasColumn('quotes', 'issued_date');
        $quoteHasTax        = Schema::hasColumn('quotes', 'tax');
        $ledgerHasEntryType = Schema::hasColumn('customer_ledger_entries', 'entry_type');
        $itemHasPrice       = Schema::hasColumn('quote_items', 'price');

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
            ['email' => 'jane.doe@example.com', 'name' => 'Jane Doe',
             'phone' => '2421234567', 'address' => '12 Pioneers Way, Freeport',
             'island' => 'Grand Bahama'],
            ['email' => 'marcus.brown@constructco.bs', 'name' => 'Marcus Brown',
             'phone' => '2423456789', 'address' => '45 Marketplace Rd, Nassau',
             'island' => 'New Providence'],
            ['email' => 'keisha.wells@gmail.com', 'name' => 'Keisha Wells',
             'phone' => '2425678901', 'address' => '8 Coral Close, Freeport',
             'island' => 'Grand Bahama'],
            ['email' => 'dolphin.supplies@bssbiz.com', 'name' => 'Dolphin Office Supplies Ltd',
             'phone' => '2427890123', 'address' => '100 Bay St, Nassau',
             'island' => 'New Providence'],
            ['email' => 'pedro.albury@hotmail.com', 'name' => 'Pedro Albury',
             'phone' => '2424321098', 'address' => '3 Sunrise Ave, Abaco',
             'island' => 'Abaco'],
        ];

        $customers = [];
        foreach ($customersData as $cd) {
            $customers[] = Customer::firstOrCreate(['email' => $cd['email']], $cd);
        }
        $this->line("  ✓ Customers: " . count($customers) . " accounts");

        // ── QUOTES & INVOICES ──────────────────────────────────────────────
        $made = 0;
        $scenarios = [
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

            $sub   = round($qty * $unitPrice, 2);
            $tax   = round($sub * ($taxPct / 100), 2);
            $total = round($sub + $tax - $disc, 2);

            // Build quote data — adapt to schema
            $quoteData = [
                'customer_id' => $cust->id,
                'status'      => 'accepted',
            ];

            if ($quoteHasIssuedDate) {
                // SQLite schema (Hostinger)
                $quoteData['issued_date']    = now()->subDays($daysAgo + 5)->toDateString();
                $quoteData['valid_until']    = now()->subDays($daysAgo)->addDays(30)->toDateString();
                $quoteData['subtotal']       = $sub;
                $quoteData['tax_total']      = $tax;
                $quoteData['discount_total'] = $disc;
                $quoteData['total']          = $total;
            } else {
                // Postgres schema (DO prod)
                $quoteData['customer_name']  = $cust->name;
                $quoteData['customer_email'] = $cust->email;
                $quoteData['subtotal']       = $sub;
                $quoteData['tax']            = $tax;
                $quoteData['total']          = $total;
                $quoteData['notes']          = "Demo quote for {$cust->name}";
            }

            $quote = Quote::firstOrCreate(['quote_number' => $qNum], $quoteData);

            // Quote item — adapt columns
            if ($itemHasPrice) {
                // Postgres: qty, price, total
                QuoteItem::firstOrCreate(['quote_id' => $quote->id, 'product_id' => $prod->id], [
                    'description' => $prod->name,
                    'qty'         => $qty,
                    'price'       => $unitPrice,
                    'total'       => $total,
                ]);
            } else {
                // SQLite: qty, unit_price, tax_rate, discount, line_total
                QuoteItem::firstOrCreate(['quote_id' => $quote->id, 'product_id' => $prod->id], [
                    'description' => $prod->name,
                    'qty'         => $qty,
                    'unit_price'  => $unitPrice,
                    'tax_rate'    => $taxPct,
                    'discount'    => $disc,
                    'line_total'  => $total,
                ]);
            }

            // Build invoice data — adapt to schema
            $invoiceData = [
                'customer_id' => $cust->id,
                'quote_id'    => $quote->id,
                'status'      => $invStatus,
            ];

            if ($quoteHasIssuedDate) {
                // SQLite
                $invoiceData['issued_date']    = now()->subDays($daysAgo)->toDateString();
                $invoiceData['due_date']       = now()->subDays($daysAgo)->addDays(14)->toDateString();
                $invoiceData['subtotal']       = $sub;
                $invoiceData['tax_total']      = $tax;
                $invoiceData['discount_total'] = $disc;
                $invoiceData['total']          = $total;
                $invoiceData['amount_paid']    = $amtPaid;
            } else {
                // Postgres
                $invoiceData['customer_name']  = $cust->name;
                $invoiceData['customer_email'] = $cust->email;
                $invoiceData['subtotal']       = $sub;
                $invoiceData['tax']            = $tax;
                $invoiceData['total']          = $total;
                $invoiceData['amount_paid']    = $amtPaid;
                $invoiceData['balance_due']    = round($total - $amtPaid, 2);
                $invoiceData['notes']          = "Demo invoice for {$cust->name}";
            }

            $invoice = Invoice::firstOrCreate(['invoice_number' => $iNum], $invoiceData);

            // Invoice item — adapt columns
            if ($itemHasPrice) {
                InvoiceItem::firstOrCreate(['invoice_id' => $invoice->id, 'product_id' => $prod->id], [
                    'description' => $prod->name,
                    'qty'         => $qty,
                    'price'       => $unitPrice,
                    'total'       => $total,
                ]);
            } else {
                InvoiceItem::firstOrCreate(['invoice_id' => $invoice->id, 'product_id' => $prod->id], [
                    'description' => $prod->name,
                    'qty'         => $qty,
                    'unit_price'  => $unitPrice,
                    'tax_rate'    => $taxPct,
                    'discount'    => $disc,
                    'line_total'  => $total,
                ]);
            }

            // Ledger entries — adapt to schema
            if ($ledgerHasEntryType) {
                // SQLite schema
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
            } else {
                // Postgres schema: type, invoice_id, running_balance
                $existing = CustomerLedgerEntry::where('customer_id', $cust->id)
                    ->where('invoice_id', $invoice->id)->count();

                if ($existing === 0) {
                    $runBal = CustomerLedgerEntry::where('customer_id', $cust->id)
                        ->latest()->value('running_balance') ?? 0;

                    $runBal += $total;
                    CustomerLedgerEntry::create([
                        'customer_id'     => $cust->id,
                        'type'            => 'charge',
                        'invoice_id'      => $invoice->id,
                        'amount'          => $total,
                        'running_balance' => $runBal,
                        'notes'           => "Invoice {$iNum} issued",
                    ]);

                    if ($amtPaid > 0) {
                        $runBal -= $amtPaid;
                        CustomerLedgerEntry::create([
                            'customer_id'     => $cust->id,
                            'type'            => 'payment',
                            'invoice_id'      => $invoice->id,
                            'amount'          => -$amtPaid,
                            'running_balance' => $runBal,
                            'notes'           => $invStatus === 'paid' ? 'Payment in full' : 'Partial payment received',
                        ]);
                    }
                }
            }

            $made++;
        }

        $this->line("  ✓ Quotes & Invoices: {$made} sets (with ledger entries)");

        // ── EXPENSES ───────────────────────────────────────────────────────
        if (Schema::hasColumn('expenses', 'title')) {
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
        } else {
            $this->line("  ~ Expenses: skipped (table schema differs)");
        }

        $this->newLine();
        $this->info('All demo data seeded successfully.');

        return self::SUCCESS;
    }
}
