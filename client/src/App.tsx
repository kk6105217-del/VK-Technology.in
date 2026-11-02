import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation, Link, Navigate } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Common Components
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Customer & Public Pages
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoryPage } from './pages/CategoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AccountPage } from './pages/AccountPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { WishlistPage } from './pages/WishlistPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { ContactPage } from './pages/ContactPage';
import { AboutPage } from './pages/AboutPage';
import { LegalPolicyPage } from './pages/LegalPolicyPage';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminInventory } from './pages/admin/AdminInventory';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCoupons } from './pages/admin/AdminCoupons';
import { AdminBanners } from './pages/admin/AdminBanners';
import { AdminReviews } from './pages/admin/AdminReviews';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminUpiPayments } from './pages/admin/AdminUpiPayments';
import { AdminNotFoundPage } from './pages/admin/AdminNotFoundPage';

import { Cpu, Search, Home, HelpCircle } from 'lucide-react';

// Scroll to top helper on navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Storefront Wrapper Layout
const StoreLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 font-sans text-gray-900">
      <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
      <Navbar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />
      <main className="flex-1">
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  );
};

// 404 Not Found Page
const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm max-w-lg w-full text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
          <Cpu size={36} />
        </div>
        <h1 className="text-2xl font-black text-gray-900">404 - Page Not Found</h1>
        <p className="text-xs text-gray-600 leading-relaxed">
          The DIY electronics page or product kit you are looking for does not exist or has been moved to a new section.
        </p>
        <div className="pt-2 flex flex-wrap gap-2 justify-center text-xs">
          <Link
            to="/"
            className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-2 rounded shadow-sm flex items-center gap-1.5"
          >
            <Home size={14} /> Back to Homepage
          </Link>
          <Link
            to="/products"
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded flex items-center gap-1.5"
          >
            <Search size={14} /> Browse Catalog
          </Link>
          <Link
            to="/contact"
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-4 py-2 rounded flex items-center gap-1.5"
          >
            <HelpCircle size={14} /> Help & Support
          </Link>
        </div>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ScrollToTop />
              <Routes>
                {/* Standalone Authentication Routes (Clean Amazon-style, no storefront header/footer/admin options) */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Dedicated Admin Portal Routes (Prioritized before Storefront) */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="inventory" element={<AdminInventory />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="upi-payments" element={<AdminUpiPayments />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="banners" element={<AdminBanners />} />
                  <Route path="reviews" element={<AdminReviews />} />
                  <Route path="reports" element={<AdminReports />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="*" element={<AdminNotFoundPage />} />
                </Route>

                {/* Storefront Layout & Customer Routes */}
                <Route path="/" element={<StoreLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="category/:slug" element={<CategoryPage />} />
                  <Route path="product/:slug" element={<ProductDetailPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="checkout" element={<CheckoutPage />} />

                  {/* Account & Orders */}
                  <Route path="account" element={<AccountPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:id" element={<OrderDetailPage />} />
                  <Route path="wishlist" element={<WishlistPage />} />
                  <Route path="track-order" element={<TrackOrderPage />} />

                  {/* Informational & Legal */}
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="policies" element={<LegalPolicyPage />} />
                  <Route path="policy/:type" element={<LegalPolicyPage />} />
                </Route>

                {/* Catch-all 404 for Unknown Storefront Routes */}
                <Route
                  path="*"
                  element={
                    <StoreLayout>
                      <NotFoundPage />
                    </StoreLayout>
                  }
                />
              </Routes>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
