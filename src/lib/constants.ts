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
