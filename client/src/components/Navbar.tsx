import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Cpu,
  Wifi,
  Terminal,
  Globe,
  Activity,
  Bot,
  Navigation,
  Zap,
  Layers,
  Wrench,
  BatteryCharging,
  Radio,
  Brain,
  BookOpen,
  Link as LinkIcon,
  Sparkles,
  Percent,
  ChevronRight,
  ShieldCheck,
  User,
  Package
} from 'lucide-react';
import { Category } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Helper icon resolver
export function getCategoryIcon(iconName?: string | null, size: number = 18) {
  switch (iconName) {
    case 'Cpu': return <Cpu size={size} />;
    case 'Wifi': return <Wifi size={size} />;
    case 'Terminal': return <Terminal size={size} />;
    case 'Globe': return <Globe size={size} />;
    case 'Activity': return <Activity size={size} />;
    case 'Bot': return <Bot size={size} />;
    case 'Navigation': return <Navigation size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Layers': return <Layers size={size} />;
    case 'Wrench': return <Wrench size={size} />;
    case 'BatteryCharging': return <BatteryCharging size={size} />;
    case 'Radio': return <Radio size={size} />;
    case 'Brain': return <Brain size={size} />;
    case 'BookOpen': return <BookOpen size={size} />;
    case 'Link': return <LinkIcon size={size} />;
    default: return <Cpu size={size} />;
  }
}

interface NavbarProps {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isMobileOpen = false, setIsMobileOpen }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    api.categories.getAll()
      .then(res => {
        if (Array.isArray(res?.categories)) {
          setCategories(res.categories);
        }
      })
      .catch(() => {});
  }, []);

  const openDrawer = drawerOpen || isMobileOpen;
  const setOpen = (open: boolean) => {
    setDrawerOpen(open);
    if (setIsMobileOpen) setIsMobileOpen(open);
  };

  const navLinks = [
    { name: 'All Products', path: '/products' },
    { name: 'Arduino Kits', path: '/category/arduino-boards-and-kits' },
    { name: 'ESP32 & IoT', path: '/category/esp32-and-esp8266' },
    { name: 'Sensors', path: '/category/sensors-and-modules' },
    { name: 'Robotics', path: '/category/robotics-kits' },
    { name: 'Drone Components', path: '/category/drone-components' },
    { name: 'Raspberry Pi', path: '/category/raspberry-pi' },
    { name: 'PCB & Electronics', path: '/category/pcb-tools-and-accessories' },
    { name: 'DIY Projects', path: '/projects' },
    { name: 'Companion Apps', path: '/apps' },
    { name: 'New Arrivals', path: '/products?sort=newest' },
    { name: 'Offers', path: '/products?featured=true' },
    { name: 'Contact Us', path: '/contact' },
  ];

  return (
    <>
      {/* Horizontal Subnav Bar */}
      <nav className="bg-vk-subnav text-white text-xs sm:text-sm font-medium border-t border-gray-700/60 shadow-inner">
        <div className="max-w-[1500px] mx-auto px-2 sm:px-4 flex items-center justify-between">
          {/* Left Categories & Links */}
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-1">
            {/* "All" button */}
            <button
              onClick={() => setOpen(true)}
              aria-label="All Categories"
              className="flex items-center space-x-1 px-2.5 py-1.5 hover:border border-white rounded font-bold whitespace-nowrap text-white"
            >
              <Menu size={18} />
              <span>All Categories</span>
            </button>

            {/* Core Nav Links */}
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-2 py-1.5 hover:border border-white rounded whitespace-nowrap transition-colors ${
                    isActive ? 'border border-amber-400 font-bold text-amber-300' : 'text-gray-200 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right Highlights */}
          <div className="hidden lg:flex items-center space-x-3 text-xs pl-3 border-l border-gray-700 whitespace-nowrap py-1">
            <span className="flex items-center text-amber-300 font-semibold">
              <Sparkles size={14} className="mr-1 text-amber-400" />
              Student DIY Kits with Schematics
            </span>
            {isAdmin && (
              <Link
                to="/admin"
                className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold px-2 py-1 rounded flex items-center space-x-1 shadow"
              >
                <ShieldCheck size={14} />
                <span>Admin Console</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Side Slide-out Drawer ("All" Menu) */}
      {openDrawer && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-80 sm:w-96 max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="bg-vk-dark text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center font-bold">
                  <User size={18} />
                </div>
                <span className="font-bold text-sm">
                  {user ? `Hello, ${user.full_name}` : 'Hello, Sign In'}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-white/10 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-3 text-sm text-gray-800">
              {/* Quick Shortcuts */}
              <div className="px-5 py-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Shop Highlights
                </h4>
                <div className="space-y-1">
                  <Link
                    to="/products"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-2 text-gray-700 hover:text-amber-600 font-medium"
                  >
                    <span>Browse All 200+ Products</span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </Link>
                  <Link
                    to="/products?featured=true"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-2 text-gray-700 hover:text-amber-600 font-medium"
                  >
                    <span className="flex items-center">
                      <Percent size={16} className="mr-2 text-amber-500" />
                      Special Offers & Deals
                    </span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </Link>
                  <Link
                    to="/category/student-diy-project-kits"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-2 text-gray-700 hover:text-amber-600 font-medium"
                  >
                    <span className="flex items-center">
                      <BookOpen size={16} className="mr-2 text-emerald-600" />
                      Student Engineering Project Kits
                    </span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </Link>
                </div>
              </div>

              <hr className="my-2 border-gray-200" />

              {/* All 15 Categories List */}
              <div className="px-5 py-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  All Product Categories
                </h4>
                <div className="space-y-0.5">
                  {(categories ?? []).map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between py-2 px-1 hover:bg-gray-100 rounded text-gray-700 group transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-500 group-hover:text-amber-600 transition-colors">
                          {getCategoryIcon(cat.icon, 18)}
                        </span>
                        <span className="font-medium group-hover:text-gray-900">{cat.name}</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-400 group-hover:text-amber-600" />
                    </Link>
                  ))}
                </div>
              </div>

              <hr className="my-2 border-gray-200" />

              {/* Help & Settings */}
              <div className="px-5 py-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Customer Care & Policies
                </h4>
                <div className="space-y-1">
                  <Link
                    to="/orders"
                    onClick={() => setOpen(false)}
                    className="block py-1.5 text-gray-700 hover:text-amber-600"
                  >
                    Your Orders & Tracking
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setOpen(false)}
                    className="block py-1.5 text-gray-700 hover:text-amber-600"
                  >
                    Customer Support & WhatsApp
                  </Link>
                  <Link
                    to="/policy/shipping-policy"
                    onClick={() => setOpen(false)}
                    className="block py-1.5 text-gray-700 hover:text-amber-600"
                  >
                    Shipping & Delivery Policy
                  </Link>
                  <Link
                    to="/policy/return-refund-policy"
                    onClick={() => setOpen(false)}
                    className="block py-1.5 text-gray-700 hover:text-amber-600"
                  >
                    Returns & Replacement
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="block py-2 mt-2 font-bold text-amber-700 hover:underline flex items-center"
                    >
                      <ShieldCheck size={16} className="mr-1.5" />
                      Admin Control Center
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
