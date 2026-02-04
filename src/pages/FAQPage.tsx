import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, HelpCircle, ArrowRight } from 'lucide-react';

const faqCategories = [
  {
    title: 'Orders & Shipping',
    items: [
      {
        question: 'How do I track my order?',
        answer: 'You can track your order by visiting the Order Tracking page and entering your order number or pickup code. You\'ll receive tracking information via email once your order ships.'
      },
      {
        question: 'What shipping options are available?',
        answer: 'We offer three shipping options: In-Store Pickup (free), Island Delivery (for Grand Bahama and New Providence), and Mailboat Delivery (for all Family Islands). Shipping costs depend on your location and order size.'
      },
      {
        question: 'How long does mailboat delivery take?',
        answer: 'Mailboat delivery typically takes 3-7 business days depending on your island. Closer islands like Abaco and Eleuthera usually receive orders in 2-3 days, while more distant islands may take up to a week.'
      },
      {
        question: 'Can I pick up my order at the store?',
        answer: 'Yes! Select "In-Store Pickup" at checkout. We\'ll notify you when your order is ready (usually within 2-4 hours). Bring your pickup code or order confirmation to collect your items.'
      }
    ]
  },
  {
    title: 'Payments & Pricing',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept cash, credit/debit cards (Visa, MasterCard), and gift cards. For in-store pickup orders, you can also choose to pay when you collect your items.'
      },
      {
        question: 'Do you charge VAT?',
        answer: 'Yes, all prices are subject to 10% VAT as required by Bahamian law. VAT is calculated on your subtotal and shown at checkout before you complete your order.'
      },
      {
        question: 'Can I use multiple gift cards on one order?',
        answer: 'Currently, you can use one gift card per order. The remaining balance can be used on future purchases. Gift card balances never expire.'
      }
    ]
  },
  {
    title: 'Returns & Refunds',
    items: [
      {
        question: 'What is your return policy?',
        answer: 'We accept returns within 30 days of purchase for unused items in original packaging with receipt. Some items like opened software, personalized items, and clearance items marked "Final Sale" cannot be returned.'
      },
      {
        question: 'How do I return an item?',
        answer: 'Bring the item to our Freeport store with your receipt or order confirmation. For mailboat orders, contact us to arrange return shipping. Refunds are processed to your original payment method.'
      },
      {
        question: 'How long do refunds take?',
        answer: 'Cash refunds are immediate. Card refunds typically appear on your statement within 5-10 business days, depending on your bank.'
      }
    ]
  },
  {
    title: 'Account & Orders',
    items: [
      {
        question: 'Do I need an account to place an order?',
        answer: 'No, you can checkout as a guest. However, creating an account lets you track orders, save addresses, create wishlists, and enjoy a faster checkout experience.'
      },
      {
        question: 'How do I check my order history?',
        answer: 'Log in to your account and visit the "Orders" section in My Account. You\'ll see all your past orders, their status, and can view detailed order information.'
      },
      {
        question: 'Can I cancel or modify my order?',
        answer: 'If your order hasn\'t been processed yet, contact us immediately to request changes. Once an order is being prepared or has shipped, we cannot modify it, but you can return items after receiving them.'
      }
    ]
  }
];

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    items: category.items.filter(
      item =>
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <div className="text-center mb-12">
        <HelpCircle className="h-12 w-12 mx-auto text-primary mb-4" />
        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-xl text-muted-foreground">
          Find answers to common questions about shopping at Bellevue
        </p>
      </div>

      {/* Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* FAQ Sections */}
      {filteredCategories.length > 0 ? (
        <div className="space-y-8">
          {filteredCategories.map((category) => (
            <div key={category.title}>
              <h2 className="text-xl font-semibold mb-4">{category.title}</h2>
              <Card>
                <CardContent className="pt-2">
                  <Accordion type="single" collapsible>
                    {category.items.map((item, index) => (
                      <AccordionItem key={index} value={`${category.title}-${index}`}>
                        <AccordionTrigger className="text-left">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No results found for "{searchTerm}"
          </p>
          <Button variant="outline" onClick={() => setSearchTerm('')}>
            Clear Search
          </Button>
        </div>
      )}

      {/* Still Need Help */}
      <Card className="mt-12 bg-muted/50">
        <CardContent className="py-8 text-center">
          <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-4">
            Our customer service team is here to help
          </p>
          <Button asChild>
            <Link to="/contact">
              Contact Us <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
