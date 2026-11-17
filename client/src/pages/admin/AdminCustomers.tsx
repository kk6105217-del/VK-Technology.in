import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Download,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  MapPin,
  Calendar,
  X,
  Phone,
  Mail,
  AlertCircle,
  Eye
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Profile modal / drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Block modal state
  const [blockingCustomer, setBlockingCustomer] = useState<any>(null);
  const [blockReason, setBlockReason] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [search, statusFilter, pagination.page]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await api.customers.getAdminAll({
        search: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: pagination.page,
        limit: pagination.limit
      });
      setCustomers(res.customers || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCustomerDetail = async (id: number) => {
    setSelectedCustomerId(id);
    try {
      setLoadingDetail(true);
      const res = await api.customers.getById(id);
      setCustomerDetail(res);
    } catch (err) {
      console.error('Failed to load customer profile:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!blockingCustomer) return;
    try {
      setIsSubmittingBlock(true);
      const newBlockedState = !blockingCustomer.is_blocked;
      await api.customers.updateStatus(blockingCustomer.id, {
        is_blocked: newBlockedState,
        block_reason: newBlockedState ? (blockReason.trim() || 'Suspended by store administrator') : ''
      });
      setBlockingCustomer(null);
      setBlockReason('');
      loadCustomers();
      if (selectedCustomerId === blockingCustomer.id) {
        openCustomerDetail(blockingCustomer.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update customer status');
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-teal-100 text-teal-900 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide">
              Customer Accounts Directory
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Registered Customers
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            View profiles, purchase reports, delivery addresses, and manage account authorization.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={api.customers.exportCsvUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold shadow-sm transition"
          >
            <Download size={14} />
            <span>Export Customers CSV</span>
          </a>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none font-medium"
          />
        </div>

        <div className="flex items-center space-x-1.5 text-xs w-full sm:w-auto">
          {(['all', 'active', 'blocked'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition ${
                statusFilter === tab
                  ? 'bg-amber-400 text-gray-950 shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'blocked' ? 'Suspended' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
            Loading registered customers directory...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No customer accounts found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Total Spend</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-gray-950 font-black flex items-center justify-center text-xs">
                          {c.full_name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div>{c.full_name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">ID #{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div>{c.email}</div>
                      <div className="text-[11px] text-gray-500">{c.phone || 'No phone recorded'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.is_blocked ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800">
                          <ShieldAlert size={11} className="mr-1" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <ShieldCheck size={11} className="mr-1" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-black text-gray-900">
                      {c.total_orders || 0} orders
                    </td>
                    <td className="py-3.5 px-4 font-black text-emerald-700">
                      ₹{Number(c.total_spent || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {c.created_at?.slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openCustomerDetail(c.id)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded text-xs transition inline-flex items-center"
                      >
                        <Eye size={12} className="mr-1" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => setBlockingCustomer(c)}
                        className={`px-2.5 py-1 rounded font-bold text-xs transition inline-flex items-center ${
                          c.is_blocked
                            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                            : 'bg-red-50 hover:bg-red-100 text-red-700'
                        }`}
                      >
                        {c.is_blocked ? 'Unblock' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Profile Drawer Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-left space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Users size={20} className="text-teal-600" />
                <h3 className="text-lg font-black text-gray-900">Customer Profile & Order Ledger</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomerId(null);
                  setCustomerDetail(null);
                }}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                <X size={18} />
              </button>
            </div>

            {loadingDetail || !customerDetail ? (
              <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
                Loading customer profile data...
              </div>
            ) : (
              <div className="space-y-5">
                {/* Profile Overview Card */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-black text-gray-900">{customerDetail.customer.full_name}</h4>
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="flex items-center"><Mail size={12} className="mr-1" />{customerDetail.customer.email}</span>
                      <span className="flex items-center"><Phone size={12} className="mr-1" />{customerDetail.customer.phone || 'No phone'}</span>
                    </div>
                  </div>
                  <div>
                    {customerDetail.customer.is_blocked ? (
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full font-black text-xs">
                        Account Suspended
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs">
                        Active Account
                      </span>
                    )}
                  </div>
                </div>

                {/* Delivery Addresses */}
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center">
                    <MapPin size={14} className="mr-1 text-gray-500" />
                    <span>Saved Delivery Addresses ({customerDetail.addresses?.length || 0})</span>
                  </h4>
                  {customerDetail.addresses?.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No saved addresses on file.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customerDetail.addresses.map((a: any) => (
                        <div key={a.id} className="p-3 bg-white rounded-lg border border-gray-200 text-xs">
                          <div className="font-bold text-gray-900">{a.full_name} ({a.phone})</div>
                          <div className="text-gray-600 mt-0.5">{a.address_line1} {a.address_line2}</div>
                          <div className="text-gray-500">{a.city}, {a.state} - {a.postal_code}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order History */}
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center">
                    <ShoppingBag size={14} className="mr-1 text-gray-500" />
                    <span>Past Order History ({customerDetail.orders?.length || 0})</span>
                  </h4>
                  {customerDetail.orders?.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No orders placed yet.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Order #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {customerDetail.orders.map((o: any) => (
                            <tr key={o.id}>
                              <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{o.order_number}</td>
                              <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">{o.created_at?.slice(0, 10)}</td>
                              <td className="py-2.5 px-3 font-bold text-gray-900">₹{o.total_amount}</td>
                              <td className="py-2.5 px-3">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800">
                                  {o.order_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suspend / Unblock Confirmation Modal */}
      {blockingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center space-x-2 text-red-600 font-black text-base pb-2 border-b border-gray-100">
              <AlertCircle size={20} />
              <span>{blockingCustomer.is_blocked ? 'Reactivate Customer Account' : 'Suspend Customer Account'}</span>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to {blockingCustomer.is_blocked ? 'reactivate' : 'suspend'} the account of{' '}
              <strong className="text-gray-900">{blockingCustomer.full_name}</strong> ({blockingCustomer.email})?
            </p>

            {!blockingCustomer.is_blocked && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Suspension</label>
                <input
                  type="text"
                  placeholder="e.g. Fraudulent order activity, policy violation..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setBlockingCustomer(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleBlock}
                disabled={isSubmittingBlock}
                className={`px-5 py-2 text-white rounded-lg text-xs font-bold shadow transition disabled:opacity-50 ${
                  blockingCustomer.is_blocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmittingBlock ? 'Saving...' : (blockingCustomer.is_blocked ? 'Confirm Reactivate' : 'Confirm Suspend')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
