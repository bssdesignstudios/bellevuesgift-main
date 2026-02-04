import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Package, RotateCcw, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function ReturnsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Returns & Exchanges</h1>
        <p className="text-xl text-muted-foreground">
          We want you to be completely satisfied with your purchase
        </p>
      </div>

      {/* Key Points */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-10 w-10 mx-auto text-primary mb-3" />
            <h3 className="font-semibold mb-2">30-Day Returns</h3>
            <p className="text-sm text-muted-foreground">
              Return most items within 30 days of purchase
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="h-10 w-10 mx-auto text-primary mb-3" />
            <h3 className="font-semibold mb-2">Original Packaging</h3>
            <p className="text-sm text-muted-foreground">
              Items must be unused and in original packaging
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <RotateCcw className="h-10 w-10 mx-auto text-primary mb-3" />
            <h3 className="font-semibold mb-2">Easy Exchanges</h3>
            <p className="text-sm text-muted-foreground">
              Swap for a different size, color, or product
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Policy Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Return Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Eligible for Return
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-7">
              <li>Unused items in original packaging</li>
              <li>Items purchased within the last 30 days</li>
              <li>Items with original receipt or order confirmation</li>
              <li>Defective or damaged items (report within 48 hours)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Not Eligible for Return
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-7">
              <li>Opened software or digital products</li>
              <li>Personalized or custom items</li>
              <li>Gift cards</li>
              <li>Clearance items marked "Final Sale"</li>
              <li>Items damaged through misuse</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How to Return</h3>
            <ol className="list-decimal list-inside text-muted-foreground space-y-2 ml-2">
              <li>Bring the item(s) to our Freeport store with your receipt</li>
              <li>Our staff will inspect the item and process your return</li>
              <li>Refunds are issued to the original payment method</li>
              <li>For mailboat deliveries, contact us to arrange return shipping</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <div className="bg-muted/50 rounded-lg p-6 text-center">
        <h3 className="font-semibold mb-2">Questions about returns?</h3>
        <p className="text-muted-foreground mb-4">
          Contact our customer service team for assistance
        </p>
        <Button asChild>
          <Link to="/contact">
            Contact Us <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
