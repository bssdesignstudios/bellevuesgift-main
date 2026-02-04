import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Demo staff accounts to create - EXACTLY 2 CASHIERS FOR DEMO
const DEMO_STAFF = [
  { email: 'cashier1@bellevue.demo', password: 'DemoPass123!', name: 'Maria Santos', role: 'cashier' },
  { email: 'cashier2@bellevue.demo', password: 'DemoPass123!', name: 'James Williams', role: 'cashier' },
  { email: 'admin1@demo.com', password: 'DemoPass123!', name: 'Admin User', role: 'admin' },
  { email: 'warehouse1@demo.com', password: 'DemoPass123!', name: 'Warehouse Manager', role: 'warehouse_manager' },
]

// Categories
const CATEGORIES = [
  { name: 'School Supplies', slug: 'school-supplies', sort_order: 1 },
  { name: 'Office Supplies', slug: 'office-supplies', sort_order: 2 },
  { name: 'Stationery', slug: 'stationery', sort_order: 3 },
  { name: 'Arts & Crafts', slug: 'arts-crafts', sort_order: 4 },
  { name: 'Gifts & Souvenirs', slug: 'gifts-souvenirs', sort_order: 5 },
  { name: 'Home Supplies', slug: 'home-supplies', sort_order: 6 },
  { name: 'Cleaning Supplies', slug: 'cleaning-supplies', sort_order: 7 },
  { name: 'Electronics & Audio Visual', slug: 'electronics-audio-visual', sort_order: 8 },
  { name: 'Books & Reading', slug: 'books-reading', sort_order: 9 },
  { name: 'Bags & Backpacks', slug: 'bags-backpacks', sort_order: 10 },
  { name: 'Toys & Games', slug: 'toys-games', sort_order: 11 },
  { name: 'Party Supplies', slug: 'party-supplies', sort_order: 12 },
]

