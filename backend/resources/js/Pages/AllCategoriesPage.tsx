import { Link } from '@inertiajs/react';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';
import { CategoryCard } from '@/components/storefront/CategoryCard';
import { Category } from '@/types';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageMeta } from '@/components/PageMeta';

// Category image mapping (reused from Homepage)
const CATEGORY_IMAGES: Record<string, string> = {
    'school-supplies': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
    'office-supplies': 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400',
    'stationery': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400',
    'arts-crafts': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
    'gifts-souvenirs': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400',
    'home-supplies': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    'cleaning-supplies': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
    'electronics-audio-visual': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    'books-reading': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    'bags-backpacks': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    'toys-games': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400',
    'party-supplies': 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400',
    'computer-accessories': 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=400',
    'musical-instruments': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
    'repair-installations': 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400',
};

export default function AllCategoriesPage({ categories }: { categories: Category[] }) {
    return (
        <StorefrontLayout>
            <PageMeta
                title="Shop by Category"
                description="Browse all product categories at Bellevue Gifts & Supplies — from school supplies and office essentials to electronics, toys, and home goods."
                canonical="https://bellevue.gifts/categories"
            />
            <div className="container mx-auto px-4 py-8 animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">All Categories</h1>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {categories.map((category) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            imageUrl={CATEGORY_IMAGES[category.slug]}
                        />
                    ))}
                </div>
            </div>
        </StorefrontLayout>
    );
}
