import { Link, usePage } from '@inertiajs/react';
import { Product, Category } from '@/types';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';

export default function CategoryPage() {
  const { category, products: allProducts, slug } = usePage<{
    category: Category | null;
    products: Product[];
    slug: string;
  }>().props;

  const [sortBy, setSortBy] = useState('newest');
  const [showInStock, setShowInStock] = useState(false);
  const [showOnSale, setShowOnSale] = useState(false);

  // Client-side filtering and sorting
  const products = useMemo(() => {
    if (!allProducts) return [];
    let filtered = [...allProducts];

    if (showOnSale) {
      filtered = filtered.filter(p => p.sale_price != null);
    }

    if (showInStock) {
      filtered = filtered.filter(p =>
        p.inventory && (p.inventory.qty_on_hand - p.inventory.qty_reserved) > 0
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (Number(a.price) || 0) - (Number(b.price) || 0);
        case 'price-high':
          return (Number(b.price) || 0) - (Number(a.price) || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    return filtered;
  }, [allProducts, sortBy, showInStock, showOnSale]);

  if (!category) {
    return (
      <StorefrontLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </StorefrontLayout>
    );
  }

  const content = (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{category.name}</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-muted-foreground">
            {products?.length || 0} products
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={showInStock ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowInStock(!showInStock)}
          >
            In Stock
          </Button>
          <Button
            variant={showOnSale ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowOnSale(!showOnSale)}
          >
            On Sale
          </Button>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">No products found in this category.</p>
          <Button asChild>
            <Link href="/">Continue Shopping</Link>
          </Button>
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
