import { Link } from '@inertiajs/react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_IMAGES } from '@/lib/constants';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  // Laravel serialises decimal columns as strings — coerce to Number here so
  // .toFixed() and arithmetic work regardless of the data source.
  const price = Number(product.price);
  const salePrice = product.sale_price != null ? Number(product.sale_price) : null;
  const hasDiscount = salePrice != null && salePrice < price;
  const displayPrice = salePrice ?? price;
  const stockAvailable = product.inventory
    ? product.inventory.qty_on_hand - product.inventory.qty_reserved
    : 0;

  return (
    <div className="product-card group">
      <Link href={`/product/${product.slug}`} className="block">
        <div
          className="relative aspect-square mb-3 rounded-md overflow-hidden transition-colors"
          style={{ backgroundColor: product.hex_code || undefined }}
        >
          {/* If no hex code, fall back to bg-muted via conditional class if needed, or just let it be transparent/white if that's the design. 
              The original looked like it had colored backgrounds. 
              If I remove bg-muted, it might be white. 
              Let's keep bg-muted as a fallback class if hex_code is missing. */}
          {!product.hex_code && <div className="absolute inset-0 bg-muted" />}
          <img
            src={product.image_url || (product.category?.slug ? CATEGORY_IMAGES[product.category.slug] : undefined) || CATEGORY_IMAGES['office-supplies']}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
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
                ${price.toFixed(2)}
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
