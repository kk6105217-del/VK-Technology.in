import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, ShieldCheck, Mail, Phone, MapPin, ExternalLink, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-vk-dark text-gray-300 text-xs mt-12">
      {/* Back to Top Bar */}
      <button
        onClick={scrollToTop}
        className="w-full bg-[#232f3e] hover:bg-[#2e3e52] text-white py-3 text-center text-xs font-semibold tracking-wide transition-colors focus:outline-none"
      >
        Back to top ↑
      </button>

      {/* Main Multi-column Footer */}
      <div className="max-w-[1300px] mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Column 1: About VK Technology */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Get to Know Us</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="hover:underline hover:text-white">
                  About VK Technology
                </Link>
              </li>
              <li>
                <Link to="/about#mission" className="hover:underline hover:text-white">
                  Our Engineering Mission
                </Link>
              </li>
              <li>
                <Link to="/about#workshop" className="hover:underline hover:text-white">
                  VK Innovation Lab
                </Link>
              </li>
              <li>
                <Link to="/category/student-diy-project-kits" className="hover:underline hover:text-white">
                  Student Campus Ambassador
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:underline hover:text-white">
                  Bulk College Lab Supply
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Connect with Us */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Connect with Us</h4>
            <ul className="space-y-2">
              <li className="flex items-center space-x-1.5">
                <Mail size={13} className="text-amber-400" />
                <a
                  href="mailto:admin@vktechnology.shop"
                  className="hover:underline hover:text-white text-gray-200"
                >
                  admin@vktechnology.shop
                </a>
              </li>
              <li className="flex items-center space-x-1.5">
                <Phone size={13} className="text-emerald-400" />
                <span className="text-gray-200">+91 8555997052</span>
              </li>
              <li>
                <a
                  href="https://api.whatsapp.com/send?phone=918555997052&text=Hi%20VK%20Technology,%20I%20have%20an%20inquiry%20regarding%20DIY%20kits"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline hover:text-white text-emerald-400 flex items-center"
                >
                  <span>Chat on WhatsApp</span>
                  <ExternalLink size={10} className="ml-1" />
                </a>
              </li>
              <li>
                <Link to="/contact" className="hover:underline hover:text-white">
                  Customer Support Desk
                </Link>
              </li>
              <li>
                <span className="text-gray-400">Support Hours: Mon-Sat, 9AM-8PM</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Popular Categories */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Top Tech Categories</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/category/arduino-boards-and-kits" className="hover:underline hover:text-white">
                  Arduino Boards & Starter Kits
                </Link>
              </li>
              <li>
                <Link to="/category/esp32-and-esp8266" className="hover:underline hover:text-white">
                  ESP32 & IoT Microcontrollers
                </Link>
              </li>
              <li>
                <Link to="/category/robotics-kits" className="hover:underline hover:text-white">
                  DIY Robotics & 4WD Chassis
                </Link>
              </li>
              <li>
                <Link to="/category/drone-components" className="hover:underline hover:text-white">
                  Drone Frames, Motors & ESCs
                </Link>
              </li>
              <li>
                <Link to="/category/raspberry-pi" className="hover:underline hover:text-white">
                  Raspberry Pi 5 Single Board PCs
                </Link>
              </li>
              <li>
                <Link to="/category/student-diy-project-kits" className="hover:underline hover:text-white">
                  Engineering Final Year Kits
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Let Us Help You */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Let Us Help You</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/account" className="hover:underline hover:text-white">
                  Your Account
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:underline hover:text-white">
                  Your Orders & Tracking
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:underline hover:text-white">
                  Real-time Shipment Tracking
                </Link>
              </li>
              <li>
                <Link to="/policy/shipping-policy" className="hover:underline hover:text-white">
                  Shipping Rates & Dispatch
                </Link>
              </li>
              <li>
                <Link to="/policy/return-refund-policy" className="hover:underline hover:text-white">
                  Returns & Replacements
                </Link>
              </li>
              <li>
                <Link to="/policy/warranty-policy" className="hover:underline hover:text-white">
                  Warranty & Component Testing
                </Link>
              </li>
              <li>
                <Link to="/contact#faq" className="hover:underline hover:text-white">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Middle Brand Divider */}
        <div className="border-t border-gray-700/80 my-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center space-x-2.5">
            <img
              src="/logo.png"
              alt="VK Technology Logo"
              className="w-9 h-9 object-contain rounded-full bg-white p-0.5 shadow shrink-0"
            />
            <span className="text-xl font-black text-white">
              VK <span className="text-amber-400 font-bold">TECHNOLOGY</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300">
            <div className="flex items-center space-x-1.5 border border-gray-600 rounded px-3 py-1">
              <span>🇮🇳</span>
              <span className="font-semibold">India</span>
            </div>
            <div className="flex items-center space-x-1.5 border border-gray-600 rounded px-3 py-1">
              <span>₹ INR</span>
              <span className="font-semibold">Indian Rupee</span>
            </div>
            <div className="flex items-center space-x-1.5 border border-gray-600 rounded px-3 py-1 text-gray-400">
              <MapPin size={12} className="text-amber-400" />
              <span>India</span>
            </div>
          </div>
        </div>

        {/* Bottom Legal Policies and Admin Links */}
        <div className="text-center pt-4 border-t border-gray-800 text-[11px] text-gray-400 space-y-3">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 font-medium">
            <Link to="/policy/shipping-policy" className="hover:text-white hover:underline">
              Shipping Policy
            </Link>
            <Link to="/policy/return-refund-policy" className="hover:text-white hover:underline">
              Cancellation & Return Policy (Final Sale)
            </Link>
            <Link to="/policy/privacy-policy" className="hover:text-white hover:underline">
              Privacy Policy
            </Link>
            <Link to="/policy/terms-conditions" className="hover:text-white hover:underline">
              Terms & Conditions
            </Link>
            <Link to="/policy/warranty-policy" className="hover:text-white hover:underline">
              Warranty Policy
            </Link>
            <Link to="/track" className="hover:text-white hover:underline">
              Order Tracking
            </Link>
          </div>

          <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Authorized Owner: <a href="mailto:karthik.suroju@gmail.com" className="text-amber-400 hover:underline">karthik.suroju@gmail.com</a> • WhatsApp: +91 8555997052
          </p>

          <p className="text-gray-400">
            © {new Date().getFullYear()} VK Technology. All rights reserved. Dedicated to engineering education, makers, and innovators across India.
          </p>
        </div>
      </div>
    </footer>
  );
};
