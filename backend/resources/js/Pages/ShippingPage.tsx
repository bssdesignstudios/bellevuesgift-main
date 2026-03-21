import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, Truck, MapPin, Clock, Package } from 'lucide-react';
import { BAHAMIAN_ISLANDS, STORE_INFO } from '@/lib/constants';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';
import { PageMeta } from '@/components/PageMeta';

export default function ShippingPage() {
  const content = (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Shipping & Delivery</h1>
        <p className="text-xl text-muted-foreground">
          We deliver across all Bahamian islands
        </p>
      </div>

      {/* Delivery Options */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="border-primary">
          <CardHeader>
            <MapPin className="h-8 w-8 text-primary mb-2" />
            <CardTitle>In-Store Pickup</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Order online and pick up at our Freeport store. Usually ready within 2-4 hours.
            </p>
            <p className="font-semibold text-lg text-primary">FREE</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Truck className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Island Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Fast delivery to Grand Bahama and New Providence. Typically 1-3 business days.
            </p>
            <p className="font-semibold text-lg">From $10</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Ship className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Mailboat Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Reliable shipping to all Family Islands via mailboat service. 3-7 business days.
            </p>
            <p className="font-semibold text-lg">From $15</p>
          </CardContent>
        </Card>
      </div>

      {/* Islands We Serve */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Islands We Serve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {BAHAMIAN_ISLANDS.map((island) => (
              <div key={island} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                {island}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mailboat Info */}
      <Card className="mb-8 bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            About Mailboat Delivery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Mailboat is the traditional and most reliable way to ship goods between Bahamian islands.
            Our packages travel on regular mailboat routes from Nassau to all Family Islands.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Estimated Transit Times</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Abaco, Eleuthera: 2-3 days</li>
                <li>• Exuma, Andros: 3-4 days</li>
                <li>• Long Island, Cat Island: 4-5 days</li>
                <li>• Southern Islands: 5-7 days</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">What to Expect</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Tracking provided once shipped</li>
                <li>• Pickup at local dock or port</li>
                <li>• Secure packaging for all items</li>
                <li>• Contact us for special handling</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pickup Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">{STORE_INFO.name}</h4>
              <p className="text-muted-foreground">{STORE_INFO.address}</p>
              <p className="text-muted-foreground">{STORE_INFO.phone}</p>
              <p className="text-muted-foreground">{STORE_INFO.email}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Store Hours</h4>
              <p className="text-muted-foreground">Monday - Friday: 8:00 AM - 5:00 PM</p>
              <p className="text-muted-foreground">Saturday: 9:00 AM - 3:00 PM</p>
              <p className="text-muted-foreground">Sunday: Closed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <StorefrontLayout>
      <PageMeta
        title="Shipping &amp; Delivery"
        description="Learn about our inter-island shipping options, delivery times, and rates across the Bahamas. Same-day pickup available in Freeport."
        canonical="https://bellevue.gifts/shipping"
      />
      {content}
    </StorefrontLayout>
  );
}
