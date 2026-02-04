export const VAT_RATE = 0.10; // 10% VAT

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'picking',
  'ready',
  'picked_up',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
] as const;

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'split',
  'gift_card',
  'pay_later'
] as const;

export const FULFILLMENT_METHODS = [
  { value: 'pickup', label: 'In-Store Pickup', description: 'Pick up at Freeport Store' },
  { value: 'island_delivery', label: 'Island-to-Island Delivery', description: 'Delivery within the Bahamas' },
  { value: 'mailboat', label: 'Mailboat Delivery', description: 'Ship via mailboat service' }
] as const;

export const BAHAMIAN_ISLANDS = [
  'Grand Bahama',
  'New Providence',
  'Abaco',
  'Andros',
  'Eleuthera',
  'Exuma',
  'Long Island',
  'Cat Island',
  'San Salvador',
  'Bimini',
  'Inagua',
  'Mayaguana',
  'Acklins',
  'Crooked Island',
  'Berry Islands',
  'Ragged Island'
] as const;

export const STORE_INFO = {
  name: 'Bellevue Gifts & Supplies Ltd.',
  tagline: 'School • Office • Gifts • Home • Audio Visual',
  phone: '+1 (242) 352-5555',
  email: 'info@bellevuegifts.com',
  address: 'Freeport, Grand Bahama, Bahamas',
  hours: '08:00 - 17:00'
} as const;

export const CATEGORY_IMAGES: Record<string, string> = {
  'school-supplies': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
  'office-supplies': 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400',
  'stationery': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400',
  'arts-crafts': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
  'furniture-decor': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  'home-supplies': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  'cleaning-supplies': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
  'electronics-audio': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
  'books-reading': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
  'bags-backpacks': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  'toys-games': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400',
  'party-supplies': 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400'
};

export const HERO_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80';
