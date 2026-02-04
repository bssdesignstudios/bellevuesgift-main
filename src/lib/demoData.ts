// Demo data for shareholder presentations when RLS prevents database access
// This provides realistic mock data for admin pages in demo mode

export const DEMO_STAFF = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Maria Santos', email: 'cashier1@bellevue.demo', role: 'cashier', is_active: true, created_at: '2025-06-15T00:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Carlos Rivera', email: 'cashier2@bellevue.demo', role: 'cashier', is_active: true, created_at: '2025-07-20T00:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'James Mitchell', email: 'warehouse1@bellevue.demo', role: 'warehouse_manager', is_active: true, created_at: '2025-05-10T00:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Sarah Thompson', email: 'admin1@bellevue.demo', role: 'admin', is_active: true, created_at: '2025-01-01T00:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000005', name: 'David Chen', email: 'admin2@bellevue.demo', role: 'admin', is_active: true, created_at: '2025-03-01T00:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000006', name: 'Tanya Brown', email: 'cashier3@bellevue.demo', role: 'cashier', is_active: false, created_at: '2025-08-01T00:00:00Z' },
];

export const DEMO_CUSTOMERS = [
  { id: '1', name: 'Alicia Rolle', phone: '242-555-0001', email: 'alicia@demo.com', island: 'Grand Bahama', is_favorite: true, created_at: '2025-06-01T00:00:00Z' },
  { id: '2', name: 'Dwayne Johnson', phone: '242-555-0002', email: 'dwayne@demo.com', island: 'Grand Bahama', is_favorite: true, created_at: '2025-05-15T00:00:00Z' },
  { id: '3', name: 'Shanice Smith', phone: '242-555-0003', email: 'shanice@demo.com', island: 'New Providence', is_favorite: true, created_at: '2025-04-20T00:00:00Z' },
  { id: '4', name: 'Caribbean Electronics Ltd', phone: '242-555-9012', email: 'orders@caribelectronics.bs', island: 'Grand Bahama', is_favorite: true, created_at: '2025-03-01T00:00:00Z' },
  { id: '5', name: 'Island Resort Group', phone: '242-555-0123', email: 'purchasing@islandresort.bs', island: 'Grand Bahama', is_favorite: true, created_at: '2025-02-15T00:00:00Z' },
  { id: '6', name: 'Marcus Thompson', phone: '242-555-1234', email: 'marcus.t@email.com', island: 'Grand Bahama', is_favorite: false, created_at: '2026-01-10T00:00:00Z' },
  { id: '7', name: 'Sandra Williams', phone: '242-555-2345', email: 'sandra.w@email.com', island: 'Grand Bahama', is_favorite: false, created_at: '2026-01-08T00:00:00Z' },
  { id: '8', name: 'Kevin Roberts', phone: '242-555-3456', email: 'kevin.r@email.com', island: 'New Providence', is_favorite: false, created_at: '2026-01-05T00:00:00Z' },
  { id: '9', name: 'Amanda Martin', phone: '242-555-0110', email: 'amanda.martin@email.com', island: 'Grand Bahama', is_favorite: false, created_at: '2026-01-15T00:00:00Z' },
  { id: '10', name: 'William Jackson', phone: '242-555-0109', email: 'william.jackson@email.com', island: 'Grand Bahama', is_favorite: false, created_at: '2026-01-12T00:00:00Z' },
  { id: '11', name: 'Jennifer Davis', phone: '242-555-0108', email: 'jennifer.davis@email.com', island: 'Grand Bahama', is_favorite: false, created_at: '2026-01-10T00:00:00Z' },
  { id: '12', name: 'Robert Taylor', phone: '242-555-0107', email: 'robert.taylor@email.com', island: 'New Providence', is_favorite: false, created_at: '2026-01-08T00:00:00Z' },
  { id: '13', name: 'Lisa Anderson', phone: '242-555-0106', email: 'lisa.anderson@email.com', island: 'Grand Bahama', is_favorite: false, created_at: '2026-01-05T00:00:00Z' },
  { id: '14', name: 'Pelican Bay Hotel', phone: '242-555-3344', email: 'manager@pelicanbay.bs', island: 'Grand Bahama', is_favorite: true, created_at: '2025-06-01T00:00:00Z' },
  { id: '15', name: 'Grand Bahama Power Company', phone: '242-555-2233', email: 'procurement@gbpower.bs', island: 'Grand Bahama', is_favorite: true, created_at: '2025-01-15T00:00:00Z' },
];

