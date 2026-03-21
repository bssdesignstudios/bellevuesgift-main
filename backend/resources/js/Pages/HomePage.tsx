import { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/storefront/ProductCard';
import { CategoryCard } from '@/components/storefront/CategoryCard';
import { Product, Category } from '@/types';
import { STORE_INFO, CATEGORY_IMAGES, HERO_FALLBACK_IMAGE } from '@/lib/constants';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';
import { PageMeta } from '@/components/PageMeta';

export default function HomePage({ featuredProducts = [], categories = [] }: { featuredProducts: Product[], categories: Category[] }) {
  const [heroSearch, setHeroSearch] = useState('');
  const [currentNewArrivalsIndex, setCurrentNewArrivalsIndex] = useState(0);

  // Auto-slide logic for New Arrivals
  useEffect(() => {
    if (!featuredProducts || featuredProducts.length <= 4) return;

    const interval = setInterval(() => {
      setCurrentNewArrivalsIndex((prev) =>
        prev + 1 >= featuredProducts.length - 3 ? 0 : prev + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [featuredProducts]);

  const nextSlide = () => {
    if (!featuredProducts || featuredProducts.length <= 4) return;
    setCurrentNewArrivalsIndex((prev) =>
      prev + 1 >= featuredProducts.length - 3 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    if (!featuredProducts || featuredProducts.length <= 4) return;
    setCurrentNewArrivalsIndex((prev) =>
      prev === 0 ? featuredProducts.length - 4 : prev - 1
    );
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      router.get(`/shop?q=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  const content = (
    <div className="animate-fade-in pb-0">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[500px] flex items-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_FALLBACK_IMAGE}
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/80 to-brand-mint/30 backdrop-blur-[2px]"></div>
        </div>

        <div className="container mx-auto px-4 py-12 md:py-20 text-center relative z-10">
          <span className="inline-block py-1 px-3 rounded-full bg-brand-blue/10 text-brand-blue font-semibold text-xs mb-4 tracking-wider uppercase">
            Bahamas' #1 Supplier
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-slate-900 tracking-tight leading-tight">
            Everything you need,<br className="hidden md:block" />
            <span className="text-brand-blue">delivered to your island.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            From classroom essentials to office upgrades, Bellevue Gifts has the widest selection in the Bahamas.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto sm:max-w-none">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-lg shadow-brand-blue/20" asChild>
              <Link href="/shop">Shop All Products</Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-white/80 backdrop-blur-sm" asChild>
              <Link href="/track-order">Track My Order</Link>
            </Button>
          </div>

          {/* Quick Category Chips */}
          <div className="mt-10 overflow-x-auto pb-4 -mx-4 px-4 flex gap-3 sm:justify-center no-scrollbar snap-x">
            <Link href="/shop?category=school-supplies" className="snap-start flex-shrink-0 bg-white border border-slate-200 rounded-full px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue transition-colors shadow-sm">
              📚 School Supplies
            </Link>
            <Link href="/shop?category=office-supplies" className="snap-start flex-shrink-0 bg-white border border-slate-200 rounded-full px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue transition-colors shadow-sm">
              💼 Office Needs
            </Link>
            <Link href="/shop?filter=sale" className="snap-start flex-shrink-0 bg-white border border-slate-200 rounded-full px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue transition-colors shadow-sm">
              🔥 On Sale
            </Link>
            <Link href="/electronics" className="snap-start flex-shrink-0 bg-white border border-slate-200 rounded-full px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue transition-colors shadow-sm">
              💻 Electronics
            </Link>
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-mint/20 rounded-full blur-3xl opacity-50 pointer-events-none z-1"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-brand-blue/10 rounded-full blur-3xl opacity-50 pointer-events-none z-1"></div>
      </section>

      {/* Value Propositions */}
      <section className="py-8 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="py-4 md:py-0 md:px-4 flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="h-10 w-10 bg-brand-blue/10 rounded-lg flex items-center justify-center text-brand-blue flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Huge Selection</h3>
                <p className="text-sm text-slate-600 mt-1">Over 5,000 office & school products.</p>
              </div>
            </div>
            <div className="py-4 md:py-0 md:px-4 flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="h-10 w-10 bg-brand-mint/20 rounded-lg flex items-center justify-center text-brand-blue flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 3a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Inter-Island Shipping</h3>
                <p className="text-sm text-slate-600 mt-1">Reliable delivery to Family Islands.</p>
              </div>
            </div>
            <div className="py-4 md:py-0 md:px-4 flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Need Help?</h3>
                <p className="text-sm text-slate-600 mt-1">Expert support for bulk orders.</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Featured Categories - 2 Rows of 4 */}
      <section className="py-12 section-padding border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Shop by Category</h2>
            <Link href="/categories" className="text-sm font-semibold text-brand-blue hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories?.slice(0, 8).map((category) => (
              <div key={category.id} className="min-w-0">
                <CategoryCard
                  category={category}
                  imageUrl={CATEGORY_IMAGES[category.slug] || 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals Slider - Clean, Auto-Sliding */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="py-16 bg-white overflow-hidden">
          <div className="container mx-auto px-4 relative group">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">New Arrivals</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={prevSlide} className="h-8 w-8 rounded-full border-slate-300">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextSlide} className="h-8 w-8 rounded-full border-slate-300">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Desktop Slider View */}
            <div className="overflow-hidden hidden md:block relative">
              <div
                className="flex transition-transform duration-500 ease-in-out gap-6"
                style={{ transform: `translateX(-${currentNewArrivalsIndex * 25}%)` }} // Move by 25% (1 item width) per index
              >
                {featuredProducts.map((product) => (
                  <div key={product.id} className="min-w-[calc(25%-18px)] flex-shrink-0">
                    <ProductCard product={product} />
                  </div>
                ))}
                {/* Duplicate first few for smooth infinite illusion if needed, but simple is fine for now */}
              </div>
            </div>

            {/* Mobile Scroll View (Default) */}
            <div className="flex md:hidden overflow-x-auto pb-6 -mx-4 px-4 gap-4 snap-x no-scrollbar">
              {featuredProducts.map((product) => (
                <div key={product.id} className="min-w-[260px] snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sale Items - Hot Deals */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="py-12 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                  🔥 Hot Deals in Bahamas
                </h2>
              </div>
              <Link href="/shop?filter=sale" className="text-sm font-semibold text-brand-blue hover:underline flex items-center gap-1">
                View Sale <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex overflow-x-auto pb-6 -mx-4 px-4 gap-4 md:grid md:grid-cols-4 md:gap-6 md:pb-0 md:mx-0 snap-x">
              {featuredProducts.map((product) => (
                <div key={product.id} className="min-w-[260px] md:min-w-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Promo - Stock Up */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="bg-brand-blue rounded-3xl p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between overflow-hidden relative shadow-2xl">
            <div className="relative z-10 max-w-lg">
              <h2 className="text-3xl font-bold text-white mb-4">Stock up for your Business or School?</h2>
              <p className="text-white/80 mb-8 text-lg">We offer special pricing for bulk orders and corporate accounts.</p>
              <Button size="lg" variant="secondary" className="font-semibold" asChild>
                <Link href="/contact">Get a Quote</Link>
              </Button>
            </div>
            {/* Abstract Shapes */}
            <div className="hidden md:block absolute right-0 bottom-0 h-64 w-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials Slider */}
      <section className="py-16 bg-brand-mint/10 border-b border-brand-mint/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-brand-blue mb-10">What our Customers Say</h2>
          <div className="flex overflow-x-auto gap-6 pb-8 snap-x no-scrollbar md:justify-center">
            {[
              { name: "Sarah J.", role: "Office Manager", quote: "Bellevue makes ordering supplies for our Freeport office incredibly easy. Delivery is always on time." },
              { name: "Michael T.", role: "High School Teacher", quote: "The best selection of school supplies in the Bahamas. My students love the quality." },
              { name: "David R.", role: "Local Business Owner", quote: "Responsive customer service and great bulk pricing. Highly recommended!" }
            ].map((t, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-sm text-left min-w-[300px] max-w-[350px] snap-center">
                <div className="flex gap-1 text-amber-400 mb-3">
                  {'★'.repeat(5)}
                </div>
                <p className="text-slate-700 italic mb-4">"{t.quote}"</p>
                <div>
                  <p className="font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Need Help Section - Blending into Footer */}
      <section className="py-16 bg-brand-mint/10 text-center -mt-px pt-0">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Need Help?</h2>
          <p className="text-slate-600 mb-8">
            Our team is here to assist you with product questions, bulk orders, or tracking your island delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-brand-blue text-white hover:bg-brand-blue/90" asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
            <Button variant="outline" size="lg" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50" asChild>
              <Link href="/faq">Visit FAQ Center</Link>
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-brand-blue/10 flex flex-col md:flex-row gap-6 justify-center text-sm text-slate-500">
            <a href="tel:+12423525555" className="flex items-center justify-center gap-2 hover:text-brand-blue">
              <span className="bg-white p-2 rounded-full shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg></span>
              +1 (242) 352-5555
            </a>
            <a href="mailto:info@bellevuegifts.com" className="flex items-center justify-center gap-2 hover:text-brand-blue">
              <span className="bg-white p-2 rounded-full shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg></span>
              info@bellevuegifts.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <StorefrontLayout>
      <PageMeta
        title="Bahamas' #1 Office, School &amp; Gift Supplier"
        description="Shop 5,000+ office supplies, school essentials, electronics, and gifts. Delivered island-wide across the Bahamas. Bulk orders welcome."
        canonical="https://bellevue.gifts/"
      />
      {content}
    </StorefrontLayout>
  );
}
