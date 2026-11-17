import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  TrendingUp,
  ArrowRight,
  Users,
  CreditCard,
  XCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building,
  FileText,
  Boxes
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [restockItem, setRestockItem] = useState<any>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const res = await api.settings.getAdminStats();
      setData(res);
    } catch (e) {
      console.error('Failed to load admin stats:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleQuickRestock = async () => {
    if (!restockItem || restockQty <= 0) return;
    try {
      setIsSubmittingRestock(true);
      await api.inventoryAdmin.adjustStock({
        product_id: restockItem.id,
        quantity_change: Number(restockQty),
        change_type: 'restock',
        reason: 'Quick restock from Amazon Seller Central dashboard'
      });
      setRestockItem(null);
      loadStats();
    } catch (err: any) {
      alert(err.message || 'Restock failed');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse text-left">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const {
    stats = {},
    recentOrders = [],
    bestSellers = [],
    dailySales = [],
    recentCustomers = [],
    lowStockList = []
  } = data;

  return (
    <div className="space-y-6 text-left">
      {/* Seller Central Title Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-100 text-amber-900 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide">
              Seller Central Dashboard
            </span>
            <span className="text-xs text-emerald-700 font-semibold flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Live Storefront Connected
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Store Performance Overview
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time analytics, order fulfillment, inventory health, and revenue control for VK Technology.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setIsRefreshing(true);
              loadStats();
            }}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh Stats</span>
          </button>
          <Link
            to="/admin/products"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 rounded-lg text-xs font-bold shadow-sm transition"
          >
            <Plus size={15} />
            <span>Add Product</span>
          </Link>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
          >
            <span>Visit Storefront</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Row 1: Primary Revenue & Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Sales (Lifetime)</span>
            <div className="text-2xl font-black text-gray-900 mt-1">
              ₹{Number(stats.total_sales || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
              Paid & COD Confirmed Orders
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl shadow-sm">
            ₹
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Today's Sales</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ₹{Number(stats.today_sales || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-gray-500 font-medium mt-1 block">
              Live intra-day turnover
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-sm">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Month-to-Date Revenue</span>
            <div className="text-2xl font-black text-blue-600 mt-1">
              ₹{Number(stats.monthly_revenue || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-blue-700 font-medium mt-1 block">
              Current calendar month
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-sm">
            <CreditCard size={24} />
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pending Payments</span>
            <div className="text-2xl font-black text-orange-600 mt-1">
              {stats.pending_payments || 0}
            </div>
            <Link to="/admin/upi-payments" className="text-[11px] text-orange-700 hover:underline font-semibold mt-1 block">
              Verify pending UPI receipts →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center shadow-sm">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Row 2: Operational Volume Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Orders</span>
            <div className="text-2xl font-black text-gray-900 mt-1">
              {stats.total_orders || 0}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
              {stats.completed_orders || 0} Delivered successfully
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shadow-sm">
            <ShoppingBag size={24} />
          </div>
        </div>

        {/* Pending Fulfillment */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pending Fulfillment</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {stats.pending_orders || 0}
            </div>
            <Link to="/admin/orders?status=Processing" className="text-[11px] text-amber-700 hover:underline font-semibold mt-1 block">
              Dispatch orders to courier →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-sm">
            <Package size={24} />
          </div>
        </div>

        {/* Products & Inventory Health */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Catalog SKUs</span>
            <div className="text-2xl font-black text-gray-900 mt-1">
              {stats.total_products || 0}
            </div>
            {stats.low_stock_products > 0 ? (
              <span className="text-[11px] text-red-600 font-bold mt-1 block">
                ⚠️ {stats.low_stock_products} items low on stock
              </span>
            ) : (
              <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                All inventory healthy
              </span>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shadow-sm">
            <Boxes size={24} />
          </div>
        </div>

        {/* Registered Customers */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Registered Customers</span>
            <div className="text-2xl font-black text-gray-900 mt-1">
              {stats.total_customers || 0}
            </div>
            <Link to="/admin/customers" className="text-[11px] text-vk-blue hover:underline font-semibold mt-1 block">
              Manage customer accounts →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-sm">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Row 3: Revenue Trend Chart (Past 14 Days) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 flex items-center space-x-2">
              <TrendingUp size={18} className="text-amber-500" />
              <span>Sales Performance Trend (Past 14 Days)</span>
            </h2>
            <p className="text-xs text-gray-500">Intra-day sales revenue and order volume across Andhra Pradesh and all Indian pin codes.</p>
          </div>
          <Link to="/admin/analytics" className="text-xs text-vk-blue hover:underline font-bold flex items-center">
            <span>Detailed Analytics & Reports</span>
            <ArrowRight size={13} className="ml-1" />
          </Link>
        </div>

        {dailySales.length > 0 ? (
          <div className="h-48 flex items-end space-x-2 pt-8 pb-2 border-b border-gray-100 overflow-x-auto">
            {dailySales.map((d: any, idx: number) => {
              const maxRev = Math.max(...dailySales.map((s: any) => s.total_revenue || 1));
              const heightPct = Math.max(12, Math.round((d.total_revenue / maxRev) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center min-w-[42px] group">
                  <div className="text-[10px] font-black text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity mb-1 bg-white px-1.5 py-0.5 rounded shadow-sm border border-gray-200 whitespace-nowrap">
                    ₹{Number(d.total_revenue).toLocaleString('en-IN')}
                    <div className="text-[9px] text-gray-400 font-normal">{d.orders_count} orders</div>
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-amber-500 to-amber-400 group-hover:from-amber-600 group-hover:to-amber-500 rounded-t-lg transition-all shadow-sm"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] text-gray-500 font-semibold mt-1.5 truncate max-w-[44px]">
                    {d.sale_date?.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-gray-400 italic">
            Sales volume will plot automatically as customers place and confirm orders.
          </div>
        )}
      </div>

      {/* Row 4: Low-Stock Inventory Alerts & Quick Restock */}
      {lowStockList.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-5 rounded-2xl border border-red-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-red-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-red-950">
                  Critical Inventory Alerts ({lowStockList.length} items low or out of stock)
                </h2>
                <p className="text-xs text-red-700">Restock these hardware components to prevent customer checkout interruptions.</p>
              </div>
            </div>
            <Link to="/admin/inventory" className="text-xs text-red-800 font-bold hover:underline">
              Open Full Inventory →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {lowStockList.map((item: any) => (
              <div key={item.id} className="bg-white p-3.5 rounded-xl border border-red-200 shadow-sm flex items-center space-x-3">
                <img
                  src={item.image_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=150&q=80'}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-contain bg-gray-50 border p-1"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 truncate" title={item.name}>{item.name}</h4>
                  <div className="text-[11px] font-mono text-gray-500">{item.sku}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[11px] font-black ${item.stock_quantity === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                      {item.stock_quantity === 0 ? '0 Units Left' : `Only ${item.stock_quantity} left`}
                    </span>
                    <button
                      onClick={() => {
                        setRestockItem(item);
                        setRestockQty(25);
                      }}
                      className="text-[10px] font-bold bg-amber-400 hover:bg-amber-500 text-gray-950 px-2 py-0.5 rounded shadow-sm transition"
                    >
                      + Restock
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 5: Recent Customer Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Customer Orders (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Recent Customer Orders</h2>
              <p className="text-xs text-gray-500">Latest transactions requiring fulfillment or status updates.</p>
            </div>
            <Link to="/admin/orders" className="text-xs text-vk-blue hover:underline font-bold flex items-center">
              <span>View All Orders</span>
              <ArrowRight size={13} className="ml-1" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center italic">No customer orders recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5">Order #</th>
                    <th className="py-2.5">Customer</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5">Payment</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-mono font-bold text-gray-900">
                        {ord.order_number}
                      </td>
                      <td className="py-3 font-semibold text-gray-800">
                        {ord.customer_name}
                      </td>
                      <td className="py-3 font-extrabold text-gray-900">
                        ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          ord.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ord.payment_status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          ord.order_status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                          ord.order_status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {ord.order_status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/admin/orders`}
                          className="text-xs font-bold text-vk-blue hover:underline"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Selling Products (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Top Selling Products</h2>
              <p className="text-xs text-gray-500">High-demand electronics & kits.</p>
            </div>
            <Link to="/admin/products" className="text-xs text-vk-blue hover:underline font-bold">
              Catalog
            </Link>
          </div>

          {bestSellers.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center italic">Best seller rankings populate with order history.</p>
          ) : (
            <div className="space-y-3">
              {bestSellers.map((item: any, idx: number) => (
                <div key={item.id} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50 transition border border-gray-100">
                  <span className="w-5 text-center font-black text-xs text-amber-600">
                    #{idx + 1}
                  </span>
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=150&q=80'}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-contain bg-gray-50 border p-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 truncate" title={item.name}>{item.name}</h4>
                    <div className="text-[11px] text-gray-500 flex items-center justify-between mt-0.5">
                      <span>₹{item.discounted_price || item.regular_price}</span>
                      <span className="font-extrabold text-emerald-700">{item.units_sold} units sold</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 6: Recent Customer Registrations & Institutional Bulk Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Customers (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center space-x-2">
                <Users size={18} className="text-teal-600" />
                <span>Recently Registered Customers</span>
              </h2>
              <p className="text-xs text-gray-500">Makers, engineers, and students creating accounts.</p>
            </div>
            <Link to="/admin/customers" className="text-xs text-vk-blue hover:underline font-bold">
              View All
            </Link>
          </div>

          {recentCustomers.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center italic">No customer accounts registered yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentCustomers.map((c: any) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900">{c.full_name}</div>
                    <div className="text-[11px] text-gray-500">{c.email} • {c.phone || 'No phone'}</div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {c.created_at?.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Institutional Bulk RFQ & Navigation Hub (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center space-x-2">
                <Building size={18} className="text-amber-600" />
                <span>College & Bulk Engineering Inquiries</span>
              </h2>
              <p className="text-xs text-gray-500">Quotation requests from engineering colleges and makerspaces.</p>
            </div>
            <Link to="/admin/bulk-orders" className="text-xs text-vk-blue hover:underline font-bold">
              Manage RFQs →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/admin/bulk-orders"
              className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 transition text-left flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-amber-900 uppercase">Pending College Quotes</span>
                <div className="text-2xl font-black text-amber-700 mt-1">
                  {stats.pending_bulk_inquiries || 0}
                </div>
              </div>
              <span className="text-xs font-bold text-amber-800 mt-2">Open Quotation Desk →</span>
            </Link>

            <Link
              to="/admin/invoices"
              className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 transition text-left flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-blue-900 uppercase">GST Tax Invoices</span>
                <div className="text-2xl font-black text-blue-700 mt-1">
                  {stats.completed_orders || 0}
                </div>
              </div>
              <span className="text-xs font-bold text-blue-800 mt-2">Generate Tax Invoices →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Restock Modal */}
      {restockItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Restock Component</h3>
              <button
                onClick={() => setRestockItem(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-900">{restockItem.name}</p>
              <p className="text-[11px] font-mono text-gray-500">SKU: {restockItem.sku} • Current Stock: {restockItem.stock_quantity}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Quantity to Add</label>
              <input
                type="number"
                min="1"
                value={restockQty}
                onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-amber-400 outline-none"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                New stock total will become: <strong className="text-gray-900">{restockItem.stock_quantity + Number(restockQty)}</strong> units.
              </p>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setRestockItem(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickRestock}
                disabled={isSubmittingRestock}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 rounded-lg text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isSubmittingRestock ? 'Updating...' : 'Confirm Restock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
