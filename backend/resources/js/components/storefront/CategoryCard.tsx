import { Link } from '@inertiajs/react';
import { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  imageUrl?: string;
}

export function CategoryCard({ category, imageUrl }: CategoryCardProps) {
  return (
    <Link href={`/shop?category=${category.slug}`} className="category-card group block relative aspect-[4/3] overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-primary/20" />
      <span className="absolute bottom-4 left-0 right-0 z-10 text-center font-semibold text-lg uppercase tracking-wide text-white drop-shadow">
        {category.name}
      </span>
    </Link>
  );
}
