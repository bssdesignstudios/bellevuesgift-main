# Purchase Flow Agent: Evidence Report

## Summary

The application has **two checkout flows**:
1. **Web Checkout** - Supabase-based customer orders
2. **POS Checkout** - Staff-assisted in-store orders

## Evidence

### 1. Web Checkout Flow

**File:** `src/pages/CheckoutPage.tsx`

#### Flow Steps

1. **Cart Validation** (L30-36)
   ```typescript
   if (items.length === 0) {
     toast.error('Your cart is empty');
     return;
   }
   ```

2. **Customer Creation/Lookup** (L46-70)
   ```typescript
   const { data: existingCustomer } = await supabase
     .from('customers')
     .select('id')
     .eq('phone', customer.phone)
     .single();
   // Create if not exists
   ```

3. **Order Number Generation** (L72-77)
   ```typescript
   const { data: orderNumberData } = await supabase
     .rpc('generate_order_number');
   ```

4. **Order Creation** (L79-98)
   ```typescript
   const { data: order } = await supabase
     .from('orders')
     .insert({
       order_number: orderNumber,
       customer_id: customerId,
       channel: 'web',
       status: 'pending',
       fulfillment_method: fulfillment,
       payment_status: paymentOption === 'now' ? 'paid' : 'pay_later',
       // ...
     });
   ```

5. **Order Items Insertion** (L100-115)
   ```typescript
   const orderItems = items.map(item => ({
     order_id: order.id,
     product_id: item.product.id,
     sku: item.product.sku,
     name: item.product.name,
     qty: item.qty,
     unit_price: item.product.sale_price ?? item.product.price,
     line_total: (item.product.sale_price ?? item.product.price) * item.qty
   }));
   ```

6. **Success Redirect** (L117-120)
   ```typescript
   clearCart();
   navigate(`/checkout/success/${order.id}`);
   toast.success('Order placed successfully!');
   ```

### 2. Fulfillment Methods

**File:** `src/lib/constants.ts`

| Value | Label | Description |
|-------|-------|-------------|
| `pickup` | Store Pickup | Collect at Freeport store |
| `island_delivery` | Grand Bahama Delivery | Local delivery |
| `mailboat` | Out Island Mailboat | Inter-island shipping |

### 3. Payment Methods

**Web Channel:**
| Method | Description |
|--------|-------------|
| `card` | Simulated payment (marked as paid) |
| `pay_later` | Pay on pickup |

**POS Channel:**
| Method | Description |
|--------|-------------|
| `cash` | Cash payment |
| `card` | Card terminal |
| `split` | Mixed payment |
| `gift_card` | Gift card redemption |
| `pay_later` | Credit/account |

### 4. Payment Statuses

| Status | Description |
|--------|-------------|
| `pending` | Payment not received |
| `paid` | Full payment received |
| `pay_later` | Deferred payment |
| `refunded` | Full refund issued |
| `partial` | Partial payment received |

### 5. Order Statuses

| Status | Description |
|--------|-------------|
| `pending` | Order placed, awaiting confirmation |
| `confirmed` | Payment confirmed |
| `picking` | Staff picking items |
| `ready` | Ready for pickup/shipping |
| `picked_up` | Customer collected |
| `shipped` | In transit |
| `delivered` | Delivered to customer |
| `cancelled` | Order cancelled |
| `refunded` | Payment refunded |

### 6. Cart Context

**File:** `src/contexts/CartContext.tsx`

```typescript
// Line 72-86: Cart totals calculation
const subtotal = items.reduce((sum, item) => {
  const price = item.product.sale_price ?? item.product.price;
  return sum + price * item.qty;
}, 0);

const discount = appliedCoupon
  ? appliedCoupon.discount_type === 'percent'
    ? subtotal * (appliedCoupon.value / 100)
    : Math.min(appliedCoupon.value, subtotal)
  : 0;

const taxableAmount = subtotal - discount;
const vatAmount = taxableAmount * VAT_RATE; // 10%
const total = taxableAmount + vatAmount;
```

### 7. VAT Rate

**File:** `src/lib/constants.ts`

```typescript
export const VAT_RATE = 0.10; // 10% Bahamian VAT
```

### 8. POS Checkout

**File:** `backend/resources/js/Pages/POSPage.tsx` (45,676 bytes)

Features:
- Product search/scan
- Cart management
- Customer lookup/create
- Split payment support
- Gift card redemption
- Receipt generation
- Offline sync (PWA)

### 9. Gift Card Purchase

**Location:**
- Page: `src/pages/GiftCardsPage.tsx`
- Balance Check: `src/pages/GiftCardsBalancePage.tsx`

Gift card denominations: $10, $25, $50, $100, Custom

### 10. Order Confirmation

**File:** `src/pages/CheckoutSuccessPage.tsx`

Displays:
- Order number
- Order summary
- Fulfillment instructions
- Tracking link

## Cart Persistence

**File:** `src/contexts/CartContext.tsx:23-31`

```typescript
const [items, setItems] = useState<CartItem[]>(() => {
  const saved = localStorage.getItem('bellevue-cart');
  return saved ? JSON.parse(saved) : [];
});

useEffect(() => {
  localStorage.setItem('bellevue-cart', JSON.stringify(items));
}, [items]);
```

## Recommendations

1. Add inventory check before order placement
2. Implement payment gateway integration
3. Add order confirmation email
4. Implement real-time order tracking
