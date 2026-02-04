import { Link, usePage } from '@inertiajs/react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';

export default function CartPage() {
  const { url } = usePage();
  const {
    items,
    updateQty,
    removeItem,
    subtotal,
    discount,
    vatAmount,
    total,
    appliedCoupon
  } = useCart();

  const content = (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-6">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Button asChild>
            <Link href="/">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const price = item.product.sale_price ?? item.product.price;
              const stockAvailable = item.product.inventory
                ? item.product.inventory.qty_on_hand - item.product.inventory.qty_reserved
                : 0;

              return (
                <div key={item.product.id} className="flex gap-4 p-4 bg-card rounded-lg border">
                  <Link href={`/product/${item.product.slug}`} className="flex-shrink-0">
                    <div className="w-24 h-24 bg-muted rounded-md overflow-hidden">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.product.slug}`}>
                      <h3 className="font-medium hover:text-primary line-clamp-2">
                        {item.product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.product.sku}
                    </p>

                    {/* Display Gift Card Options */}
                    {item.giftCardOptions && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1 bg-muted/50 p-2 rounded">
                        <p><span className="font-semibold">To:</span> {item.giftCardOptions.recipientName} ({item.giftCardOptions.recipientEmail})</p>
                        <p><span className="font-semibold">From:</span> {item.giftCardOptions.senderName}</p>
                        {item.giftCardOptions.message && (
                          <p className="italic">"{item.giftCardOptions.message}"</p>
                        )}
                      </div>
                    )}

                    <p className="font-semibold mt-1">
                      ${Number(price).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center border rounded-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateQty(item.product.id, parseInt(e.target.value) || 1)}
                        className="w-12 h-8 text-center border-0 p-0"
                        min={1}
                        max={stockAvailable}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                        disabled={item.qty >= stockAvailable}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <span className="font-semibold">
                      ${(Number(price) * item.qty).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                {appliedCoupon && discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (10%)</span>
                  <span>${vatAmount.toFixed(2)}</span>
                </div>

                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <Button className="w-full mt-6" size="lg" asChild>
                <Link href="/checkout">
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>

              <Button variant="outline" className="w-full mt-3" asChild>
                <Link href="/">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <StorefrontLayout>
      {content}
    </StorefrontLayout>
  );
}
