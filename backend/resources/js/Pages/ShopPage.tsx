import { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Grid, List } from 'lucide-react';
import { Product, Category } from '@/types';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';

export default function ShopPage() {
  const { url } = usePage();
  const searchParams = new URL(window.location.href).searchParams;

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('category') ? [searchParams.get('category')!] : []
  );
  const [sortBy, setSortBy] = useState('newest');
  const [onSaleOnly, setOnSaleOnly] = useState(searchParams.get('filter') === 'sale');

  // Sync state with URL params on mount/change
  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const q = params.get('q') || '';
    const cat = params.get('category');
    const filter = params.get('filter');

    if (q) setSearchTerm(q);
    if (cat && !selectedCategories.includes(cat)) {
      setSelectedCategories([cat]);
    }
    if (filter === 'sale') setOnSaleOnly(true);
  }, [url]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Category[];
    }
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['shop-products', searchTerm, priceRange, selectedCategories, sortBy, onSaleOnly],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, category:categories(*), inventory(*)')
        .eq('is_active', true);

      // Search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      }

      // Category filter
      if (selectedCategories.length > 0) {
        query = query.in('category_id', selectedCategories);
      }

      // Price filter
      query = query.gte('price', priceRange[0]).lte('price', priceRange[1]);

      // Sale filter
      if (onSaleOnly) {
        query = query.not('sale_price', 'is', null);
      }

      // Sorting
      switch (sortBy) {
        case 'price-asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price-desc':
          query = query.order('price', { ascending: false });
          break;
        case 'name':
          query = query.order('name', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Product[];
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.get('/shop', { q: searchTerm }, { preserveState: true });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPriceRange([0, 500]);
    setSelectedCategories([]);
    setSortBy('newest');
    setOnSaleOnly(false);
    router.get('/shop', {}, { preserveState: true });
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const activeFiltersCount = [
    searchTerm,
    selectedCategories.length > 0,
    priceRange[0] > 0 || priceRange[1] < 500,
    onSaleOnly
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold mb-3">Categories</h3>
        <div className="space-y-2">
          {categories?.map((cat) => (
            <div key={cat.id} className="flex items-center space-x-2">
              <Checkbox
                id={cat.id}
                checked={selectedCategories.includes(cat.id)}
                onCheckedChange={() => toggleCategory(cat.id)}
              />
              <Label htmlFor={cat.id} className="text-sm cursor-pointer">
                {cat.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold mb-3">Price Range</h3>
        <Slider
          value={priceRange}
          min={0}
          max={500}
          step={10}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          className="mb-2"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>${priceRange[0]}</span>
          <span>${priceRange[1]}+</span>
        </div>
      </div>

      {/* On Sale */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="on-sale"
          checked={onSaleOnly}
          onCheckedChange={(checked) => setOnSaleOnly(!!checked)}
        />
        <Label htmlFor="on-sale" className="cursor-pointer">
          On Sale Only
        </Label>
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  const content = (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shop</h1>
        <p className="text-muted-foreground">
          Browse our complete selection of school, office, and home supplies
        </p>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="name">Name: A to Z</SelectItem>
            </SelectContent>
          </Select>

          {/* Mobile Filter Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters */}
      {(searchTerm || selectedCategories.length > 0 || onSaleOnly) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchTerm}"
              <button onClick={() => setSearchTerm('')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedCategories.map((catId) => {
            const cat = categories?.find(c => c.id === catId);
            return cat ? (
              <Badge key={catId} variant="secondary" className="gap-1">
                {cat.name}
                <button onClick={() => toggleCategory(catId)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
          {onSaleOnly && (
            <Badge variant="secondary" className="gap-1">
              On Sale
              <button onClick={() => setOnSaleOnly(false)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 border rounded-lg p-4">
            <h2 className="font-semibold mb-4">Filters</h2>
            <FilterContent />
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-lg mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products?.length ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {products.length} product{products.length !== 1 ? 's' : ''} found
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search term
              </p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <StorefrontLayout>
      {content}
    </StorefrontLayout>
  );
}