// Product templates per category
const PRODUCTS_BY_CATEGORY: Record<string, Array<{ name: string; price: number; description: string }>> = {
  'school-supplies': [
    { name: 'Composition Notebook', price: 3.99, description: 'Wide-ruled composition notebook, 100 sheets' },
    { name: 'Spiral Notebook 5-Subject', price: 7.99, description: 'College-ruled 5-subject spiral notebook' },
    { name: 'Pencil Set 12-Pack', price: 4.49, description: 'HB #2 pencils, pre-sharpened, 12 count' },
    { name: 'Eraser Pack', price: 2.99, description: 'Pink pearl erasers, 3 pack' },
    { name: 'Ruler Set', price: 3.49, description: '12-inch wooden ruler with metal edge' },
    { name: 'Scissors - Student', price: 2.79, description: 'Blunt tip safety scissors for students' },
    { name: 'Glue Sticks 6-Pack', price: 5.99, description: 'Washable glue sticks, 6 count' },
    { name: 'Crayons 24-Pack', price: 3.99, description: 'Classic crayons, 24 vibrant colors' },
    { name: 'Colored Pencils 12-Pack', price: 5.49, description: 'Pre-sharpened colored pencils, 12 colors' },
    { name: 'Highlighters 4-Pack', price: 4.29, description: 'Assorted fluorescent highlighters' },
    { name: 'Pencil Sharpener', price: 1.99, description: 'Manual pencil sharpener with shavings catcher' },
    { name: 'Index Cards 100-Pack', price: 2.49, description: 'White ruled index cards, 3x5 inches' },
  ],
  'office-supplies': [
    { name: 'Copy Paper Ream', price: 8.99, description: '500 sheets, 20lb white copy paper' },
    { name: 'Stapler - Desktop', price: 12.99, description: 'Full-strip desktop stapler, 25-sheet capacity' },
    { name: 'Staples 5000-Pack', price: 4.99, description: 'Standard staples, fits most staplers' },
    { name: 'Paper Clips Box', price: 2.49, description: 'Jumbo paper clips, 100 count' },
    { name: 'Binder Clips Assorted', price: 4.99, description: 'Assorted size binder clips, 30 count' },
    { name: 'Desk Organizer', price: 15.99, description: 'Mesh desk organizer with 5 compartments' },
    { name: 'File Folders 24-Pack', price: 9.99, description: 'Letter size manila folders' },
    { name: 'Tape Dispenser', price: 6.49, description: 'Heavy-duty tape dispenser with tape' },
    { name: 'Sticky Notes 3x3', price: 3.99, description: 'Yellow sticky notes, 100 sheets per pad' },
    { name: 'Push Pins Box', price: 2.99, description: 'Clear push pins, 100 count' },
    { name: 'Rubber Bands Box', price: 3.49, description: 'Assorted rubber bands, 1lb box' },
    { name: 'Calculator - Desktop', price: 14.99, description: '12-digit display solar calculator' },
  ],
  'stationery': [
    { name: 'Ballpoint Pens 10-Pack', price: 5.99, description: 'Blue ink ballpoint pens' },
    { name: 'Gel Pens 8-Pack', price: 7.99, description: 'Assorted color gel pens' },
    { name: 'Fountain Pen', price: 19.99, description: 'Classic fountain pen with ink cartridge' },
    { name: 'Letter Writing Set', price: 12.99, description: 'Premium stationery set with envelopes' },
    { name: 'Thank You Cards Box', price: 8.49, description: '24 thank you cards with envelopes' },
    { name: 'Birthday Cards Variety', price: 6.99, description: '12 assorted birthday cards' },
    { name: 'Greeting Cards Box', price: 9.99, description: 'All-occasion greeting cards, 30 pack' },
    { name: 'Wax Seal Kit', price: 24.99, description: 'Vintage wax seal stamp kit' },
    { name: 'Calligraphy Set', price: 18.99, description: 'Beginner calligraphy pen set' },
    { name: 'Lined Letter Paper', price: 5.49, description: 'Premium lined letter paper, 100 sheets' },
    { name: 'Envelopes White 50-Pack', price: 4.99, description: '#10 business envelopes' },
    { name: 'Journal - Leather Cover', price: 16.99, description: 'Lined journal with faux leather cover' },
  ],
  'arts-crafts': [
    { name: 'Acrylic Paint Set', price: 14.99, description: '12 colors acrylic paint set' },
    { name: 'Watercolor Set', price: 11.99, description: '24 color watercolor palette' },
    { name: 'Paint Brushes Set', price: 9.99, description: 'Artist paint brushes, 15 piece set' },
    { name: 'Canvas Pack 3-Count', price: 12.99, description: '11x14 inch canvas panels' },
    { name: 'Sketch Pad', price: 6.99, description: '50 sheets sketch paper, 9x12 inches' },
    { name: 'Craft Paper Pack', price: 7.49, description: 'Assorted color construction paper, 200 sheets' },
    { name: 'Beading Kit', price: 15.99, description: 'Jewelry making beading kit' },
    { name: 'Yarn Variety Pack', price: 12.49, description: 'Assorted yarn for knitting and crochet' },
    { name: 'Craft Scissors Set', price: 8.99, description: 'Decorative edge scissors, 6 piece' },
    { name: 'Modeling Clay Set', price: 9.99, description: 'Non-drying modeling clay, 12 colors' },
    { name: 'Foam Sheets Pack', price: 5.99, description: 'Craft foam sheets, assorted colors' },
    { name: 'Glitter Set', price: 6.49, description: 'Fine glitter, 12 colors' },
  ],
  'gifts-souvenirs': [
    { name: 'Bahamas Keychain', price: 4.99, description: 'Decorative Bahamas souvenir keychain' },
    { name: 'Bahamas Magnet', price: 3.99, description: 'Grand Bahama fridge magnet' },
    { name: 'Shell Jewelry Box', price: 18.99, description: 'Handcrafted shell-decorated jewelry box' },
    { name: 'Photo Frame 5x7', price: 12.99, description: 'Bahamas-themed photo frame' },
    { name: 'Coffee Mug - Bahamas', price: 8.99, description: 'Ceramic mug with Bahamas design' },
    { name: 'T-Shirt Bahamas Logo', price: 19.99, description: 'Bahamas souvenir t-shirt' },
    { name: 'Beach Towel', price: 24.99, description: 'Large beach towel with tropical design' },
    { name: 'Postcard Set', price: 5.99, description: 'Bahamas scenic postcards, 10 pack' },
    { name: 'Decorative Conch Shell', price: 14.99, description: 'Natural conch shell souvenir' },
    { name: 'Straw Hat', price: 16.99, description: 'Traditional Bahamian straw hat' },
    { name: 'Gift Basket Set', price: 45.99, description: 'Curated Bahamas gift basket' },
    { name: 'Mini Flag Set', price: 6.99, description: 'Bahamas mini flag collection' },
  ],
  'home-supplies': [
    { name: 'LED Light Bulb 4-Pack', price: 12.99, description: '60W equivalent LED bulbs' },
    { name: 'Extension Cord 6ft', price: 9.99, description: '3-outlet indoor extension cord' },
    { name: 'Power Strip', price: 14.99, description: '6-outlet surge protector' },
    { name: 'Batteries AA 12-Pack', price: 8.99, description: 'Alkaline AA batteries' },
    { name: 'Batteries AAA 12-Pack', price: 8.99, description: 'Alkaline AAA batteries' },
    { name: 'Flashlight LED', price: 11.99, description: 'Tactical LED flashlight' },
    { name: 'Tool Kit Basic', price: 29.99, description: '39-piece household tool kit' },
    { name: 'Picture Hooks Set', price: 5.99, description: 'Assorted picture hanging kit' },
    { name: 'Duct Tape', price: 6.99, description: 'Heavy-duty silver duct tape' },
    { name: 'Measuring Tape', price: 7.49, description: '25ft retractable measuring tape' },
    { name: 'First Aid Kit', price: 19.99, description: '100-piece first aid kit' },
    { name: 'Smoke Detector', price: 24.99, description: 'Battery-operated smoke detector' },
  ],
  'cleaning-supplies': [
    { name: 'All-Purpose Cleaner', price: 5.99, description: 'Multi-surface cleaner spray, 32oz' },
    { name: 'Glass Cleaner', price: 4.49, description: 'Streak-free glass cleaner' },
    { name: 'Dish Soap', price: 3.99, description: 'Liquid dish soap, 24oz' },
    { name: 'Laundry Detergent', price: 11.99, description: 'Liquid laundry detergent, 50oz' },
    { name: 'Bleach Bottle', price: 4.99, description: 'Concentrated bleach, 64oz' },
    { name: 'Sponges 6-Pack', price: 4.49, description: 'Heavy-duty scrub sponges' },
    { name: 'Paper Towels 2-Pack', price: 6.99, description: 'Select-a-size paper towels' },
    { name: 'Trash Bags 30-Count', price: 9.99, description: '13 gallon kitchen trash bags' },
    { name: 'Mop - Spin', price: 29.99, description: 'Spin mop with bucket' },
    { name: 'Broom & Dustpan Set', price: 14.99, description: 'Angle broom with dustpan' },
    { name: 'Rubber Gloves', price: 3.99, description: 'Reusable cleaning gloves, pair' },
    { name: 'Disinfecting Wipes', price: 5.99, description: 'Antibacterial wipes, 75 count' },
  ],
  'electronics-audio-visual': [
    { name: 'USB Flash Drive 32GB', price: 9.99, description: 'USB 3.0 flash drive' },
    { name: 'USB Flash Drive 64GB', price: 14.99, description: 'USB 3.0 flash drive' },
    { name: 'Wireless Mouse', price: 19.99, description: 'Ergonomic wireless mouse' },
    { name: 'Wired Keyboard', price: 24.99, description: 'Full-size USB keyboard' },
    { name: 'USB Hub 4-Port', price: 12.99, description: 'USB 3.0 hub with 4 ports' },
    { name: 'USB Hub 7-Port Powered', price: 24.99, description: 'Powered USB hub with 7 ports' },
    { name: 'Earbuds - Wired', price: 12.99, description: 'In-ear headphones with mic' },
    { name: 'Bluetooth Speaker', price: 29.99, description: 'Portable Bluetooth speaker' },
    { name: 'Headphones - Over Ear', price: 39.99, description: 'Comfortable over-ear headphones' },
    { name: 'Phone Charger Cable USB-C', price: 8.99, description: 'USB-C charging cable, 6ft' },
    { name: 'Phone Charger Cable Lightning', price: 12.99, description: 'Lightning cable for iPhone, 6ft' },
    { name: 'Wall Charger USB', price: 12.99, description: 'Dual USB wall charger' },
    { name: 'Power Bank 10000mAh', price: 24.99, description: 'Portable power bank' },
    { name: 'Power Bank 20000mAh', price: 39.99, description: 'High capacity portable charger' },
    { name: 'HDMI Cable 6ft', price: 9.99, description: 'High-speed HDMI cable' },
    { name: 'HDMI Cable 10ft', price: 14.99, description: 'Long HDMI cable for wall mounts' },
    { name: 'Webcam HD 1080p', price: 49.99, description: '1080p HD webcam with mic' },
    { name: 'Webcam 4K Ultra HD', price: 99.99, description: '4K webcam for streaming' },
    // Premium Electronics - TVs
    { name: 'Samsung 32" LED TV', price: 249.99, description: 'HD Smart TV with streaming apps' },
    { name: 'Samsung 43" 4K UHD TV', price: 349.99, description: 'Crystal UHD 4K Smart TV' },
    { name: 'Samsung 55" 4K UHD TV', price: 499.99, description: 'Crystal UHD 4K Smart TV with HDR' },
    { name: 'Samsung 65" 4K QLED TV', price: 899.99, description: 'QLED 4K Smart TV with Quantum Processor' },
    { name: 'Samsung 75" 4K UHD TV', price: 1199.99, description: 'Large screen 4K Smart TV' },
    { name: 'LG 50" 4K Smart TV', price: 449.99, description: 'webOS Smart TV with AI ThinQ' },
    { name: 'LG 55" 4K OLED TV', price: 999.99, description: 'OLED evo with Dolby Vision' },
    { name: 'LG 65" 4K OLED TV', price: 1299.99, description: 'OLED evo with Dolby Vision and Atmos' },
    { name: 'Sony 55" 4K LED TV', price: 599.99, description: 'BRAVIA XR with Google TV' },
    { name: 'Sony 65" 4K LED TV', price: 899.99, description: 'BRAVIA XR with Triluminos Pro' },
    { name: 'TCL 43" Roku TV', price: 279.99, description: '4K UHD HDR Roku Smart TV' },
    { name: 'TCL 55" Roku TV', price: 349.99, description: '4K UHD HDR Roku Smart TV' },
    { name: 'Hisense 50" ULED TV', price: 399.99, description: 'Quantum Dot 4K Smart TV' },
    { name: 'Hisense 65" ULED TV', price: 599.99, description: 'Quantum Dot 4K Smart TV' },
    // Laptops
    { name: 'HP 14" Laptop', price: 399.99, description: 'Intel Core i3, 8GB RAM, 256GB SSD' },
    { name: 'HP 15.6" Laptop', price: 549.99, description: 'Intel Core i5, 16GB RAM, 512GB SSD' },
    { name: 'HP 17" Business Laptop', price: 749.99, description: 'Intel Core i7, 16GB RAM, 512GB SSD' },
    { name: 'Dell Inspiron 15', price: 599.99, description: 'AMD Ryzen 5, 16GB RAM, 512GB SSD' },
    { name: 'Dell Inspiron 17', price: 749.99, description: 'Intel Core i7, 16GB RAM, 1TB SSD' },
    { name: 'Lenovo IdeaPad 15', price: 449.99, description: 'Intel Core i5, 8GB RAM, 256GB SSD' },
    { name: 'Lenovo ThinkPad E15', price: 699.99, description: 'Business laptop with fingerprint reader' },
    { name: 'ASUS VivoBook 14', price: 479.99, description: 'Intel Core i5, 8GB RAM, 512GB SSD' },
    { name: 'ASUS VivoBook 15', price: 529.99, description: 'AMD Ryzen 5, 12GB RAM, 512GB SSD' },
    { name: 'Acer Aspire 5', price: 529.99, description: 'AMD Ryzen 7, 8GB RAM, 512GB SSD' },
    { name: 'Acer Chromebook 14', price: 249.99, description: 'Chrome OS, 4GB RAM, 64GB storage' },
    // Tablets
    { name: 'Samsung Galaxy Tab A8', price: 229.99, description: '10.5" tablet, 32GB storage' },
    { name: 'Samsung Galaxy Tab S6 Lite', price: 349.99, description: '10.4" tablet with S Pen' },
    { name: 'Amazon Fire HD 10', price: 149.99, description: '10.1" tablet, 32GB, 2022 release' },
    { name: 'Amazon Fire HD 8', price: 99.99, description: '8" tablet, 32GB' },
    { name: 'Lenovo Tab M10 Plus', price: 179.99, description: '10.3" FHD tablet, 4GB RAM' },
    // Audio Equipment
    { name: 'JBL PartyBox 310', price: 449.99, description: 'Portable party speaker with lights' },
    { name: 'JBL Flip 6', price: 129.99, description: 'Portable Bluetooth speaker IP67' },
    { name: 'Bose SoundLink Flex', price: 149.99, description: 'Portable Bluetooth speaker IP67' },
    { name: 'Sony WH-1000XM5', price: 349.99, description: 'Wireless noise-canceling headphones' },
    { name: 'Sony WH-CH720N', price: 149.99, description: 'Budget noise-canceling headphones' },
    { name: 'Soundbar 2.1 Channel', price: 199.99, description: 'Home theater soundbar with subwoofer' },
    { name: 'Soundbar 5.1 Channel', price: 349.99, description: 'Dolby Atmos soundbar system' },
    // Accessories
    { name: 'Monitor Stand with USB', price: 39.99, description: 'Monitor riser with USB hub' },
    { name: 'Laptop Cooling Pad', price: 29.99, description: 'Cooling pad with 4 fans' },
    { name: 'Keyboard & Mouse Combo', price: 34.99, description: 'Wireless keyboard and mouse set' },
    { name: 'Gaming Mouse Pad XL', price: 19.99, description: 'Large gaming mouse pad' },
  ],
  'books-reading': [
    { name: 'Bahamas History Book', price: 24.99, description: 'Comprehensive Bahamas history' },
    { name: 'Caribbean Cookbook', price: 19.99, description: 'Traditional Caribbean recipes' },
    { name: 'Children Picture Book', price: 9.99, description: 'Colorful picture book for kids' },
    { name: 'Activity Book Kids', price: 7.99, description: 'Puzzles and activities for children' },
    { name: 'Coloring Book Adult', price: 11.99, description: 'Stress-relief adult coloring book' },
    { name: 'Dictionary English', price: 14.99, description: 'Pocket English dictionary' },
    { name: 'Novel - Fiction', price: 12.99, description: 'Popular fiction paperback' },
    { name: 'Travel Guide Bahamas', price: 18.99, description: 'Complete Bahamas travel guide' },
    { name: 'Sudoku Puzzle Book', price: 6.99, description: 'Sudoku puzzles, various difficulty' },
    { name: 'Crossword Puzzle Book', price: 6.99, description: 'Classic crossword puzzles' },
    { name: 'Journal - Blank', price: 8.99, description: 'Blank journal for writing' },
    { name: 'Planner 2026', price: 15.99, description: 'Weekly/monthly planner' },
  ],
  'bags-backpacks': [
    { name: 'Backpack - School', price: 29.99, description: 'Student backpack with laptop pocket' },
    { name: 'Backpack - Large', price: 44.99, description: 'Large capacity hiking backpack' },
    { name: 'Laptop Bag 15-inch', price: 34.99, description: 'Professional laptop briefcase' },
    { name: 'Messenger Bag', price: 27.99, description: 'Canvas messenger bag' },
    { name: 'Lunch Bag Insulated', price: 14.99, description: 'Insulated lunch cooler bag' },
    { name: 'Pencil Case - Large', price: 6.99, description: 'Multi-compartment pencil case' },
    { name: 'Tote Bag Canvas', price: 12.99, description: 'Reusable canvas tote bag' },
    { name: 'Drawstring Bag', price: 8.99, description: 'Sport drawstring backpack' },
    { name: 'Duffle Bag', price: 39.99, description: 'Travel duffle bag with wheels' },
    { name: 'Fanny Pack', price: 15.99, description: 'Adjustable waist pack' },
    { name: 'Travel Organizer', price: 18.99, description: 'Electronic accessories organizer' },
    { name: 'Beach Bag', price: 19.99, description: 'Large beach tote bag' },
  ],
  'toys-games': [
    { name: 'Building Blocks Set', price: 24.99, description: '100-piece building blocks' },
    { name: 'Puzzle 500 Piece', price: 14.99, description: 'Scenic jigsaw puzzle' },
    { name: 'Board Game - Classic', price: 19.99, description: 'Classic family board game' },
    { name: 'Playing Cards', price: 4.99, description: 'Standard playing cards deck' },
    { name: 'Uno Card Game', price: 8.99, description: 'Classic Uno card game' },
    { name: 'Stuffed Animal', price: 12.99, description: 'Plush stuffed toy' },
    { name: 'Action Figure', price: 15.99, description: 'Collectible action figure' },
    { name: 'Doll - Fashion', price: 18.99, description: 'Fashion doll with accessories' },
    { name: 'Remote Control Car', price: 34.99, description: 'RC car with controller' },
    { name: 'Play-Doh 10-Pack', price: 11.99, description: 'Assorted color play dough' },
    { name: 'Bubble Wands Set', price: 5.99, description: 'Bubble solution with wands' },
    { name: 'Kite - Beach', price: 14.99, description: 'Easy-fly beach kite' },
  ],
  'party-supplies': [
    { name: 'Balloons 50-Pack', price: 7.99, description: 'Assorted color latex balloons' },
    { name: 'Birthday Banner', price: 5.99, description: 'Happy Birthday foil banner' },
    { name: 'Paper Plates 24-Pack', price: 4.99, description: 'Disposable party plates' },
    { name: 'Paper Cups 24-Pack', price: 3.99, description: 'Disposable party cups' },
    { name: 'Napkins 50-Pack', price: 3.49, description: 'Party napkins, assorted colors' },
    { name: 'Tablecloth Disposable', price: 4.99, description: 'Plastic tablecloth, 54x108 inches' },
    { name: 'Party Hats 8-Pack', price: 5.49, description: 'Cone party hats' },
    { name: 'Streamers 6-Pack', price: 4.99, description: 'Crepe paper streamers' },
    { name: 'Confetti Bag', price: 3.99, description: 'Multi-color confetti' },
    { name: 'Candles Birthday Set', price: 2.99, description: 'Number candles with holders' },
    { name: 'Gift Bags 12-Pack', price: 8.99, description: 'Assorted gift bags with tissue' },
    { name: 'Pinata - Animal', price: 19.99, description: 'Fillable party pinata' },
  ],
}

