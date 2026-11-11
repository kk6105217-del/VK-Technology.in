import React, { useState } from 'react';
import { MapPin, Truck, CheckCircle2, Clock } from 'lucide-react';

interface PincodeCheckerProps {
  onPincodeChange?: (pincode: string) => void;
}

export const PincodeChecker: React.FC<PincodeCheckerProps> = ({ onPincodeChange }) => {
  const [pincode, setPincode] = useState(() => localStorage.getItem('vk_user_pincode') || '534204');
  const [inputVal, setInputVal] = useState(pincode);
  const [result, setResult] = useState<any>(() => calculateDelivery(pincode));

  function calculateDelivery(code: string) {
    if (!code || code.length !== 6) return null;

    const prefix2 = code.substring(0, 2);
    let region = 'All India Express';
    let days = '1-2 Weeks';
    let isLocal = false;

    if (['51', '52', '53'].includes(prefix2)) {
      region = 'Andhra Pradesh (Express Dispatch)';
      days = '1-2 Weeks';
      isLocal = true;
    } else if (prefix2 === '50') {
      region = 'Telangana (Express Dispatch)';
      days = '1-2 Weeks';
      isLocal = true;
    } else if (['56', '57', '58', '59', '60', '61', '62', '63', '64', '67', '68', '69'].includes(prefix2)) {
      region = 'South India Zone';
      days = '1-2 Weeks';
    }

    return {
      pincode: code,
      region,
      days,
      isLocal,
      codAvailable: false,
      freeShippingThreshold: 999
    };
  }

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.length === 6) {
      setPincode(inputVal);
      localStorage.setItem('vk_user_pincode', inputVal);
      const res = calculateDelivery(inputVal);
      setResult(res);
      if (onPincodeChange) onPincodeChange(inputVal);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 text-xs text-gray-700">
      <div className="flex items-center space-x-1.5 font-bold text-gray-800 mb-2">
        <MapPin size={16} className="text-amber-500" />
        <span>Check Delivery & Estimated Arrival</span>
      </div>

      <form onSubmit={handleCheck} className="flex gap-2 mb-2">
        <input
          type="text"
          maxLength={6}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="Enter 6-digit Pincode"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="submit"
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-3 py-1.5 rounded transition text-xs"
        >
          Check
        </button>
      </form>

      {result && (
        <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-200 text-[11px]">
          <div className="flex items-center text-emerald-700 font-semibold">
            <CheckCircle2 size={13} className="mr-1.5 shrink-0" />
            <span>Delivery available to {result.pincode} ({result.region})</span>
          </div>

          <div className="flex items-center text-gray-600">
            <Clock size={13} className="mr-1.5 text-amber-600 shrink-0" />
            <span>Estimated Delivery: <strong>{result.days}</strong></span>
          </div>

          <div className="flex items-center text-gray-600">
            <Truck size={13} className="mr-1.5 text-blue-600 shrink-0" />
            <span>FREE delivery on orders over ₹{result.freeShippingThreshold} • Estimated Delivery: 1-2 Weeks</span>
          </div>
        </div>
      )}
    </div>
  );
};
