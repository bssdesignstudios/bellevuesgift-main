import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/storefront/ProductCard';
import { CategoryCard } from '@/components/storefront/CategoryCard';
import { Product, Category } from '@/types';
import { STORE_INFO } from '@/lib/constants';

// Category image mapping (placeholder URLs - you'd replace with actual images)
const CATEGORY_IMAGES: Record<string, string> = {
  'school-supplies': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
  'office-supplies': 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400',
  'stationery': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400',
  'arts-crafts': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
  'gifts-souvenirs': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400',
  'home-supplies': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  'cleaning-supplies': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
  'electronics-audio': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
  'books-reading': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
  'bags-backpacks': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  'toys-games': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400',
  'party-supplies': 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400'
};

export default function HomePage() {
  const [heroSearch, setHeroSearch] = useState('');
  const navigate = useNavigate();

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

  const { data: featuredProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*), inventory(*)')
        .eq('is_active', true)
        .not('sale_price', 'is', null)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as Product[];
    }
  });

  const { data: newProducts } = useQuery({
    queryKey: ['new-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*), inventory(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data as Product[];
    }
  });

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary to-header py-16 md:py-24">
        <div className="container mx-auto px-4 text-center text-primary-foreground">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            {STORE_INFO.name}
          </h1>
          <p className="text-xl md:text-2xl opacity-90 mb-8">
            {STORE_INFO.tagline}
          </p>
          
          <form onSubmit={handleHeroSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Input
                type="search"
                placeholder="What are you looking for?"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                className="w-full h-14 pl-6 pr-16 text-lg bg-white text-foreground rounded-full"
              />
              <Button 
                type="submit"
                size="lg"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 p-0"
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <Button variant="secondary" size="sm" asChild className="rounded-full">
              <Link to="/category/school-supplies">School Supplies</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild className="rounded-full">
              <Link to="/category/office-supplies">Office Supplies</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild className="rounded-full">
              <Link to="/sale">Sale Items</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Shop by Category</h2>
            <Button variant="ghost" asChild>
              <Link to="/categories" className="flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories?.slice(0, 8).map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                imageUrl={CATEGORY_IMAGES[category.slug]}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Sale Items */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="py-12 md:py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Hot Deals</h2>
                <p className="text-muted-foreground">Save big on these items</p>
              </div>
              <Button variant="ghost" asChild>
                <Link to="/sale" className="flex items-center gap-1">
                  See All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newProducts && newProducts.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">New Arrivals</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {newProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Promo Banner */}
      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Island-Wide Delivery Available
          </h2>
          <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
            We ship to all major islands in the Bahamas. Order online and get your supplies delivered right to your door.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/shipping">Learn More</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
