import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Search, ShoppingCart, User, Menu, X, ChevronDown, Phone, Clock, MapPin, Heart, Wrench, Gift, Truck, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import bellevueLogo from '@/assets/bellevue-logo.webp';
import { STORE_INFO } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Define all categories that must appear in the Shop All dropdown - EXACT MATCH TO SCREENSHOT
const REQUIRED_CATEGORIES = [
  { name: 'Art & Craft Supplies', slug: 'arts-crafts' },
  { name: 'Bags & Backpacks', slug: 'bags-backpacks' },
  { name: 'Books & Reading', slug: 'books-reading' },
  { name: 'Cleaning Supplies', slug: 'cleaning-supplies' },
  { name: 'Computers & Accessories', slug: 'computers-accessories' },
  { name: 'Electronics & Audio Visual', slug: 'electronics-audio-visual' },
  { name: 'Home Décor', slug: 'home-supplies' },
  { name: 'Musical Instruments', slug: 'musical-instruments' },
  { name: 'Office Supplies', slug: 'office-supplies' },
  { name: 'Party Supplies', slug: 'party-supplies' },
  { name: 'School Supplies', slug: 'school-supplies' },
  { name: 'Toys, Games & Bikes', slug: 'toys-games' },
];

export function StorefrontHeader() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { customer, signOut: customerSignOut } = useCustomerAuth();
  const { staff, signOut: staffSignOut } = useAuth();


  const { data: dbCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get('/api/storefront/categories');
      return response.data;
    }
  });

  // Merge DB categories with required categories
  const categories = REQUIRED_CATEGORIES.map(required => {
    const dbCat = dbCategories?.find((c: any) => c.slug === required.slug || c.name === required.name);
    return dbCat || required;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.get('/shop', { q: searchQuery.trim() });
    }
  };

  const handleSignOut = async () => {
    if (customer) {
      await customerSignOut();
    }
    if (staff) {
      await staffSignOut();
    }
    router.visit('/');
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Top bar */}
      {/* Top bar */}
      <div className="bg-brand-blue text-white text-sm py-2">
        <div className="container mx-auto px-4 flex items-center justify-center md:justify-between">
          <div className="hidden md:flex items-center gap-6">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {STORE_INFO.hours}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {STORE_INFO.phone}
            </span>
          </div>
          <div className="text-center font-medium tracking-wide uppercase text-xs md:text-sm">
            ISLAND SHIPPING AVAILABLE
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/contact" className="hover:text-brand-mint transition-colors flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Freeport Store
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-[36px] z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 md:gap-8">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <img
                src={bellevueLogo}
                alt="Bellevue Gifts & Supplies Ltd."
                className="h-8 md:h-12 w-auto object-contain"
              />
            </Link>

            {/* Desktop Search Bar - Centered */}
            <div className="hidden md:block flex-1 max-w-2xl mx-auto">
              <form onSubmit={handleSearch} className="relative w-full">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-4 pr-12 h-11 border-slate-300 rounded-lg text-base shadow-sm focus-visible:ring-brand-blue"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-1 top-1 bottom-1 w-9 h-9 bg-brand-blue hover:bg-brand-blue/90 rounded-md"
                >
                  <Search className="h-4 w-4 text-white" />
                </Button>
              </form>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
              {staff && (
                <Button variant="ghost" size="sm" asChild className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 text-brand-blue hover:bg-slate-100">
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    Admin Panel
                  </Link>
                </Button>
              )}
              {/* Wishlist */}
              <Button variant="ghost" size="icon" asChild className="hidden md:flex hover:bg-brand-mint/20 hover:text-brand-blue">
                <Link href="/account/wishlist">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>

              {/* Account dropdown */}
              {customer || staff ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hidden md:flex">
                      <User className="h-4 w-4 mr-2" />
                      {staff ? staff.name : customer?.name || 'Account'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {customer && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/account">My Account</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/account/orders">Orders</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/account/wishlist">Wishlist</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {staff && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/pos">POS Terminal</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin">Admin Dashboard</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={handleSignOut}>
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="sm" asChild className="hidden md:flex">
                  <Link href="/account/login">
                    <User className="h-4 w-4 mr-2" />
                    My Account
                  </Link>
                </Button>
              )}

              {/* Cart */}
              <Link href="/cart" className="relative text-slate-800 p-1">
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-blue text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full ring-2 ring-white">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-800 md:hidden p-1"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-7 w-7" />}
              </button>
            </div>
          </div>

          {/* Mobile Search Bar - Visible ONLY on mobile */}
          <div className="mt-4 pb-1 md:hidden">
            <form onSubmit={handleSearch} className="relative w-full">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-4 pr-12 h-11 border-slate-300 rounded-lg text-base shadow-sm focus-visible:ring-brand-blue"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 bottom-1 w-9 h-9 bg-brand-blue hover:bg-brand-blue/90 rounded-md"
              >
                <Search className="h-4 w-4 text-white" />
              </Button>
            </form>
          </div>
        </div>

        {/* Navigation - Clean white background to match MVP */}
        <div className="w-full bg-white border-t border-slate-100 shadow-sm">
          <div className="container mx-auto px-4">
            <nav className="hidden md:flex items-center gap-1">
              {/* Shop All dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-12 gap-2 text-slate-800 hover:bg-slate-50 font-medium">
                    <Menu className="h-4 w-4" />
                    Shop All
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto">
                  {categories.map((category) => (
                    <DropdownMenuItem key={category.slug} asChild>
                      <Link href={`/category/${category.slug}`}>{category.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* SALE */}
              <Link href="/sale">
                <Button variant="ghost" className="h-12 text-slate-800 hover:bg-slate-50 font-bold tracking-wider">
                  SALE
                </Button>
              </Link>

              {/* BACK TO SCHOOL ESSENTIALS */}
              <Link href="/category/school-supplies">
                <Button variant="ghost" className="h-12 text-slate-800 hover:bg-slate-50 font-bold tracking-wider">
                  BACK TO SCHOOL ESSENTIALS
                </Button>
              </Link>

              {/* REPAIR & INSTALLATIONS */}
              <Link href="/repair">
                <Button variant="ghost" className="h-12 text-slate-800 hover:bg-slate-50 gap-2 font-medium">
                  <Wrench className="h-4 w-4" />
                  REPAIR & INSTALLATIONS
                </Button>
              </Link>

              {/* GIFT CARDS dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-12 gap-2 text-slate-800 hover:bg-slate-50 font-medium">
                    <Gift className="h-4 w-4" />
                    GIFT CARDS
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/gift-cards/balance" className="flex items-center gap-2 w-full">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Gift Card Balance
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/gift-cards" className="flex items-center gap-2 w-full">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      Buy Gift Cards
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/track-order">
                <Button variant="ghost" className="h-12 text-brand-yellow hover:bg-slate-50 gap-2 font-bold tracking-wider">
                  <Truck className="h-4 w-4" />
                  TRACK MY ORDER
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-card border-b animate-fade-in">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            {customer || staff ? (
              <>
                <div className="py-2 text-sm text-muted-foreground">
                  Signed in as {staff?.name || customer?.name || 'User'}
                </div>
                {customer && (
                  <>
                    <Link href="/account" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                      My Account
                    </Link>
                    <Link href="/account/wishlist" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                      Wishlist
                    </Link>
                  </>
                )}
                {staff && (
                  <>
                    <Link href="/pos" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                      POS Terminal
                    </Link>
                    <Link href="/admin" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                      Admin Dashboard
                    </Link>
                  </>
                )}
                <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="block py-2 text-destructive">
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/account/login" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                Sign In / My Account
              </Link>
            )}

            <hr className="my-2" />

            {/* Mobile nav items matching desktop */}
            <Link href="/sale" className="block py-2 font-semibold" onClick={() => setMobileMenuOpen(false)}>
              SALE
            </Link>
            <Link href="/category/school-supplies" className="block py-2 font-semibold" onClick={() => setMobileMenuOpen(false)}>
              BACK TO SCHOOL ESSENTIALS
            </Link>
            <Link href="/repair" className="block py-2 font-semibold" onClick={() => setMobileMenuOpen(false)}>
              REPAIR & INSTALLATIONS
            </Link>
            <Link href="/gift-cards" className="block py-2 font-semibold" onClick={() => setMobileMenuOpen(false)}>
              GIFT CARDS
            </Link>
            <Link href="/gift-cards/balance" className="block py-2 pl-4 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
              Check Gift Card Balance
            </Link>

            <hr className="my-2" />
            <div className="font-semibold py-2">Categories</div>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="block py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
