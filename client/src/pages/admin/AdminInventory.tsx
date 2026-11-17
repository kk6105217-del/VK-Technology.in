import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Search,
  Save,
  Package,
  History,
  Plus,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { Product } from '../../types';

export const AdminInventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<number, number>>({});
  const [savedSuccessId, setSavedSuccessId] = useState<number | null>(null);
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Manual Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjProductId, setAdjProductId] = useState<number | ''>('');
  const [adjType, setAdjType] = useState('restock');
  const [adjQuantity, setAdjQuantity] = useState<number>(10);
  const [adjSupplier, setAdjSupplier] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    loadProducts();
    if (activeTab === 'movements') {
      loadMovements();
    }
  }, [activeTab]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const res = await api.products.getAdminAll();
      const list = res.products || [];
      setProducts(list);

      const map: Record<number, number> = {};
      list.forEach(p => { map[p.id] = p.stock_quantity; });
      setStockInputs(map);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const res = await api.inventoryAdmin.getMovements();
      setMovements(res.movements || []);
    } catch (e) {
      console.error('Failed to load movements:', e);
    }
  };

  const handleSaveStock = async (id: number) => {
    const val = stockInputs[id];
    if (val === undefined || isNaN(val) || val < 0) return;

    try {
      await api.products.updateStock(id, Number(val));
      setSavedSuccessId(id);
      setTimeout(() => setSavedSuccessId(null), 2000);
      loadProducts();
    } catch (e: any) {
      alert(e.message || 'Stock save failed');
    }
  };

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProductId || isNaN(Number(adjQuantity))) return;

    try {
      setIsAdjusting(true);
      await api.inventoryAdmin.adjustStock({
        product_id: Number(adjProductId),
        change_type: adjType,
        quantity_change: Number(adjQuantity),
        reason: adjReason,
        supplier_name: adjSupplier
      });
      setShowAdjustModal(false);
      setAdjProductId('');
      setAdjQuantity(10);
      setAdjSupplier('');
      setAdjReason('');
      loadProducts();
      loadMovements();
    } catch (err: any) {
      alert(err.message || 'Adjustment failed');
    } finally {
      setIsAdjusting(false);
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filterStock === 'low') return p.stock_quantity > 0 && p.stock_quantity <= 5;
    if (filterStock === 'out') return p.stock_quantity === 0;
    return true;
  });

  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length;
  const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-100 text-amber-900 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide">
              Warehouse & Stock Controller
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Inventory & Stock Controls
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor real-time component stock levels, prevent inventory stockouts, and record supplier deliveries.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold rounded-lg text-xs shadow-sm transition"
          >
            <Plus size={15} />
            <span>Record Restock / Adjustment</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center space-x-2 px-4 py-2 font-bold text-xs rounded-t-lg transition border-b-2 ${
            activeTab === 'stock'
              ? 'border-amber-500 text-gray-950 bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Boxes size={15} />
          <span>Stock Levels & SKU Management</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('movements');
            loadMovements();
          }}
          className={`flex items-center space-x-2 px-4 py-2 font-bold text-xs rounded-t-lg transition border-b-2 ${
            activeTab === 'movements'
              ? 'border-amber-500 text-gray-950 bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <History size={15} />
          <span>Movement Audit Ledger</span>
        </button>
      </div>

      {activeTab === 'stock' && (
        <>
          {/* Metric pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setFilterStock('all')}
              className={`p-4 rounded-xl border text-left transition ${
                filterStock === 'all' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Tracked SKUs</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{products.length}</div>
            </button>

            <button
              onClick={() => setFilterStock('low')}
              className={`p-4 rounded-xl border text-left transition ${
                filterStock === 'low' ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-400' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="text-xs font-semibold text-orange-700 uppercase">Low Stock Alert (≤ 5)</span>
              <div className="text-2xl font-black text-orange-600 mt-1">{lowStockCount}</div>
            </button>

            <button
              onClick={() => setFilterStock('out')}
              className={`p-4 rounded-xl border text-left transition ${
                filterStock === 'out' ? 'bg-red-50 border-red-400 ring-1 ring-red-400' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="text-xs font-semibold text-red-700 uppercase">Out of Stock (0 Units)</span>
              <div className="text-2xl font-black text-red-600 mt-1">{outOfStockCount}</div>
            </button>
          </div>

          {/* Search bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by component name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
              />
            </div>
            <div className="text-xs text-gray-500">
              Showing <strong>{filtered.length}</strong> products
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Component Item</th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Current Available Stock</th>
                    <th className="py-3 px-3">Adjust Stock Count</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((prod) => {
                    const isLow = prod.stock_quantity > 0 && prod.stock_quantity <= 5;
                    const isOut = prod.stock_quantity === 0;

                    return (
                      <tr key={prod.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4">
                          <strong className="text-gray-900 block truncate max-w-xs">{prod.name}</strong>
                          <span className="text-[10px] text-gray-400">ID #{prod.id}</span>
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-gray-700">
                          {prod.sku}
                        </td>

                        <td className="py-3 px-3 text-gray-600">
                          {prod.category_name || 'General'}
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold ${
                            isOut
                              ? 'bg-red-100 text-red-800'
                              : isLow
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isOut && <AlertTriangle size={12} className="mr-1 text-red-600" />}
                            {prod.stock_quantity} units
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              min="0"
                              value={stockInputs[prod.id] !== undefined ? stockInputs[prod.id] : prod.stock_quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setStockInputs(prev => ({ ...prev, [prod.id]: isNaN(val) ? 0 : val }));
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded font-mono font-bold text-center text-xs"
                            />
                            <span className="text-gray-400 text-[11px]">units</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleSaveStock(prod.id)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center space-x-1 ml-auto ${
                              savedSuccessId === prod.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-900 hover:bg-gray-800 text-white'
                            }`}
                          >
                            {savedSuccessId === prod.id ? (
                              <>
                                <CheckCircle2 size={13} />
                                <span>Updated!</span>
                              </>
                            ) : (
                              <>
                                <Save size={13} />
                                <span>Save</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Stock Movement Audit Trail</h3>
              <p className="text-xs text-gray-500">Complete historical log of customer orders, restock events, and manual corrections.</p>
            </div>
            <button
              onClick={loadMovements}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold transition flex items-center space-x-1"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          {movements.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400 italic">
              No stock movements recorded yet. Movements populate on orders, cancellations, and restocks.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Component</th>
                    <th className="py-3 px-4">Change Type</th>
                    <th className="py-3 px-4">Delta</th>
                    <th className="py-3 px-4">Stock (Before → After)</th>
                    <th className="py-3 px-4">Reason / Supplier</th>
                    <th className="py-3 px-4 text-right">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((m: any) => {
                    const isPositive = m.quantity_change > 0;

                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4 font-mono text-gray-500 text-[11px] whitespace-nowrap">
                          {m.created_at?.slice(0, 19).replace('T', ' ')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{m.product_name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{m.product_sku}</div>
                        </td>
                        <td className="py-3 px-4 font-bold capitalize text-gray-700">
                          {m.change_type}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center font-black ${
                            isPositive ? 'text-emerald-700' : 'text-red-600'
                          }`}>
                            {isPositive ? <ArrowUpRight size={13} className="mr-0.5" /> : <ArrowDownRight size={13} className="mr-0.5" />}
                            {isPositive ? `+${m.quantity_change}` : m.quantity_change}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-700">
                          {m.previous_quantity} → {m.new_quantity}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                          {m.reason || 'General inventory adjustment'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-gray-500">
                          {m.created_by}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual Stock Adjustment / Restock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                <Truck size={18} className="text-amber-500" />
                <span>Record Stock Adjustment / Restock</span>
              </h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualAdjust} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Component Product</label>
                <select
                  required
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-400 outline-none"
                >
                  <option value="">-- Choose Catalog SKU --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Available: {p.stock_quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Operation Type</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-400 outline-none"
                  >
                    <option value="restock">Restock / Inbound</option>
                    <option value="correction">Audit Correction</option>
                    <option value="damage">Damaged Write-off</option>
                    <option value="return">Customer Return</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Quantity Delta</label>
                  <input
                    type="number"
                    required
                    placeholder="+20 or -5"
                    value={adjQuantity}
                    onChange={(e) => setAdjQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Supplier Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Robokits India, Sunrom, Tenet Technetronics..."
                  value={adjSupplier}
                  onChange={(e) => setAdjSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason / Invoice Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Invoice #PO-9401 / Warehouse replenishment"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 rounded-lg text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {isAdjusting ? 'Recording...' : 'Record Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
