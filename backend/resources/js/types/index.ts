export interface Category {
  id: string;
  name: string;
  slug: string;
  sku_prefix: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  vendor_id: string | null;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  price: number;
  sale_price: number | null;
  cost: number | null;
  markup_percentage: number | null;
  vendor: string | null;
  tax_class: string;
  image_url: string | null;
  card_color?: string | null;
  hex_code?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  vendor_relation?: Vendor;
  inventory?: Inventory;
}

export interface Inventory {
  id: string;
  product_id: string;
  location: string;
  qty_on_hand: number;
  qty_reserved: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  island: string | null;
  address: string | null;
  created_at: string;
}

export interface Staff {
  id: number | string;
  name: string;
  email: string;
  role: 'cashier' | 'warehouse' | 'warehouse_manager' | 'admin' | 'finance';
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  staff_id: string | null;
  channel: 'web' | 'pos';
  status: 'pending' | 'confirmed' | 'picking' | 'ready' | 'picked_up' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  fulfillment_method: 'pickup' | 'island_delivery' | 'mailboat';
  payment_status: 'pending' | 'paid' | 'pay_later' | 'refunded' | 'partial';
  payment_method: 'cash' | 'card' | 'split' | 'gift_card' | 'pay_later' | null;
  subtotal: number;
  vat_amount: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  staff?: Staff;
  items?: OrderItem[];
  payments?: Payment[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  sku: string;
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: 'cash' | 'card' | 'gift_card';
  reference: string | null;
  created_at: string;
}

export interface GiftCard {
  id: string;
  code: string;
  balance: number;
  initial_balance: number;
  is_active: boolean;
  created_at: string;
  used_at: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  value: number;
  min_order_amount: number | null;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  giftCardOptions?: {
    recipientEmail: string;
    recipientName: string;
    senderName: string;
    message?: string;
    deliveryDate?: string;
  };
}

export interface StoreSettings {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}
