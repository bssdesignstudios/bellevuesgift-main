import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, ChevronDown, Phone, Clock, MapPin, Heart, Wrench, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  const navigate = useNavigate();

  const { data: dbCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    }
  });

  // Merge DB categories with required categories
  const categories = REQUIRED_CATEGORIES.map(required => {
    const dbCat = dbCategories?.find(c => c.slug === required.slug || c.name === required.name);
    return dbCat || required;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = async () => {
    if (customer) {
      await customerSignOut();
    }
    if (staff) {
      await staffSignOut();
    }
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-header text-header-foreground text-sm py-2">
        <div className="container mx-auto px-4 flex items-center justify-between">
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
          <div className="text-center flex-1 md:flex-none font-medium">
            ISLAND SHIPPING AVAILABLE
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Link to="/contact" className="hover:underline flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Freeport Store
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 lg:gap-8">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <img 
                src={bellevueLogo} 
                alt="Bellevue Gifts & Supplies Ltd." 
                className="h-8 md:h-10 w-auto"
              />
            </Link>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 hidden md:block">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 h-11 bg-background"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Wishlist */}
              <Button variant="ghost" size="sm" asChild className="hidden md:flex">
                <Link to="/account/wishlist">
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
                          <Link to="/account">My Account</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/account/orders">Orders</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/account/wishlist">Wishlist</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {staff && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/pos">POS Terminal</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin">Admin Dashboard</Link>
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
                  <Link to="/account/login">
                    <User className="h-4 w-4 mr-2" />
                    My Account
                  </Link>
                </Button>
              )}

              <Button variant="ghost" size="sm" asChild className="relative">
                <Link to="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile search */}
          <form onSubmit={handleSearch} className="mt-4 md:hidden">
            <div className="relative">
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12"
              />
              <Button 
                type="submit" 
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* Navigation - EXACT MATCH TO SCREENSHOT */}
        <div className="bg-header text-header-foreground">
          <div className="container mx-auto px-4">
            <nav className="hidden md:flex items-center gap-1">
              {/* Shop All dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-12 gap-2 text-header-foreground hover:bg-sidebar-accent">
                    <Menu className="h-4 w-4" />
                    Shop All
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto">
                  {categories.map((category) => (
                    <DropdownMenuItem key={category.slug} asChild>
                      <Link to={`/category/${category.slug}`}>{category.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* SALE */}
              <Link to="/sale">
                <Button variant="ghost" className="h-12 text-header-foreground hover:bg-sidebar-accent font-semibold">
                  SALE
                </Button>
              </Link>

              {/* BACK TO SCHOOL ESSENTIALS */}
              <Link to="/category/school-supplies">
                <Button variant="ghost" className="h-12 text-header-foreground hover:bg-sidebar-accent font-semibold">
                  BACK TO SCHOOL ESSENTIALS
                </Button>
              </Link>

              {/* REPAIR & INSTALLATIONS */}
              <Link to="/repair">
                <Button variant="ghost" className="h-12 text-header-foreground hover:bg-sidebar-accent gap-2">
                  <Wrench className="h-4 w-4" />
                  REPAIR & INSTALLATIONS
                </Button>
              </Link>

              {/* GIFT CARDS dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-12 gap-2 text-header-foreground hover:bg-sidebar-accent">
                    <Gift className="h-4 w-4" />
                    GIFT CARDS
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link to="/gift-cards/balance">Gift Card Balance</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/gift-cards">Buy Gift Cards</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                    <Link to="/account" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                      My Account
                    </Link>
                    <Link to="/account/wishlist" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                      Wishlist
                    </Link>
                  </>
                )}
                {staff && (
                  <>
                    <Link to="/pos" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                      POS Terminal
                    </Link>
                    <Link to="/admin" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                      Admin Dashboard
                    </Link>
                  </>
                )}
                <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="block py-2 text-destructive">
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/account/login" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                Sign In / My Account
              </Link>
            )}
            
            <hr className="my-2" />
            
            {/* Mobile nav items matching desktop */}
            <Link to="/sale" className="block py-2 font-semibold" onClick={() => setMobileMenuOpen(false)}>
              SALE
            </Link>
            <Link to="/category/school-supplies" className="block py-2 font-semibold" onClick={() => setMobileMenuOpen(false)}>
              BACK TO SCHOOL ESSENTIALS
            </Link>
            <Link to="/repair" className="block py-2 font-semibold" onClick={() => setMobileMenuOpen(false)}>
              REPAIR & INSTALLATIONS
            </Link>
            <Link to="/gift-cards" className="block py-2 font-semibold" onClick={() => setMobileMenuOpen(false)}>
              GIFT CARDS
            </Link>
            <Link to="/gift-cards/balance" className="block py-2 pl-4 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
              Check Gift Card Balance
            </Link>
            
            <hr className="my-2" />
            <div className="font-semibold py-2">Categories</div>
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/category/${category.slug}`}
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
