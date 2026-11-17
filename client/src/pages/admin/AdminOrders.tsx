import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Filter,
  Download,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  ChevronDown,
  Edit,
  Save,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { Order } from '../../types';
import { getOrderStatusBadge } from '../OrdersPage';

const ORDER_STATUSES = [
  'Pending Payment',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Return Requested',
  'Refunded'
];

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Status edit modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [newTracking, setNewTracking] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const res = await api.orders.getAdminAll({
        status: statusFilter || undefined,
        search: searchQuery || undefined
      });
      setOrders(res.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      setUpdatingStatus(true);
      await api.orders.updateStatus(editingOrder.id, {
        order_status: newStatus,
        tracking_number: newTracking.trim() || undefined
      });
      setEditingOrder(null);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/orders/admin/export/csv', '_blank');
  };

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    return o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_email.toLowerCase().includes(q) ||
      o.customer_phone.includes(q);
  });

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Order Fulfillment</h1>
          <p className="text-xs text-gray-500">
            View orders, dispatch packages, update status milestones, and export CSV reports.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-bold px-4 py-2 rounded text-xs shadow-sm flex items-center space-x-1.5 transition"
        >
          <Download size={14} />
          <span>Export Orders to CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order ID, Name, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 bg-white rounded px-3 py-2 text-xs focus:outline-none cursor-pointer"
          >
            <option value="">All Order Statuses</option>
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500 shrink-0">
            Total: <strong>{filteredOrders.length}</strong> orders
          </span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Order # & Date</th>
                <th className="py-3 px-3">Customer Information</th>
                <th className="py-3 px-3">Delivery Destination</th>
                <th className="py-3 px-3">Total Amount</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Fulfillment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-4">
                    <strong className="font-mono text-gray-900 block">{ord.order_number}</strong>
                    <span className="text-[10px] text-gray-400">
                      {new Date(ord.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <strong className="text-gray-900 block">{ord.customer_name}</strong>
                    <span className="text-[11px] text-gray-500 block">{ord.customer_phone}</span>
                    <span className="text-[10px] text-gray-400 block truncate max-w-[150px]">{ord.customer_email}</span>
                  </td>

                  <td className="py-3 px-3 text-gray-600">
                    <span className="block font-medium">{ord.shipping_address?.city}, {ord.shipping_address?.state}</span>
                    <span className="text-[10px] text-gray-400 font-mono">PIN: {ord.shipping_address?.postal_code}</span>
                  </td>

                  <td className="py-3 px-3">
                    <strong className="text-gray-900 font-extrabold block text-sm">
                      ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[10px] text-gray-500">
                      {ord.payment_method?.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      ord.payment_status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ord.payment_status}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    {getOrderStatusBadge(ord.order_status)}
                    {ord.tracking_number && (
                      <span className="text-[10px] text-gray-500 font-mono block mt-1">
                        Track: {ord.tracking_number}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingOrder(ord);
                        setNewStatus(ord.order_status);
                        setNewTracking(ord.tracking_number || '');
                      }}
                      className="text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold px-2.5 py-1 rounded transition text-[11px]"
                    >
                      Update Status
                    </button>
                    <Link
                      to="/admin/invoices"
                      className="text-vk-blue hover:underline font-bold text-[11px] inline-flex items-center"
                    >
                      Tax Invoice
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Status Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-xs space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <h3 className="font-bold text-sm text-gray-900">
                Update Order #{editingOrder.order_number}
              </h3>
              <button onClick={() => setEditingOrder(null)}>
                <X size={18} className="text-gray-400 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Change Fulfillment Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white font-bold cursor-pointer"
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Courier Tracking Number (AWB / Consignment)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DELHIVERY-12849021 or SPEEDPOST-AP490"
                  value={newTracking}
                  onChange={(e) => setNewTracking(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-2 rounded shadow-sm transition disabled:opacity-50"
                >
                  {updatingStatus ? 'Saving...' : 'Save & Notify Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
