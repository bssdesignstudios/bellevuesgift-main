import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Receipt, Package, RotateCcw, LogOut, Wrench, Monitor, WifiOff, X, ChevronUp } from 'lucide-react';
import { playBeep } from '@/lib/beep';
import { VAT_RATE } from '@/lib/constants';
import { Product, Category, CartItem, Order } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import bellevueLogo from '@/assets/bellevue-logo.webp';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useRegister } from '@/hooks/useRegister';
import { OfflineIndicator } from '@/components/pos/OfflineIndicator';
import { RegisterSelector } from '@/components/pos/RegisterSelector';
import { CloseShiftDialog } from '@/components/pos/CloseShiftDialog';
import { isPOSDomain } from '@/lib/domain';
import { printReceipt } from '@/components/pos/ReceiptPrint';
import { Printer } from 'lucide-react';

export default function POSPage() {
  const { user, staff, loading, effectiveStaff, signOut, impersonating, impersonate } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: 'percent' | 'fixed'; value: number } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Offline queue and register hooks
  const { isOnline, pendingCount, isSyncing, addToQueue, syncQueue } = useOfflineQueue();

  const onPOSDomain = isPOSDomain();

  // Get staff UUID from Inertia page props for register session management.
  // auth.staff.staff_uuid is the UUID from the staff table (not the integer users.id).
  const pageProps = usePage().props as any;
  const staffUuid = pageProps?.auth?.staff?.staff_uuid || effectiveStaff?.staff_uuid;

  const {
    registers,
    activeRegisterId,
    activeSessionId,
    openSession,
    closeSession,
    hasActiveSession
  } = useRegister(staffUuid);

  const [closeShiftOpen, setCloseShiftOpen] = useState(false);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Warn before closing/refreshing if cart has items
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (cart.length > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [cart.length]);

  // Server-side auth middleware already protects this route.
  // If this page rendered, the user IS authenticated.
  // IMPORTANT: Always source staff_uuid from Inertia page props — it is the UUID from the
  // staff table and is required for register sessions and Order creation. The AuthContext
  // effectiveStaff.id is the integer users.id, NOT the staff UUID, so we must merge it in.
  const pageStaff = pageProps?.auth?.staff;
  const resolvedStaff = effectiveStaff
    ? { ...effectiveStaff, staff_uuid: pageStaff?.staff_uuid ?? effectiveStaff.staff_uuid }
    : (pageStaff ? {
        id: String(pageStaff.id),
        staff_uuid: pageStaff.staff_uuid,
        name: pageStaff.name,
        email: pageStaff.email,
        role: pageStaff.role,
        auth_user_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
      } as any : null);

  if (!resolvedStaff) {
    // Truly unauthenticated — redirect to login
    window.location.href = onPOSDomain ? '/pos/login' : '/staff/login';
    return null;
  }

  const allowedRoles = ['admin', 'cashier', 'warehouse', 'warehouse_manager'];
  if (!allowedRoles.includes(resolvedStaff?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Not Authorized</h1>
          <p className="text-muted-foreground mb-4">You don't have access to the POS system.</p>
          <Button asChild>
            <Link href="/staff/login">Back to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  const showRegisterSelector = !hasActiveSession && !!registers && registers.length > 0;

  const handleSignOut = async () => {
    if (hasActiveSession) {
      setCloseShiftOpen(true);
      return;
    }
    // Pass domain-aware redirect so signOut() goes to the correct login page
    await signOut(onPOSDomain ? '/pos/login' : '/staff/login');
  };

  const handleCloseShiftConfirm = async (closingBalance: number, notes?: string) => {
    await closeSession.mutateAsync({ closingBalance, notes });
    // Pass domain-aware redirect — signOut handles navigation, no duplicate override needed
    await signOut(onPOSDomain ? '/pos/login' : '/staff/login');
  };

  const displayName = effectiveStaff?.name ?? 'Staff';
  const displayRole = effectiveStaff?.role?.replace('_', ' ') ?? 'staff';

  // Register selector already defined above

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Register Selector Dialog */}
      <RegisterSelector
        open={showRegisterSelector}
        registers={registers || []}
        onSelect={(registerId, openingBalance) => openSession.mutate({ registerId, openingBalance })}
        onClose={() => { }}
      />

      {/* Close Shift Dialog */}
      <CloseShiftDialog
        open={closeShiftOpen}
        onOpenChange={setCloseShiftOpen}
        sessionId={activeSessionId}
        onConfirm={handleCloseShiftConfirm}
      />

      {/* Header */}
      <header className="bg-header text-header-foreground px-3 py-2 lg:px-4 lg:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 lg:gap-4 min-w-0">
          <img
            src={bellevueLogo}
            alt="Bellevue"
            className="h-6 lg:h-8 brightness-0 invert shrink-0"
          />
          <div className="text-xs lg:text-sm min-w-0">
            <div className="font-medium truncate">{displayName}</div>
            <div className="opacity-70 capitalize hidden sm:block">{displayRole}</div>
          </div>
          {activeRegisterId && registers && (
            <div className="hidden sm:flex items-center gap-1 text-xs lg:text-sm bg-white/10 px-2 py-1 rounded">
              <Monitor className="h-3 w-3" />
              <span className="truncate max-w-[100px] lg:max-w-none">{registers.find(r => r.id === activeRegisterId)?.name || 'Unknown Register'}</span>
            </div>
          )}
          {impersonating && (
            <Button size="sm" variant="secondary" className="hidden sm:inline-flex" onClick={() => impersonate(null)}>
              Stop Impersonating
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
          <OfflineIndicator
            isOnline={isOnline}
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            onSync={syncQueue}
          />
          <span className="text-xs lg:text-sm opacity-70 hidden md:inline">Freeport Store</span>
          {effectiveStaff?.role === 'admin' && !onPOSDomain && (
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-header-foreground hover:bg-white/10 hover:text-white text-xs lg:text-sm">
                Admin
              </Button>
            </Link>
          )}
          {effectiveStaff?.role === 'cashier' && (
            <span className="text-xs opacity-70 hidden sm:inline">Cashier Mode</span>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:h-9 lg:w-9 text-header-foreground hover:bg-white/10 hover:text-white" onClick={handleSignOut}>
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
          searchInputRef={searchInputRef}
          effectiveStaff={resolvedStaff}
          isOnline={isOnline}
          addToQueue={addToQueue}
        />
      </div>
    </div>
  );
}

function POSContent({
  cart, setCart, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
  couponCode, setCouponCode, appliedCoupon, setAppliedCoupon,
  checkoutOpen, setCheckoutOpen,
  searchInputRef, effectiveStaff,
  isOnline, addToQueue
}: any) {
  const queryClient = useQueryClient();
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: async () => {
      const response = await axios.get('/api/pos/categories');
      return response.data as Category[];
    }
  });

  const { data: products } = useQuery({
    queryKey: ['pos-products', selectedCategory, searchQuery],
    queryFn: async () => {
      const response = await axios.get('/api/pos/products', {
        params: { category_id: selectedCategory, search: searchQuery }
      });
      return response.data as Product[];
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
      return prev
        .map(item => {
          if (item.product.id !== productId) return item;
          const newQty = item.qty + delta;
          if (newQty <= 0) return { ...item, qty: 0 }; // mark for removal
          const available = item.product.inventory
            ? item.product.inventory.qty_on_hand - (item.product.inventory.qty_reserved || 0)
            : Infinity;
          if (isFinite(available) && newQty > available) {
            toast.error('Not enough stock');
            return item;
          }
          return { ...item, qty: newQty };
        })
        .filter(item => item.qty > 0); // remove items with qty 0
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

    try {
      const response = await axios.post('/api/pos/coupons/validate', { code: couponCode });
      const data = response.data;
      setAppliedCoupon({
        code: data.code,
        type: data.type,
        value: Number(data.value)
      });
      toast.success('Coupon applied!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid coupon code');
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum: number, item: CartItem) => {
    const price = item.product.sale_price ?? item.product.price;
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

  const cartTabContent = (
    <>
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.map((item: CartItem) => {
          const price = item.product.sale_price ?? item.product.price;
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
      <div className="p-3 border-t shrink-0">
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
      <div className="p-3 border-t space-y-1 text-sm shrink-0">
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
      <div className="p-3 border-t space-y-2 shrink-0">
        <Button className="w-full" size="lg" disabled={cart.length === 0} onClick={() => { setCheckoutOpen(true); setMobileCartOpen(false); }}>
          <CreditCard className="h-4 w-4 mr-2" />
          Pay ${total.toFixed(2)}
        </Button>
        <Button variant="outline" className="w-full" onClick={clearCart} disabled={cart.length === 0}>
          Clear Cart
        </Button>
      </div>
    </>
  );

  const cartPanel = (
    <Tabs defaultValue="cart" className="h-full flex flex-col">
      <TabsList className="w-full rounded-none border-b grid grid-cols-4 shrink-0">
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

      <TabsContent value="cart" className="m-0 flex-1 overflow-y-auto">
        <div className="h-full flex flex-col">
          {cartTabContent}
        </div>
      </TabsContent>

      <TabsContent value="pickup" className="m-0 flex-1 overflow-y-auto p-4">
        <PickupTab staffId={effectiveStaff?.id} />
      </TabsContent>

      <TabsContent value="repair" className="m-0 flex-1 overflow-y-auto p-4">
        <RepairTab staffId={effectiveStaff?.id} />
      </TabsContent>

      <TabsContent value="refund" className="m-0 flex-1 overflow-y-auto p-4">
        <RefundTab staffId={effectiveStaff?.id} />
      </TabsContent>
    </Tabs>
  );

  return (
    <>
      {/* ── Mobile layout (hidden on lg+) ────────────────────── */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
        {/* Category horizontal scroll strip */}
        <div className="bg-muted border-b overflow-x-auto flex-shrink-0">
          <div className="flex gap-1 p-2 w-max min-w-full">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'ghost'}
              className="whitespace-nowrap text-xs"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {categories?.map(cat => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? 'default' : 'ghost'}
                className="whitespace-nowrap text-xs"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="p-3 border-b bg-background flex-shrink-0">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Scan barcode or search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
        </div>

        {/* Product grid — full width, scrollable, padded above floating button */}
        <div className="flex-1 overflow-y-auto p-3 pb-24">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products?.map(product => {
              const price = product.sale_price ?? product.price;
              const available = product.inventory
                ? product.inventory.qty_on_hand - (product.inventory.qty_reserved || 0)
                : Infinity;
              return (
                <Card
                  key={product.id}
                  className={`cursor-pointer hover:border-primary transition-colors ${available <= 0 ? 'opacity-50' : ''}`}
                  onClick={() => available > 0 && addToCart(product)}
                >
                  <CardContent className="p-3">
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name} className="w-full h-16 object-cover rounded mb-2" />
                    )}
                    <div className="font-medium text-sm line-clamp-2">{product.name}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-sm">${Number(price).toFixed(2)}</span>
                      <span className={`text-xs ${isFinite(available) && available < 10 ? 'text-warning' : 'text-muted-foreground'}`}>
                        {isFinite(available) ? `${available} left` : ''}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Floating cart button */}
        <button
          onClick={() => setMobileCartOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-3 shadow-xl font-semibold text-sm"
        >
          <ShoppingCart className="h-5 w-5" />
          {cart.length > 0 && (
            <span className="bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
              {cart.reduce((s: number, i: CartItem) => s + i.qty, 0)}
            </span>
          )}
          <span>${total.toFixed(2)}</span>
        </button>

        {/* Mobile cart drawer backdrop */}
        {mobileCartOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileCartOpen(false)}
          />
        )}

        {/* Mobile cart drawer (slide up from bottom) */}
        <div
          className={`fixed inset-x-0 bottom-0 z-50 h-[85vh] bg-card rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}
        >
          {/* Header + close */}
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cart.length > 0 && <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">{cart.reduce((s: number, i: CartItem) => s + i.qty, 0)}</span>}
            </div>
            <button onClick={() => setMobileCartOpen(false)} className="p-1 rounded-md hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {cartPanel}
          </div>
        </div>
      </div>

      {/* ── Desktop layout (hidden below lg) ─────────────────── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
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
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {products?.map(product => {
                const price = product.sale_price ?? product.price;
                const available = product.inventory
                  ? product.inventory.qty_on_hand - (product.inventory.qty_reserved || 0)
                  : Infinity;
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
                        <span className={`text-xs ${isFinite(available) && available < 10 ? 'text-warning' : 'text-muted-foreground'}`}>
                          {isFinite(available) ? `${available} left` : 'In Stock'}
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
          {cartPanel}
        </div>
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
        staffId={effectiveStaff?.staff_uuid || effectiveStaff?.id}
        staffName={effectiveStaff?.name || 'Staff'}
        registerName={effectiveStaff ? 'Register' : ''}
        onSuccess={clearCart}
        isOnline={isOnline}
        addToQueue={addToQueue}
      />
    </>
  );
}

function CheckoutDialog({ open, onOpenChange, cart, subtotal, discount, vatAmount, total, couponCode, staffId, staffName, registerName, onSuccess, isOnline, addToQueue }: any) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split' | 'gift_card'>('cash');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();

  const checkGiftCard = async () => {
    try {
      const response = await axios.post('/api/pos/check-gift-card', {
        code: giftCardCode
      });

      setGiftCardBalance(response.data.balance);
      toast.success(`Gift card balance: $${response.data.balance.toFixed(2)}`);
    } catch (error: any) {
      toast.error('Invalid gift card');
    }
  };

  const processPayment = async () => {
    setProcessing(true);

    const orderPayload = {
      channel: 'pos',
      payment_method: paymentMethod,
      fulfillment_method: 'in_store',
      staff_id: staffId,
      subtotal,
      discount_amount: discount,
      vat_amount: vatAmount,
      total,
      gift_card_code: paymentMethod === 'gift_card' ? giftCardCode : null,
      notes: couponCode ? `Coupon: ${couponCode}` : null,
      items: cart.map((item: CartItem) => ({
        product_id: item.product.id,
        qty: item.qty,
        unit_price: item.product.sale_price ?? item.product.price,
        line_total: (item.product.sale_price ?? item.product.price) * item.qty,
      }))
    };

    // If offline, queue the transaction for later sync
    if (!isOnline) {
      const txId = addToQueue('sale', orderPayload);
      setReceiptOrder({
        order_number: `OFFLINE-${txId.slice(0, 8).toUpperCase()}`,
        total,
        offline: true,
      });
      playBeep('success');
      toast.success('Transaction saved offline — will sync when connected');
      onSuccess();
      setProcessing(false);
      return;
    }

    try {
      const response = await axios.post('/api/pos/checkout', orderPayload);

      const order = response.data;
      setReceiptOrder(order);
      playBeep('success');
      toast.success('Transaction completed!');
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    } catch (error: any) {
      // Network error while supposedly online — queue it
      if (!navigator.onLine || error.code === 'ERR_NETWORK') {
        const txId = addToQueue('sale', orderPayload);
        setReceiptOrder({
          order_number: `OFFLINE-${txId.slice(0, 8).toUpperCase()}`,
          total,
          offline: true,
        });
        playBeep('success');
        toast.warning('Connection lost — transaction saved offline');
        onSuccess();
      } else {
        playBeep('error');
        toast.error('Payment failed: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setProcessing(false);
    }
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
              <div className="text-muted-foreground">
                {receiptOrder.offline ? 'Saved Offline — Will Sync' : 'Payment Complete'}
              </div>
            </div>
            {receiptOrder.offline && (
              <div className="text-center text-sm text-amber-600 bg-amber-50 rounded-lg p-2">
                This transaction will be synced when connection is restored
              </div>
            )}
            <div className={`text-center text-3xl font-bold ${receiptOrder.offline ? 'text-amber-600' : 'text-success'}`}>
              ${Number(receiptOrder.total).toFixed(2)}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => printReceipt({
                  orderNumber: receiptOrder.order_number,
                  date: new Date().toLocaleString(),
                  cashier: staffName || 'Staff',
                  register: registerName || 'POS',
                  items: (receiptOrder.items || cart).map((item: any) => ({
                    name: item.name || item.product?.name || '',
                    sku: item.sku || item.product?.sku || '',
                    qty: item.qty,
                    unit_price: Number(item.unit_price || item.product?.price || 0),
                    line_total: Number(item.line_total || (item.product?.price || 0) * item.qty),
                  })),
                  subtotal: Number(receiptOrder.subtotal || subtotal),
                  discount: Number(receiptOrder.discount_amount || discount),
                  vatAmount: Number(receiptOrder.vat_amount || vatAmount),
                  total: Number(receiptOrder.total),
                  paymentMethod: receiptOrder.payment_method || paymentMethod,
                  offline: receiptOrder.offline,
                })}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              <Button className="flex-1" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-sm text-muted-foreground">Total Due</div>
              <div className="text-3xl font-bold">${total.toFixed(2)}</div>
            </div>

            {!isOnline && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-2 text-sm">
                <WifiOff className="h-4 w-4 flex-shrink-0" />
                Offline mode — transaction will sync when connected
              </div>
            )}

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'card', 'gift_card'] as const).map(method => (
                  <Button
                    key={method}
                    variant={paymentMethod === method ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod(method)}
                    className="capitalize"
                    disabled={!isOnline && method === 'gift_card'}
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

    const searchTerm = orderNumber.trim().toUpperCase();

    try {
      const { data } = await axios.get('/api/pos/orders/lookup', { params: { q: searchTerm } });
      if (!data.order) {
        toast.error('Order not found. Try order number (BLV-2026-000001) or pickup code');
        setOrder(null);
      } else {
        setOrder(data.order as Order);
        playBeep('success');
      }
    } catch {
      toast.error('Order not found');
      setOrder(null);
    }

    setLoading(false);
  };

  const markPickedUp = async () => {
    if (!order) return;
    setLoading(true);

    try {
      await axios.patch(`/api/pos/orders/${order.id}/pickup`);

      playBeep('success');
      toast.success('Order marked as picked up!');
      setOrder(null);
      setOrderNumber('');
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });

    } catch (error: any) {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
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
      await axios.post(`/api/pos/orders/${order.id}/payment`, {
        method: paymentMethod,
        amount: Number(order.total),
      });

      playBeep('success');
      toast.success('Payment collected!');
      onSuccess();
    } catch (error: any) {
      toast.error('Payment failed: ' + (error.response?.data?.message || error.message));
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

    try {
      const { data } = await axios.get('/api/pos/orders/lookup', { params: { q: orderNumber.trim() } });
      if (!data.order) {
        toast.error('Order not found');
        setOrder(null);
      } else {
        setOrder(data.order as Order);
      }
    } catch {
      toast.error('Order not found');
      setOrder(null);
    }

    setLoading(false);
  };

  const processRefund = async () => {
    if (!order) return;
    setLoading(true);

    try {
      await axios.post(`/api/pos/orders/${order.id}/refund`);

      playBeep('success');
      toast.success('Refund processed!');
      setOrder(null);
      setOrderNumber('');
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });

    } catch (error: any) {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
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

    try {
      const { data } = await axios.get('/api/pos/repair-tickets/lookup', { params: { q: ticketNumber.toUpperCase().trim() } });
      if (!data.ticket) {
        playBeep('error');
        toast.error('Repair ticket not found');
      } else {
        setTicket(data.ticket);
        playBeep('success');
      }
    } catch {
      playBeep('error');
      toast.error('Repair ticket not found');
    }

    setLoading(false);
  };

  const markPickedUp = async () => {
    if (!ticket) return;
    setLoading(true);

    try {
      await axios.patch(`/api/pos/repair-tickets/${ticket.id}/pickup`);

      playBeep('success');
      toast.success('Repair marked as picked up!');
      setTicket(null);
      setTicketNumber('');
    } catch (error: any) {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
    }

    setLoading(false);
  };

  const collectDeposit = async () => {
    if (!ticket) return;
    setLoading(true);

    try {
      await axios.patch(`/api/pos/repair-tickets/${ticket.id}/deposit`);

      playBeep('success');
      toast.success('Deposit collected!');
      setTicket({ ...ticket, deposit_paid: true });
    } catch (error: any) {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
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
              <div className="space-y-2">
                <div className="p-3 bg-success/10 border border-success rounded-lg">
                  <div className="flex justify-between font-bold">
                    <span>Balance Due</span>
                    <span>${(Number(ticket.total_cost || 0) - (ticket.deposit_paid ? Number(ticket.deposit_amount || 0) : 0)).toFixed(2)}</span>
                  </div>
                </div>
                <Button className="w-full" onClick={() => setPaymentOpen(true)} disabled={loading}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Take Payment & Pickup
                </Button>
              </div>
            )}

            {ticket.status === 'completed' && (
              <div className="text-center text-success text-sm py-2">
                ✓ This repair has been completed and picked up
              </div>
            )}
          </div>

          {/* Payment Dialog for remaining balance */}
          <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Repair Final Payment</DialogTitle>
              </DialogHeader>
              <RepairPaymentForm
                ticket={ticket}
                staffId={staffId}
                onSuccess={() => {
                  setPaymentOpen(false);
                  searchTicket();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
function RepairPaymentForm({ ticket, staffId, onSuccess }: { ticket: any; staffId?: string; onSuccess: () => void }) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [processing, setProcessing] = useState(false);

  const balanceDue = Number(ticket.total_cost || 0) - (ticket.deposit_paid ? Number(ticket.deposit_amount || 0) : 0);

  const processPayment = async () => {
    setProcessing(true);
    try {
      await axios.post(`/api/pos/repair-tickets/${ticket.id}/payment`, {
        amount: balanceDue,
        method: paymentMethod,
      });

      playBeep('success');
      toast.success('Payment collected and repair closed!');
      onSuccess();
    } catch (error: any) {
      toast.error('Payment failed: ' + error.message);
    }
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg text-center">
        <div className="text-sm text-muted-foreground">Remaining Balance Due</div>
        <div className="text-3xl font-bold">${balanceDue.toFixed(2)}</div>
        <div className="text-xs text-muted-foreground mt-1">
          Total: ${Number(ticket.total_cost || 0).toFixed(2)} | Deposit: ${Number(ticket.deposit_amount || 0).toFixed(2)}
        </div>
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
        {processing ? 'Processing...' : 'Complete & Close Ticket'}
      </Button>
    </div>
  );
}