export const DEMO_ORDERS = [
  { id: '1', order_number: 'BLV-2026-000208', customer: { name: 'Alicia Rolle' }, channel: 'pos', status: 'delivered', payment_status: 'paid', payment_method: 'card', total: 337.49, subtotal: 299.99, vat_amount: 37.50, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: '2', order_number: 'BLV-2026-000207', customer: { name: 'Dwayne Johnson' }, channel: 'web', status: 'ready', payment_status: 'paid', payment_method: 'card', total: 674.99, subtotal: 599.99, vat_amount: 75.00, created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: '3', order_number: 'BLV-2026-000206', customer: { name: 'Island Resort Group' }, channel: 'web', status: 'confirmed', payment_status: 'paid', payment_method: 'card', total: 1462.49, subtotal: 1299.99, vat_amount: 162.50, created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: '4', order_number: 'BLV-2026-000205', customer: { name: 'Marcus Thompson' }, channel: 'pos', status: 'delivered', payment_status: 'paid', payment_method: 'cash', total: 168.74, subtotal: 149.99, vat_amount: 18.75, created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { id: '5', order_number: 'BLV-2026-000204', customer: { name: 'Caribbean Electronics Ltd' }, channel: 'web', status: 'picking', payment_status: 'paid', payment_method: 'card', total: 2849.99, subtotal: 2545.00, vat_amount: 304.99, created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { id: '6', order_number: 'BLV-2026-000203', customer: { name: 'Shanice Smith' }, channel: 'pos', status: 'delivered', payment_status: 'paid', payment_method: 'card', total: 89.99, subtotal: 79.99, vat_amount: 10.00, created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { id: '7', order_number: 'BLV-2026-000202', customer: { name: 'Kevin Roberts' }, channel: 'web', status: 'pending', payment_status: 'pending', payment_method: null, total: 459.99, subtotal: 409.99, vat_amount: 50.00, created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() },
  { id: '8', order_number: 'BLV-2026-000201', customer: { name: 'Sandra Williams' }, channel: 'pos', status: 'delivered', payment_status: 'paid', payment_method: 'cash', total: 224.99, subtotal: 199.99, vat_amount: 25.00, created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() },
  { id: '9', order_number: 'BLV-2026-000200', customer: null, channel: 'pos', status: 'delivered', payment_status: 'paid', payment_method: 'cash', total: 45.99, subtotal: 40.99, vat_amount: 5.00, created_at: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString() },
  { id: '10', order_number: 'BLV-2026-000199', customer: { name: 'Pelican Bay Hotel' }, channel: 'web', status: 'delivered', payment_status: 'paid', payment_method: 'card', total: 3299.99, subtotal: 2945.00, vat_amount: 354.99, created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
];

// Generate demo daily sales for last 7 days
export function generateDemoDailySales(days: number = 7) {
  const results = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseSales = isWeekend ? 3500 : 2800;
    const variance = (Math.random() - 0.5) * 1000;
    const sales = baseSales + variance;
    const posRatio = 0.6 + (Math.random() * 0.2);
    
    results.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: Math.round(sales * 100) / 100,
      vat: Math.round(sales * 0.1 * 100) / 100,
      orders: Math.floor(15 + Math.random() * 15),
      posTotal: Math.round(sales * posRatio * 100) / 100,
      webTotal: Math.round(sales * (1 - posRatio) * 100) / 100,
      posCount: Math.floor(10 + Math.random() * 10),
      webCount: Math.floor(5 + Math.random() * 5),
    });
  }
  return results;
}

export const DEMO_CASHIER_SALES = [
  { name: 'Maria Santos', count: 45, total: 4523.45 },
  { name: 'Carlos Rivera', count: 38, total: 3891.20 },
  { name: 'Sarah Thompson', count: 12, total: 1245.00 },
];

export const DEMO_CATEGORY_SALES = [
  { name: 'TVs & Displays', total: 12450.00, qty: 28 },
  { name: 'Computers & Laptops', total: 9875.50, qty: 22 },
  { name: 'Mobile Phones', total: 7320.00, qty: 45 },
  { name: 'Audio Equipment', total: 4560.00, qty: 67 },
  { name: 'Gaming', total: 3890.00, qty: 34 },
  { name: 'Repair Services', total: 2450.00, qty: 15 },
  { name: 'Accessories', total: 1890.00, qty: 156 },
  { name: 'Cables & Adapters', total: 890.00, qty: 234 },
];

export const DEMO_TOP_PRODUCTS = [
  { name: 'Samsung 55" 4K Smart TV', sku: 'TV-SAM-55-4K', qty: 12, revenue: 7188.00 },
  { name: 'Apple MacBook Air M2', sku: 'LAP-APP-MBA-M2', qty: 8, revenue: 9592.00 },
  { name: 'iPhone 15 Pro 256GB', sku: 'PHN-APP-15P-256', qty: 15, revenue: 17985.00 },
  { name: 'Sony WH-1000XM5 Headphones', sku: 'AUD-SNY-WH5', qty: 24, revenue: 8376.00 },
  { name: 'LG 65" OLED TV', sku: 'TV-LG-65-OLED', qty: 5, revenue: 9995.00 },
  { name: 'Screen Replacement Service', sku: 'SVC-SCREEN', qty: 18, revenue: 2700.00 },
  { name: 'PlayStation 5', sku: 'GAM-SNY-PS5', qty: 10, revenue: 4990.00 },
  { name: 'Virus Removal Service', sku: 'SVC-VIRUS', qty: 22, revenue: 1760.00 },
];

export const DEMO_REPAIR_ANALYTICS = {
  statusCounts: { submitted: 1, received: 0, diagnosing: 2, awaiting_parts: 2, in_progress: 2, ready_for_pickup: 2, completed: 1, cancelled: 0 },
  totalTickets: 10,
  openTickets: 9,
  avgTurnaround: 3,
  totalRevenue: 2450.00,
};

export const DEMO_CUSTOMER_ANALYTICS = {
  totalCustomers: 42,
  favoriteCount: 8,
  repeatBuyers: 28,
  tierCounts: { retail: 32, school: 3, corporate: 5, vip: 2 },
  topCustomers: [
    { id: '1', name: 'Grand Bahama Power Company', is_favorite: true, orderCount: 24, totalSpent: 45890.00 },
    { id: '2', name: 'Island Resort Group', is_favorite: true, orderCount: 18, totalSpent: 32450.00 },
    { id: '3', name: 'Caribbean Electronics Ltd', is_favorite: true, orderCount: 15, totalSpent: 28900.00 },
    { id: '4', name: 'Pelican Bay Hotel', is_favorite: true, orderCount: 12, totalSpent: 18750.00 },
    { id: '5', name: 'Alicia Rolle', is_favorite: true, orderCount: 45, totalSpent: 8920.00 },
    { id: '6', name: 'Dwayne Johnson', is_favorite: true, orderCount: 38, totalSpent: 7450.00 },
    { id: '7', name: 'Shanice Smith', is_favorite: true, orderCount: 32, totalSpent: 5890.00 },
    { id: '8', name: 'Marcus Thompson', is_favorite: false, orderCount: 8, totalSpent: 2340.00 },
  ],
};

export const DEMO_INVENTORY_ANALYTICS = [
  { product: { name: 'iPhone 15 Pro 256GB', sku: 'PHN-APP-15P-256' }, qty_on_hand: 3, reorder_level: 5, velocity: 15, dailyVelocity: 0.5, daysUntilStockout: 6, needsReorder: true },
  { product: { name: 'Samsung 55" 4K Smart TV', sku: 'TV-SAM-55-4K' }, qty_on_hand: 5, reorder_level: 3, velocity: 12, dailyVelocity: 0.4, daysUntilStockout: 12, needsReorder: false },
  { product: { name: 'Apple MacBook Air M2', sku: 'LAP-APP-MBA-M2' }, qty_on_hand: 2, reorder_level: 5, velocity: 8, dailyVelocity: 0.27, daysUntilStockout: 7, needsReorder: true },
  { product: { name: 'Sony WH-1000XM5', sku: 'AUD-SNY-WH5' }, qty_on_hand: 8, reorder_level: 10, velocity: 24, dailyVelocity: 0.8, daysUntilStockout: 10, needsReorder: true },
  { product: { name: 'PlayStation 5', sku: 'GAM-SNY-PS5' }, qty_on_hand: 4, reorder_level: 5, velocity: 10, dailyVelocity: 0.33, daysUntilStockout: 12, needsReorder: true },
];
