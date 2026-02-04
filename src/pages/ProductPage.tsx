import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { ChevronRight, Minus, Plus, ShoppingCart, Check, Heart } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { toast } from 'sonner';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*), inventory(*)')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!slug
  });

  // Check if product is in wishlist
  const { data: isInWishlist } = useQuery({
    queryKey: ['wishlist-check', customer?.id, product?.id],
    queryFn: async () => {
      if (!customer?.id || !product?.id) return false;
      const { data } = await supabase
        .from('wishlists')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('product_id', product.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!customer?.id && !!product?.id
  });

  // Toggle wishlist mutation
  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.id || !product?.id) throw new Error('Not logged in');
      
      if (isInWishlist) {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('customer_id', customer.id)
          .eq('product_id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wishlists')
          .insert({ customer_id: customer.id, product_id: product.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-check', customer?.id, product?.id] });
      queryClient.invalidateQueries({ queryKey: ['customer-wishlist'] });
      toast.success(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist');
    },
    onError: () => {
      toast.error('Failed to update wishlist');
    }
  });

  const handleWishlistToggle = () => {
    if (!customer) {
      toast.error('Please log in to add to wishlist');
      navigate('/account/login');
      return;
    }
    wishlistMutation.mutate();
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-lg animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-6 w-1/4 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Button asChild>
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const displayPrice = product.sale_price ?? product.price;
  const stockAvailable = product.inventory 
    ? product.inventory.qty_on_hand - product.inventory.qty_reserved 
    : 0;
  const discountPercent = hasDiscount 
    ? Math.round((1 - (product.sale_price! / product.price)) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        {product.category && (
          <>
            <Link to={`/category/${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="text-foreground line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image Available
            </div>
          )}
          {hasDiscount && (
            <Badge className="absolute top-4 left-4 bg-destructive text-lg py-1 px-3">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
              SKU: {product.sku}
            </p>
            <h1 className="text-3xl font-bold">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-primary">
              ${displayPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-xl text-muted-foreground line-through">
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {stockAvailable > 0 ? (
              <>
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-success font-medium">
                  In Stock
                  {stockAvailable <= 10 && ` (${stockAvailable} left)`}
                </span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-destructive font-medium">Out of Stock</span>
              </>
            )}
          </div>

          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}

          {/* Quantity & Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="font-medium">Quantity:</span>
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{qty}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQty(Math.min(stockAvailable, qty + 1))}
                  disabled={qty >= stockAvailable}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={stockAvailable <= 0}
              >
                {added ? (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  handleAddToCart();
                  navigate('/cart');
                }}
                disabled={stockAvailable <= 0}
              >
                Buy Now
              </Button>
            </div>

            {/* Wishlist Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleWishlistToggle}
              disabled={wishlistMutation.isPending}
            >
              <Heart className={`h-5 w-5 mr-2 ${isInWishlist ? 'fill-destructive text-destructive' : ''}`} />
              {isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
            </Button>
          </div>

          {/* Additional Info */}
          <div className="border-t pt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span>{product.category?.name || 'Uncategorized'}</span>
            </div>
            {product.barcode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Barcode</span>
                <span className="font-mono">{product.barcode}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>VAT Included (10%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
