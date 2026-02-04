import { Link } from '@inertiajs/react';
import { AccountLayout } from '@/components/layout/AccountLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/types';

export default function AccountWishlistPage() {
  const { customer } = useCustomerAuth();
  const { addItem } = useCart();
  const queryClient = useQueryClient();

  const { data: wishlistItems, isLoading } = useQuery({
    queryKey: ['customer-wishlist', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          product:products(*)
        `)
        .eq('customer_id', customer.id);

      if (error) throw error;
      return data as Array<{ id: string; product: Product }>;
    },
    enabled: !!customer?.id
  });

  const removeMutation = useMutation({
    mutationFn: async (wishlistId: string) => {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-wishlist'] });
      toast.success('Removed from wishlist');
    }
  });

  const handleAddToCart = (product: Product) => {
    addItem(product);
    toast.success('Added to cart');
  };

  if (isLoading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground">Items you've saved for later</p>
        </div>

        {!wishlistItems?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6">
                Save items you love by clicking the heart icon on any product.
              </p>
              <Button asChild>
                <Link href="/shop">Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishlistItems.map(({ id, product }) => (
              <Card key={id} className="overflow-hidden">
                <Link href={`/product/${product.slug}`}>
                  <div className="aspect-square bg-muted relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                    {product.sale_price && (
                      <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-1 text-xs font-bold rounded">
                        SALE
                      </div>
                    )}
                  </div>
                </Link>

                <CardContent className="p-4">
                  <Link href={`/product/${product.slug}`}>
                    <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 mt-2">
                    {product.sale_price ? (
                      <>
                        <span className="font-bold text-destructive">
                          ${product.sale_price.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          ${product.price.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="font-bold">${product.price.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeMutation.mutate(id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
