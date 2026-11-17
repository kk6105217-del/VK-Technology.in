import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Check,
  CheckSquare,
  Archive,
  RotateCcw,
  ShieldAlert,
  Layers,
  RefreshCw,
  History,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';
import { Product, Category } from '../../types';
import { useCatalogSync } from '../../hooks/useCatalogSync';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [recycleBinProducts, setRecycleBinProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'recycle_bin'>('active');
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Bulk Selection and Operations State
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Permanent Delete Modal State (Super Admin Only)
  const [isPermanentModalOpen, setIsPermanentModalOpen] = useState(false);
  const [permanentTargetIds, setPermanentTargetIds] = useState<number[]>([]);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [isPermDeleting, setIsPermDeleting] = useState(false);
  const [permError, setPermError] = useState('');

  // Catalog Audit & Selective Recovery Modal
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryAudit, setRecoveryAudit] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [subcategory, setSubcategory] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [regularPrice, setRegularPrice] = useState<number | string>('');
  const [discountedPrice, setDiscountedPrice] = useState<number | string>('');
  const [stockQuantity, setStockQuantity] = useState<number | string>(10);
  const [brand, setBrand] = useState('VK Technology');
  const [compatibility, setCompatibility] = useState('Arduino IDE, PlatformIO, 5V/3.3V logic');
  const [shippingWeight, setShippingWeight] = useState<number | string>(250);
  const [estimatedDispatch, setEstimatedDispatch] = useState<number | string>(1);
  const [warrantyInfo, setWarrantyInfo] = useState('6 Months Manufacturer Warranty');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Dynamic Specs & Features arrays
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([
    { key: 'Operating Voltage', value: '5V DC' },
    { key: 'Microcontroller', value: 'ATmega328P' }
  ]);
  const [features, setFeatures] = useState<string[]>(['100% Genuine tested component', 'Breadboard friendly pin headers']);
  const [packageContents, setPackageContents] = useState<string[]>(['1x Board/Module']);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Real-time synchronization: automatically reload if any product updates
  useCatalogSync(() => {
    loadData();
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [catsRes, prodsRes, binRes] = await Promise.all([
        api.categories.getAll(),
        api.products.getAdminAll({ status: 'all' }),
        api.products.getRecycleBin()
      ]);
      setCategories(catsRes.categories || []);
      setProducts(prodsRes.products || []);
      setRecycleBinProducts(binRes.products || []);
      if (catsRes.categories && catsRes.categories.length > 0 && !categoryId) {
        setCategoryId(catsRes.categories[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`VK-${Date.now().toString().slice(-4)}`);
    setSubcategory('');
    setShortDescription('');
    setDescription('');
    setRegularPrice('');
    setDiscountedPrice('');
    setStockQuantity(25);
    setBrand('VK Technology');
    setCompatibility('Arduino IDE, PlatformIO, 5V/3.3V logic');
    setShippingWeight(250);
    setEstimatedDispatch(1);
    setWarrantyInfo('6 Months Manufacturer Warranty');
    setIsFeatured(false);
    setIsActive(true);
    setSpecs([{ key: 'Operating Voltage', value: '5V DC' }]);
    setFeatures(['High quality tested component']);
    setPackageContents(['1x Main Module']);
    setImages(['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80']);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setCategoryId(p.category_id);
    setSubcategory(p.subcategory || '');
    setShortDescription(p.short_description || '');
    setDescription(p.description);
    setRegularPrice(p.regular_price);
    setDiscountedPrice(p.discounted_price || '');
    setStockQuantity(p.stock_quantity);
    setBrand(p.brand || 'VK Technology');
    setCompatibility(p.compatibility || '');
    setShippingWeight(p.shipping_weight_grams || 250);
    setEstimatedDispatch(p.estimated_dispatch_days || 1);
    setWarrantyInfo(p.warranty_info || '6 Months Warranty');
    setIsFeatured(!!p.is_featured);
    setIsActive(!!p.is_active);

    // Convert specs
    if (p.specifications && typeof p.specifications === 'object') {
      setSpecs(Object.entries(p.specifications).map(([key, value]) => ({ key, value: String(value) })));
    } else {
      setSpecs([]);
    }

    setFeatures(p.features || []);
    setPackageContents(p.package_contents || []);

    // Extract all images reliably (handles object array and string array)
    const extractedImages: string[] = [];
    if (Array.isArray(p.images) && p.images.length > 0) {
      p.images.forEach((img: any) => {
        const u = typeof img === 'string' ? img : (img?.image_url || img?.url);
        if (u && typeof u === 'string' && u.trim().length > 0 && !extractedImages.includes(u.trim())) {
          extractedImages.push(u.trim());
        }
      });
    }
    if (p.primary_image && typeof p.primary_image === 'string' && !extractedImages.includes(p.primary_image)) {
      extractedImages.unshift(p.primary_image);
    }
    if (extractedImages.length === 0) {
      extractedImages.push('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80');
    }

    setImages(extractedImages);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await api.upload.single(file);
      // Place newly uploaded image first as the primary product photo
      setImages(prev => [res.url, ...prev.filter(url => url !== res.url)]);
    } catch (err: any) {
      alert(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!name || !sku || !regularPrice) {
      setFormError('Name, SKU, and Regular Price are required.');
      return;
    }

    // Build specs map
    const specsMap: Record<string, string> = {};
    specs.forEach(s => {
      if (s.key.trim()) specsMap[s.key.trim()] = s.value.trim();
    });

    const cleanImages = images.filter(img => typeof img === 'string' && img.trim().length > 0);
    const finalPrimaryImage = cleanImages[0] || editingProduct?.primary_image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80';
    const computedSlug = (editingProduct?.slug || name.trim())
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `product-${editingProduct?.id || Date.now()}`;

    const payload = {
      name: name.trim(),
      slug: computedSlug,
      sku: sku.trim().toUpperCase(),
      category_id: Number(categoryId),
      subcategory: subcategory.trim() || undefined,
      short_description: shortDescription.trim() || undefined,
      description: description.trim() || name.trim(),
      regular_price: Number(regularPrice),
      discounted_price: (discountedPrice !== '' && discountedPrice !== null && discountedPrice !== undefined) ? Number(discountedPrice) : null,
      stock_quantity: Number(stockQuantity || 0),
      brand: brand.trim(),
      compatibility: compatibility.trim(),
      shipping_weight_grams: Number(shippingWeight || 250),
      estimated_dispatch_days: Number(estimatedDispatch || 1),
      warranty_info: warrantyInfo.trim(),
      is_featured: isFeatured,
      is_active: isActive,
      specifications: specsMap,
      features: features.filter(f => f.trim().length > 0),
      package_contents: packageContents.filter(p => p.trim().length > 0),
      primary_image: finalPrimaryImage,
      images: cleanImages
    };

    try {
      setFormSubmitting(true);
      if (editingProduct) {
        await api.products.update(editingProduct.id, payload);
        setFormSuccess('Product price and photos updated successfully.');
      } else {
        await api.products.create(payload);
        setFormSuccess('Product created successfully.');
      }
      await loadData();
      setTimeout(() => setIsModalOpen(false), 1200);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Safe Archive: Soft-deletes product and moves to Recycle Bin
  const handleArchiveProduct = async (id: number, prodName: string) => {
    if (window.confirm(`Move "${prodName}" to the Recycle Bin?\n\nIt will be unpublished from the public storefront and customer checkout, but safely preserved in the database.`)) {
      try {
        await api.products.archive(id);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to archive product');
      }
    }
  };

  // Restore product from Recycle Bin back to Active catalog
  const handleRestoreProduct = async (id: number, prodName: string) => {
    try {
      await api.products.restore(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to restore product');
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean | number) => {
    try {
      await api.products.toggleStatus(id, !currentStatus);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Status toggle failed');
    }
  };

  const handleQuickStock = async (id: number, newStock: number) => {
    try {
      await api.products.updateStock(id, Math.max(0, newStock));
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Stock update failed');
    }
  };

  // Filter products locally based on active tab
  const currentCatalog = activeTab === 'active' ? products : recycleBinProducts;
  const filteredProducts = currentCatalog.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = !filterCategory || p.category_id === Number(filterCategory);
    return matchesSearch && matchesCat;
  });

  const isAllSelected = filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectProduct = (id: number) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Bulk Safe Archive (Active Tab)
  const handleBulkArchive = async () => {
    if (selectedProductIds.length === 0) return;
    const confirmPrompt = `Move ${selectedProductIds.length} selected products to the Recycle Bin?\n\nThey will be safely archived and unpublished from the public storefront.`;

    if (window.confirm(confirmPrompt)) {
      try {
        setIsBulkOperating(true);
        const res = await api.products.bulkArchive(selectedProductIds);
        setSelectedProductIds([]);
        await loadData();
        alert(res.message);
      } catch (err: any) {
        alert(err.message || 'Failed to archive selected products.');
      } finally {
        setIsBulkOperating(false);
      }
    }
  };

  // Bulk Restore (Recycle Bin Tab)
  const handleBulkRestore = async () => {
    if (selectedProductIds.length === 0) return;
    try {
      setIsBulkOperating(true);
      const res = await api.products.bulkRestore(selectedProductIds);
      setSelectedProductIds([]);
      await loadData();
      alert(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to restore selected products.');
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Permanent Delete Modal opener (Super Admin)
  const openPermanentDeleteModal = (ids: number[]) => {
    setPermanentTargetIds(ids);
    setConfirmPhrase('');
    setPermError('');
    setIsPermanentModalOpen(true);
  };

  const handleExecutePermanentDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPhrase !== 'DELETE PERMANENTLY') {
      setPermError('You must type exactly "DELETE PERMANENTLY" to confirm.');
      return;
    }

    try {
      setIsPermDeleting(true);
      setPermError('');
      const res = await api.products.permanentDelete({
        ids: permanentTargetIds,
        confirmPhrase
      });
      setIsPermanentModalOpen(false);
      setSelectedProductIds([]);
      await loadData();
      alert(res.message);
    } catch (err: any) {
      setPermError(err.message || 'Permanent deletion failed.');
    } finally {
      setIsPermDeleting(false);
    }
  };

  // Catalog Audit & Selective Recovery
  const handleOpenAuditModal = async () => {
    try {
      setIsAuditing(true);
      setRecoveryMessage('');
      const report = await api.products.recoverCatalog({ dryRun: true });
      setRecoveryAudit(report);
      setIsRecoveryModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to audit catalog');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleExecuteSelectiveRecovery = async () => {
    if (!window.confirm('Are you sure you want to restore archived products and re-insert missing canonical products?\n\nThis will NOT overwrite customer accounts, orders, or modified products.')) {
      return;
    }
    try {
      setIsRecovering(true);
      const res = await api.products.recoverCatalog({ dryRun: false, execute: true });
      setRecoveryMessage(res.message);
      await loadData();
      const updatedAudit = await api.products.recoverCatalog({ dryRun: true });
      setRecoveryAudit(updatedAudit);
    } catch (err: any) {
      alert(err.message || 'Recovery execution failed.');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleBulkToggleStatus = async (publish: boolean) => {
    if (selectedProductIds.length === 0) return;
    try {
      setIsBulkOperating(true);
      const res = await api.products.bulkToggleStatus(selectedProductIds, publish);
      await loadData();
      alert(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to update selected products.');
    } finally {
      setIsBulkOperating(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-xs text-gray-500">
            Add, edit, upload images, adjust pricing, and control inventory for all DIY electronics.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
                setSelectedProductIds([]);
              } else {
                setSelectedProductIds(filteredProducts.map(p => p.id));
              }
            }}
            className="border border-gray-300 hover:border-gray-400 bg-white text-gray-700 font-semibold px-3 py-2 rounded text-xs shadow-sm flex items-center space-x-1.5 transition"
          >
            <CheckSquare size={14} className="text-amber-500" />
            <span>
              {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0
                ? 'Deselect All'
                : `Select All (${filteredProducts.length})`}
            </span>
          </button>
          <button
            onClick={openCreateModal}
            className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-2 rounded text-xs shadow flex items-center space-x-1.5 transition"
          >
            <Plus size={16} />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs: Active Products vs Recycle Bin */}
      <div className="flex items-center space-x-2 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('active'); setSelectedProductIds([]); }}
          aria-label="Active Products Tab"
          className={`pb-2.5 px-4 text-xs font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'active'
              ? 'border-amber-500 text-amber-700 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers size={14} />
          <span>Active Products</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'active' ? 'bg-amber-200 text-amber-900' : 'bg-gray-100 text-gray-600'
          }`}>
            {products.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('recycle_bin'); setSelectedProductIds([]); }}
          aria-label="Recycle Bin Tab"
          className={`pb-2.5 px-4 text-xs font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'recycle_bin'
              ? 'border-red-500 text-red-700 bg-red-50/50 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Trash2 size={14} />
          <span>Recycle Bin</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'recycle_bin' ? 'bg-red-200 text-red-900' : 'bg-gray-100 text-gray-600'
          }`}>
            {recycleBinProducts.length}
          </span>
        </button>

        <div className="flex-1" />

        <button
          onClick={handleOpenAuditModal}
          className="pb-2 text-xs font-semibold text-gray-600 hover:text-indigo-600 flex items-center space-x-1.5 transition px-2"
          title="Audit and recover canonical catalog products"
        >
          <RefreshCw size={13} className={isAuditing ? 'animate-spin' : ''} />
          <span>Audit Catalog (24 Products)</span>
        </button>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedProductIds.length > 0 && (
        <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg border border-gray-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-gray-950 font-bold text-xs flex items-center justify-center">
              {selectedProductIds.length}
            </div>
            <span className="text-xs font-semibold text-gray-200">
              {selectedProductIds.length} of {currentCatalog.length} {activeTab === 'active' ? 'active' : 'archived'} products selected
            </span>
            {selectedProductIds.length < filteredProducts.length && (
              <button
                onClick={() => setSelectedProductIds(filteredProducts.map(p => p.id))}
                className="text-[11px] text-amber-400 hover:underline font-medium"
              >
                Select all {filteredProducts.length} visible
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {activeTab === 'active' ? (
              <>
                <button
                  disabled={isBulkOperating}
                  onClick={() => handleBulkToggleStatus(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-emerald-900/60 font-semibold px-3 py-1.5 rounded text-xs flex items-center space-x-1 transition disabled:opacity-50"
                >
                  <Eye size={13} />
                  <span>Publish Selected</span>
                </button>
                <button
                  disabled={isBulkOperating}
                  onClick={() => handleBulkToggleStatus(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-900/60 font-semibold px-3 py-1.5 rounded text-xs flex items-center space-x-1 transition disabled:opacity-50"
                >
                  <EyeOff size={13} />
                  <span>Unpublish Selected</span>
                </button>
                <button
                  disabled={isBulkOperating}
                  onClick={handleBulkArchive}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded text-xs shadow flex items-center space-x-1 transition disabled:opacity-50"
                >
                  <Archive size={13} />
                  <span>Archive Selected ({selectedProductIds.length})</span>
                </button>
              </>
            ) : (
              <>
                <button
                  disabled={isBulkOperating}
                  onClick={handleBulkRestore}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-xs shadow flex items-center space-x-1 transition disabled:opacity-50"
                >
                  <RotateCcw size={13} />
                  <span>Restore Selected ({selectedProductIds.length})</span>
                </button>
                <button
                  disabled={isBulkOperating}
                  onClick={() => openPermanentDeleteModal(selectedProductIds)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded text-xs shadow flex items-center space-x-1 transition disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  <span>Permanently Delete Selected ({selectedProductIds.length})</span>
                </button>
              </>
            )}
            <button
              onClick={() => setSelectedProductIds([])}
              className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-gray-800 transition"
              title="Deselect All"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 bg-white rounded px-3 py-2 text-xs focus:outline-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500 shrink-0">
            Total: <strong>{filteredProducts.length}</strong> items
          </span>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={isAllSelected}
                    ref={el => {
                      if (el) {
                        el.indeterminate = selectedProductIds.length > 0 && !isAllSelected;
                      }
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-400 cursor-pointer w-4 h-4"
                  />
                </th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Price (₹)</th>
                <th className="py-3 px-3">Stock Count</th>
                <th className="py-3 px-3">{activeTab === 'active' ? 'Status' : 'Archived At'}</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    {activeTab === 'recycle_bin' ? (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Trash2 size={32} className="text-gray-300" />
                        <p className="font-semibold text-gray-700">Recycle Bin is empty</p>
                        <p className="text-xs text-gray-400">Products moved to Recycle Bin will be safely preserved here.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Layers size={32} className="text-gray-300" />
                        <p className="font-semibold text-gray-700">No active products match your criteria</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock_quantity <= 0;
                  const isLowStock = p.stock_quantity > 0 && p.stock_quantity <= 5;
                  const isSelected = selectedProductIds.includes(p.id);

                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition ${isSelected ? 'bg-amber-50/40' : ''}`}>
                      <td className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${p.name}`}
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(p.id)}
                          className="rounded border-gray-300 text-amber-500 focus:ring-amber-400 cursor-pointer w-4 h-4"
                        />
                      </td>
                      <td className="py-3 px-4 flex items-center space-x-3">
                        <img
                          src={p.primary_image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=100&q=80'}
                          alt={p.name}
                          className="w-10 h-10 object-contain rounded border bg-gray-50 p-1 shrink-0"
                        />
                        <div>
                          {activeTab === 'active' ? (
                            <Link
                              to={`/product/${p.slug}`}
                              target="_blank"
                              className="font-bold text-gray-900 hover:text-amber-600 line-clamp-1"
                            >
                              {p.name}
                            </Link>
                          ) : (
                            <span className="font-bold text-gray-700 line-clamp-1">
                              {p.name}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400 font-mono block">
                            SKU: {p.sku} {p.brand ? `• ${p.brand}` : ''}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-gray-600">
                        {p.category_name || 'Electronics'}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">
                          ₹{p.discounted_price || p.regular_price}
                        </div>
                        {p.discounted_price && (
                          <span className="text-[10px] text-gray-400 line-through">
                            ₹{p.regular_price}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {activeTab === 'active' ? (
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleQuickStock(p.id, p.stock_quantity - 1)}
                              aria-label={`Decrease stock for ${p.name}`}
                              className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className={`font-mono font-bold px-1.5 ${
                              isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-gray-900'
                            }`}>
                              {p.stock_quantity}
                            </span>
                            <button
                              onClick={() => handleQuickStock(p.id, p.stock_quantity + 1)}
                              aria-label={`Increase stock for ${p.name}`}
                              className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono font-semibold text-gray-600">
                            {p.stock_quantity} units
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {activeTab === 'active' ? (
                          <button
                            onClick={() => handleToggleStatus(p.id, p.is_active)}
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                              p.is_active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {p.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                            <span>{p.is_active ? 'Published' : 'Hidden'}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                            <History size={11} />
                            <span>{p.deleted_at ? new Date(p.deleted_at).toLocaleDateString() : 'Archived'}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        {activeTab === 'active' ? (
                          <>
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1 text-gray-600 hover:text-amber-600 transition"
                              title="Edit Product"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleArchiveProduct(p.id, p.name)}
                              className="p-1 text-gray-400 hover:text-amber-600 transition"
                              title="Move to Recycle Bin (Safe Archive)"
                            >
                              <Archive size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestoreProduct(p.id, p.name)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded border border-emerald-300 inline-flex items-center space-x-1 transition text-xs"
                              title="Restore to Active Storefront"
                            >
                              <RotateCcw size={13} />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => openPermanentDeleteModal([p.id])}
                              className="p-1 text-gray-400 hover:text-red-600 transition inline-block align-middle"
                              title="Permanently Delete (Super Admin Only)"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs text-left animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New DIY Electronic Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {formSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded flex items-center">
                  <CheckCircle2 size={16} className="mr-2" />
                  <span>{formSuccess}</span>
                </div>
              )}
              {formError && (
                <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  <span>{formError}</span>
                </div>
              )}

              <form id="productForm" onSubmit={handleSaveProduct} className="space-y-4">
                {/* 1. Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-800 mb-1">Product Title *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Arduino UNO R4 WiFi Board"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">SKU Code *</label>
                    <input
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono font-bold focus:outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">Category *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white focus:outline-none cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">Subcategory</label>
                    <input
                      type="text"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      placeholder="e.g. Development Boards"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">Brand / Manufacturer</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. VK Technology"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* 2. Pricing and Stock */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">Regular M.R.P (₹) *</label>
                    <input
                      type="number"
                      required
                      value={regularPrice}
                      onChange={(e) => setRegularPrice(e.target.value)}
                      placeholder="e.g. 1499"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">Discounted Price (₹)</label>
                    <input
                      type="number"
                      value={discountedPrice}
                      onChange={(e) => setDiscountedPrice(e.target.value)}
                      placeholder="e.g. 1199"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">Initial Stock Qty *</label>
                    <input
                      type="number"
                      required
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">Weight (Grams)</label>
                    <input
                      type="number"
                      value={shippingWeight}
                      onChange={(e) => setShippingWeight(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* 3. Images Management */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-gray-800">Product Images</label>
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-3 py-1 rounded text-[11px] flex items-center space-x-1 border border-gray-300">
                      <Upload size={13} />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group w-24 h-24 rounded-lg border-2 bg-gray-50 p-1 flex flex-col items-center justify-center overflow-hidden shadow-sm">
                        <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-contain" />
                        {idx === 0 ? (
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[9px] font-bold text-center py-0.5 tracking-wide">
                            ★ Main Photo
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const reordered = [img, ...images.filter((_, i) => i !== idx)];
                              setImages(reordered);
                            }}
                            className="absolute bottom-0 inset-x-0 bg-gray-900/80 hover:bg-gray-900 text-white text-[9px] font-semibold text-center py-0.5 transition"
                            title="Click to set as Main Photo"
                          >
                            Set Main
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                          title="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Or paste external image URL and press Enter..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          setImages([...images, val]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>

                {/* 4. Descriptions */}
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Short Summary (1-2 lines)</label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Brief highlights for search listings..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Detailed Technical Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>

                {/* 5. Toggles */}
                <div className="flex items-center space-x-6 pt-2">
                  <label className="flex items-center space-x-2 text-gray-800 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    <span>Active & Published on Storefront</span>
                  </label>

                  <label className="flex items-center space-x-2 text-gray-800 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    <span>Highlight on Homepage as Featured</span>
                  </label>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end space-x-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-100 rounded text-gray-800 font-semibold"
              >
                Cancel
              </button>
              <button
                form="productForm"
                type="submit"
                disabled={formSubmitting}
                className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-6 py-2 rounded shadow-sm transition disabled:opacity-50"
              >
                {formSubmitting ? 'Saving Product...' : editingProduct ? 'Save Product Changes' : 'Publish Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin: Strictly Protected Permanent Delete Modal */}
      {isPermanentModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95">
            <div className="bg-red-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert size={18} />
                <h3 className="font-bold text-sm">Permanent Deletion Confirmation</h3>
              </div>
              <button
                onClick={() => setIsPermanentModalOpen(false)}
                className="text-red-200 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecutePermanentDelete} className="p-5 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-red-800">
                  <AlertTriangle size={15} />
                  <span>CRITICAL WARNING</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  You are about to permanently delete <strong>{permanentTargetIds.length}</strong> product(s) from the database. This action <strong>CANNOT</strong> be undone.
                </p>
                <p className="text-[10px] text-red-700 font-medium pt-1 border-t border-red-200">
                  🛡️ <strong>Safety Rule:</strong> If any product is referenced in existing customer orders, permanent deletion will be strictly blocked to preserve order history and customer receipts.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Type <span className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-200">DELETE PERMANENTLY</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="DELETE PERMANENTLY"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                  autoFocus
                />
              </div>

              {permError && (
                <div className="p-2.5 rounded bg-red-100 text-red-800 text-[11px] flex items-start space-x-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{permError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPermanentModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-100 rounded text-gray-700 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmPhrase !== 'DELETE PERMANENTLY' || isPermDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-xs transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {isPermDeleting ? 'Permanently Deleting...' : 'Confirm Permanent Deletion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Catalog Audit & Selective Recovery Modal */}
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs text-left animate-in fade-in zoom-in-95">
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <RefreshCw size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm">Catalog Audit & Selective Recovery</h3>
              </div>
              <button
                onClick={() => setIsRecoveryModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <p className="text-gray-600 text-[11px]">
                This audit inspects the database against the <strong>24 canonical VK Technology products</strong>. You can selectively restore archived products to the storefront or re-insert missing catalog products without overwriting any customer accounts or existing order records.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Canonical</span>
                  <span className="text-lg font-extrabold text-gray-900">{recoveryAudit?.totalCanonical || 24}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-emerald-700 font-bold block uppercase">Active</span>
                  <span className="text-lg font-extrabold text-emerald-800">{recoveryAudit?.activeCount || 0}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-amber-700 font-bold block uppercase">In Recycle Bin</span>
                  <span className="text-lg font-extrabold text-amber-800">{recoveryAudit?.archivedCount || 0}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-rose-700 font-bold block uppercase">Missing from DB</span>
                  <span className="text-lg font-extrabold text-rose-800">{recoveryAudit?.missingCount || 0}</span>
                </div>
              </div>

              {recoveryMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center space-x-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span className="font-semibold text-xs">{recoveryMessage}</span>
                </div>
              )}

              {/* Product Audit Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                      {recoveryAudit?.details?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-bold text-gray-800">{item.sku}</td>
                          <td className="py-2 px-3 text-gray-700 font-sans truncate max-w-xs">{item.name}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'ARCHIVED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-sans text-[10px] text-gray-500">
                            {item.action === 'NONE_NEEDED' && <span className="text-emerald-700 font-medium">✓ Up to Date</span>}
                            {item.action === 'CAN_RESTORE' && <span className="text-amber-700 font-bold">Will Restore</span>}
                            {item.action === 'CAN_REINSERT' && <span className="text-rose-700 font-bold">Will Re-insert</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-gray-500">
                Safe Recovery: Preserves all existing orders & users
              </span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRecoveryModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-100 rounded text-gray-800 font-semibold text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isRecovering || (recoveryAudit?.missingCount === 0 && recoveryAudit?.archivedCount === 0)}
                  onClick={handleExecuteSelectiveRecovery}
                  className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-2 rounded text-xs transition disabled:opacity-40 shadow-sm"
                >
                  {isRecovering ? 'Restoring Products...' : 'Execute Selective Recovery'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
