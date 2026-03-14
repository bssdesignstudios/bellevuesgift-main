<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ShopSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Users
        User::updateOrCreate(
            ['email' => 'admin@bellevuegifts.com'],
            ['name' => 'Admin User', 'password' => bcrypt('password'), 'role' => 'admin']
        );

        User::updateOrCreate(
            ['email' => 'cashier@bellevuegifts.com'],
            ['name' => 'Cashier User', 'password' => bcrypt('password'), 'role' => 'cashier']
        );

        User::updateOrCreate(
            ['email' => 'warehouse@bellevuegifts.com'],
            ['name' => 'Warehouse Manager', 'password' => bcrypt('password'), 'role' => 'warehouse_manager']
        );

        // Real staff accounts
        User::updateOrCreate(
            ['email' => 'daniella@bellevuegifts.com'],
            ['name' => 'Daniella Forbes', 'password' => bcrypt('bellevue123'), 'role' => 'finance']
        );
        User::updateOrCreate(
            ['email' => 'diamond@bellevuegifts.com'],
            ['name' => 'Diamond Clarke', 'password' => bcrypt('bellevue123'), 'role' => 'cashier']
        );
        User::updateOrCreate(
            ['email' => 'donnika@bellevuegifts.com'],
            ['name' => 'Donnika Williams', 'password' => bcrypt('bellevue123'), 'role' => 'cashier']
        );
        User::updateOrCreate(
            ['email' => 'adrian@bellevuegifts.com'],
            ['name' => 'Adrian Williams', 'password' => bcrypt('bellevue123'), 'role' => 'admin']
        );
        User::updateOrCreate(
            ['email' => 'theresa@bellevuegifts.com'],
            ['name' => 'Theresa Tomlinson', 'password' => bcrypt('bellevue123'), 'role' => 'admin']
        );
        User::updateOrCreate(
            ['email' => 'peter@bellevuegifts.com'],
            ['name' => 'Peter Storr', 'password' => bcrypt('bellevue123'), 'role' => 'warehouse']
        );
        User::updateOrCreate(
            ['email' => 'steve@bellevuegifts.com'],
            ['name' => 'Steve McPhee', 'password' => bcrypt('bellevue123'), 'role' => 'warehouse']
        );
        User::updateOrCreate(
            ['email' => 'jahmarli@bellevuegifts.com'],
            ['name' => 'Jah-Marli Saunders', 'password' => bcrypt('bellevue123'), 'role' => 'warehouse']
        );

        // 2. Categories — with SKU Prefix
        $categoryDefs = [
            ['name' => 'Art & Craft Supplies', 'slug' => 'arts-crafts', 'sort_order' => 1, 'sku_prefix' => 'ART'],
            ['name' => 'Bags & Backpacks', 'slug' => 'bags-backpacks', 'sort_order' => 2, 'sku_prefix' => 'BAG'],
            ['name' => 'Books & Reading', 'slug' => 'books-reading', 'sort_order' => 3, 'sku_prefix' => 'BKS'],
            ['name' => 'Cleaning Supplies', 'slug' => 'cleaning-supplies', 'sort_order' => 4, 'sku_prefix' => 'CLN'],
            ['name' => 'Computers & Accessories', 'slug' => 'computers-accessories', 'sort_order' => 5, 'sku_prefix' => 'CMP'],
            ['name' => 'Electronics & Audio Visual', 'slug' => 'electronics-audio', 'sort_order' => 6, 'sku_prefix' => 'ELC'],
            ['name' => 'Home & Kitchen', 'slug' => 'home-supplies', 'sort_order' => 7, 'sku_prefix' => 'HOM'],
            ['name' => 'Musical Instruments', 'slug' => 'musical-instruments', 'sort_order' => 8, 'sku_prefix' => 'MUS'],
            ['name' => 'Office Supplies', 'slug' => 'office-supplies', 'sort_order' => 9, 'sku_prefix' => 'OFF'],
            ['name' => 'Party Supplies', 'slug' => 'party-supplies', 'sort_order' => 10, 'sku_prefix' => 'PTY'],
            ['name' => 'School Supplies', 'slug' => 'school-supplies', 'sort_order' => 11, 'sku_prefix' => 'SCH'],
            ['name' => 'Toys, Games & Bikes', 'slug' => 'toys-games', 'sort_order' => 12, 'sku_prefix' => 'TOY'],
            ['name' => 'Stationery', 'slug' => 'stationery', 'sort_order' => 13, 'sku_prefix' => 'STA'],
            ['name' => 'Furniture & Decor', 'slug' => 'furniture-decor', 'sort_order' => 14, 'sku_prefix' => 'FDC'],
        ];

        $catMap = [];
        foreach ($categoryDefs as $def) {
            $existing = Category::where('slug', $def['slug'])->first();
            if ($existing) {
                $existing->update([
                    'name' => $def['name'],
                    'sort_order' => $def['sort_order'],
                    'sku_prefix' => $def['sku_prefix'],
                    'is_active' => true,
                ]);
                $catMap[$def['slug']] = $existing->id;
            } else {
                $cat = Category::create([
                    'id' => Str::uuid(),
                    'name' => $def['name'],
                    'slug' => $def['slug'],
                    'sku_prefix' => $def['sku_prefix'],
                    'sort_order' => $def['sort_order'],
                    'is_active' => true,
                ]);
                $catMap[$def['slug']] = $cat->id;
            }
        }

        // 3. Products — with Cost and Markup (Price calculated automatically by Model)
        $products = [
            // --- Art & Craft Supplies ---
            [
                'sku' => 'ART-001',
                'category_id' => $catMap['arts-crafts'],
                'name' => 'Acrylic Paint Set',
                'slug' => 'acrylic-paint-set',
                'cost' => 12.50,
                'markup_percentage' => 100, // Price ~25.00
                'description' => 'Vibrant acrylic paints for artists of all levels.',
                'image_url' => 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'ArtSupplyCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'ART-002',
                'category_id' => $catMap['arts-crafts'],
                'name' => 'Canvas Board 3-Pack',
                'slug' => 'canvas-board-3-pack',
                'cost' => 8.00,
                'markup_percentage' => 100, // Price ~16.00
                'description' => 'Sturdy canvas boards for painting and mixed media.',
                'image_url' => 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'ArtSupplyCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'ART-003',
                'category_id' => $catMap['arts-crafts'],
                'name' => 'Drawing Sketchpad',
                'slug' => 'drawing-sketchpad',
                'cost' => 4.50,
                'markup_percentage' => 100, // Price ~9.00
                'description' => 'High-quality paper ideal for sketching and drawing.',
                'image_url' => 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PaperWorks',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'ART-004',
                'category_id' => $catMap['arts-crafts'],
                'name' => 'Colored Pencils 24ct',
                'slug' => 'colored-pencils-24ct',
                'cost' => 6.50,
                'markup_percentage' => 100, // Price ~13.00
                'description' => 'Richly pigmented colored pencils for coloring and art.',
                'image_url' => 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'ColorWorld',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'ART-005',
                'category_id' => $catMap['arts-crafts'],
                'name' => 'Paint Brushes Set',
                'slug' => 'paint-brushes-set',
                'cost' => 5.00,
                'markup_percentage' => 100, // Price ~10.00
                'description' => 'Assorted paint brushes for various techniques.',
                'image_url' => 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'ArtSupplyCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],

            // --- Bags & Backpacks ---
            [
                'sku' => 'BAG-001',
                'category_id' => $catMap['bags-backpacks'],
                'name' => 'Classic School Backpack',
                'slug' => 'classic-school-backpack',
                'cost' => 15.00,
                'markup_percentage' => 100, // Price ~30.00
                'description' => 'Durable and spacious backpack for everyday school use.',
                'image_url' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'BagMasters',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'BAG-002',
                'category_id' => $catMap['bags-backpacks'],
                'name' => 'Laptop Messenger Bag',
                'slug' => 'laptop-messenger-bag',
                'cost' => 23.00,
                'markup_percentage' => 100, // Price ~46.00
                'description' => 'Professional messenger bag with padded laptop compartment.',
                'image_url' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'TechGear',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'BAG-003',
                'category_id' => $catMap['bags-backpacks'],
                'name' => 'Kids Character Backpack',
                'slug' => 'kids-character-backpack',
                'cost' => 12.50,
                'markup_percentage' => 100, // Price ~25.00
                'description' => 'Fun and colorful backpack featuring popular characters.',
                'image_url' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'KidsWorld',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'BAG-004',
                'category_id' => $catMap['bags-backpacks'],
                'name' => 'Drawstring Gym Bag',
                'slug' => 'drawstring-gym-bag',
                'cost' => 7.50,
                'markup_percentage' => 100, // Price ~15.00
                'description' => 'Lightweight drawstring bag for gym clothes or light carry.',
                'image_url' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'FitGear',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'BAG-005',
                'category_id' => $catMap['bags-backpacks'],
                'name' => 'Travel Duffel Bag',
                'slug' => 'travel-duffel-bag',
                'cost' => 25.00,
                'markup_percentage' => 100, // Price ~50.00
                'description' => 'Spacious duffel bag perfect for weekend trips.',
                'image_url' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'TravelCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],

            // --- Books & Reading ---
            [
                'sku' => 'BKS-001',
                'category_id' => $catMap['books-reading'],
                'name' => 'Classic Novels Collection',
                'slug' => 'classic-novels-collection',
                'cost' => 20.00,
                'markup_percentage' => 100, // Price ~40.00
                'description' => 'Set of timeless classic literature novels.',
                'image_url' => 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PenguinBooks',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'BKS-002',
                'category_id' => $catMap['books-reading'],
                'name' => 'Children\'s Storybook',
                'slug' => 'childrens-storybook',
                'cost' => 6.50,
                'markup_percentage' => 100, // Price ~13.00
                'description' => 'Illustrated storybook for young readers.',
                'image_url' => 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'KidsReads',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'BKS-003',
                'category_id' => $catMap['books-reading'],
                'name' => 'SAT Prep Guide',
                'slug' => 'sat-prep-guide',
                'cost' => 12.50,
                'markup_percentage' => 100, // Price ~25.00
                'description' => 'Comprehensive guide for SAT exam preparation.',
                'image_url' => 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'EduPrep',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'BKS-004',
                'category_id' => $catMap['books-reading'],
                'name' => 'Journal / Diary',
                'slug' => 'journal-diary',
                'cost' => 7.50,
                'markup_percentage' => 100, // Price ~15.00
                'description' => 'Lined journal for personal writing and note-taking.',
                'image_url' => 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PaperWorks',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'BKS-005',
                'category_id' => $catMap['books-reading'],
                'name' => 'Local History Book',
                'slug' => 'local-history-book',
                'cost' => 10.00,
                'markup_percentage' => 100, // Price ~20.00
                'description' => 'Fascinating history and stories from the Bahamas.',
                'image_url' => 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'IslandPress',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],

            // --- Cleaning Supplies ---
            [
                'sku' => 'CLN-001',
                'category_id' => $catMap['cleaning-supplies'],
                'name' => 'Commercial Spray Bottle',
                'slug' => 'commercial-spray-bottle',
                'cost' => 6.50,
                'markup_percentage' => 100, // Price ~13.00
                'description' => 'Heavy duty spray bottle for industrial use.',
                'image_url' => 'https://images.unsplash.com/photo-1624823183492-23910c283021?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'CleanPro',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'CLN-002',
                'category_id' => $catMap['cleaning-supplies'],
                'name' => 'Disinfectant Spray 32oz',
                'slug' => 'disinfectant-spray-32oz',
                'cost' => 4.50,
                'markup_percentage' => 100, // Price ~9.00
                'description' => 'Multi-surface disinfectant cleaner.',
                'image_url' => 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'CleanPro',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'CLN-003',
                'category_id' => $catMap['cleaning-supplies'],
                'name' => 'Microfiber Cloth Pack',
                'slug' => 'microfiber-cloth-pack',
                'cost' => 7.50,
                'markup_percentage' => 100, // Price ~15.00
                'description' => 'Pack of 12 reusable microfiber cloths.',
                'image_url' => 'https://images.unsplash.com/photo-1585276541430-26d89cc79777?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'CleanPro',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'CLN-004',
                'category_id' => $catMap['cleaning-supplies'],
                'name' => 'Floor Cleaner 1 Gallon',
                'slug' => 'floor-cleaner-1-gallon',
                'cost' => 10.00,
                'markup_percentage' => 100, // Price ~20.00
                'description' => 'Effective floor cleaner for all surface types.',
                'image_url' => 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'CleanPro',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'CLN-005',
                'category_id' => $catMap['cleaning-supplies'],
                'name' => 'Paper Towels Bulk Pack',
                'slug' => 'paper-towels-bulk-pack',
                'cost' => 12.50,
                'markup_percentage' => 100, // Price ~25.00
                'description' => 'Bulk pack of high-absorbency paper towels.',
                'image_url' => 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'CleanPro',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],

            // --- Computers & Accessories ---
            [
                'sku' => 'CMP-001',
                'category_id' => $catMap['computers-accessories'],
                'name' => 'Wireless Mouse',
                'slug' => 'wireless-mouse',
                'cost' => 10.00,
                'markup_percentage' => 100, // Price ~20.00
                'description' => 'Ergonomic wireless mouse with USB receiver.',
                'image_url' => 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'TechGear',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'CMP-002',
                'category_id' => $catMap['computers-accessories'],
                'name' => 'Mechanical Keyboard',
                'slug' => 'mechanical-keyboard',
                'cost' => 30.00,
                'markup_percentage' => 100, // Price ~60.00
                'description' => 'Tactile mechanical keyboard for typing and gaming.',
                'image_url' => 'https://images.unsplash.com/photo-1587829741301-dc798b91add1?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'TechGear',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'CMP-003',
                'category_id' => $catMap['computers-accessories'],
                'name' => 'USB-C Hub Adapter',
                'slug' => 'usb-c-hub-adapter',
                'cost' => 15.00,
                'markup_percentage' => 100, // Price ~30.00
                'description' => 'Multi-port USB-C adapter for laptops.',
                'image_url' => 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'ConnectPlus',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'CMP-004',
                'category_id' => $catMap['computers-accessories'],
                'name' => 'Laptop Stand Adjustable',
                'slug' => 'laptop-stand-adjustable',
                'cost' => 13.00,
                'markup_percentage' => 100, // Price ~26.00
                'description' => 'Adjustable aluminum stand for laptops and tablets.',
                'image_url' => 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'ErgoWorks',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'CMP-005',
                'category_id' => $catMap['computers-accessories'],
                'name' => 'External Hard Drive 1TB',
                'slug' => 'external-hard-drive-1tb',
                'cost' => 35.00,
                'markup_percentage' => 100, // Price ~70.00
                'description' => 'Portable external hard drive for data backup.',
                'image_url' => 'https://images.unsplash.com/photo-1531492876349-310ec8add252?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'DataSafe',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],

            // --- Electronics & Audio Visual ---
            [
                'sku' => 'ELC-JBL-001',
                'category_id' => $catMap['electronics-audio'],
                'name' => 'JBL Flip 6',
                'slug' => 'jbl-flip-6',
                'cost' => 65.00,
                'markup_percentage' => 100, // Price ~130.00
                'description' => 'Waterproof portable Bluetooth speaker.',
                'image_url' => 'https://images.unsplash.com/photo-1628126139474-06cba3d63b0a?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'JBL Distributor',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'ELC-AMZ-001',
                'category_id' => $catMap['electronics-audio'],
                'name' => 'Amazon Fire HD',
                'slug' => 'amazon-fire-hd',
                'cost' => 45.00,
                'markup_percentage' => 100, // Price ~90.00
                'description' => '10 inch tablet for entertainment.',
                'image_url' => 'https://images.unsplash.com/photo-1544866092-1935c5ef2a8f?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'Amazon',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'ELC-JBL-PB31',
                'category_id' => $catMap['electronics-audio'],
                'name' => 'JBL PartyBox 31',
                'slug' => 'jbl-partybox-31',
                'cost' => 175.00,
                'markup_percentage' => 100, // Price ~350.00
                'description' => 'Portable party speaker with built-in light show.',
                'image_url' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'JBL Distributor',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'ELC-SAM-001',
                'category_id' => $catMap['electronics-audio'],
                'name' => 'Samsung Galaxy Tab',
                'slug' => 'samsung-galaxy-tab',
                'cost' => 225.00,
                'markup_percentage' => 100, // Price ~450.00
                'description' => 'Samsung Galaxy Tab A9 — versatile Android tablet.',
                'image_url' => 'https://images.unsplash.com/photo-1601944077518-338095ad02ab?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'Samsung',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'ELC-HDMI-001',
                'category_id' => $catMap['electronics-audio'],
                'name' => 'HDMI Cable 10ft',
                'slug' => 'hdmi-cable-10ft',
                'cost' => 12.50,
                'markup_percentage' => 100, // Price ~25.00
                'description' => 'High-speed HDMI 2.1 cable, 10 feet.',
                'image_url' => 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'TechGear',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],

            // --- Home & Kitchen ---
            [
                'sku' => 'HOM-001',
                'category_id' => $catMap['home-supplies'],
                'name' => 'Scented Candle Set',
                'slug' => 'scented-candle-set',
                'cost' => 11.50,
                'markup_percentage' => 100, // Price ~23.00
                'description' => 'Set of 3 hand-poured soy candles.',
                'image_url' => 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'HomeSense',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'HOM-002',
                'category_id' => $catMap['home-supplies'],
                'name' => 'Kitchen Knife Set',
                'slug' => 'kitchen-knife-set',
                'cost' => 30.00,
                'markup_percentage' => 100, // Price ~60.00
                'description' => 'High-quality stainless steel kitchen knife set.',
                'image_url' => 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'ChefPro',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'HOM-003',
                'category_id' => $catMap['home-supplies'],
                'name' => 'Storage Containers',
                'slug' => 'storage-containers',
                'cost' => 15.00,
                'markup_percentage' => 100, // Price ~30.00
                'description' => 'Airtight food storage containers for kitchen organization.',
                'image_url' => 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'HomeOrganize',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'HOM-004',
                'category_id' => $catMap['home-supplies'],
                'name' => 'Ceramic Mug Set',
                'slug' => 'ceramic-mug-set',
                'cost' => 9.50,
                'markup_percentage' => 100, // Price ~19.00
                'description' => 'Set of 4 stylish ceramic mugs.',
                'image_url' => 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'HomeSense',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'HOM-005',
                'category_id' => $catMap['home-supplies'],
                'name' => 'Bath Towel Set',
                'slug' => 'bath-towel-set',
                'cost' => 20.00,
                'markup_percentage' => 100, // Price ~40.00
                'description' => 'Soft and absorbent cotton bath towels.',
                'image_url' => 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'HomeSense',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],

            // --- Musical Instruments ---
            [
                'sku' => 'MUS-001',
                'category_id' => $catMap['musical-instruments'],
                'name' => 'Acoustic Guitar Beginner',
                'slug' => 'acoustic-guitar-beginner',
                'cost' => 60.00,
                'markup_percentage' => 100, // Price ~120.00
                'description' => 'Perfect starter acoustic guitar for students.',
                'image_url' => 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'MusicWorld',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'MUS-002',
                'category_id' => $catMap['musical-instruments'],
                'name' => 'Electronic Keyboard',
                'slug' => 'electronic-keyboard',
                'cost' => 75.00,
                'markup_percentage' => 100, // Price ~150.00
                'description' => '61-key portable electronic keyboard.',
                'image_url' => 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'MusicWorld',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'MUS-003',
                'category_id' => $catMap['musical-instruments'],
                'name' => 'Ukulele Soprano',
                'slug' => 'ukulele-soprano',
                'cost' => 25.00,
                'markup_percentage' => 100, // Price ~50.00
                'description' => 'Classic soprano ukulele with carrying bag.',
                'image_url' => 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'MusicWorld',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'MUS-004',
                'category_id' => $catMap['musical-instruments'],
                'name' => 'Drum Sticks Pair',
                'slug' => 'drum-sticks-pair',
                'cost' => 6.50,
                'markup_percentage' => 100, // Price ~13.00
                'description' => 'Durable hickory drum sticks for practice.',
                'image_url' => 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'MusicWorld',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'MUS-005',
                'category_id' => $catMap['musical-instruments'],
                'name' => 'Music Stand',
                'slug' => 'music-stand',
                'cost' => 12.50,
                'markup_percentage' => 100, // Price ~25.00
                'description' => 'Foldable music stand with carrying case.',
                'image_url' => 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'MusicWorld',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],

            // --- Office Supplies ---
            [
                'sku' => 'OFF-001',
                'category_id' => $catMap['office-supplies'],
                'name' => 'Ballpoint Pen Box',
                'slug' => 'ballpoint-pen-box',
                'cost' => 3.50,
                'markup_percentage' => 100, // Price ~7.00
                'description' => 'Box of 24 assorted ballpoint pens.',
                'image_url' => 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'OfficePro',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'OFF-002',
                'category_id' => $catMap['office-supplies'],
                'name' => 'Desk Organizer',
                'slug' => 'desk-organizer',
                'cost' => 10.00,
                'markup_percentage' => 100, // Price ~20.00
                'description' => 'Bamboo desktop organizer with 5 compartments.',
                'image_url' => 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'OfficePro',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'OFF-003',
                'category_id' => $catMap['office-supplies'],
                'name' => 'Printer Paper Ream',
                'slug' => 'printer-paper-ream',
                'cost' => 4.25,
                'markup_percentage' => 100, // Price ~8.50
                'description' => 'Multi-purpose printer paper, 500 sheets.',
                'image_url' => 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PaperCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'OFF-004',
                'category_id' => $catMap['office-supplies'],
                'name' => 'Stapler Heavy Duty',
                'slug' => 'stapler-heavy-duty',
                'cost' => 7.50,
                'markup_percentage' => 100, // Price ~15.00
                'description' => 'Reliable desktop stapler with 20-sheet capacity.',
                'image_url' => 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'OfficePro',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'OFF-005',
                'category_id' => $catMap['office-supplies'],
                'name' => 'File Folders 100ct',
                'slug' => 'file-folders-100ct',
                'cost' => 9.50,
                'markup_percentage' => 100, // Price ~19.00
                'description' => 'Box of 100 manila file folders.',
                'image_url' => 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PaperCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],

            // --- Party Supplies ---
            [
                'sku' => 'PTY-001',
                'category_id' => $catMap['party-supplies'],
                'name' => 'Birthday Balloons 50pk',
                'slug' => 'birthday-balloons-50pk',
                'cost' => 6.50,
                'markup_percentage' => 100, // Price ~13.00
                'description' => 'Colorful latex balloons for parties and events.',
                'image_url' => 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PartyTime',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'PTY-002',
                'category_id' => $catMap['party-supplies'],
                'name' => 'Paper Plates & Cups',
                'slug' => 'paper-plates-cups',
                'cost' => 8.00,
                'markup_percentage' => 100, // Price ~16.00
                'description' => 'Party set including plates, cups, and napkins.',
                'image_url' => 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PartyTime',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'PTY-003',
                'category_id' => $catMap['party-supplies'],
                'name' => 'Party Streamers',
                'slug' => 'party-streamers',
                'cost' => 3.00,
                'markup_percentage' => 100, // Price ~6.00
                'description' => 'Rolls of colorful crepe paper streamers.',
                'image_url' => 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PartyTime',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'PTY-004',
                'category_id' => $catMap['party-supplies'],
                'name' => 'Gift Wrapping Paper',
                'slug' => 'gift-wrapping-paper',
                'cost' => 4.50,
                'markup_percentage' => 100, // Price ~9.00
                'description' => 'Assorted designs of premium wrapping paper.',
                'image_url' => 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PartyTime',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],
            [
                'sku' => 'PTY-005',
                'category_id' => $catMap['party-supplies'],
                'name' => 'Confetti Cannon',
                'slug' => 'confetti-cannon',
                'cost' => 5.00,
                'markup_percentage' => 100, // Price ~10.00
                'description' => 'Handheld confetti cannon for celebrations.',
                'image_url' => 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PartyTime',
                'card_color' => 'mint',
                'hex_code' => '#E0F7FA',
            ],

            // --- School Supplies ---
            [
                'sku' => 'SCH-001',
                'category_id' => $catMap['school-supplies'],
                'name' => 'Notebook Set (5-Pack)',
                'slug' => 'notebook-set-5-pack',
                'cost' => 5.00,
                'markup_percentage' => 100, // Price ~10.00
                'description' => 'Ruled notebooks, college size.',
                'image_url' => 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'SchoolPro',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'SCH-002',
                'category_id' => $catMap['school-supplies'],
                'name' => 'Backpack — Student Pro',
                'slug' => 'backpack-student-pro',
                'cost' => 17.50,
                'markup_percentage' => 100, // Price ~35.00
                'description' => 'Durable school backpack with laptop sleeve.',
                'image_url' => 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'BagMasters',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'SCH-003',
                'category_id' => $catMap['school-supplies'],
                'name' => 'Geometry Set',
                'slug' => 'geometry-set',
                'cost' => 4.00,
                'markup_percentage' => 100, // Price ~8.00
                'description' => 'Complete geometry set with compass and rulers.',
                'image_url' => 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'SchoolPro',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'SCH-004',
                'category_id' => $catMap['school-supplies'],
                'name' => 'Scientific Calculator',
                'slug' => 'scientific-calculator',
                'cost' => 9.50,
                'markup_percentage' => 100, // Price ~19.00
                'description' => 'Standard scientific calculator for math and science.',
                'image_url' => 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'TechGear',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'SCH-005',
                'category_id' => $catMap['school-supplies'],
                'name' => 'No. 2 Pencils Box',
                'slug' => 'no-2-pencils-box',
                'cost' => 2.50,
                'markup_percentage' => 100, // Price ~5.00
                'description' => 'Box of 12 HB wooden pencils.',
                'image_url' => 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'SchoolPro',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],

            // --- Toys, Games & Bikes ---
            [
                'sku' => 'TOY-001',
                'category_id' => $catMap['toys-games'],
                'name' => 'Puzzle 1000 Piece',
                'slug' => 'puzzle-1000-piece',
                'cost' => 10.00,
                'markup_percentage' => 100, // Price ~20.00
                'description' => 'Challenging jigsaw puzzle with scenic view.',
                'image_url' => 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'ToyLand',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'TOY-002',
                'category_id' => $catMap['toys-games'],
                'name' => 'Board Game Classic',
                'slug' => 'board-game-classic',
                'cost' => 15.00,
                'markup_percentage' => 100, // Price ~30.00
                'description' => 'Family favorite board game for game nights.',
                'image_url' => 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'ToyLand',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'TOY-003',
                'category_id' => $catMap['toys-games'],
                'name' => 'Action Figure Hero',
                'slug' => 'action-figure-hero',
                'cost' => 7.50,
                'markup_percentage' => 100, // Price ~15.00
                'description' => 'Poseable action figure with accessories.',
                'image_url' => 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'ToyLand',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'TOY-004',
                'category_id' => $catMap['toys-games'],
                'name' => 'Bicycle Helmet',
                'slug' => 'bicycle-helmet',
                'cost' => 12.50,
                'markup_percentage' => 100, // Price ~25.00
                'description' => 'Adjustable safety helmet for cycling.',
                'image_url' => 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'SafeRide',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'TOY-005',
                'category_id' => $catMap['toys-games'],
                'name' => 'Kids Tricycle',
                'slug' => 'kids-tricycle',
                'cost' => 35.00,
                'markup_percentage' => 100, // Price ~70.00
                'description' => 'Sturdy tricycle for toddlers.',
                'image_url' => 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'SafeRide',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],

            // --- Stationery ---
            [
                'sku' => 'STA-001',
                'category_id' => $catMap['stationery'],
                'name' => 'Premium Writing Pad',
                'slug' => 'premium-writing-pad',
                'cost' => 4.50,
                'markup_percentage' => 100, // Price ~9.00
                'description' => 'Smooth writing paper for correspondence.',
                'image_url' => 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PaperCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'STA-002',
                'category_id' => $catMap['stationery'],
                'name' => 'Envelope Pack',
                'slug' => 'envelope-pack',
                'cost' => 3.00,
                'markup_percentage' => 100, // Price ~6.00
                'description' => 'Pack of 50 standard envelopes.',
                'image_url' => 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'PaperCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'STA-003',
                'category_id' => $catMap['stationery'],
                'name' => 'Sticky Notes Cube',
                'slug' => 'sticky-notes-cube',
                'cost' => 3.25,
                'markup_percentage' => 100, // Price ~6.50
                'description' => 'Cube of 400 sticky notes in assorted colors.',
                'image_url' => 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'OfficePro',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'STA-004',
                'category_id' => $catMap['stationery'],
                'name' => 'Fountain Pen Ink',
                'slug' => 'fountain-pen-ink',
                'cost' => 6.50,
                'markup_percentage' => 100, // Price ~13.00
                'description' => 'Bottle of premium blue fountain pen ink.',
                'image_url' => 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'FinePens',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'STA-005',
                'category_id' => $catMap['stationery'],
                'name' => 'Washi Tape Set',
                'slug' => 'washi-tape-set',
                'cost' => 5.50,
                'markup_percentage' => 100, // Price ~11.00
                'description' => 'Decorative washi tape for journaling and crafts.',
                'image_url' => 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'CraftyCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],

            // --- Furniture & Decor ---
            [
                'sku' => 'FDC-001',
                'category_id' => $catMap['furniture-decor'],
                'name' => 'Office Chair Mesh',
                'slug' => 'office-chair-mesh',
                'cost' => 85.00,
                'markup_percentage' => 100, // Price ~170.00
                'description' => 'Ergonomic mesh back office chair with adjustable height.',
                'image_url' => 'https://images.unsplash.com/photo-1596162955779-9c8f7f439d62?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'FurnitureCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'FDC-002',
                'category_id' => $catMap['furniture-decor'],
                'name' => 'LED Desk Lamp',
                'slug' => 'led-desk-lamp',
                'cost' => 20.00,
                'markup_percentage' => 100, // Price ~40.00
                'description' => 'Modern LED desk lamp with adjustable brightness.',
                'image_url' => 'https://images.unsplash.com/photo-1534073828943-f801091a7d58?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'LightHouse',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'FDC-003',
                'category_id' => $catMap['furniture-decor'],
                'name' => 'Wooden Side Table',
                'slug' => 'wooden-side-table',
                'cost' => 45.00,
                'markup_percentage' => 100, // Price ~90.00
                'description' => 'Minimalist wooden side table for office or home.',
                'image_url' => 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'FurnitureCo',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'FDC-004',
                'category_id' => $catMap['furniture-decor'],
                'name' => 'Wall Clock Modern',
                'slug' => 'wall-clock-modern',
                'cost' => 15.00,
                'markup_percentage' => 100, // Price ~30.00
                'description' => 'Silent movement modern wall clock.',
                'image_url' => 'https://images.unsplash.com/photo-1563861826-6b5a77f9c927?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'DecorHome',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
            [
                'sku' => 'FDC-005',
                'category_id' => $catMap['furniture-decor'],
                'name' => 'Artificial Potted Plant',
                'slug' => 'artificial-potted-plant',
                'cost' => 12.50,
                'markup_percentage' => 100, // Price ~25.00
                'description' => 'Realistic artificial plant for desk decoration.',
                'image_url' => 'https://images.unsplash.com/photo-1620987278429-2177342f7111?auto=format&fit=crop&w=400&q=80',
                'vendor' => 'DecorHome',
                'card_color' => 'blue',
                'hex_code' => '#00005D',
            ],
        ];

        foreach ($products as $prod) {
            Product::updateOrCreate(
                ['sku' => $prod['sku']],
                array_merge($prod, ['id' => Product::where('sku', $prod['sku'])->value('id') ?? Str::uuid(), 'is_active' => true])
            );
        }
    }
}
