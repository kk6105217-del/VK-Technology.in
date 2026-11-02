import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Package } from 'lucide-react';

export const AdminNotFoundPage: React.FC = () => {
  return (
    <div className="p-6 sm:p-12 max-w-2xl mx-auto text-center space-y-4">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
        <ShieldAlert size={36} />
      </div>
      <h1 className="text-2xl font-black text-gray-900">Admin Section Not Found (404)</h1>
      <p className="text-xs text-gray-600 leading-relaxed max-w-md mx-auto">
        The administration tool, setting, or report page you are attempting to access does not exist or has been relocated within the store control center.
      </p>

      <div className="pt-4 flex flex-wrap gap-2 justify-center text-xs">
        <Link
          to="/admin/dashboard"
          className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-2.5 rounded shadow-sm flex items-center gap-1.5 transition"
        >
          <LayoutDashboard size={15} /> Go to Admin Dashboard
        </Link>
        <Link
          to="/admin/products"
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2.5 rounded flex items-center gap-1.5 transition border border-gray-300"
        >
          <Package size={15} /> Manage Products
        </Link>
        <Link
          to="/"
          className="text-gray-500 hover:text-gray-900 font-medium px-4 py-2.5 flex items-center gap-1.5 transition"
        >
          <ArrowLeft size={15} /> Return to Storefront
        </Link>
      </div>
    </div>
  );
};