// Repair Service SKUs - these can be rung up at POS
const REPAIR_SERVICES = [
  { name: 'TV Diagnostic Fee', price: 35.00, description: 'Diagnostic service for television issues' },
  { name: 'TV Screen Repair', price: 150.00, description: 'Television screen repair or replacement' },
  { name: 'TV Power Supply Repair', price: 85.00, description: 'Power supply board repair or replacement' },
  { name: 'TV T-Con Board Repair', price: 95.00, description: 'T-Con board repair for display issues' },
  { name: 'TV HDMI Port Repair', price: 75.00, description: 'HDMI port repair or replacement' },
  { name: 'Laptop Diagnostic Fee', price: 30.00, description: 'Diagnostic service for laptop issues' },
  { name: 'Laptop Screen Replacement', price: 175.00, description: 'LCD/LED screen replacement' },
  { name: 'Laptop Keyboard Replacement', price: 65.00, description: 'Keyboard replacement service' },
  { name: 'Laptop Battery Replacement', price: 55.00, description: 'Battery replacement service' },
  { name: 'Laptop SSD Upgrade', price: 45.00, description: 'SSD installation and data migration' },
  { name: 'Laptop RAM Upgrade', price: 25.00, description: 'RAM upgrade installation' },
  { name: 'Laptop OS Reinstall', price: 65.00, description: 'Operating system reinstallation' },
  { name: 'Virus Removal Service', price: 75.00, description: 'Malware and virus removal' },
  { name: 'Data Recovery - Basic', price: 99.00, description: 'Basic data recovery service' },
  { name: 'Data Recovery - Advanced', price: 199.00, description: 'Advanced data recovery for damaged drives' },
  { name: 'Printer Repair - Basic', price: 45.00, description: 'Basic printer repair service' },
  { name: 'Printer Head Cleaning', price: 35.00, description: 'Professional printhead cleaning' },
  { name: 'Speaker Repair', price: 55.00, description: 'Bluetooth/portable speaker repair' },
  { name: 'TV Wall Mount Installation', price: 75.00, description: 'Professional TV wall mounting' },
  { name: 'TV Wall Mount Installation - XL', price: 125.00, description: 'Wall mount for 65"+ TVs' },
  { name: 'Home Theater Setup', price: 150.00, description: 'Complete home theater installation' },
  { name: 'Computer Setup Service', price: 45.00, description: 'New computer setup and configuration' },
]

