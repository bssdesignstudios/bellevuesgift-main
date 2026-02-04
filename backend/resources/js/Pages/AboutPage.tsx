import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { Building, Users, Award, Heart, MapPin, ArrowRight } from 'lucide-react';
import { STORE_INFO } from '@/lib/constants';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';

export default function AboutPage() {
  const content = (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About Bellevue</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            {STORE_INFO.tagline}
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Our Story</h2>
              <p className="text-muted-foreground mb-4">
                Bellevue Gifts & Supplies Ltd. has been serving the Freeport community and
                the wider Bahamas for over two decades. What started as a small stationery
                shop has grown into the island's premier destination for school supplies,
                office equipment, gifts, and home essentials.
              </p>
              <p className="text-muted-foreground">
                Our commitment to quality products and exceptional customer service has
                made us the trusted choice for families, businesses, and institutions
                across Grand Bahama and beyond.
              </p>
            </div>
            <div className="bg-muted rounded-lg aspect-square flex items-center justify-center">
              <Building className="h-24 w-24 text-muted-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <Award className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Quality</h3>
                <p className="text-muted-foreground">
                  We carefully select every product to ensure durability,
                  functionality, and value for our customers.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Service</h3>
                <p className="text-muted-foreground">
                  Our friendly and knowledgeable staff are here to help you
                  find exactly what you need.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Heart className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Community</h3>
                <p className="text-muted-foreground">
                  We're proud to support local schools, businesses, and
                  community organizations across the Bahamas.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <MapPin className="h-12 w-12 mx-auto text-primary mb-4" />
            <h2 className="text-3xl font-bold mb-4">Visit Our Store</h2>
            <p className="text-muted-foreground">
              We're located in the heart of Freeport, Grand Bahama
            </p>
          </div>

          <Card>
            <CardContent className="py-8">
              <div className="grid md:grid-cols-2 gap-8 text-center md:text-left">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{STORE_INFO.name}</h3>
                  <p className="text-muted-foreground">{STORE_INFO.address}</p>
                  <p className="text-muted-foreground mt-4">{STORE_INFO.phone}</p>
                  <p className="text-muted-foreground">{STORE_INFO.email}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Store Hours</h3>
                  <p className="text-muted-foreground">Monday - Friday: 8:00 AM - 5:00 PM</p>
                  <p className="text-muted-foreground">Saturday: 9:00 AM - 3:00 PM</p>
                  <p className="text-muted-foreground">Sunday: Closed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Shop?</h2>
          <p className="text-xl opacity-90 mb-8">
            Browse our wide selection of supplies for school, office, and home.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/shop">
              Start Shopping <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );

  return (
    <StorefrontLayout>
      {content}
    </StorefrontLayout>
  );
}
