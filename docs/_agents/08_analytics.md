# Analytics Agent: Evidence Report

## Summary

**Status: NOT IMPLEMENTED**

No analytics or tracking system exists in the codebase.

## Evidence

### Search Results

**Query:** `analytics|track|event|pageview`  
**Scope:** `src/`  
**Result:** No matches found

### Head/Script Tags

**File:** `index.html`
- No Google Analytics script
- No Google Tag Manager
- No Plausible/Umami

### Tracking Events

- No add_to_cart tracking
- No purchase tracking
- No page view tracking
- No user identification

## Expected Implementation

### Option A: Google Analytics 4

```html
<!-- Add to index.html or app.blade.php -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Option B: Google Tag Manager

```html
<!-- Head -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>

<!-- Body -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```

### Option C: Self-Hosted (Plausible/Umami)

```html
<script defer data-domain="bellevuegifts.com" src="https://plausible.io/js/script.js"></script>
```

### E-commerce Event Tracking

#### Add to Cart
```typescript
// In CartContext.tsx addItem function
gtag('event', 'add_to_cart', {
  currency: 'BSD',
  value: product.price,
  items: [{
    item_id: product.id,
    item_name: product.name,
    item_category: product.category?.name,
    price: product.price,
    quantity: qty,
  }]
});
```

#### Purchase
```typescript
// In CheckoutPage.tsx after successful order
gtag('event', 'purchase', {
  transaction_id: order.order_number,
  value: total,
  currency: 'BSD',
  tax: vatAmount,
  shipping: 0,
  items: items.map(item => ({
    item_id: item.product.id,
    item_name: item.product.name,
    price: item.product.sale_price ?? item.product.price,
    quantity: item.qty,
  }))
});
```

#### View Item
```typescript
// In ProductPage.tsx
gtag('event', 'view_item', {
  currency: 'BSD',
  value: product.price,
  items: [{
    item_id: product.id,
    item_name: product.name,
    item_category: product.category?.name,
    price: product.price,
  }]
});
```

### Custom Analytics Service

```typescript
// src/lib/analytics.ts
class Analytics {
  private static instance: Analytics;
  
  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  track(event: string, properties?: Record<string, any>) {
    // Send to backend or third-party service
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', event, properties);
    }
    
    // Optional: Send to your own backend
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties, timestamp: new Date().toISOString() }),
    }).catch(console.error);
  }

  pageView(path: string) {
    this.track('page_view', { page_path: path });
  }

  addToCart(product: Product, quantity: number) {
    this.track('add_to_cart', {
      product_id: product.id,
      product_name: product.name,
      quantity,
      value: product.price * quantity,
    });
  }

  purchase(order: Order, items: CartItem[]) {
    this.track('purchase', {
      order_id: order.id,
      order_number: order.order_number,
      value: order.total,
      items: items.map(i => ({
        id: i.product.id,
        name: i.product.name,
        quantity: i.qty,
      })),
    });
  }
}

export const analytics = Analytics.getInstance();
```

### Backend Analytics Table (Optional)

```php
Schema::create('analytics_events', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('event_type');
    $table->json('properties')->nullable();
    $table->string('session_id')->nullable();
    $table->foreignUuid('customer_id')->nullable();
    $table->string('user_agent')->nullable();
    $table->string('ip_address')->nullable();
    $table->string('referrer')->nullable();
    $table->string('page_url')->nullable();
    $table->timestamp('created_at')->useCurrent();
    
    $table->index(['event_type', 'created_at']);
    $table->index('customer_id');
    $table->index('session_id');
});
```

## Recommendations

1. **Immediate:** Add Google Analytics 4 for basic tracking
2. **Short-term:** Implement e-commerce event tracking
3. **Medium-term:** Consider self-hosted alternative for privacy
4. **Long-term:** Build custom analytics dashboard

## Priority

**High** - Essential for business intelligence and marketing optimization.

## Effort Estimate

- GA4 Setup: 1-2 hours
- E-commerce Events: 4-6 hours
- Custom Dashboard: 8-12 hours
- **Minimum (GA4 + Events): 5-8 hours**
