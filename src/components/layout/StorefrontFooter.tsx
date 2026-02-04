import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram } from 'lucide-react';
import { STORE_INFO } from '@/lib/constants';
import bellevueLogo from '@/assets/bellevue-logo.webp';

export function StorefrontFooter() {
  return (
    <footer className="bg-header text-header-foreground mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company info */}
          <div>
            <img 
              src={bellevueLogo} 
              alt="Bellevue Gifts & Supplies Ltd." 
              className="h-10 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-sm opacity-80 mt-4">
              Your one-stop shop for school supplies, office essentials, gifts, and more in Grand Bahama.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/category/school-supplies" className="opacity-80 hover:opacity-100">School Supplies</Link></li>
              <li><Link to="/category/office-supplies" className="opacity-80 hover:opacity-100">Office Supplies</Link></li>
              <li><Link to="/category/gifts-souvenirs" className="opacity-80 hover:opacity-100">Gifts & Souvenirs</Link></li>
              <li><Link to="/sale" className="opacity-80 hover:opacity-100">Sale Items</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/contact" className="opacity-80 hover:opacity-100">Contact Us</Link></li>
              <li><Link to="/shipping" className="opacity-80 hover:opacity-100">Shipping Information</Link></li>
              <li><Link to="/returns" className="opacity-80 hover:opacity-100">Returns & Refunds</Link></li>
              <li><Link to="/faq" className="opacity-80 hover:opacity-100">FAQs</Link></li>
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 opacity-80" />
                <span className="opacity-80">{STORE_INFO.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 opacity-80" />
                <span className="opacity-80">{STORE_INFO.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 opacity-80" />
                <span className="opacity-80">{STORE_INFO.email}</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 opacity-80" />
                <span className="opacity-80">Mon-Sat: {STORE_INFO.hours}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm opacity-60">
          <p>© {new Date().getFullYear()} Bellevue Gifts & Supplies Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
