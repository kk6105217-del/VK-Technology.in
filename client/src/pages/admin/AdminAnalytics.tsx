import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  TrendingUp, IndianRupee, ShoppingCart, Package, Users, CreditCard,
  Percent, Download, FileSpreadsheet, FileText, AlertTriangle, CheckCircle2,
  Calendar, Shield, BarChart3, Clock, Eye, Layers, ArrowUpRight
} from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'sales' | 'products' | 'customers' | 'inventory' | 'promotions'>('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      let startDate: string | undefined;
      const now = new Date();
      if (dateRange === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '90d') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      }

      const res = await api.analytics.getDashboard(startDate, now.toISOString());
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = async (domain: string) => {
    try {
      setIsExporting(true);
      const url = api.analytics.downloadCsvUrl(domain);
      const token = localStorage.getItem('vk_auth_token');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `vk_technology_${domain}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Failed to download CSV export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setIsExporting(true);
      const url = api.analytics.downloadExcelUrl();
      const token = localStorage.getItem('vk_auth_token');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `vk_technology_analytics_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Failed to download Excel workbook');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const { role, domains } = data;
  const { finance, salesOps, products, customers, payments, inventory, promotions } = domains;
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'admin';

  return (
    <div className="space-y-6">
      
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="text-amber-500" size={24} />
            <span>Platform Analytics & Business Intelligence</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time multi-domain analytics, inventory valuation, and role-governed data exports.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Active Role Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold border border-gray-800">
            <Shield size={14} className="text-amber-400" />
            <span>Role: <strong className="text-amber-400">{role}</strong></span>
          </div>

          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Export Button */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow"
          >
            <Download size={14} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500">
            <span>Gross Revenue</span>
            <IndianRupee size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900">
            {finance.hasAccess ? `₹${finance.grossRevenue.toLocaleString('en-IN')}` : '••••••'}
          </div>
          <div className="text-[10px] text-gray-400 font-medium">
            {finance.hasAccess ? `Net: ₹${finance.netRevenue.toLocaleString('en-IN')}` : 'Requires SUPER_ADMIN'}
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500">
            <span>Total Orders</span>
            <ShoppingCart size={16} className="text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900">
            {salesOps.totalOrders}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold">
            {salesOps.fulfillmentRate}% Fulfillment Rate
          </div>
        </div>

        {/* Active Catalog */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500">
            <span>Active Products</span>
            <Package size={16} className="text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900">
            {products.totalActiveProducts}
          </div>
          <div className="text-[10px] text-orange-600 font-semibold">
            {products.lowStockCount} low stock alerts
          </div>
        </div>

        {/* Customers */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500">
            <span>Total Customers</span>
            <Users size={16} className="text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900">
            {customers.totalCustomers}
          </div>
          <div className="text-[10px] text-gray-400 font-medium">
            {customers.repeatCustomerRate}% Repeat Order Rate
          </div>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="flex border-b border-gray-200 space-x-1 overflow-x-auto text-xs font-bold">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'finance', label: 'Finance (Super Admin)', icon: IndianRupee },
          { id: 'sales', label: 'Sales Operations', icon: ShoppingCart },
          { id: 'products', label: 'Products & Catalog', icon: Package },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'inventory', label: 'Inventory & Stock', icon: Layers },
          { id: 'promotions', label: 'Promotions & Coupons', icon: Percent },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600 font-extrabold bg-amber-50/40'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Order Status Breakdown */}
          <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">Orders by Status</h3>
            <div className="space-y-2">
              {salesOps.ordersByStatus.map((st: any) => (
                <div key={st.status} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>{st.status}</span>
                    <span>{st.count} orders ({st.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        st.status === 'Delivered' ? 'bg-emerald-500' :
                        st.status === 'Cancelled' ? 'bg-red-500' :
                        st.status === 'Shipped' ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${st.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Health */}
          <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">Warehouse Inventory Health</h3>
            <div className="flex items-center space-x-4 pt-2">
              <div className="text-3xl font-black text-gray-900">
                {inventory.stockHealthPercentage}%
              </div>
              <div className="text-xs text-gray-500">
                <span>Healthy In-Stock Ratio</span>
                <p className="text-[10px] text-gray-400">Total Units: {inventory.totalUnitsInStock.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${inventory.stockHealthPercentage}%` }}></div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
              <div className="p-2 bg-orange-50 border border-orange-200 rounded text-orange-900">
                <strong>{inventory.lowStockCount}</strong> Low Stock Items
              </div>
              <div className="p-2 bg-red-50 border border-red-200 rounded text-red-900">
                <strong>{inventory.outOfStockCount}</strong> Out of Stock
              </div>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="lg:col-span-12 bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">Top Selling DIY Components</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3 text-center">Units Sold</th>
                    {finance.hasAccess && <th className="py-2 px-3 text-right">Revenue (INR)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {products.topSelling.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-semibold">{p.product_name}</td>
                      <td className="py-2 px-3 font-mono text-gray-500">{p.product_sku}</td>
                      <td className="py-2 px-3 text-center font-bold text-amber-600">{p.unitsSold}</td>
                      {finance.hasAccess && (
                        <td className="py-2 px-3 text-right font-bold text-gray-900">
                          ₹{p.revenue.toLocaleString('en-IN')}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Finance Domain */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {!finance.hasAccess ? (
            <div className="p-8 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
              <Shield size={32} className="mx-auto text-amber-600" />
              <h3 className="text-base font-bold text-gray-900">Financial Revenue Restricted</h3>
              <p className="text-xs text-gray-600 max-w-md mx-auto">
                Gross revenue, net margins, and financial ledgers are strictly governed by RBAC and restricted to <strong>SUPER_ADMIN</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-gray-500">Gross Revenue</span>
                <div className="text-2xl font-black text-gray-900">₹{finance.grossRevenue.toLocaleString('en-IN')}</div>
                <span className="text-[10px] text-gray-400">All completed prepaid & verified orders</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-gray-500">Average Order Value (AOV)</span>
                <div className="text-2xl font-black text-gray-900">₹{finance.averageOrderValue.toLocaleString('en-IN')}</div>
                <span className="text-[10px] text-gray-400">Calculated per non-cancelled order</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-gray-500">Total Discounts Applied</span>
                <div className="text-2xl font-black text-red-600">-₹{finance.totalDiscounts.toLocaleString('en-IN')}</div>
                <span className="text-[10px] text-gray-400">Via promo coupons and discounts</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Sales Operations */}
      {activeTab === 'sales' && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-gray-900">Recent Customer Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {salesOps.recentOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{o.order_number}</td>
                    <td className="py-2.5 px-3 font-semibold">{o.customer_name}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-500">{o.customer_email}</td>
                    <td className="py-2.5 px-3">{o.payment_method}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        o.order_status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {o.order_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                      {o.total_amount ? `₹${o.total_amount.toLocaleString('en-IN')}` : '[RESTRICTED]'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Inventory & Stock */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-gray-500">Total Units in Stock</span>
              <div className="text-2xl font-black text-gray-900">{inventory.totalUnitsInStock.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-gray-500">Warehouse Stock Valuation</span>
              <div className="text-2xl font-black text-gray-900">
                {isSuperAdmin ? `₹${inventory.totalValuation.toLocaleString('en-IN')}` : '••••••'}
              </div>
              <span className="text-[10px] text-gray-400">{isSuperAdmin ? 'Computed at regular retail price' : 'Requires SUPER_ADMIN'}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-gray-500">Stock Health Ratio</span>
              <div className="text-2xl font-black text-emerald-600">{inventory.stockHealthPercentage}%</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center space-x-1.5 text-orange-600">
              <AlertTriangle size={16} />
              <span>Low Stock Reorder Alerts</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3 text-center">Remaining Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {inventory.lowStockItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-semibold">{item.name}</td>
                      <td className="py-2 px-3 font-mono text-gray-500">{item.sku}</td>
                      <td className="py-2 px-3 text-center font-bold text-red-600">{item.stock_quantity} left</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Promotions & Coupons */}
      {activeTab === 'promotions' && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-gray-900">Promotions & Promo Code Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <th className="py-2 px-3">Coupon Code</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Discount</th>
                  <th className="py-2 px-3 text-center">Times Used</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {promotions.coupons.map((c: any) => (
                  <tr key={c.code} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono font-bold text-amber-600">{c.code}</td>
                    <td className="py-2 px-3 text-gray-600">{c.description}</td>
                    <td className="py-2 px-3 font-semibold">
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-gray-900">{c.times_used}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Customers */}
      {activeTab === 'customers' && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-gray-900">Customer Engagement & Lifetime Value</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <th className="py-2 px-3">Customer ID</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3 text-center">Total Orders</th>
                  {isSuperAdmin && <th className="py-2 px-3 text-right">Lifetime Spend</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {customers.topCustomers.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-gray-400">#{c.id}</td>
                    <td className="py-2 px-3 font-semibold text-gray-900">{c.full_name}</td>
                    <td className="py-2 px-3 font-mono text-gray-500">{c.email}</td>
                    <td className="py-2 px-3 text-center font-bold text-amber-600">{c.orderCount}</td>
                    {isSuperAdmin && (
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">
                        ₹{c.totalSpent.toLocaleString('en-IN')}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Reports Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-gray-900 flex items-center space-x-2">
                <Download size={18} className="text-amber-500" />
                <span>Export Analytics Reports</span>
              </h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Downloads comply with <strong>RFC 4180</strong> with <strong>UTF-8 BOM</strong> and formula injection protection. Role masking is automatically applied for <strong>{role}</strong>.
            </p>

            {/* Excel Multi-Sheet Workbook */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                <FileSpreadsheet size={16} className="text-emerald-700" />
                <span>Complete Multi-Sheet Excel Workbook (.xlsx)</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Exports all authorized domains into formatted multi-sheet Excel spreadsheet.
              </p>
              <button
                disabled={isExporting}
                onClick={handleDownloadExcel}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-xs transition flex items-center justify-center space-x-1"
              >
                <Download size={13} />
                <span>Download Multi-Sheet Excel Workbook</span>
              </button>
            </div>

            {/* Individual Domain CSV Exports */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Individual RFC 4180 CSV Reports
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleDownloadCsv('sales')}
                  className="py-1.5 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded font-semibold text-gray-700 text-left flex justify-between items-center"
                >
                  <span>Sales Orders</span>
                  <FileText size={12} className="text-gray-400" />
                </button>
                <button
                  onClick={() => handleDownloadCsv('products')}
                  className="py-1.5 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded font-semibold text-gray-700 text-left flex justify-between items-center"
                >
                  <span>Product Catalog</span>
                  <FileText size={12} className="text-gray-400" />
                </button>
                <button
                  onClick={() => handleDownloadCsv('inventory')}
                  className="py-1.5 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded font-semibold text-gray-700 text-left flex justify-between items-center"
                >
                  <span>Inventory Stock</span>
                  <FileText size={12} className="text-gray-400" />
                </button>
                <button
                  onClick={() => handleDownloadCsv('customers')}
                  className="py-1.5 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded font-semibold text-gray-700 text-left flex justify-between items-center"
                >
                  <span>Customers</span>
                  <FileText size={12} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setExportModalOpen(false)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
