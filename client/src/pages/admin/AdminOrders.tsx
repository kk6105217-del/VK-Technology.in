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
  X,
  Mail,
  MessageSquare,
  Bell,
  AlertCircle,
  RefreshCw,
  Send,
  Smartphone,
  Eye
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

  // Notification Management Modal
  const [notificationOrder, setNotificationOrder] = useState<Order | null>(null);
  const [notificationDetails, setNotificationDetails] = useState<any>(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [retryingChannel, setRetryingChannel] = useState<string | null>(null);
  const [notificationActionMsg, setNotificationActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleOpenNotificationModal = async (ord: Order) => {
    setNotificationOrder(ord);
    setNotificationActionMsg(null);
    setLoadingNotifications(true);
    try {
      const res = await api.orders.getNotifications(ord.id);
      setNotificationDetails(res);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleRetryNotification = async (channel?: string) => {
    if (!notificationOrder) return;
    try {
      setRetryingChannel(channel || 'all');
      setNotificationActionMsg(null);
      const res = await api.orders.retryNotification(notificationOrder.id, { channel });
      setNotificationActionMsg({
        type: res.success ? 'success' : 'error',
        text: res.message || 'Notification retry dispatched.'
      });

      // Reload notification details & order list
      const updatedDetails = await api.orders.getNotifications(notificationOrder.id);
      setNotificationDetails(updatedDetails);
      await loadOrders();
    } catch (err: any) {
      setNotificationActionMsg({
        type: 'error',
        text: err.message || 'Retry request failed'
      });
    } finally {
      setRetryingChannel(null);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/orders/admin/export/csv', '_blank');
  };

  const getChannelBadge = (status?: string) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'SENT') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={10} className="mr-0.5" /> SENT
        </span>
      );
    }
    if (s === 'FAILED') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle size={10} className="mr-0.5" /> FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock size={10} className="mr-0.5" /> PENDING
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">Customer Order Fulfillment & Notifications</h1>
          <p className="text-xs text-gray-500">
            View orders, dispatch packages, manage multi-channel Email & WhatsApp notifications, and export CSV reports.
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
                <th className="py-3 px-3">Notifications</th>
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

                  {/* Multi-Channel Notification Badges */}
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-semibold text-gray-600 w-12 shrink-0">Owner:</span>
                        <span title="Owner Email" className="cursor-pointer" onClick={() => handleOpenNotificationModal(ord)}>
                          {getChannelBadge(ord.owner_email_status)}
                        </span>
                        <span title="Owner WhatsApp" className="cursor-pointer" onClick={() => handleOpenNotificationModal(ord)}>
                          {getChannelBadge(ord.owner_whatsapp_status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-semibold text-gray-600 w-12 shrink-0">Cust:</span>
                        <span title="Customer Email" className="cursor-pointer" onClick={() => handleOpenNotificationModal(ord)}>
                          {getChannelBadge(ord.customer_email_status)}
                        </span>
                        <span title="Customer WhatsApp" className="cursor-pointer" onClick={() => handleOpenNotificationModal(ord)}>
                          {getChannelBadge(ord.customer_whatsapp_status)}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenNotificationModal(ord)}
                      className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 font-bold px-2 py-1 rounded transition text-[11px] inline-flex items-center space-x-1"
                      title="Manage Email & WhatsApp Notifications"
                    >
                      <Bell size={11} />
                      <span>Notify</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingOrder(ord);
                        setNewStatus(ord.order_status);
                        setNewTracking(ord.tracking_number || '');
                      }}
                      className="text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold px-2 py-1 rounded transition text-[11px]"
                    >
                      Status
                    </button>
                    <Link
                      to="/admin/invoices"
                      className="text-vk-blue hover:underline font-bold text-[11px] inline-flex items-center"
                    >
                      Invoice
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Channel Notification Management Modal */}
      {notificationOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 text-xs space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-1.5">
                  <Bell size={16} className="text-amber-500" />
                  Order Notification Center – #{notificationOrder.order_number}
                </h3>
                <p className="text-[11px] text-gray-500">
                  Customer: <strong>{notificationOrder.customer_name}</strong> • Amount: <strong>₹{Number(notificationOrder.total_amount).toLocaleString('en-IN')}</strong> ({notificationOrder.payment_method?.toUpperCase()})
                </p>
              </div>
              <button onClick={() => setNotificationOrder(null)} className="text-gray-400 hover:text-gray-700 p-1">
                <X size={18} />
              </button>
            </div>

            {/* Notification Feedback Toast */}
            {notificationActionMsg && (
              <div className={`p-3 rounded-lg text-xs font-semibold ${
                notificationActionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {notificationActionMsg.text}
              </div>
            )}

            {loadingNotifications ? (
              <div className="py-12 text-center text-gray-500">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
                <p>Loading notification delivery states & audit logs...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 4 Delivery Channels Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Channel 1: Owner Email */}
                  <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-gray-900 flex items-center gap-1">
                          <Mail size={13} className="text-blue-600" /> Store Owner Email
                        </span>
                        {getChannelBadge(notificationDetails?.channels?.ownerEmail?.status || notificationOrder.owner_email_status)}
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono truncate">
                        To: {notificationDetails?.channels?.ownerEmail?.recipient || 'karthik.suroju@gmail.com'}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Nodemailer SMTP</span>
                      <button
                        onClick={() => handleRetryNotification('owner_email')}
                        disabled={retryingChannel === 'owner_email'}
                        className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-bold px-2 py-1 rounded text-[10px] shadow-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw size={10} className={retryingChannel === 'owner_email' ? 'animate-spin' : ''} />
                        Retry Email
                      </button>
                    </div>
                  </div>

                  {/* Channel 2: Owner WhatsApp */}
                  <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-gray-900 flex items-center gap-1">
                          <MessageSquare size={13} className="text-emerald-600" /> Store Owner WhatsApp
                        </span>
                        {getChannelBadge(notificationDetails?.channels?.ownerWhatsApp?.status || notificationOrder.owner_whatsapp_status)}
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono truncate">
                        To: {notificationDetails?.channels?.ownerWhatsApp?.recipient || '+91 8555997052'}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between gap-1">
                      {notificationDetails?.channels?.ownerWhatsApp?.directLink && (
                        <a
                          href={notificationDetails.channels.ownerWhatsApp.directLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-700 hover:underline font-semibold flex items-center gap-0.5"
                        >
                          <ExternalLink size={10} /> Web Link
                        </a>
                      )}
                      <button
                        onClick={() => handleRetryNotification('owner_whatsapp')}
                        disabled={retryingChannel === 'owner_whatsapp'}
                        className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-bold px-2 py-1 rounded text-[10px] shadow-sm flex items-center gap-1 disabled:opacity-50 ml-auto"
                      >
                        <RefreshCw size={10} className={retryingChannel === 'owner_whatsapp' ? 'animate-spin' : ''} />
                        Retry WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Channel 3: Customer Email */}
                  <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-gray-900 flex items-center gap-1">
                          <Mail size={13} className="text-blue-600" /> Customer Email
                        </span>
                        {getChannelBadge(notificationDetails?.channels?.customerEmail?.status || notificationOrder.customer_email_status)}
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono truncate">
                        To: {notificationDetails?.channels?.customerEmail?.recipient || notificationOrder.customer_email}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Order Confirmation</span>
                      <button
                        onClick={() => handleRetryNotification('customer_email')}
                        disabled={retryingChannel === 'customer_email'}
                        className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-bold px-2 py-1 rounded text-[10px] shadow-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw size={10} className={retryingChannel === 'customer_email' ? 'animate-spin' : ''} />
                        Retry Email
                      </button>
                    </div>
                  </div>

                  {/* Channel 4: Customer WhatsApp */}
                  <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-gray-900 flex items-center gap-1">
                          <MessageSquare size={13} className="text-emerald-600" /> Customer WhatsApp
                        </span>
                        {getChannelBadge(notificationDetails?.channels?.customerWhatsApp?.status || notificationOrder.customer_whatsapp_status)}
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono truncate">
                        To: {notificationDetails?.channels?.customerWhatsApp?.recipient || notificationOrder.customer_phone}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between gap-1">
                      {notificationDetails?.channels?.customerWhatsApp?.directLink && (
                        <a
                          href={notificationDetails.channels.customerWhatsApp.directLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-700 hover:underline font-semibold flex items-center gap-0.5"
                        >
                          <ExternalLink size={10} /> Web Link
                        </a>
                      )}
                      <button
                        onClick={() => handleRetryNotification('customer_whatsapp')}
                        disabled={retryingChannel === 'customer_whatsapp'}
                        className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-bold px-2 py-1 rounded text-[10px] shadow-sm flex items-center gap-1 disabled:opacity-50 ml-auto"
                      >
                        <RefreshCw size={10} className={retryingChannel === 'customer_whatsapp' ? 'animate-spin' : ''} />
                        Retry WhatsApp
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notification Error Log & Metadata */}
                {(notificationDetails?.notificationError || notificationOrder.notification_error) && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-900">
                    <strong className="block font-bold mb-1 flex items-center gap-1">
                      <AlertCircle size={13} /> Last Recorded Error:
                    </strong>
                    <p className="font-mono text-[11px] break-words whitespace-pre-wrap">
                      {notificationDetails?.notificationError || notificationOrder.notification_error}
                    </p>
                  </div>
                )}

                {/* Additional Notification Metadata */}
                <div className="bg-gray-50 rounded-lg p-3 text-[11px] text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
                  <span>
                    Sent Timestamp: <strong>{notificationDetails?.notificationSentAt ? new Date(notificationDetails.notificationSentAt).toLocaleString('en-IN') : 'Pending / Not Sent'}</strong>
                  </span>
                  <span>
                    Retry Count: <strong>{notificationDetails?.retryCount ?? notificationOrder.retry_count ?? 0}</strong>
                  </span>
                  {notificationDetails?.whatsappMessageId && (
                    <span className="font-mono text-[10px]">
                      Meta WA ID: <strong>{notificationDetails.whatsappMessageId}</strong>
                    </span>
                  )}
                </div>

                {/* Notification Audit History */}
                <div>
                  <h4 className="font-bold text-gray-800 text-xs mb-2">Audit Dispatch Ledger</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-gray-100 text-gray-700 font-bold">
                        <tr>
                          <th className="py-1.5 px-3">Timestamp</th>
                          <th className="py-1.5 px-3">Channel</th>
                          <th className="py-1.5 px-3">Recipient</th>
                          <th className="py-1.5 px-3">Status</th>
                          <th className="py-1.5 px-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {(!notificationDetails?.logs || notificationDetails.logs.length === 0) ? (
                          <tr>
                            <td colSpan={5} className="py-3 text-center text-gray-400">
                              No historical logs recorded yet for this order.
                            </td>
                          </tr>
                        ) : (
                          notificationDetails.logs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="py-1.5 px-3 text-gray-500 whitespace-nowrap">
                                {new Date(log.created_at || log.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                              <td className="py-1.5 px-3 font-semibold uppercase text-gray-700">
                                {log.channel}
                              </td>
                              <td className="py-1.5 px-3 text-gray-600 truncate max-w-[120px]">
                                {log.recipient}
                              </td>
                              <td className="py-1.5 px-3">
                                {getChannelBadge(log.status || log.delivery_status)}
                              </td>
                              <td className="py-1.5 px-3 text-gray-500 font-mono text-[10px] truncate max-w-[140px]">
                                {log.error_message || log.gateway_response || 'OK'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleRetryNotification('all')}
                    disabled={retryingChannel !== null}
                    className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-3 py-1.5 rounded shadow-sm text-xs flex items-center gap-1.5 disabled:opacity-50 transition"
                  >
                    <RefreshCw size={12} className={retryingChannel === 'all' ? 'animate-spin' : ''} />
                    <span>Retry All Failed Channels</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotificationOrder(null)}
                    className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-semibold text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
