import { Link } from 'react-router-dom';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const displayPrice = product.sale_price ?? product.price;
  const stockAvailable = product.inventory 
    ? product.inventory.qty_on_hand - product.inventory.qty_reserved 
    : 0;

  return (
    <div className="product-card group">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square mb-3 bg-muted rounded-md overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
          {hasDiscount && (
            <Badge className="absolute top-2 left-2 bg-destructive">
              Sale
            </Badge>
          )}
          {stockAvailable <= 0 && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="font-medium text-muted-foreground">Out of Stock</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {product.sku}
          </p>
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg">
              ${displayPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>
          {stockAvailable > 0 && stockAvailable <= 5 && (
            <p className="text-xs text-warning">Only {stockAvailable} left</p>
          )}
        </div>
      </Link>

      <Button
        size="sm"
        className="w-full mt-3"
        onClick={() => addItem(product)}
        disabled={stockAvailable <= 0}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        Add to Cart
      </Button>
    </div>
  );
}
