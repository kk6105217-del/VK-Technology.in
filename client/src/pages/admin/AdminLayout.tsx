import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  ShoppingBag,
  Tag,
  Image as ImageIcon,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Menu,
  X,
  User,
  QrCode
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If loading auth state, show clean spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mx-auto" />
          <p className="text-xs text-gray-400 font-mono">Verifying admin credentials...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to /admin/login immediately
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  // If logged in as customer (not admin), explicitly deny access
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-left">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center space-y-4 border border-red-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Admin Privileges Required</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            You are signed in as <strong className="text-gray-900">{user.email}</strong>. Customer accounts do not have administrative access to the store management control center.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                logout();
                navigate('/admin/login', { replace: true });
              }}
              className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-6 py-2.5 rounded text-xs shadow transition"
            >
              Log in with Admin Account
            </button>
            <Link
              to="/"
              className="text-xs text-gray-600 hover:text-gray-900 font-semibold py-1 transition"
            >
              ← Return to Customer Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Products', path: '/admin/products', icon: Package },
    { name: 'Categories', path: '/admin/categories', icon: Layers },
    { name: 'Inventory & Stock', path: '/admin/inventory', icon: Boxes },
    { name: 'Customer Orders', path: '/admin/orders', icon: ShoppingBag },
    { name: 'UPI Payments', path: '/admin/upi-payments', icon: QrCode },
    { name: 'Coupons & Discounts', path: '/admin/coupons', icon: Tag },
    { name: 'Homepage Banners', path: '/admin/banners', icon: ImageIcon },
    { name: 'Review Moderation', path: '/admin/reviews', icon: MessageSquare },
    { name: 'Sales Reports & CSV', path: '/admin/reports', icon: BarChart3 },
    { name: 'Store & Shipping Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col text-left">
      {/* Top Admin Navbar */}
      <header className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-1.5 hover:bg-gray-800 rounded text-gray-300"
          >
            <Menu size={22} />
          </button>

          <Link to="/admin" className="flex items-center space-x-2.5">
            <img
              src="/logo.png"
              alt="VK Technology Logo"
              className="w-8 h-8 rounded-full bg-white p-0.5 object-contain shadow"
            />
            <span className="font-extrabold text-base tracking-tight">
              VK <span className="text-amber-400 font-bold">ADMIN</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          <Link
            to="/"
            target="_blank"
            className="hidden sm:flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-gray-200 transition"
          >
            <span>Live Storefront</span>
            <ExternalLink size={12} />
          </Link>

          <div className="flex items-center space-x-2 border-l border-gray-700 pl-4">
            <div className="text-right hidden sm:block">
              <span className="block font-bold text-gray-200">{user.full_name}</span>
              <span className="text-[10px] text-amber-400 font-mono">{user.email}</span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/admin/login');
              }}
              className="p-1.5 bg-gray-800 hover:bg-red-900/60 hover:text-red-300 rounded text-gray-400 transition"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body with Sidebar */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col justify-between p-4 shrink-0">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2 block">
              Store Control Center
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/admin/dashboard'
                  ? location.pathname === '/admin' || location.pathname === '/admin/dashboard'
                  : location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-400 text-gray-950 font-bold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-gray-950' : 'text-gray-500'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1 px-2">
            <p className="font-semibold text-gray-800">VK Technology Hub</p>
            <p className="text-[11px]">India</p>
            <p className="text-[10px] text-gray-400">Server Status: Online (Port 5000)</p>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-72 bg-white h-full p-4 flex flex-col justify-between z-10 animate-in slide-in-from-left">
              <div className="space-y-1">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                  <span className="font-bold text-sm text-gray-900">Admin Menu</span>
                  <button onClick={() => setMobileSidebarOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === '/admin/dashboard'
                      ? location.pathname === '/admin' || location.pathname === '/admin/dashboard'
                      : location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold ${
                        isActive ? 'bg-amber-400 text-gray-950 font-bold' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={17} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Routed Outlet Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
