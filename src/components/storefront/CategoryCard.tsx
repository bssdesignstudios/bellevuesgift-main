import { Link } from 'react-router-dom';
import { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  imageUrl?: string;
}

export function CategoryCard({ category, imageUrl }: CategoryCardProps) {
  return (
    <Link to={`/category/${category.slug}`} className="category-card">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-primary/20" />
      <span className="relative font-semibold text-lg uppercase tracking-wide">
        {category.name}
      </span>
    </Link>
  );
}
