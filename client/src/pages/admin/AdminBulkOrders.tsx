import React, { useState, useEffect } from 'react';
import {
  Building,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Mail,
  Phone,
  Edit3,
  ExternalLink,
  Plus
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminBulkOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Quote modal state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [quotationAmount, setQuotationAmount] = useState<string>('');
  const [approvalStatus, setApprovalStatus] = useState<string>('pending');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadBulkOrders();
  }, []);

  const loadBulkOrders = async () => {
    try {
      setIsLoading(true);
      const res = await api.bulkOrders.getAdminAll();
      setOrders(res.bulkOrders || []);
    } catch (err) {
      console.error('Failed to load bulk orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openQuoteModal = (order: any) => {
    setSelectedOrder(order);
    setQuotationAmount(order.quotation_amount ? String(order.quotation_amount) : '');
    setApprovalStatus(order.approval_status || 'pending');
    setNotes(order.notes || '');
  };

  const handleSaveQuotation = async () => {
    if (!selectedOrder) return;
    try {
      setIsSubmitting(true);
      await api.bulkOrders.update(selectedOrder._id || selectedOrder.id, {
        approval_status: approvalStatus,
        quotation_amount: quotationAmount ? Number(quotationAmount) : undefined,
        notes: notes.trim()
      });
      setSelectedOrder(null);
      loadBulkOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = orders.filter((o: any) => {
    const matchesSearch =
      (o.institution_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.phone || '').includes(search);

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && o.approval_status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-100 text-amber-900 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide">
              B2B & Institutional Procurement
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            College & Institutional Bulk Orders
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage wholesale RFQs, student project kits, custom robotics lab quotations, and institutional discounts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
            Total Inquiries: <strong className="text-gray-900">{orders.length}</strong>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search college, contact person, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none font-medium"
          />
        </div>

        <div className="flex items-center space-x-1.5 text-xs w-full sm:w-auto overflow-x-auto">
          {['all', 'pending', 'quoted', 'approved', 'rejected'].map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition ${
                statusFilter === tab
                  ? 'bg-amber-400 text-gray-950 shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
            Loading institutional quotations...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No institutional bulk order inquiries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Institution / College</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Required Components</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Quoted Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item: any) => (
                  <tr key={item._id || item.id} className="hover:bg-gray-50 transition">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div>{item.institution_name}</div>
                      {item.gst_details?.gstin || item.gstin ? (
                        <div className="text-[10px] text-gray-400 font-mono">
                          GSTIN: {item.gst_details?.gstin || item.gstin}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="font-semibold text-gray-900">{item.contact_person}</div>
                      <div className="text-[11px] text-gray-500">{item.email}</div>
                      <div className="text-[11px] text-gray-500">{item.phone}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-gray-700">
                      <p className="line-clamp-2 text-xs" title={item.product_requirements}>
                        {item.product_requirements}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {item.quantity} units
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-700">
                      {item.quotation_amount ? `₹${Number(item.quotation_amount).toLocaleString('en-IN')}` : (
                        <span className="text-gray-400 font-normal italic">Pending Quote</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold capitalize ${
                        item.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        item.approval_status === 'quoted' ? 'bg-blue-100 text-blue-800' :
                        item.approval_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.approval_status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openQuoteModal(item)}
                        className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold rounded-lg text-xs transition inline-flex items-center shadow-sm"
                      >
                        <Edit3 size={13} className="mr-1.5" />
                        <span>Quote / Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quote / Manage Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                <Building size={18} className="text-amber-500" />
                <span>Prepare Institutional Quotation</span>
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-1">
              <div className="font-extrabold text-sm text-gray-900">{selectedOrder.institution_name}</div>
              <div className="text-gray-600">Contact: <strong>{selectedOrder.contact_person}</strong> ({selectedOrder.email} • {selectedOrder.phone})</div>
              {selectedOrder.gst_details?.gstin || selectedOrder.gstin ? (
                <div className="text-gray-500 font-mono">GSTIN: {selectedOrder.gst_details?.gstin || selectedOrder.gstin}</div>
              ) : null}
              <div className="pt-2 text-gray-800 border-t border-gray-200 mt-2">
                <strong>Components Requested ({selectedOrder.quantity} sets):</strong>
                <p className="mt-1 bg-white p-2.5 rounded border border-gray-200 whitespace-pre-wrap text-gray-700">
                  {selectedOrder.product_requirements}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Discounted Quotation Total (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 45000"
                  value={quotationAmount}
                  onChange={(e) => setQuotationAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Inquiry Status</label>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-400 outline-none"
                >
                  <option value="pending">Pending Review</option>
                  <option value="quoted">Quoted / Sent to College</option>
                  <option value="approved">Approved & Payment Settled</option>
                  <option value="fulfilled">Components Dispatched</option>
                  <option value="rejected">Rejected / Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Admin Notes / Terms</label>
              <textarea
                rows={3}
                placeholder="Include payment terms, estimated dispatch time from Pedamiram, component substitutions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuotation}
                disabled={isSubmitting}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 rounded-lg text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Quotation Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
