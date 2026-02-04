import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Receipt, Package, RotateCcw, LogOut, Wrench, Monitor } from 'lucide-react';
import { playBeep } from '@/lib/beep';
import { VAT_RATE } from '@/lib/constants';
import { Product, Category, CartItem, Order } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import bellevueLogo from '@/assets/bellevue-logo.webp';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useRegister } from '@/hooks/useRegister';
import { OfflineIndicator } from '@/components/pos/OfflineIndicator';
import { RegisterSelector } from '@/components/pos/RegisterSelector';
import { 
  isDemoModeEnabled, 
  getDemoSession, 
  disableDemoMode,
  canAccessPOS,
  isDemoStaffId
} from '@/lib/demoSession';

export default function POSPage() {
  const { user, staff, loading, effectiveStaff, signOut, impersonating, impersonate, demoSession } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: 'percent' | 'fixed'; value: number } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Offline queue and register hooks
  const { isOnline, pendingCount, isSyncing, syncQueue } = useOfflineQueue();
  const { 
    registers, 
    activeRegisterId, 
    currentSession, 
    selectRegister, 
    openSession, 
    hasActiveSession 
  } = useRegister(effectiveStaff?.id);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Check for demo mode
  const demoModeActive = isDemoModeEnabled();
  const storedDemoSession = getDemoSession();

  // Auth check - POS MUST load directly for staff
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading POS...</p>
        </div>
      </div>
    );
  }

  // Demo mode access check
  if (demoModeActive && storedDemoSession?.enabled) {
    const role = storedDemoSession.role;
    if (!canAccessPOS(role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Not Authorized</h1>
            <p className="text-muted-foreground mb-4">This demo role doesn't have POS access.</p>
            <Button asChild>
              <Link to="/admin/kiosk">Switch to Admin View</Link>
            </Button>
          </div>
        </div>
      );
    }
    // Allow demo mode access - continue to render POS
  } else {
    // Redirect to staff login if not authenticated (real mode)
    if (!user || !staff) {
      return <Navigate to="/staff/login" replace state={{ from: '/pos' }} />;
    }

    // Role-based access: cashier, admin can use full POS; warehouse_manager can only use pickup/repairs tabs
    const allowedRoles = ['admin', 'cashier', 'warehouse_manager'];
    if (!allowedRoles.includes(effectiveStaff?.role || '')) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Not Authorized</h1>
            <p className="text-muted-foreground mb-4">You don't have access to the POS system.</p>
            <Button asChild>
              <Link to="/staff/login">Back to Login</Link>
            </Button>
          </div>
        </div>
      );
    }
  }

  const isWarehouseOnly = effectiveStaff?.role === 'warehouse_manager' || storedDemoSession?.role === 'warehouse';

  // Show register selector if no active session (skip in demo mode for simplicity)
  const showRegisterSelector = !demoModeActive && !hasActiveSession && registers && registers.length > 0;

  const handleSignOut = async () => {
    if (demoModeActive) {
      disableDemoMode();
      window.location.href = '/staff/login';
    } else {
      await signOut();
    }
  };

  // Get display name for header
  const displayName = demoModeActive && storedDemoSession 
    ? storedDemoSession.name 
    : effectiveStaff?.name;
  const displayRole = demoModeActive && storedDemoSession 
    ? storedDemoSession.role 
    : effectiveStaff?.role?.replace('_', ' ');

  // Register selector already defined above

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Register Selector Dialog */}
      <RegisterSelector
        open={showRegisterSelector}
        registers={registers || []}
        onSelect={(registerId, openingBalance) => openSession.mutate({ registerId, openingBalance })}
        onClose={() => {}}
      />

      {/* Header */}
      <header className="bg-header text-header-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={bellevueLogo} alt="Bellevue" className="h-8" />
          <div className="text-sm">
            <div className="font-medium">{displayName}</div>
            <div className="opacity-70 capitalize">{displayRole}</div>
          </div>
          {activeRegisterId && registers && (
            <div className="flex items-center gap-1 text-sm bg-white/10 px-2 py-1 rounded">
              <Monitor className="h-3 w-3" />
              {registers.find(r => r.id === activeRegisterId)?.name || 'Unknown Register'}
            </div>
          )}
          {impersonating && (
            <Button size="sm" variant="secondary" onClick={() => impersonate(null)}>
              Stop Impersonating
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <OfflineIndicator
            isOnline={isOnline}
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            onSync={syncQueue}
          />
          <span className="text-sm opacity-70">Freeport Store</span>
          {(effectiveStaff?.role === 'admin' || storedDemoSession?.role === 'admin') && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-header-foreground hover:bg-white/10">
                Admin
              </Button>
            </Link>
          )}
          {(effectiveStaff?.role === 'cashier' || storedDemoSession?.role === 'cashier') && (
            <span className="text-xs opacity-70">Cashier Mode</span>
          )}
          <Button variant="ghost" size="icon" className="text-header-foreground hover:bg-white/10" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <POSContent
          cart={cart}
          setCart={setCart}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          appliedCoupon={appliedCoupon}
          setAppliedCoupon={setAppliedCoupon}
          checkoutOpen={checkoutOpen}
          setCheckoutOpen={setCheckoutOpen}
          pickupOpen={pickupOpen}
          setPickupOpen={setPickupOpen}
          refundOpen={refundOpen}
          setRefundOpen={setRefundOpen}
          searchInputRef={searchInputRef}
          effectiveStaff={effectiveStaff}
        />
      </div>
    </div>
  );
}

