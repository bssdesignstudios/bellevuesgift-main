<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Register;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductPriceSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Fix prices on existing products that have cost/markup but $0 price
        $products = Product::whereNotNull('cost')
            ->where('cost', '>', 0)
            ->where(function ($q) {
                $q->where('price', 0)->orWhereNull('price');
            })
            ->get();

        foreach ($products as $product) {
            $product->save(); // Triggers boot saving() which recalculates price
        }

        $this->command->info("Fixed prices on {$products->count()} existing products.");

        // 2. Add barcodes to all products that don't have one
        $barcodeCounter = 1;
        Product::whereNull('barcode')->orWhere('barcode', '')->chunk(50, function ($products) use (&$barcodeCounter) {
            foreach ($products as $product) {
                // Generate EAN-13 barcode: 242 (Bahamas prefix) + 0000 + sequential + check digit
                $product->barcode = $this->generateEAN13($barcodeCounter);
                $product->saveQuietly(); // Don't trigger saving event again
                $barcodeCounter++;
            }
        });

        $this->command->info("Added barcodes to products.");

        // 3. Add new products to boost each category
        $this->seedNewProducts();

        // 4. Ensure registers exist
        $this->seedRegisters();
    }

    private function generateEAN13(int $sequence): string
    {
        // Country prefix 242 (Bahamas) + company 0000 + item number + check digit
        $base = '242' . '0000' . str_pad($sequence, 2, '0', STR_PAD_LEFT);
        // Pad to 12 digits
        $base = str_pad($base, 12, '0', STR_PAD_LEFT);

        // Calculate check digit (EAN-13 algorithm)
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $base[$i] * ($i % 2 === 0 ? 1 : 3);
        }
        $check = (10 - ($sum % 10)) % 10;

        return $base . $check;
    }

    private function seedNewProducts(): void
    {
        $categories = Category::where('is_active', true)->pluck('id', 'slug');

        $newProducts = [
            // --- Gift Cards category ---
            ['slug' => 'gift-cards', 'products' => [
                ['name' => 'Bellevue Gift Card - $10', 'sku' => 'GC-BEL-10', 'cost' => 10.00, 'markup' => 0, 'desc' => 'Perfect small gift for any occasion.'],
                ['name' => 'Bellevue Gift Card - $75', 'sku' => 'GC-BEL-75', 'cost' => 75.00, 'markup' => 0, 'desc' => 'A generous gift card for that special someone.'],
                ['name' => 'Bellevue Gift Card - $500', 'sku' => 'GC-BEL-500', 'cost' => 500.00, 'markup' => 0, 'desc' => 'Premium gift card for major purchases.'],
            ]],

            // --- Art & Craft Supplies ---
            ['slug' => 'arts-crafts', 'products' => [
                ['name' => 'Watercolor Paint Set 12pk', 'sku' => 'ART-006', 'cost' => 7.50, 'markup' => 100, 'desc' => 'Semi-professional watercolor paints in 12 vibrant colors.'],
                ['name' => 'Craft Glue Sticks 24pk', 'sku' => 'ART-007', 'cost' => 3.00, 'markup' => 120, 'desc' => 'Non-toxic clear glue sticks for school and craft projects.'],
                ['name' => 'Modeling Clay Set', 'sku' => 'ART-008', 'cost' => 5.50, 'markup' => 100, 'desc' => 'Air-dry modeling clay in 8 assorted colors.'],
            ]],

            // --- Bags & Backpacks ---
            ['slug' => 'bags-backpacks', 'products' => [
                ['name' => 'Canvas Tote Bag', 'sku' => 'BAG-004', 'cost' => 8.00, 'markup' => 100, 'desc' => 'Reusable canvas tote bag for shopping and everyday use.'],
                ['name' => 'Kids Character Backpack', 'sku' => 'BAG-005', 'cost' => 12.00, 'markup' => 100, 'desc' => 'Fun character backpack for young learners.'],
                ['name' => 'Travel Duffel Bag', 'sku' => 'BAG-006', 'cost' => 25.00, 'markup' => 80, 'desc' => 'Spacious duffel bag with multiple compartments.'],
            ]],

            // --- Books & Reading ---
            ['slug' => 'books-reading', 'products' => [
                ['name' => 'Coloring Book — Animals', 'sku' => 'BKS-004', 'cost' => 3.50, 'markup' => 120, 'desc' => 'Fun animal coloring book for kids aged 4-10.'],
                ['name' => 'Journal Notebook A5', 'sku' => 'BKS-005', 'cost' => 4.00, 'markup' => 100, 'desc' => 'Lined journal notebook, 200 pages.'],
                ['name' => 'Bible — King James Version', 'sku' => 'BKS-006', 'cost' => 8.00, 'markup' => 60, 'desc' => 'Compact KJV Bible with leatherette cover.'],
            ]],

            // --- Cleaning Supplies ---
            ['slug' => 'cleaning-supplies', 'products' => [
                ['name' => 'Pine-Sol All Purpose Cleaner 1L', 'sku' => 'CLN-004', 'cost' => 4.50, 'markup' => 80, 'desc' => 'Powerful multi-surface cleaner with pine scent.'],
                ['name' => 'Sponge Pack 6ct', 'sku' => 'CLN-005', 'cost' => 2.50, 'markup' => 100, 'desc' => 'Durable kitchen sponges, 6 pack.'],
                ['name' => 'Trash Bags 30 Gallon 25ct', 'sku' => 'CLN-006', 'cost' => 5.00, 'markup' => 80, 'desc' => 'Heavy-duty trash bags for home and office.'],
                ['name' => 'Bleach 1 Gallon', 'sku' => 'CLN-007', 'cost' => 3.50, 'markup' => 80, 'desc' => 'Concentrated household bleach for cleaning and disinfecting.'],
            ]],

            // --- Computers & Accessories ---
            ['slug' => 'computers-accessories', 'products' => [
                ['name' => 'USB Flash Drive 32GB', 'sku' => 'CMP-004', 'cost' => 5.00, 'markup' => 100, 'desc' => 'High-speed USB 3.0 flash drive.'],
                ['name' => 'Wireless Mouse', 'sku' => 'CMP-005', 'cost' => 8.00, 'markup' => 100, 'desc' => 'Ergonomic wireless mouse with USB receiver.'],
                ['name' => 'Laptop Cooling Pad', 'sku' => 'CMP-006', 'cost' => 12.00, 'markup' => 80, 'desc' => 'Adjustable laptop cooling pad with dual fans.'],
                ['name' => 'HDMI Cable 6ft', 'sku' => 'CMP-007', 'cost' => 4.00, 'markup' => 120, 'desc' => 'High-speed HDMI cable for HD/4K displays.'],
            ]],

            // --- Electronics & Audio Visual ---
            ['slug' => 'electronics-audio', 'products' => [
                ['name' => 'Bluetooth Speaker Mini', 'sku' => 'ELC-004', 'cost' => 15.00, 'markup' => 80, 'desc' => 'Portable Bluetooth speaker with 6-hour battery.'],
                ['name' => 'Wall Charger Dual USB', 'sku' => 'ELC-005', 'cost' => 4.50, 'markup' => 100, 'desc' => 'Fast-charging dual USB wall adapter.'],
                ['name' => 'LED Desk Lamp', 'sku' => 'ELC-006', 'cost' => 12.00, 'markup' => 80, 'desc' => 'Adjustable LED desk lamp with touch dimmer.'],
                ['name' => 'Power Strip 6-Outlet', 'sku' => 'ELC-007', 'cost' => 8.00, 'markup' => 80, 'desc' => 'Surge-protected power strip with 6 outlets.'],
            ]],

            // --- Home & Kitchen ---
            ['slug' => 'home-supplies', 'products' => [
                ['name' => 'Plastic Food Containers 10pk', 'sku' => 'HOM-006', 'cost' => 6.00, 'markup' => 80, 'desc' => 'Microwave-safe food storage containers with lids.'],
                ['name' => 'Kitchen Utensil Set 5pc', 'sku' => 'HOM-007', 'cost' => 8.00, 'markup' => 80, 'desc' => 'Nylon kitchen utensils: spatula, ladle, spoon, tongs, whisk.'],
                ['name' => 'Glass Tumbler Set 4pk', 'sku' => 'HOM-008', 'cost' => 5.00, 'markup' => 100, 'desc' => 'Clear glass drinking tumblers, 12oz each.'],
            ]],

            // --- Musical Instruments ---
            ['slug' => 'musical-instruments', 'products' => [
                ['name' => 'Recorder Flute', 'sku' => 'MUS-004', 'cost' => 4.00, 'markup' => 120, 'desc' => 'Soprano recorder for school music programs.'],
                ['name' => 'Tambourine 8"', 'sku' => 'MUS-005', 'cost' => 6.00, 'markup' => 100, 'desc' => 'Wooden tambourine with jingle bells.'],
                ['name' => 'Guitar Strings Set', 'sku' => 'MUS-006', 'cost' => 3.50, 'markup' => 100, 'desc' => 'Steel acoustic guitar string set, 6 strings.'],
            ]],

            // --- Office Supplies ---
            ['slug' => 'office-supplies', 'products' => [
                ['name' => 'Copy Paper 500 Sheets', 'sku' => 'OFF-004', 'cost' => 5.50, 'markup' => 80, 'desc' => 'Letter-size white copy paper, 500 sheets.'],
                ['name' => 'Stapler Desktop', 'sku' => 'OFF-005', 'cost' => 4.00, 'markup' => 100, 'desc' => 'Full-size desktop stapler, 25-sheet capacity.'],
                ['name' => 'File Folders 12pk', 'sku' => 'OFF-006', 'cost' => 3.50, 'markup' => 100, 'desc' => 'Manila file folders, letter size, 12 pack.'],
                ['name' => 'Tape Dispenser with Tape', 'sku' => 'OFF-007', 'cost' => 3.00, 'markup' => 100, 'desc' => 'Desktop tape dispenser with 1 roll of clear tape.'],
            ]],

            // --- Party Supplies ---
            ['slug' => 'party-supplies', 'products' => [
                ['name' => 'Paper Plates 50ct', 'sku' => 'PTY-004', 'cost' => 3.50, 'markup' => 100, 'desc' => 'White paper plates, 9-inch, 50 pack.'],
                ['name' => 'Plastic Cups 50ct', 'sku' => 'PTY-005', 'cost' => 3.00, 'markup' => 100, 'desc' => 'Clear plastic cups, 16oz, 50 pack.'],
                ['name' => 'Streamers Assorted 6pk', 'sku' => 'PTY-006', 'cost' => 2.50, 'markup' => 120, 'desc' => 'Crepe paper streamers in 6 bright colors.'],
                ['name' => 'Party Hats 8pk', 'sku' => 'PTY-007', 'cost' => 2.00, 'markup' => 120, 'desc' => 'Colorful cone-shaped party hats with elastic.'],
            ]],

            // --- School Supplies ---
            ['slug' => 'school-supplies', 'products' => [
                ['name' => 'Scientific Calculator', 'sku' => 'SCH-004', 'cost' => 8.00, 'markup' => 80, 'desc' => 'Full-function scientific calculator for high school math.'],
                ['name' => 'Pencil Case Zip', 'sku' => 'SCH-005', 'cost' => 3.00, 'markup' => 100, 'desc' => 'Zippered pencil case with multiple compartments.'],
                ['name' => 'Composition Book 3pk', 'sku' => 'SCH-006', 'cost' => 4.00, 'markup' => 80, 'desc' => 'Marble composition books, wide-ruled, 3 pack.'],
                ['name' => 'Highlighters 5pk', 'sku' => 'SCH-007', 'cost' => 2.50, 'markup' => 120, 'desc' => 'Chisel-tip highlighters in 5 fluorescent colors.'],
            ]],

            // --- Toys, Games & Bikes ---
            ['slug' => 'toys-games', 'products' => [
                ['name' => 'Playing Cards Deck', 'sku' => 'TOY-005', 'cost' => 2.00, 'markup' => 120, 'desc' => 'Standard 52-card deck with 2 jokers.'],
                ['name' => 'Rubik\'s Cube 3x3', 'sku' => 'TOY-006', 'cost' => 5.00, 'markup' => 100, 'desc' => 'Classic 3x3 puzzle cube.'],
                ['name' => 'Jump Rope', 'sku' => 'TOY-007', 'cost' => 3.00, 'markup' => 100, 'desc' => 'Adjustable jump rope for kids and adults.'],
                ['name' => 'Foam Football', 'sku' => 'TOY-008', 'cost' => 4.00, 'markup' => 80, 'desc' => 'Soft foam football for safe indoor/outdoor play.'],
            ]],

            // --- Stationery ---
            ['slug' => 'stationery', 'products' => [
                ['name' => 'Ballpoint Pens 10pk', 'sku' => 'STA-004', 'cost' => 2.50, 'markup' => 100, 'desc' => 'Blue medium-point ballpoint pens, 10 pack.'],
                ['name' => 'Sticky Notes 3x3 5pk', 'sku' => 'STA-005', 'cost' => 2.00, 'markup' => 120, 'desc' => 'Self-stick notes in 5 pastel colors, 100 sheets each.'],
                ['name' => 'Envelope White 50pk', 'sku' => 'STA-006', 'cost' => 3.00, 'markup' => 80, 'desc' => 'Standard #10 white envelopes, 50 pack.'],
                ['name' => 'Correction Tape 2pk', 'sku' => 'STA-007', 'cost' => 2.50, 'markup' => 100, 'desc' => 'White-out correction tape, 2 pack.'],
            ]],

            // --- Furniture & Decor ---
            ['slug' => 'furniture-decor', 'products' => [
                ['name' => 'Photo Frame 5x7', 'sku' => 'FDC-006', 'cost' => 5.00, 'markup' => 100, 'desc' => 'Classic wooden photo frame, 5x7 inches.'],
                ['name' => 'Desk Organizer', 'sku' => 'FDC-007', 'cost' => 8.00, 'markup' => 80, 'desc' => 'Multi-compartment desk organizer for pens, clips, and notes.'],
                ['name' => 'Wall Clock 12"', 'sku' => 'FDC-008', 'cost' => 10.00, 'markup' => 80, 'desc' => 'Silent quartz wall clock, 12-inch diameter.'],
            ]],
        ];

        $created = 0;
        $barcodeSeq = 200; // Start after existing products

        foreach ($newProducts as $catGroup) {
            $categoryId = $categories[$catGroup['slug']] ?? null;
            if (!$categoryId) {
                continue;
            }

            foreach ($catGroup['products'] as $p) {
                $slug = Str::slug($p['name']);
                // Skip if SKU or slug already exists
                if (Product::where('sku', $p['sku'])->orWhere('slug', $slug)->exists()) {
                    // Just make sure price is set
                    $existing = Product::where('sku', $p['sku'])->orWhere('slug', $slug)->first();
                    if ($existing && ($existing->price == 0 || $existing->price === null)) {
                        $existing->cost = $p['cost'];
                        $existing->markup_percentage = $p['markup'];
                        $existing->save();
                    }
                    continue;
                }

                $product = Product::create([
                    'id' => Str::uuid(),
                    'category_id' => $categoryId,
                    'name' => $p['name'],
                    'slug' => $slug,
                    'sku' => $p['sku'],
                    'barcode' => $this->generateEAN13($barcodeSeq++),
                    'cost' => $p['cost'],
                    'markup_percentage' => $p['markup'],
                    'description' => $p['desc'],
                    'is_active' => true,
                ]);

                // Create inventory record
                Inventory::updateOrCreate(
                    ['product_id' => $product->id],
                    [
                        'qty_on_hand' => rand(10, 100),
                        'qty_reserved' => 0,
                        'reorder_level' => 5,
                        'location' => 'Freeport Store',
                    ]
                );

                $created++;
            }
        }

        $this->command->info("Created {$created} new products.");

        // 4. Ensure all existing products have inventory records
        $productsWithoutInventory = Product::whereDoesntHave('inventory')->get();
        foreach ($productsWithoutInventory as $product) {
            Inventory::create([
                'product_id' => $product->id,
                'qty_on_hand' => rand(10, 50),
                'qty_reserved' => 0,
                'reorder_level' => 5,
                'location' => 'Freeport Store',
            ]);
        }

        if ($productsWithoutInventory->count() > 0) {
            $this->command->info("Created inventory for {$productsWithoutInventory->count()} products.");
        }
    }

    private function seedRegisters(): void
    {
        $registers = [
            ['name' => 'Register 1', 'location' => 'Freeport Store'],
            ['name' => 'Register 2', 'location' => 'Freeport Store'],
            ['name' => 'Register 3', 'location' => 'Freeport Store'],
        ];

        foreach ($registers as $reg) {
            Register::firstOrCreate(
                ['name' => $reg['name']],
                [
                    'id' => Str::uuid(),
                    'location' => $reg['location'],
                    'is_active' => true,
                ]
            );
        }

        $this->command->info("Ensured 3 registers exist.");
    }
}
