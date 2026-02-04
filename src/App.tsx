import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { StorefrontLayout } from "@/components/layout/StorefrontLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AccountLayout } from "@/components/account/AccountLayout";
import { DemoRoleSwitcher } from "@/components/DemoRoleSwitcher";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import OrderPage from "./pages/OrderPage";
import LoginPage from "./pages/LoginPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import POSPage from "./pages/POSPage";
import NotFound from "./pages/NotFound";
import ShopPage from "./pages/ShopPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import GiftCardsPage from "./pages/GiftCardsPage";
import GiftCardsBalancePage from "./pages/GiftCardsBalancePage";
import ReturnsPage from "./pages/ReturnsPage";
import ShippingPage from "./pages/ShippingPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import RepairPage from "./pages/RepairPage";

// Account pages
import AccountLoginPage from "./pages/account/AccountLoginPage";
import AccountRegisterPage from "./pages/account/AccountRegisterPage";
import AccountForgotPasswordPage from "./pages/account/AccountForgotPasswordPage";
import AccountDashboardPage from "./pages/account/AccountDashboardPage";
import AccountOrdersPage from "./pages/account/AccountOrdersPage";
import AccountOrderDetailPage from "./pages/account/AccountOrderDetailPage";
import AccountTrackingPage from "./pages/account/AccountTrackingPage";
import AccountAddressesPage from "./pages/account/AccountAddressesPage";
import AccountWishlistPage from "./pages/account/AccountWishlistPage";
import AccountGiftCardsPage from "./pages/account/AccountGiftCardsPage";
import AccountSettingsPage from "./pages/account/AccountSettingsPage";

// Admin pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminDiscounts from "./pages/admin/AdminDiscounts";
import AdminReports from "./pages/admin/AdminReports";
import AdminRepairTickets from "./pages/admin/AdminRepairTickets";
import AdminGiftCards from "./pages/admin/AdminGiftCards";
import NotAuthorizedPage from "./pages/NotAuthorizedPage";

// Kiosk entry points for demo
import CashierKiosk from "./pages/kiosk/CashierKiosk";
import WarehouseKiosk from "./pages/kiosk/WarehouseKiosk";
import AdminKiosk from "./pages/kiosk/AdminKiosk";

// Debug pages
import SupabaseStatus from "./pages/debug/SupabaseStatus";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CustomerAuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <DemoRoleSwitcher />
              <Routes>
                {/* Storefront Routes */}
                <Route element={<StorefrontLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/product/:slug" element={<ProductPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/checkout/success/:id" element={<CheckoutSuccessPage />} />
                  <Route path="/order/:id" element={<OrderPage />} />
                  <Route path="/order/track" element={<TrackOrderPage />} />
                  <Route path="/sale" element={<CategoryPage />} />
                  <Route path="/search" element={<ShopPage />} />
                  <Route path="/gift-cards" element={<GiftCardsPage />} />
                  <Route path="/gift-cards/balance" element={<GiftCardsBalancePage />} />
                  <Route path="/returns" element={<ReturnsPage />} />
                  <Route path="/shipping" element={<ShippingPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/repair" element={<RepairPage />} />
                </Route>

                {/* Customer Auth Routes */}
                <Route path="/account/login" element={<AccountLoginPage />} />
                <Route path="/account/register" element={<AccountRegisterPage />} />
                <Route path="/account/forgot-password" element={<AccountForgotPasswordPage />} />

                {/* Customer Account Portal */}
                <Route path="/account" element={<AccountLayout />}>
                  <Route index element={<AccountDashboardPage />} />
                  <Route path="orders" element={<AccountOrdersPage />} />
                  <Route path="orders/:orderNumber" element={<AccountOrderDetailPage />} />
                  <Route path="tracking" element={<AccountTrackingPage />} />
                  <Route path="addresses" element={<AccountAddressesPage />} />
                  <Route path="wishlist" element={<AccountWishlistPage />} />
                  <Route path="gift-cards" element={<AccountGiftCardsPage />} />
                  <Route path="settings" element={<AccountSettingsPage />} />
                </Route>

                {/* Staff Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/staff/login" element={<StaffLoginPage />} />

                {/* Kiosk Entry Routes (Demo Mode) */}
                <Route path="/pos/kiosk" element={<CashierKiosk />} />
                <Route path="/warehouse/kiosk" element={<WarehouseKiosk />} />
                <Route path="/admin/kiosk" element={<AdminKiosk />} />

                {/* Debug Routes */}
                <Route path="/debug/supabase" element={<SupabaseStatus />} />

                {/* POS Route */}
                <Route path="/pos" element={<POSPage />} />

                {/* Not Authorized page for cashiers trying to access admin */}
                <Route path="/not-authorized" element={<NotAuthorizedPage />} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverview />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="inventory" element={<AdminInventory />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="repair-tickets" element={<AdminRepairTickets />} />
                  <Route path="gift-cards" element={<AdminGiftCards />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="staff" element={<AdminStaff />} />
                  <Route path="discounts" element={<AdminDiscounts />} />
                  <Route path="reports" element={<AdminReports />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