function POSContent({
  cart, setCart, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
  couponCode, setCouponCode, appliedCoupon, setAppliedCoupon,
  checkoutOpen, setCheckoutOpen, pickupOpen, setPickupOpen, refundOpen, setRefundOpen,
  searchInputRef, effectiveStaff
}: any) {
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
      return data as Category[];
    }
  });

  const { data: products } = useQuery({
    queryKey: ['pos-products', selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, inventory(*)')
        .eq('is_active', true);

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,barcode.eq.${searchQuery}`);
      }

      const { data } = await query.order('name').limit(50);
      return data as Product[];
    }
  });

  const addToCart = useCallback((product: Product) => {
    const available = (product.inventory?.qty_on_hand || 0) - (product.inventory?.qty_reserved || 0);
    
    setCart((prev: CartItem[]) => {
      const existing = prev.find(item => item.product.id === product.id);
      const currentQty = existing?.qty || 0;
      
      if (currentQty >= available) {
        playBeep('error');
        toast.error('Not enough stock');
        return prev;
      }

      playBeep('success');
      toast.success(`Added ${product.name}`);

      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });

    searchInputRef.current?.focus();
  }, [setCart, searchInputRef]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Try to find exact match by barcode or SKU
    const exactMatch = products?.find(
      p => p.barcode === searchQuery || p.sku?.toLowerCase() === searchQuery.toLowerCase()
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setSearchQuery('');
    } else if (products?.length === 1) {
      addToCart(products[0]);
      setSearchQuery('');
    } else if (products?.length === 0) {
      playBeep('error');
      toast.error('Product not found');
    }

    searchInputRef.current?.focus();
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev: CartItem[]) => {
      return prev.map(item => {
        if (item.product.id !== productId) return item;
        const newQty = item.qty + delta;
        if (newQty <= 0) return item;
        const available = (item.product.inventory?.qty_on_hand || 0) - (item.product.inventory?.qty_reserved || 0);
        if (newQty > available) {
          toast.error('Not enough stock');
          return item;
        }
        return { ...item, qty: newQty };
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev: CartItem[]) => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      toast.error('Invalid coupon code');
      return;
    }

    setAppliedCoupon({
      code: data.code,
      type: data.discount_type as 'percent' | 'fixed',
      value: data.value,
    });
    toast.success('Coupon applied!');
  };

  // Calculate totals
  const subtotal = cart.reduce((sum: number, item: CartItem) => {
    const price = item.product.sale_price || item.product.price;
    return sum + price * item.qty;
  }, 0);

  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.type === 'percent'
      ? subtotal * (appliedCoupon.value / 100)
      : appliedCoupon.value;
  }

  const afterDiscount = subtotal - discount;
  const vatAmount = afterDiscount * VAT_RATE;
  const total = afterDiscount + vatAmount;

  return (
    <>
      {/* Categories Sidebar */}
      <div className="w-48 bg-muted border-r overflow-y-auto">
        <div className="p-2 space-y-1">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setSelectedCategory('all')}
          >
            All Products
          </Button>
          {categories?.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'ghost'}
              className="w-full justify-start text-left"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-background">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Scan barcode or search product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products?.map(product => {
              const price = product.sale_price || product.price;
              const available = (product.inventory?.qty_on_hand || 0) - (product.inventory?.qty_reserved || 0);
              
              return (
                <Card
                  key={product.id}
                  className={`cursor-pointer hover:border-primary transition-colors ${available <= 0 ? 'opacity-50' : ''}`}
                  onClick={() => available > 0 && addToCart(product)}
                >
                  <CardContent className="p-3">
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name} className="w-full h-20 object-cover rounded mb-2" />
                    )}
                    <div className="font-medium text-sm line-clamp-2">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold">${Number(price).toFixed(2)}</span>
                      <span className={`text-xs ${available < 10 ? 'text-warning' : 'text-muted-foreground'}`}>
                        {available} left
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-80 bg-card border-l flex flex-col">
        <Tabs defaultValue="cart" className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b grid grid-cols-4">
            <TabsTrigger value="cart" className="text-xs">
              <ShoppingCart className="h-4 w-4 mr-1" />
              Cart ({cart.length})
            </TabsTrigger>
            <TabsTrigger value="pickup" className="text-xs">
              <Package className="h-4 w-4 mr-1" />
              Pickup
            </TabsTrigger>
            <TabsTrigger value="repair" className="text-xs">
              <Wrench className="h-4 w-4 mr-1" />
              Repair
            </TabsTrigger>
            <TabsTrigger value="refund" className="text-xs">
              <RotateCcw className="h-4 w-4 mr-1" />
              Refund
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cart" className="flex-1 flex flex-col m-0">
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.map((item: CartItem) => {
                const price = item.product.sale_price || item.product.price;
                return (
                  <div key={item.product.id} className="flex items-center gap-2 bg-muted rounded-md p-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.product.name}</div>
                      <div className="text-xs text-muted-foreground">${Number(price).toFixed(2)} ea</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {cart.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Cart is empty
                </div>
              )}
            </div>

            {/* Coupon */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={!!appliedCoupon}
                />
                <Button variant="outline" onClick={applyCoupon} disabled={!!appliedCoupon}>
                  Apply
                </Button>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between mt-2 text-sm text-success">
                  <span>{appliedCoupon.code}</span>
                  <span>-{appliedCoupon.type === 'percent' ? `${appliedCoupon.value}%` : `$${appliedCoupon.value}`}</span>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="p-3 border-t space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>VAT (10%)</span>
                <span>${vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 border-t space-y-2">
              <Button className="w-full" size="lg" disabled={cart.length === 0} onClick={() => setCheckoutOpen(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${total.toFixed(2)}
              </Button>
              <Button variant="outline" className="w-full" onClick={clearCart} disabled={cart.length === 0}>
                Clear Cart
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="pickup" className="flex-1 m-0 p-4 overflow-y-auto">
            <PickupTab staffId={effectiveStaff?.id} />
          </TabsContent>

          <TabsContent value="repair" className="flex-1 m-0 p-4 overflow-y-auto">
            <RepairTab staffId={effectiveStaff?.id} />
          </TabsContent>

          <TabsContent value="refund" className="flex-1 m-0 p-4 overflow-y-auto">
            <RefundTab staffId={effectiveStaff?.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        subtotal={subtotal}
        discount={discount}
        vatAmount={vatAmount}
        total={total}
        couponCode={appliedCoupon?.code}
        staffId={effectiveStaff?.id}
        onSuccess={clearCart}
      />
    </>
  );
}

function CheckoutDialog({ open, onOpenChange, cart, subtotal, discount, vatAmount, total, couponCode, staffId, onSuccess }: any) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split' | 'gift_card'>('cash');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();

  const checkGiftCard = async () => {
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('code', giftCardCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      toast.error('Invalid gift card');
      return;
    }

    setGiftCardBalance(data.balance);
    toast.success(`Gift card balance: $${data.balance.toFixed(2)}`);
  };

  const processPayment = async () => {
    setProcessing(true);

    try {
      // Generate order number
      const { data: orderNum } = await supabase.rpc('generate_order_number');

      // Don't use demo staff IDs in database - they don't exist in the staff table
      const actualStaffId = isDemoStaffId(staffId) ? null : staffId;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNum,
          channel: 'pos',
          status: 'delivered',
          fulfillment_method: 'pickup',
          payment_status: 'paid',
          payment_method: paymentMethod,
          subtotal,
          discount_amount: discount,
          vat_amount: vatAmount,
          total,
          staff_id: actualStaffId,
          notes: couponCode ? `Coupon: ${couponCode}` : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const items = cart.map((item: CartItem) => ({
        order_id: order.id,
        product_id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        qty: item.qty,
        unit_price: item.product.sale_price || item.product.price,
        line_total: (item.product.sale_price || item.product.price) * item.qty,
      }));

      await supabase.from('order_items').insert(items);

      // Create payment record
      await supabase.from('payments').insert({
        order_id: order.id,
        amount: total,
        method: paymentMethod,
        reference: `POS-${Date.now()}`,
      });

      // Deduct inventory immediately for POS
      for (const item of cart) {
        const { data: inv } = await supabase
          .from('inventory')
          .select('qty_on_hand')
          .eq('product_id', item.product.id)
          .single();

        if (inv) {
          await supabase
            .from('inventory')
            .update({ qty_on_hand: inv.qty_on_hand - item.qty })
            .eq('product_id', item.product.id);
        }
      }

      // Deduct gift card if used
      if (paymentMethod === 'gift_card' && giftCardBalance !== null) {
        await supabase
          .from('gift_cards')
          .update({ balance: Math.max(0, giftCardBalance - total) })
          .eq('code', giftCardCode.toUpperCase());
      }

      playBeep('success');
      toast.success('Payment successful!');
      setReceiptOrder(order as unknown as Order);
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });

    } catch (error: any) {
      playBeep('error');
      toast.error('Payment failed: ' + error.message);
    }

    setProcessing(false);
  };

  const handleClose = () => {
    if (receiptOrder) {
      onSuccess();
      setReceiptOrder(null);
    }
    onOpenChange(false);
    setPaymentMethod('cash');
    setGiftCardCode('');
    setGiftCardBalance(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{receiptOrder ? 'Receipt' : 'Checkout'}</DialogTitle>
        </DialogHeader>

        {receiptOrder ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-xl font-bold">{receiptOrder.order_number}</div>
              <div className="text-muted-foreground">Payment Complete</div>
            </div>
            <div className="text-center text-3xl font-bold text-success">
              ${Number(receiptOrder.total).toFixed(2)}
            </div>
            <Button className="w-full" onClick={handleClose}>
              <Receipt className="h-4 w-4 mr-2" />
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-sm text-muted-foreground">Total Due</div>
              <div className="text-3xl font-bold">${total.toFixed(2)}</div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'card', 'gift_card', 'split'] as const).map(method => (
                  <Button
                    key={method}
                    variant={paymentMethod === method ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod(method)}
                    className="capitalize"
                  >
                    {method.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === 'gift_card' && (
              <div className="space-y-2">
                <Label>Gift Card Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value)}
                    placeholder="Enter code"
                  />
                  <Button variant="outline" onClick={checkGiftCard}>Check</Button>
                </div>
                {giftCardBalance !== null && (
                  <div className="text-sm">
                    Balance: <span className="font-bold">${giftCardBalance.toFixed(2)}</span>
                    {giftCardBalance < total && (
                      <span className="text-destructive ml-2">Insufficient balance</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={processPayment}
              disabled={processing || (paymentMethod === 'gift_card' && (giftCardBalance === null || giftCardBalance < total))}
            >
              {processing ? 'Processing...' : `Complete Payment`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickupTab({ staffId }: { staffId?: string }) {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const queryClient = useQueryClient();

  const searchOrder = async () => {
    if (!orderNumber.trim()) return;
    setLoading(true);

    // Search by order_number or pickup_code
    const searchTerm = orderNumber.trim().toUpperCase();
    
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(*), items:order_items(*)')
      .eq('channel', 'web')
      .or(`order_number.ilike.%${searchTerm}%,pickup_code.eq.${searchTerm}`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      toast.error('Order not found. Try order number (BLV-2026-000001) or pickup code');
      setOrder(null);
    } else {
      setOrder(data as unknown as Order);
      playBeep('success');
    }

    setLoading(false);
  };

  const markPickedUp = async () => {
    if (!order) return;
    setLoading(true);

    try {
      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'picked_up', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      // Update inventory - decrease qty_on_hand and qty_reserved
      for (const item of order.items || []) {
        if (item.product_id) {
          const { data: inv } = await supabase
            .from('inventory')
            .select('qty_on_hand, qty_reserved')
            .eq('product_id', item.product_id)
            .single();

          if (inv) {
            await supabase
              .from('inventory')
              .update({
                qty_on_hand: inv.qty_on_hand - item.qty,
                qty_reserved: Math.max(0, inv.qty_reserved - item.qty),
              })
              .eq('product_id', item.product_id);
          }
        }
      }

      playBeep('success');
      toast.success('Order marked as picked up!');
      setOrder(null);
      setOrderNumber('');
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });

    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Order # or pickup code..."
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
        />
        <Button onClick={searchOrder} disabled={loading}>Search</Button>
      </div>

      {order && (
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="font-bold text-lg">{order.order_number}</div>
            <div className="text-sm text-muted-foreground">
              {order.customer?.name} • {order.status.replace('_', ' ')}
            </div>
            <div className="text-sm">
              Payment: <span className={order.payment_status === 'paid' ? 'text-success' : 'text-warning'}>{order.payment_status}</span>
            </div>
          </div>

          <div className="space-y-2">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.qty}x {item.name}</span>
                <span>${Number(item.line_total).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          {order.payment_status === 'pay_later' && (
            <div className="p-3 bg-warning/10 border border-warning rounded-lg text-center">
              <div className="font-medium text-warning">Payment Required</div>
              <div className="text-sm">Collect ${Number(order.total).toFixed(2)} before pickup</div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setPaymentOpen(true)}
              >
                Take Payment
              </Button>
            </div>
          )}

          <Button
            className="w-full"
            onClick={markPickedUp}
            disabled={loading || !['pending', 'reserved', 'confirmed', 'ready', 'picking', 'ready_for_pickup'].includes(order.status)}
          >
            <Package className="h-4 w-4 mr-2" />
            Mark Picked Up
          </Button>
          
          {/* Payment Dialog for pay_later orders */}
          <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Collect Payment</DialogTitle>
              </DialogHeader>
              <PickupPaymentForm 
                order={order} 
                staffId={staffId}
                onSuccess={() => {
                  setPaymentOpen(false);
                  // Refresh order
                  searchOrder();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

function PickupPaymentForm({ order, staffId, onSuccess }: { order: Order; staffId?: string; onSuccess: () => void }) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [processing, setProcessing] = useState(false);

  const processPayment = async () => {
    setProcessing(true);
    try {
      // Create payment record
      await supabase.from('payments').insert({
        order_id: order.id,
        amount: Number(order.total),
        method: paymentMethod,
        reference: `PICKUP-${Date.now()}`,
      });

      // Update order payment status
      await supabase
        .from('orders')
        .update({ payment_status: 'paid', payment_method: paymentMethod })
        .eq('id', order.id);

      playBeep('success');
      toast.success('Payment collected!');
      onSuccess();
    } catch (error: any) {
      toast.error('Payment failed: ' + error.message);
    }
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg text-center">
        <div className="text-sm text-muted-foreground">Amount Due</div>
        <div className="text-3xl font-bold">${Number(order.total).toFixed(2)}</div>
      </div>

      <div className="space-y-2">
        <Label>Payment Method</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={paymentMethod === 'cash' ? 'default' : 'outline'}
            onClick={() => setPaymentMethod('cash')}
          >
            Cash
          </Button>
          <Button
            variant={paymentMethod === 'card' ? 'default' : 'outline'}
            onClick={() => setPaymentMethod('card')}
          >
            Card
          </Button>
        </div>
      </div>

      <Button className="w-full" onClick={processPayment} disabled={processing}>
        {processing ? 'Processing...' : 'Complete Payment'}
      </Button>
    </div>
  );
}

function RefundTab({ staffId }: { staffId?: string }) {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const searchOrder = async () => {
    if (!orderNumber.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('order_number', orderNumber.trim())
      .single();

    if (error || !data) {
      toast.error('Order not found');
      setOrder(null);
    } else {
      setOrder(data as unknown as Order);
    }

    setLoading(false);
  };

  const processRefund = async () => {
    if (!order) return;
    setLoading(true);

    try {
      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'refunded', payment_status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      // Create negative payment record
      await supabase.from('payments').insert({
        order_id: order.id,
        amount: -Number(order.total),
        method: order.payment_method || 'cash',
        reference: `REFUND-${Date.now()}`,
      });

      // Return inventory
      for (const item of order.items || []) {
        if (item.product_id) {
          const { data: inv } = await supabase
            .from('inventory')
            .select('qty_on_hand')
            .eq('product_id', item.product_id)
            .single();

          if (inv) {
            await supabase
              .from('inventory')
              .update({ qty_on_hand: inv.qty_on_hand + item.qty })
              .eq('product_id', item.product_id);
          }
        }
      }

      playBeep('success');
      toast.success('Refund processed!');
      setOrder(null);
      setOrderNumber('');
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });

    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter order number..."
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
        />
        <Button onClick={searchOrder} disabled={loading}>Search</Button>
      </div>

      {order && (
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="font-bold text-lg">{order.order_number}</div>
            <div className="text-sm text-muted-foreground">
              Status: {order.status} • Channel: {order.channel.toUpperCase()}
            </div>
          </div>

          <div className="space-y-2">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.qty}x {item.name}</span>
                <span>${Number(item.line_total).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Refund Amount</span>
              <span className="text-destructive">${Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={processRefund}
            disabled={loading || order.status === 'refunded'}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {order.status === 'refunded' ? 'Already Refunded' : 'Process Refund'}
          </Button>
        </div>
      )}
    </div>
  );
}

// RepairTab component for POS repair ticket lookup and payment
function RepairTab({ staffId }: { staffId?: string }) {
  const [ticketNumber, setTicketNumber] = useState('');
  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const searchTicket = async () => {
    if (!ticketNumber.trim()) return;
    setLoading(true);
    setTicket(null);

    const { data, error } = await supabase
      .from('repair_tickets')
      .select('*')
      .eq('ticket_number', ticketNumber.toUpperCase().trim())
      .maybeSingle();

    if (error || !data) {
      playBeep('error');
      toast.error('Repair ticket not found');
    } else {
      setTicket(data);
      playBeep('success');
    }

    setLoading(false);
  };

  const markPickedUp = async () => {
    if (!ticket) return;
    setLoading(true);

    try {
      await supabase
        .from('repair_tickets')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', ticket.id);

      playBeep('success');
      toast.success('Repair marked as picked up!');
      setTicket(null);
      setTicketNumber('');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }

    setLoading(false);
  };

  const collectDeposit = async () => {
    if (!ticket) return;
    setLoading(true);

    try {
      await supabase
        .from('repair_tickets')
        .update({ deposit_paid: true })
        .eq('id', ticket.id);

      playBeep('success');
      toast.success('Deposit collected!');
      setTicket({ ...ticket, deposit_paid: true });
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }

    setLoading(false);
  };

  const STATUS_LABELS: Record<string, string> = {
    submitted: 'Submitted',
    received: 'Received',
    diagnosing: 'Diagnosing',
    awaiting_parts: 'Awaiting Parts',
    in_progress: 'In Progress',
    ready_for_pickup: 'Ready for Pickup',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Repair ticket # (RPR-...)"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && searchTicket()}
        />
        <Button onClick={searchTicket} disabled={loading}>Search</Button>
      </div>

      {ticket && (
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="font-bold text-lg font-mono">{ticket.ticket_number}</div>
            <div className="text-sm text-muted-foreground">
              {ticket.customer_name} • {ticket.phone}
            </div>
            <div className="text-sm mt-1">
              Status: <span className="font-medium">{STATUS_LABELS[ticket.status] || ticket.status}</span>
            </div>
          </div>

          <div className="text-sm space-y-1">
            <p><strong>Service:</strong> {ticket.service_type === 'repair' ? 'Repair' : 'Installation'}</p>
            {ticket.item_make && <p><strong>Make:</strong> {ticket.item_make}</p>}
            {ticket.model_number && <p><strong>Model:</strong> {ticket.model_number}</p>}
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground">Problem Description</p>
            <p className="text-sm">{ticket.problem_description}</p>
          </div>

          {/* Costs */}
          {(ticket.deposit_amount > 0 || ticket.total_cost > 0) && (
            <div className="space-y-1 text-sm p-3 bg-muted rounded-lg">
              {ticket.deposit_amount > 0 && (
                <div className="flex justify-between">
                  <span>Deposit</span>
                  <span className={ticket.deposit_paid ? 'text-success' : 'text-warning'}>
                    ${Number(ticket.deposit_amount).toFixed(2)} {ticket.deposit_paid ? '(Paid)' : '(Pending)'}
                  </span>
                </div>
              )}
              {ticket.total_cost > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Total Cost</span>
                  <span>${Number(ticket.total_cost).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {ticket.deposit_amount > 0 && !ticket.deposit_paid && (
              <Button variant="outline" className="w-full" onClick={collectDeposit} disabled={loading}>
                <CreditCard className="h-4 w-4 mr-2" />
                Collect Deposit (${Number(ticket.deposit_amount).toFixed(2)})
              </Button>
            )}

            {ticket.status === 'ready_for_pickup' && (
              <Button className="w-full" onClick={markPickedUp} disabled={loading}>
                <Package className="h-4 w-4 mr-2" />
                Mark Picked Up
              </Button>
            )}

            {ticket.status === 'completed' && (
              <div className="text-center text-success text-sm">
                ✓ This repair has been completed and picked up
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
