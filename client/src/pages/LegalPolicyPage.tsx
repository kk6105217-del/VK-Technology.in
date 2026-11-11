import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, FileText, CheckCircle2 } from 'lucide-react';

export const LegalPolicyPage: React.FC = () => {
  const { type } = useParams<{ type: string }>();

  const policies: Record<string, { title: string; lastUpdated: string; content: React.ReactNode }> = {
    'shipping-policy': {
      title: 'Shipping & Delivery Policy',
      lastUpdated: 'October 2026',
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-gray-700">
          <p>
            At <strong>VK Technology</strong>, we understand that prompt component delivery is critical for student engineering deadlines and DIY project schedules. We are committed to delivering your orders accurately and in mint condition.
          </p>

          <h3 className="text-sm font-bold text-gray-900 mt-4">1. Dispatch Hub & Order Processing</h3>
          <p>
            All products are stocked, bench-tested, and dispatched directly from our dedicated warehouse facility in Pedamiram, West Godavari, Andhra Pradesh, India with real-time courier tracking.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Orders placed before 3:00 PM IST on working days (Monday through Saturday) are typically processed and dispatched promptly.</li>
            <li>Orders placed on Sundays or gazetted public holidays are dispatched on the next business day.</li>
          </ul>

          <h3 className="text-sm font-bold text-gray-900 mt-4">2. Shipping Charges & Free Delivery</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>FREE Delivery:</strong> Available across India on all orders with a cart subtotal of <strong>₹999 or above</strong>.</li>
            <li><strong>Standard Shipping Fee:</strong> A nominal flat charge of <strong>₹60</strong> applies to orders below ₹999.</li>
          </ul>

          <h3 className="text-sm font-bold text-gray-900 mt-4">3. Estimated Delivery Timelines</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>FREE delivery on orders over ₹999 • Estimated Delivery: 1-2 Weeks</strong> across all Indian States and Union Territories.</li>
          </ul>

          <h3 className="text-sm font-bold text-gray-900 mt-4">4. Tracking Your Shipment</h3>
          <p>
            Once your package is handed over to our courier partner (e.g. Express Cargo, Delhivery, Blue Dart, or Speed Post), an automated email and WhatsApp notification with your unique Tracking ID is dispatched. You can track package milestones live on our <Link to="/track" className="text-vk-blue font-bold hover:underline">Track Order page</Link>.
          </p>
        </div>
      )
    },
    'return-refund-policy': {
      title: 'No Return / No Refund Policy (All Sales Final)',
      lastUpdated: 'October 2026',
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-gray-700">
          <div className="bg-amber-50 border border-amber-300 rounded p-3 text-amber-950 font-medium">
            ⚠️ <strong>All Sales Final Notice:</strong> Due to the sensitive nature of DIY electronics, microcontrollers, semiconductor ICs, sensors, and robotics modules, VK Technology does not accept returns or process refunds once an order is placed and dispatched.
          </div>

          <h3 className="text-sm font-bold text-gray-900 mt-4">1. Strict No-Return Policy</h3>
          <p>
            Electronic components can be easily compromised by electrostatic discharge (ESD), reverse polarity wiring, over-voltage spikes, or soldering heat. To guarantee that every customer receives 100% factory-fresh, uncompromised components, we do not accept returns or exchanges.
          </p>

          <h3 className="text-sm font-bold text-gray-900 mt-4">2. Quality Assurance Before Dispatch</h3>
          <p>
            Every microcontroller, sensor board, and DIY project kit is quality-checked for trace integrity, visual soldering standards, and power-indicator operation prior to packaging.
          </p>

          <h3 className="text-sm font-bold text-gray-900 mt-4">3. Customer Guidance</h3>
          <p>
            Please double-check product technical specifications, pin configurations, operating voltages (e.g., 3.3V vs 5V logic), and dimensional compatibility before completing your purchase.
          </p>
        </div>
      )
    },
    'cancellation-policy': {
      title: 'No Cancellation Policy',
      lastUpdated: 'October 2026',
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-gray-700">
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-900 font-medium">
            🚫 <strong>No Cancellation Policy:</strong> Orders placed on VK Technology are final and cannot be cancelled or retracted once submitted.
          </div>
          <p>
            Our fulfillment system automatically queues and processes orders immediately upon confirmation to meet same-day dispatch timelines. Therefore, order cancellation requests cannot be accepted.
          </p>
          <p>
            Customers are strongly advised to verify their delivery address, phone number, and selected components in the checkout review section prior to making payment.
          </p>
        </div>
      )
    },
    'privacy-policy': {
      title: 'Privacy Policy',
      lastUpdated: 'October 2026',
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-gray-700">
          <p>
            <strong>VK Technology</strong> respects your privacy and is committed to protecting your personal data.
          </p>
          <h3 className="text-sm font-bold text-gray-900 mt-4">Information We Collect</h3>
          <p>
            We collect personal details essential for fulfilling your orders: your name, delivery address, phone number, and email address. We do NOT store credit card or debit card numbers on our servers; all electronic transactions are processed securely through RBI-compliant payment aggregators (Razorpay).
          </p>
          <h3 className="text-sm font-bold text-gray-900 mt-4">Data Usage</h3>
          <p>
            Your information is exclusively used to communicate order status updates, print courier shipping labels, and provide technical customer service. We never sell, lease, or rent customer records to third parties.
          </p>
        </div>
      )
    },
    'terms-conditions': {
      title: 'Terms and Conditions',
      lastUpdated: 'October 2026',
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-gray-700">
          <p>
            Welcome to VK Technology. By browsing, accessing, or placing an order on our website, you agree to comply with and be bound by the following terms and conditions.
          </p>
          <h3 className="text-sm font-bold text-gray-900 mt-4">Product Usability</h3>
          <p>
            Our products, modules, and DIY engineering kits are sold for educational, prototyping, research, and hobbyist applications. Users are responsible for adhering to safe electrical engineering and ESD practices during circuit prototyping.
          </p>
          <h3 className="text-sm font-bold text-gray-900 mt-4">Jurisdiction</h3>
          <p>
            Any disputes arising in connection with orders or contracts with VK Technology shall be subject to the exclusive jurisdiction of the competent courts in West Godavari District, Andhra Pradesh, India.
          </p>
        </div>
      )
    },
    'warranty-policy': {
      title: 'Warranty & Testing Policy',
      lastUpdated: 'October 2026',
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-gray-700">
          <p>
            All development boards (Arduino, ESP32, STM32, Raspberry Pi accessories) supplied by VK Technology carry a <strong>6 Months Manufacturer Warranty</strong> against internal component flaws and manufacturing defects.
          </p>
          <p>
            Every board is inspected for solder bridging, trace continuity, and power indicator readiness before dispatch from our testing workshop. For warranty claims or pinout verification assistance, email <strong>karthik.suroju@gmail.com</strong> or message <strong>+91 8555997052</strong>.
          </p>
        </div>
      )
    }
  };

  const currentPolicyKey = type && policies[type] ? type : 'shipping-policy';
  const currentPolicy = policies[currentPolicyKey];

  return (
    <div className="bg-[#eaeded] min-h-screen py-8 sm:py-12 text-left">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Navigation tabs */}
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-1 text-xs font-semibold">
          {Object.entries(policies).map(([key, item]) => (
            <Link
              key={key}
              to={`/policy/${key}`}
              className={`px-3 py-2 rounded transition ${
                currentPolicyKey === key
                  ? 'bg-amber-400 text-gray-950 font-bold shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.title}
            </Link>
          ))}
        </div>

        {/* Content Box */}
        <div className="bg-white p-6 sm:p-10 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">{currentPolicy.title}</h1>
            <p className="text-xs text-gray-400 mt-1">
              VK Technology • India • Last updated: {currentPolicy.lastUpdated}
            </p>
          </div>

          <div className="pt-2">
            {currentPolicy.content}
          </div>
        </div>
      </div>
    </div>
  );
};
