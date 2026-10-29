import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Truck, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export const TrackOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!orderNumber.trim()) {
      setErrorMsg('Please enter your Order ID.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.orders.track(orderNumber.trim(), email.trim() || undefined);
      navigate(`/orders/${res.order.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Order not found. Please verify your order number and email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#eaeded] min-h-screen py-10 px-4 flex flex-col justify-center items-center text-left">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm border border-gray-300 w-full max-w-md space-y-4">
        <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-2">
          <Truck size={24} />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Track Your Package</h1>
          <p className="text-xs text-gray-500 mt-1">
            Check live shipment milestones and delivery status for orders placed at VK Technology.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-xs flex items-center">
            <AlertCircle size={16} className="mr-2 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleTrack} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Order ID / Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. VK-2026-1024"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono font-bold focus:outline-none uppercase"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Billing Email Address (Optional for verification)
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold py-2.5 rounded text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <span>{isLoading ? 'Locating Package...' : 'Track Package'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        <div className="pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
          Need help with your shipment? Email us at{' '}
          <a
            href="mailto:admin@vktechnology.shop"
            className="text-vk-blue font-bold hover:underline"
          >
            admin@vktechnology.shop
          </a>{' '}
          or WhatsApp at{' '}
          <a
            href="https://api.whatsapp.com/send?phone=918555997052"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-700 font-bold hover:underline"
          >
            +91 8555997052
          </a>
        </div>
      </div>
    </div>
  );
};
