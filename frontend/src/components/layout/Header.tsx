import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cpu,
  Search,
  ShoppingCart,
  Heart,
  User as UserIcon,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Package,
  ChevronDown,
  Flame,
  ShieldCheck,
  HelpCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isOwner, logout } = useAuth();
  const { totalItems, subtotalPaise } = useCart();
  const { wishlistIds } = useWishlist();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => localStorage.getItem('vk_language') || 'en');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (selectedCategory) params.append('category', selectedCategory);
    navigate(`/shop${params.toString() ? `?${params.toString()}` : ''}`);
    setMobileMenuOpen(false);
  };

  const categories = [
    { name: 'All Categories', slug: '' },
    { name: 'DIY Project Kits', slug: 'diy-tech-projects' },
    { name: 'Arduino & IoT', slug: 'arduino-boards-and-kits' },
    { name: 'ESP32 Modules', slug: 'esp32-and-iot-modules' },
    { name: 'Sensors & Components', slug: 'sensors-and-electronic-components' },
    { name: 'Robotics & Motor Drivers', slug: 'robotics-and-motor-drivers' },
    { name: 'Drone Components', slug: 'drone-components' },
    { name: 'Raspberry Pi Systems', slug: 'raspberry-pi-and-embedded-systems' },
    { name: 'PCB & Prototyping', slug: 'pcb-and-prototyping' },
    { name: 'STEM Educational Kits', slug: 'stem-and-educational-kits' },
    { name: 'Cables & Accessories', slug: 'cables-connectors-and-accessories' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full shadow-md font-sans">
        {/* Row 1: Amazon-Style Main Dark Navy Header */}
        <div className="bg-[#131921] text-white px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-1.5 p-1 rounded hover:outline hover:outline-1 hover:outline-white transition-all flex-shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-sm">
              <Cpu size={20} />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-base tracking-tight block">
                VK <span className="text-cyan-400">TECHNOLOGY</span>
                <span className="text-[10px] text-amber-400 font-bold ml-0.5">.in</span>
              </span>
              <span className="text-[9px] text-slate-300 font-mono uppercase tracking-widest block -mt-0.5">
                DIY TECH & IoT
              </span>
            </div>
          </Link>

          {/* Amazon-Style Search Bar with Category Dropdown */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-3xl flex items-center h-10 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-amber-400 mx-1 sm:mx-2"
          >
            {/* Category Dropdown Pill */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="hidden md:block h-full bg-slate-100 text-slate-700 text-xs font-medium px-2.5 border-r border-slate-300 hover:bg-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search Arduino, ESP32, sensors, robotics kits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none h-full"
            />

            {/* Amber Search Button */}
            <button
              type="submit"
              className="h-full px-5 bg-[#febd69] hover:bg-[#f3a847] active:bg-[#e29432] text-slate-900 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Search products"
            >
              <Search size={20} className="stroke-[2.5]" />
            </button>
          </form>

          {/* Right Header Navigation Icons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 text-xs">
            {/* Country / Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="hidden xl:flex items-center gap-1.5 p-1.5 rounded hover:outline hover:outline-1 hover:outline-white cursor-pointer transition-all text-left"
                title="Select Language & Currency"
              >
                <span className="text-base leading-none">🇮🇳</span>
                <span className="font-bold text-xs uppercase text-white flex items-center gap-0.5">
                  {currentLang.toUpperCase()} <ChevronDown size={11} className="text-slate-400" />
                </span>
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white text-slate-900 border border-slate-200 rounded-lg shadow-xl py-2 z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-600">
                    Language Settings
                  </div>
                  {[
                    { code: 'en', name: 'English - EN' },
                    { code: 'hi', name: 'हिन्दी - HI' },
                    { code: 'te', name: 'తెలుగు - TE' },
                  ].map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setCurrentLang(l.code);
                        localStorage.setItem('vk_language', l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                        currentLang === l.code ? 'font-bold text-cyan-700 bg-cyan-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>{l.name}</span>
                      {currentLang === l.code && <span className="text-cyan-700 text-xs">✓</span>}
                    </button>
                  ))}
                  <div className="px-3 py-1 border-t border-slate-100 mt-1 text-[10px] text-slate-400">
                    Currency: <span className="font-bold text-slate-700">INR (₹)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Account & Lists */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex flex-col items-start p-1.5 rounded hover:outline hover:outline-1 hover:outline-white transition-all text-left"
              >
                <span className="text-[11px] text-slate-300 font-normal leading-none">
                  Hello, {user ? user.name.split(' ')[0] : 'sign in'}
                </span>
                <span className="font-bold text-xs flex items-center gap-0.5 leading-tight mt-0.5">
                  Account & Lists <ChevronDown size={12} className="text-slate-400" />
                </span>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white text-slate-900 border border-slate-200 rounded-lg shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 pb-3 border-b border-slate-100">
                    {isAuthenticated ? (
                      <div>
                        <p className="text-xs text-slate-500">Your Account</p>
                        <p className="font-bold text-sm text-slate-900 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Link
                          to="/login"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full block py-2 bg-[#ffd814] hover:bg-[#f7ca00] text-slate-900 font-bold rounded-lg text-xs shadow-xs"
                        >
                          Sign In
                        </Link>
                        <p className="text-[11px] text-slate-500 mt-2">
                          New customer?{' '}
                          <Link
                            to="/register"
                            onClick={() => setUserDropdownOpen(false)}
                            className="text-cyan-700 hover:underline font-semibold"
                          >
                            Start here.
                          </Link>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="py-1 text-xs">
                    {isOwner && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 font-bold text-cyan-800 bg-cyan-50/70 hover:bg-cyan-100"
                      >
                        <LayoutDashboard size={15} />
                        Owner Console (Karthik)
                      </Link>
                    )}
                    <Link
                      to="/account"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <UserIcon size={15} /> Your Account
                    </Link>
                    <Link
                      to="/account?tab=orders"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <Package size={15} /> Your Orders
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <Heart size={15} /> Your Wishlist ({wishlistIds.size})
                    </Link>
                  </div>

                  {isAuthenticated && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                          navigate('/');
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Returns & Orders */}
            <Link
              to={isAuthenticated ? '/account?tab=orders' : '/login'}
              className="hidden md:flex flex-col items-start p-1.5 rounded hover:outline hover:outline-1 hover:outline-white transition-all text-left"
            >
              <span className="text-[11px] text-slate-300 font-normal leading-none">Returns</span>
              <span className="font-bold text-xs leading-tight mt-0.5">& Orders</span>
            </Link>

            {/* Shopping Cart (Amazon Style) */}
            <Link
              to="/cart"
              className="flex items-end gap-1 p-1.5 rounded hover:outline hover:outline-1 hover:outline-white transition-all"
              title="Shopping Cart"
            >
              <div className="relative flex items-center">
                <ShoppingCart size={28} className="text-white" />
                <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1 text-amber-400 font-extrabold text-xs font-mono">
                  {totalItems}
                </span>
              </div>
              <span className="font-bold text-xs hidden sm:inline leading-none mb-1">
                Cart
              </span>
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded hover:outline hover:outline-1 hover:outline-white text-white"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Category Bar (Amazon Style) */}
        <div className="bg-[#232f3e] text-slate-100 text-xs px-3 sm:px-4 py-1.5 flex items-center justify-between overflow-x-auto no-scrollbar gap-4">
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* "All Categories" Drawer Trigger */}
            <button
              onClick={() => setSideDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded font-bold hover:outline hover:outline-1 hover:outline-white transition-all text-white flex-shrink-0"
            >
              <Menu size={16} />
              <span>All Categories</span>
            </button>

            {/* Exact Navigation Links in Specified Order */}
            <Link to="/categories/diy-tech-projects" className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white whitespace-nowrap font-medium">
              DIY Tech Projects
            </Link>
            <Link
              to="/shop?sale=true"
              className="flex items-center gap-1 px-2 py-1 rounded text-amber-300 font-bold hover:outline hover:outline-1 hover:outline-white whitespace-nowrap"
            >
              <Flame size={13} className="fill-amber-400 text-amber-400" />
              <span>Today's Deals</span>
            </Link>
            <Link to="/categories/arduino-boards-and-kits" className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white whitespace-nowrap">
              Arduino & ESP32
            </Link>
            <Link to="/categories/sensors-and-electronic-components" className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white whitespace-nowrap">
              Sensors & IoT
            </Link>
            <Link to="/categories/robotics-and-motor-drivers" className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white whitespace-nowrap">
              Robotics
            </Link>
            <Link to="/categories/drone-components" className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white whitespace-nowrap">
              Drone Components
            </Link>
            <Link to="/categories/pcb-and-prototyping" className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white whitespace-nowrap">
              PCB & Prototyping
            </Link>
            <Link to="/categories/stem-and-educational-kits" className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white whitespace-nowrap">
              Educational Kits
            </Link>
            <Link to="/shop?sort=newest" className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white whitespace-nowrap">
              New Arrivals
            </Link>
            <Link to="/contact" className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white whitespace-nowrap">
              Customer Support
            </Link>
          </div>

          {/* Right Highlight Promotional Strip */}
          <div className="hidden lg:flex items-center gap-3 text-slate-300 text-[11px] flex-shrink-0">
            <span className="font-semibold text-cyan-300">⚡ Free Delivery above ₹999</span>
            <span>|</span>
            <span className="font-semibold text-amber-300">Cash on Delivery (COD)</span>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#131921] border-t border-slate-700 px-4 py-3 space-y-3 text-xs text-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <span className="font-bold text-white">Location: {city} ({pincode})</span>
              <button
                onClick={() => {
                  setShowPincodeModal(true);
                  setMobileMenuOpen(false);
                }}
                className="text-cyan-400 underline font-semibold"
              >
                Change
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-medium">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to={c.slug ? `/categories/${c.slug}` : '/shop'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 px-2 bg-slate-800 rounded hover:bg-slate-700"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Side Slide-Over Drawer for "☰ All" Categories */}
      {sideDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSideDrawerOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="relative w-80 max-w-full bg-white text-slate-900 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="bg-[#232f3e] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon size={20} className="text-slate-300" />
                <span className="font-bold text-base">
                  Hello, {user ? user.name : 'Sign in'}
                </span>
              </div>
              <button
                onClick={() => setSideDrawerOpen(false)}
                className="p-1 hover:bg-slate-700 rounded text-slate-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer List */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] px-3 mb-2 font-mono">
                  Shop by Hardware Category
                </h4>
                <div className="space-y-0.5">
                  {categories.slice(1).map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/categories/${cat.slug}`}
                      onClick={() => setSideDrawerOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-100 text-slate-700 font-medium"
                    >
                      <span>{cat.name}</span>
                      <span className="text-slate-400">›</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] px-3 mb-2 font-mono">
                  Programs & Deals
                </h4>
                <div className="space-y-0.5">
                  <Link
                    to="/shop?sale=true"
                    onClick={() => setSideDrawerOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 text-amber-700 font-bold"
                  >
                    <Flame size={15} className="fill-amber-500 text-amber-500" />
                    <span>Today's Electronics Deals</span>
                  </Link>
                  <Link
                    to="/shop?sort=bestselling"
                    onClick={() => setSideDrawerOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 text-slate-700 font-medium"
                  >
                    <Sparkles size={15} className="text-cyan-600" />
                    <span>Bestsellers in DIY Tech</span>
                  </Link>
                  <Link
                    to="/track-order"
                    onClick={() => setSideDrawerOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 text-slate-700 font-medium"
                  >
                    <Package size={15} />
                    <span>Track Your Package</span>
                  </Link>
                </div>
              </div>

              {isOwner && (
                <div className="pt-3 border-t border-slate-200">
                  <h4 className="font-bold text-cyan-800 uppercase tracking-wider text-[11px] px-3 mb-2 font-mono">
                    Owner Administration
                  </h4>
                  <Link
                    to="/admin"
                    onClick={() => setSideDrawerOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-cyan-50 text-cyan-900 font-bold"
                  >
                    <LayoutDashboard size={15} />
                    <span>VK Technology Owner Dashboard</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
