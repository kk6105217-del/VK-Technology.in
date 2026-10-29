import React, { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

const FAQS = [
  {
    q: 'How fast do you dispatch orders?',
    a: 'All orders placed before 3:00 PM IST on business days are dispatched on the same day. Orders across India are typically delivered within 2-4 business days with live tracking.'
  },
  {
    q: 'Do your DIY Student Project Kits come with source code?',
    a: 'Yes! Every project kit from VK Technology includes tested Arduino/ESP32 source code, complete circuit schematics, block diagrams, and a comprehensive documentation guide suitable for engineering exhibitions and lab evaluations.'
  },
  {
    q: 'What payment methods do you support?',
    a: 'We accept Direct UPI QR Code payment (PhonePe, Google Pay, Paytm, BHIM), Online Gateway (Cards, Net Banking) and Cash on Delivery (COD) for eligible pincodes.'
  },
  {
    q: 'Can I request bulk orders or custom component packages for college labs?',
    a: 'Absolutely! We regularly supply engineering colleges, polytechnics, and robotics workshops. Reach out via our contact form or directly on WhatsApp (+91 8555997052) for institutional quotations.'
  },
  {
    q: 'What is your warranty and return policy?',
    a: 'We offer a 7-day replacement guarantee on all dead-on-arrival or defective items. We also provide a 6-month manufacturer testing warranty on all standard development boards.'
  }
];

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setIsLoading(true);
      const res = await api.contact.send({
        name,
        email,
        phone,
        subject,
        message
      });

      setSuccessMsg(res.message);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit message.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#eaeded] min-h-screen py-6 sm:py-10 text-left">
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        {/* Page Title */}
        <div className="text-center max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Contact VK Technology
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Have questions about a DIY electronics component, custom student project kit, or an existing order? We are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Contact Information & Channels (5 cols) */}
          <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-lg shadow-sm border border-gray-200 space-y-5 text-xs">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
              Business & Workshop Details
            </h3>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <strong className="text-gray-900 block font-bold">Country of Origin:</strong>
                  <p className="text-gray-600 leading-relaxed">
                    India (Express Dispatch Nationwide)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </div>
                <div>
                  <strong className="text-gray-900 block font-bold">Customer Support Email:</strong>
                  <a
                    href="mailto:admin@vktechnology.shop"
                    className="text-vk-blue hover:underline font-semibold"
                  >
                    admin@vktechnology.shop
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Phone size={16} />
                </div>
                <div>
                  <strong className="text-gray-900 block font-bold">Hotline & WhatsApp:</strong>
                  <p className="text-gray-700 font-semibold">+91 8555997052</p>
                  <span className="text-[11px] text-gray-500">Mon - Sat: 9:00 AM - 8:00 PM IST</span>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp button */}
            <div className="pt-2 border-t border-gray-100">
              <a
                href="https://api.whatsapp.com/send?phone=918555997052&text=Hi%20VK%20Technology,%20I%20have%20an%20inquiry%20regarding%20DIY%20kits"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-md flex items-center justify-center space-x-2 shadow transition"
              >
                <span>Chat Instantly on WhatsApp (+91 8555997052)</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Contact Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Send us a Message
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Submit your inquiry and our engineering team will respond within 24 hours.
            </p>

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded text-xs mb-4 flex items-center">
                <CheckCircle2 size={16} className="mr-2 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-xs mb-4 flex items-center">
                <AlertCircle size={16} className="mr-2 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Karthik Suroju"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mobile Phone (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Bulk order for College Robo Club"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Message / Project Inquiry *</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detail your requirements, pinout doubts, or order questions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-6 py-2.5 rounded text-xs shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <span>{isLoading ? 'Sending...' : 'Send Message'}</span>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <HelpCircle size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">
              Frequently Asked Questions (FAQ)
            </h2>
          </div>

          <div className="divide-y divide-gray-200 text-xs">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full flex justify-between items-center text-left font-bold text-gray-800 hover:text-amber-700 transition"
                >
                  <span className="text-sm">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`transform transition-transform ${openFaqIndex === idx ? 'rotate-180 text-amber-500' : 'text-gray-400'}`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <p className="mt-2 text-gray-600 leading-relaxed bg-gray-50 p-3 rounded">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