// Customer names and islands
const CUSTOMER_NAMES = [
  'James Thompson', 'Maria Garcia', 'John Smith', 'Sarah Johnson', 'Michael Brown',
  'Jennifer Davis', 'David Wilson', 'Lisa Anderson', 'Robert Taylor', 'Emily Martinez',
  'William Jackson', 'Ashley White', 'Daniel Harris', 'Amanda Martin', 'Christopher Lee',
  'Jessica Clark', 'Matthew Lewis', 'Stephanie Robinson', 'Andrew Walker', 'Nicole Hall'
]

const ISLANDS = ['Grand Bahama', 'New Providence', 'Abaco', 'Eleuthera', 'Exuma']

function generateBarcode(): string {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('')
}

function generatePickupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const results: string[] = []

    // 1. Create staff auth users and staff records
    results.push('Creating staff accounts...')
    for (const staff of DEMO_STAFF) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email === staff.email)
      
      let authUserId: string
      
      if (existingUser) {
        authUserId = existingUser.id
        results.push(`Staff user ${staff.email} already exists`)
      } else {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: staff.email,
          password: staff.password,
          email_confirm: true,
        })
        
        if (authError) {
          results.push(`Error creating ${staff.email}: ${authError.message}`)
          continue
        }
        authUserId = authData.user!.id
        results.push(`Created auth user: ${staff.email}`)
      }

      // Upsert staff record
      const { error: staffError } = await supabase
        .from('staff')
        .upsert({
          auth_user_id: authUserId,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          is_active: true,
        }, { onConflict: 'auth_user_id' })
      
      if (staffError) {
        results.push(`Error creating staff record: ${staffError.message}`)
      }
    }

    // 2. Seed categories
    results.push('Seeding categories...')
    const { data: insertedCategories, error: catError } = await supabase
      .from('categories')
      .upsert(CATEGORIES, { onConflict: 'slug' })
      .select()
    
    if (catError) {
      results.push(`Category error: ${catError.message}`)
    } else {
      results.push(`Inserted ${insertedCategories?.length || 0} categories`)
    }

    // Fetch all categories
    const { data: categories } = await supabase.from('categories').select('*')
    const categoryMap = new Map(categories?.map(c => [c.slug, c.id]) || [])

    // 3. Seed products and inventory
    results.push('Seeding products...')
    let productCount = 0
    const allProducts: any[] = []

    for (const [categorySlug, products] of Object.entries(PRODUCTS_BY_CATEGORY)) {
      const categoryId = categoryMap.get(categorySlug)
      if (!categoryId) continue

      const categoryPrefix = categorySlug.split('-').map(w => w[0].toUpperCase()).join('')
      
      for (let i = 0; i < products.length; i++) {
        const p = products[i]
        const sku = `BLV-${categoryPrefix}-${String(i + 1).padStart(4, '0')}`
        const slug = `${categorySlug}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        const hasSale = Math.random() < 0.25
        const salePrice = hasSale ? Math.round(p.price * 0.8 * 100) / 100 : null

        allProducts.push({
          category_id: categoryId,
          name: p.name,
          slug: slug,
          sku: sku,
          barcode: generateBarcode(),
          description: p.description,
          price: p.price,
          sale_price: salePrice,
          tax_class: 'standard',
          image_url: `https://placehold.co/400x400/00005D/white?text=${encodeURIComponent(p.name.substring(0, 15))}`,
          is_active: true,
        })
        productCount++
      }
    }

    // Add Repair Services as products (can be rung up at POS)
    results.push('Seeding repair service products...')
    for (let i = 0; i < REPAIR_SERVICES.length; i++) {
      const service = REPAIR_SERVICES[i]
      const sku = `BLV-SVC-${String(i + 1).padStart(4, '0')}`
      const slug = `service-${service.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

      allProducts.push({
        category_id: null, // Services don't belong to a category
        name: service.name,
        slug: slug,
        sku: sku,
        barcode: `SVC${String(i + 1).padStart(9, '0')}`,
        description: service.description,
        price: service.price,
        sale_price: null,
        tax_class: 'service',
        image_url: `https://placehold.co/400x400/2563eb/white?text=${encodeURIComponent(service.name.substring(0, 12))}`,
        is_active: true,
      })
      productCount++
    }

    const { data: insertedProducts, error: prodError } = await supabase
      .from('products')
      .upsert(allProducts, { onConflict: 'sku' })
      .select()

    if (prodError) {
      results.push(`Product error: ${prodError.message}`)
    } else {
      results.push(`Inserted ${insertedProducts?.length || 0} products (including ${REPAIR_SERVICES.length} repair services)`)
    }

    // 4. Seed inventory for all products
    results.push('Seeding inventory...')
    const { data: productIds } = await supabase.from('products').select('id')
    
    if (productIds) {
      const inventoryRecords = productIds.map(p => ({
        product_id: p.id,
        location: 'Freeport Store',
        qty_on_hand: Math.floor(Math.random() * 115) + 5,
        qty_reserved: 0,
        reorder_level: 10,
      }))

      const { error: invError } = await supabase
        .from('inventory')
        .upsert(inventoryRecords, { onConflict: 'product_id' })

      if (invError) {
        results.push(`Inventory error: ${invError.message}`)
      } else {
        results.push(`Seeded inventory for ${inventoryRecords.length} products`)
      }
    }

    // 5. Seed customers with tiers and loyalty points
    results.push('Seeding customers...')
    const customers = CUSTOMER_NAMES.map((name, i) => {
      // Assign some customers to different tiers
      const tierOptions = ['retail', 'retail', 'retail', 'school', 'corporate', 'vip']
      const tier = tierOptions[i % tierOptions.length]
      const tierDiscount = tier === 'school' ? 5 : tier === 'corporate' ? 10 : tier === 'vip' ? 15 : 0
      
      return {
        name,
        phone: `242-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
        island: ISLANDS[i % ISLANDS.length],
        address: `${Math.floor(Math.random() * 999) + 1} Main Street`,
        loyalty_points: Math.floor(Math.random() * 5000),
        customer_tier: tier,
        tier_discount: tierDiscount,
        is_favorite: tier === 'vip' || i < 3,
      }
    })

    const { data: insertedCustomers, error: custError } = await supabase
      .from('customers')
      .upsert(customers, { onConflict: 'email' })
      .select()

    if (custError) {
      results.push(`Customer error: ${custError.message}`)
    } else {
      results.push(`Inserted ${insertedCustomers?.length || 0} customers with tiers`)
    }

    // 6. Seed coupons
    results.push('Seeding coupons...')
    const coupons = [
      { code: 'SAVE10', discount_type: 'percent', value: 10, is_active: true },
      { code: 'SAVE15', discount_type: 'percent', value: 15, is_active: true },
      { code: 'SAVE25', discount_type: 'percent', value: 25, is_active: true },
      { code: 'FLAT5', discount_type: 'fixed', value: 5, is_active: true },
      { code: 'FLAT10', discount_type: 'fixed', value: 10, is_active: true },
      { code: 'FLAT20', discount_type: 'fixed', value: 20, is_active: true },
    ]

    const { error: couponError } = await supabase
      .from('coupons')
      .upsert(coupons, { onConflict: 'code' })

    if (couponError) {
      results.push(`Coupon error: ${couponError.message}`)
    } else {
      results.push('Inserted coupons')
    }

    // 7. Seed gift cards
    results.push('Seeding gift cards...')
    const giftCards = [
      { code: 'GC-DEMO-001', balance: 25, initial_balance: 25, is_active: true },
      { code: 'GC-DEMO-002', balance: 50, initial_balance: 50, is_active: true },
      { code: 'GC-DEMO-003', balance: 100, initial_balance: 100, is_active: true },
      { code: 'GC-DEMO-004', balance: 25, initial_balance: 25, is_active: true },
      { code: 'GC-DEMO-005', balance: 50, initial_balance: 50, is_active: true },
      { code: 'GC-DEMO-006', balance: 100, initial_balance: 100, is_active: true },
      { code: 'GC-DEMO-007', balance: 75, initial_balance: 100, is_active: true },
      { code: 'GC-DEMO-008', balance: 30, initial_balance: 50, is_active: true },
    ]

    const { error: gcError } = await supabase
      .from('gift_cards')
      .upsert(giftCards, { onConflict: 'code' })

    if (gcError) {
      results.push(`Gift card error: ${gcError.message}`)
    } else {
      results.push('Inserted gift cards')
    }

    // 8. Seed orders
    results.push('Seeding orders...')
    const { data: allProducts2 } = await supabase.from('products').select('*').limit(50)
    const { data: allCustomers } = await supabase.from('customers').select('*')
    const { data: staffList } = await supabase.from('staff').select('*')

    const webStatuses = ['pending', 'confirmed', 'picking', 'ready', 'picked_up', 'shipped', 'delivered']
    const fulfillmentMethods = ['pickup', 'island_delivery', 'mailboat']
    const paymentStatuses = ['paid', 'pay_later']

    // Create web orders
    for (let i = 0; i < 20; i++) {
      const customer = allCustomers?.[i % (allCustomers?.length || 1)]
      const status = webStatuses[Math.floor(Math.random() * webStatuses.length)]
      const fulfillment = fulfillmentMethods[Math.floor(Math.random() * fulfillmentMethods.length)]
      const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)]
      
      // Generate order number
      const { data: orderNum } = await supabase.rpc('generate_order_number')
      const orderNumber = orderNum || `BLV-2026-${String(i + 1).padStart(6, '0')}`
      
      // Random products for order
      const numItems = Math.floor(Math.random() * 4) + 1
      const orderProducts = allProducts2?.slice(0, numItems) || []
      
      let subtotal = 0
      const items = orderProducts.map(p => {
        const qty = Math.floor(Math.random() * 3) + 1
        const unitPrice = p.sale_price || p.price
        const lineTotal = qty * unitPrice
        subtotal += lineTotal
        return {
          product_id: p.id,
          sku: p.sku,
          name: p.name,
          qty,
          unit_price: unitPrice,
          line_total: lineTotal,
        }
      })

      const vatAmount = Math.round(subtotal * 0.1 * 100) / 100
      const total = subtotal + vatAmount

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customer?.id,
          channel: 'web',
          status,
          fulfillment_method: fulfillment,
          payment_status: paymentStatus,
          payment_method: paymentStatus === 'paid' ? 'card' : null,
          subtotal,
          vat_amount: vatAmount,
          total,
          notes: null,
        })
        .select()
        .single()

      if (orderError) {
        results.push(`Order error: ${orderError.message}`)
        continue
      }

      // Insert order items
      const orderItems = items.map(item => ({ ...item, order_id: order.id }))
      await supabase.from('order_items').insert(orderItems)

      // Create payment if paid
      if (paymentStatus === 'paid') {
        await supabase.from('payments').insert({
          order_id: order.id,
          amount: total,
          method: 'card',
          reference: `PAY-${Date.now()}-${i}`,
        })
      }
    }

    // Create POS orders
    for (let i = 0; i < 20; i++) {
      const staff = staffList?.[i % (staffList?.length || 1)]
      
      const { data: orderNum } = await supabase.rpc('generate_order_number')
      const orderNumber = orderNum || `BLV-2026-${String(i + 100).padStart(6, '0')}`
      
      const numItems = Math.floor(Math.random() * 5) + 1
      const orderProducts = allProducts2?.slice(numItems, numItems * 2) || []
      
      let subtotal = 0
      const items = orderProducts.map(p => {
        const qty = Math.floor(Math.random() * 3) + 1
        const unitPrice = p.sale_price || p.price
        const lineTotal = qty * unitPrice
        subtotal += lineTotal
        return {
          product_id: p.id,
          sku: p.sku,
          name: p.name,
          qty,
          unit_price: unitPrice,
          line_total: lineTotal,
        }
      })

      const vatAmount = Math.round(subtotal * 0.1 * 100) / 100
      const total = subtotal + vatAmount

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: null,
          staff_id: staff?.id,
          channel: 'pos',
          status: 'delivered',
          fulfillment_method: 'pickup',
          payment_status: 'paid',
          payment_method: ['cash', 'card'][Math.floor(Math.random() * 2)],
          subtotal,
          vat_amount: vatAmount,
          total,
          notes: null,
        })
        .select()
        .single()

      if (orderError) continue

      const orderItems = items.map(item => ({ ...item, order_id: order.id }))
      await supabase.from('order_items').insert(orderItems)

      await supabase.from('payments').insert({
        order_id: order.id,
        amount: total,
        method: 'cash',
        reference: `POS-${Date.now()}-${i}`,
      })
    }

    results.push('Seeded 40 orders (20 web, 20 POS)')

    // 9. Seed repair tickets - more realistic scenarios
    results.push('Seeding repair tickets...')
    const repairTickets = [
      {
        ticket_number: 'RPR-2026-000001',
        customer_name: 'Michael Brown',
        phone: '242-555-0101',
        email: 'michael@example.com',
        service_type: 'repair',
        item_make: 'Samsung',
        model_number: 'UN55TU7000',
        serial_number: 'SN123456789',
        problem_description: 'TV screen has horizontal lines, no picture sound works fine. Issue started after power surge.',
        status: 'in_progress',
        eta_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Ordered replacement T-Con board. Expected by Friday. Parts order #PO-2026-0045.',
        deposit_amount: 50,
        deposit_paid: true,
        labor_hours: 2,
        parts_cost: 85,
        total_cost: 185,
      },
      {
        ticket_number: 'RPR-2026-000002',
        customer_name: 'Sarah Johnson',
        phone: '242-555-0102',
        email: 'sarah@example.com',
        service_type: 'repair',
        item_make: 'Sony',
        model_number: 'SRS-XB43',
        serial_number: 'SNXB43-98765',
        problem_description: 'Bluetooth speaker not charging, battery indicator not lighting up. 2 years old.',
        status: 'awaiting_parts',
        eta_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Waiting for replacement battery from supplier. ETA next Tuesday.',
        deposit_amount: 25,
        deposit_paid: true,
        parts_cost: 35,
        labor_hours: 1,
        total_cost: 85,
      },
      {
        ticket_number: 'RPR-2026-000003',
        customer_name: 'James Thompson',
        phone: '242-555-0103',
        email: 'james@example.com',
        service_type: 'installation',
        item_make: 'LG',
        model_number: '65NANO75',
        problem_description: 'New TV wall mount installation, customer purchased TV from us. Living room wall mount.',
        status: 'ready_for_pickup',
        eta_date: new Date().toISOString().split('T')[0],
        notes: 'Installation complete. Customer notified via phone. Used articulating mount.',
        deposit_amount: 0,
        deposit_paid: false,
        labor_hours: 1.5,
        total_cost: 125,
      },
      {
        ticket_number: 'RPR-2026-000004',
        customer_name: 'Emily Martinez',
        phone: '242-555-0104',
        email: 'emily@example.com',
        service_type: 'repair',
        item_make: 'JBL',
        model_number: 'Charge 5',
        serial_number: 'JBLCHG5-44332',
        problem_description: 'Speaker makes crackling sound at high volume. Still under warranty.',
        status: 'diagnosing',
        notes: 'Testing different audio sources to isolate issue. May be speaker driver problem.',
        deposit_amount: 20,
        deposit_paid: false,
      },
      {
        ticket_number: 'RPR-2026-000005',
        customer_name: 'David Wilson',
        phone: '242-555-0105',
        service_type: 'repair',
        item_make: 'HP',
        model_number: 'OfficeJet Pro 9015',
        problem_description: 'Printer not feeding paper, makes grinding noise when trying to print.',
        status: 'submitted',
        notes: null,
        deposit_amount: 30,
        deposit_paid: false,
      },
      {
        ticket_number: 'RPR-2026-000006',
        customer_name: 'Lisa Anderson',
        phone: '242-555-0106',
        email: 'lisa@example.com',
        service_type: 'repair',
        item_make: 'Dell',
        model_number: 'Inspiron 15 3520',
        serial_number: 'DELL-INS-77654',
        problem_description: 'Laptop won\'t turn on. Was working yesterday, now no power at all even when plugged in.',
        status: 'diagnosing',
        notes: 'Testing power supply and motherboard. Possible DC jack issue.',
        deposit_amount: 30,
        deposit_paid: true,
      },
      {
        ticket_number: 'RPR-2026-000007',
        customer_name: 'Robert Taylor',
        phone: '242-555-0107',
        email: 'robert@example.com',
        service_type: 'repair',
        item_make: 'LG',
        model_number: '43UP7000PUA',
        serial_number: 'LG43-8899321',
        problem_description: 'TV has no picture but sound works. Backlight seems to be out.',
        status: 'in_progress',
        eta_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Replacing LED backlight strips. Parts in stock.',
        deposit_amount: 75,
        deposit_paid: true,
        parts_cost: 120,
        labor_hours: 3,
        total_cost: 270,
      },
      {
        ticket_number: 'RPR-2026-000008',
        customer_name: 'Jennifer Davis',
        phone: '242-555-0108',
        email: 'jennifer@example.com',
        service_type: 'repair',
        item_make: 'ASUS',
        model_number: 'VivoBook 15',
        problem_description: 'Laptop screen cracked after drop. Need replacement LCD.',
        status: 'awaiting_parts',
        eta_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Screen ordered from supplier. 15.6" FHD IPS panel.',
        deposit_amount: 100,
        deposit_paid: true,
        parts_cost: 145,
        labor_hours: 1.5,
        total_cost: 220,
      },
      {
        ticket_number: 'RPR-2026-000009',
        customer_name: 'William Jackson',
        phone: '242-555-0109',
        service_type: 'installation',
        item_make: 'Samsung',
        model_number: 'QN75Q60C',
        problem_description: 'Home theater setup with new 75" TV and 5.1 soundbar system.',
        status: 'completed',
        eta_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Installation complete. Wall mounted TV, configured soundbar, tested all connections.',
        deposit_amount: 100,
        deposit_paid: true,
        labor_hours: 4,
        total_cost: 275,
      },
      {
        ticket_number: 'RPR-2026-000010',
        customer_name: 'Amanda Martin',
        phone: '242-555-0110',
        email: 'amanda@example.com',
        service_type: 'repair',
        item_make: 'HP',
        model_number: 'Pavilion 14',
        problem_description: 'Laptop running very slow, possible virus infection. Many pop-ups appearing.',
        status: 'ready_for_pickup',
        eta_date: new Date().toISOString().split('T')[0],
        notes: 'Virus removal complete. Installed antivirus, cleaned temp files, ran optimization.',
        deposit_amount: 35,
        deposit_paid: true,
        labor_hours: 2,
        total_cost: 75,
      },
    ]

    for (const ticket of repairTickets) {
      await supabase.from('repair_tickets').upsert(ticket, { onConflict: 'ticket_number' })
    }

    results.push('Seeded 10 repair tickets in various statuses')

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
