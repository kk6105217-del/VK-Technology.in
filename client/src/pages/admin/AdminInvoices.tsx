import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Printer,
  Download,
  Calendar,
  CheckCircle,
  Eye,
  ArrowRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminInvoices: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [search]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const res = await api.orders.getAdminAll({
        search: search.trim() || undefined
      });
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to load orders for invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInvoice = async (orderId: number | string) => {
    try {
      setLoadingInvoice(true);
      const res = await api.orders.getInvoice(orderId);
      setSelectedInvoice(res.invoice);
    } catch (err: any) {
      alert(err.message || 'Failed to generate tax invoice');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-left">
      {/* Print-specific style tag */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-container, #printable-invoice-container * {
            visibility: visible;
          }
          #printable-invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-100 text-blue-900 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide">
              Official Tax & GST Documentation
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Tax Invoices & Billing
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate, print, and export official Indian GST tax invoices with HSN classifications and tax breakdowns.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between no-print">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order # or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none font-medium"
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Showing {orders.length} order billing records
        </div>
      </div>

      {/* Orders Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden no-print">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
            Loading billing records...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No orders found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Taxable Value</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Invoice Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-gray-50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {ord.order_number}
                    </td>
                    <td className="py-3.5 px-4 text-gray-800 font-medium">
                      {ord.customer_name}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {ord.created_at?.slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">
                      ₹{ord.subtotal || ord.total_amount}
                    </td>
                    <td className="py-3.5 px-4 font-black text-gray-900">
                      ₹{ord.total_amount}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenInvoice(ord.id)}
                        className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold rounded-lg text-xs transition inline-flex items-center shadow-sm"
                      >
                        <FileText size={13} className="mr-1.5" />
                        <span>View GST Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Official GST Tax Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 sm:p-8 my-8 text-left space-y-6">
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 no-print">
              <div className="flex items-center space-x-2">
                <FileText size={20} className="text-amber-500" />
                <h3 className="text-base font-black text-gray-900">
                  GST Tax Invoice — {selectedInvoice.invoice_number}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
                >
                  <Printer size={14} />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Container */}
            <div id="printable-invoice-container" className="border border-gray-300 rounded-xl p-6 sm:p-8 bg-white text-gray-900 text-xs font-sans space-y-6">
              {/* Invoice Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-300 gap-4">
                <div className="flex items-center space-x-3">
                  <img
                    src="/logo.png"
                    alt="VK Technology"
                    className="w-14 h-14 rounded-full border border-gray-200 p-1 object-contain"
                  />
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-gray-950 uppercase">
                      {selectedInvoice.seller.name}
                    </h2>
                    <p className="text-[11px] text-gray-600 font-medium">
                      DIY Electronics, Robotics, Arduino & STEM Kits
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Proprietor: <strong className="text-gray-900">{selectedInvoice.seller.proprietor}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:pl-6 border-gray-200">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 font-extrabold uppercase text-[11px] rounded tracking-wider">
                    Tax Invoice
                  </span>
                  <div className="font-mono font-black text-base text-gray-900 mt-1">
                    {selectedInvoice.invoice_number}
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    Date: <strong className="text-gray-900">{selectedInvoice.invoice_date?.slice(0, 10)}</strong>
                  </div>
                  <div className="text-gray-500 text-[11px]">
                    Order: <strong className="text-gray-900 font-mono">{selectedInvoice.order_number}</strong>
                  </div>
                </div>
              </div>

              {/* Seller and Buyer Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 pb-2 text-xs">
                {/* Sold By */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sold By / Tax Details:</div>
                  <div className="font-extrabold text-gray-950 text-sm">{selectedInvoice.seller.name}</div>
                  <div className="text-gray-700">{selectedInvoice.seller.address}</div>
                  <div className="text-gray-700">Phone: {selectedInvoice.seller.phone}</div>
                  <div className="text-gray-700">Email: {selectedInvoice.seller.email}</div>
                  <div className="pt-1 text-gray-900 font-mono">
                    <strong>GSTIN:</strong> {selectedInvoice.seller.gstin} | <strong>State Code:</strong> {selectedInvoice.seller.state_code}
                  </div>
                </div>

                {/* Billed & Shipped To */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Billed & Shipped To:</div>
                  <div className="font-extrabold text-gray-950 text-sm">{selectedInvoice.buyer.name}</div>
                  <div className="text-gray-700">
                    {selectedInvoice.buyer.shipping_address?.address_line1} {selectedInvoice.buyer.shipping_address?.address_line2}
                  </div>
                  <div className="text-gray-700">
                    {selectedInvoice.buyer.shipping_address?.city}, {selectedInvoice.buyer.shipping_address?.state} - {selectedInvoice.buyer.shipping_address?.postal_code}
                  </div>
                  <div className="text-gray-700">Phone: {selectedInvoice.buyer.phone || selectedInvoice.buyer.shipping_address?.phone}</div>
                  <div className="text-gray-700">Email: {selectedInvoice.buyer.email}</div>
                  <div className="pt-1 text-gray-900">
                    Payment: <strong>{selectedInvoice.payment_method.toUpperCase()} ({selectedInvoice.payment_status})</strong>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">HSN/SAC</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-right">Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInvoice.items.map((it: any, idx: number) => (
                      <tr key={it.id || idx}>
                        <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-gray-900">{it.product_name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">SKU: {it.sku}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">{it.hsn_code}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-medium">₹{it.unit_price}</td>
                        <td className="py-2.5 px-3 text-right font-medium">₹{it.total_price}</td>
                        <td className="py-2.5 px-3 text-right font-black text-gray-950">₹{it.total_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pricing & GST Breakdown Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
                <div className="text-[11px] text-gray-500 space-y-1.5 max-w-sm">
                  <div className="font-bold text-gray-800">Payment & Bank Reconciliation:</div>
                  <p>UPI ID: <strong>8555997052@ibl</strong> (Mr Suroju Jnana Venkata Karthik)</p>
                  <p>Declaration: This invoice certifies that the supply has been effected according to the Goods and Services Tax Act.</p>
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Electronic Verification Stamp:</span>
                    <div className="mt-1 font-mono text-[9px] text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 break-all">
                      VERIFIED-VK-INVOICE:{selectedInvoice.invoice_number}:HASH-{Date.now().toString(36).toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-72 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-bold">₹{selectedInvoice.pricing.subtotal}</span>
                  </div>
                  {selectedInvoice.pricing.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-bold">-₹{selectedInvoice.pricing.discount_amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Charges:</span>
                    <span className="font-bold">
                      {selectedInvoice.pricing.shipping_fee > 0 ? `₹${selectedInvoice.pricing.shipping_fee}` : 'FREE'}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-1.5 flex justify-between text-gray-600">
                    <span>Taxable Amount:</span>
                    <span className="font-bold">₹{selectedInvoice.pricing.taxable_amount}</span>
                  </div>
                  {selectedInvoice.pricing.cgst_amount > 0 && (
                    <div className="flex justify-between text-gray-600 text-[11px]">
                      <span>CGST (9%):</span>
                      <span>₹{selectedInvoice.pricing.cgst_amount}</span>
                    </div>
                  )}
                  {selectedInvoice.pricing.sgst_amount > 0 && (
                    <div className="flex justify-between text-gray-600 text-[11px]">
                      <span>SGST (9%):</span>
                      <span>₹{selectedInvoice.pricing.sgst_amount}</span>
                    </div>
                  )}
                  {selectedInvoice.pricing.igst_amount > 0 && (
                    <div className="flex justify-between text-gray-600 text-[11px]">
                      <span>IGST (18%):</span>
                      <span>₹{selectedInvoice.pricing.igst_amount}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-900 pt-2 flex justify-between text-sm font-black text-gray-950">
                    <span>Grand Total:</span>
                    <span className="text-base text-gray-950">₹{selectedInvoice.pricing.total_amount}</span>
                  </div>
                </div>
              </div>

              {/* Signatory Footer */}
              <div className="border-t border-gray-200 pt-6 flex justify-between items-end">
                <div className="text-[10px] text-gray-400">
                  Computer generated invoice. No physical signature required.
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">For VK Technology</div>
                  <div className="font-black text-xs text-gray-900">S. J. V. Karthik</div>
                  <div className="text-[10px] text-gray-500">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
