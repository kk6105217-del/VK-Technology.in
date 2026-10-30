import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Layers, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { api } from '../../services/api';
import { Category } from '../../types';
import { getCategoryIcon } from '../../components/Navbar';
import { useCatalogSync } from '../../hooks/useCatalogSync';

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Cpu');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  // Real-time synchronization across servers and browser sessions
  useCatalogSync(() => {
    loadCategories();
  });

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const res = await api.categories.getAdminAll();
      setCategories(res.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Cpu');
    setImageUrl('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80');
    setSortOrder(categories.length + 1);
    setIsActive(true);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setIcon(cat.icon || 'Cpu');
    setImageUrl(cat.image_url || '');
    setSortOrder(cat.sort_order || 0);
    setIsActive(!!cat.is_active);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !slug) {
      setErrorMsg('Name and slug are required.');
      return;
    }

    const payload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: description.trim() || undefined,
      icon,
      image_url: imageUrl.trim() || undefined,
      sort_order: Number(sortOrder),
      is_active: isActive
    };

    try {
      if (editingCategory) {
        await api.categories.update(editingCategory.id, payload);
      } else {
        await api.categories.create(payload);
      }
      setIsModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: number, catName: string) => {
    if (window.confirm(`Are you sure you want to delete category "${catName}"?`)) {
      try {
        await api.categories.delete(id);
        await loadCategories();
      } catch (err: any) {
        alert(err.message || 'Failed to delete category');
      }
    }
  };

  const iconOptions = ['Cpu', 'Wifi', 'Terminal', 'Globe', 'Activity', 'Bot', 'Navigation', 'Zap', 'Layers', 'Wrench', 'BatteryCharging', 'Radio', 'Brain', 'BookOpen', 'Link'];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Categories</h1>
          <p className="text-xs text-gray-500">
            Create, reorder, and configure electronic project categories and display icons.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-2 rounded text-xs shadow flex items-center space-x-1.5 transition"
        >
          <Plus size={16} />
          <span>Add New Category</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-3">Icon & Name</th>
                <th className="py-3 px-3">URL Slug</th>
                <th className="py-3 px-3">Products</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-gray-400">
                    #{c.sort_order}
                  </td>

                  <td className="py-3 px-3 flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      {getCategoryIcon(c.icon, 16)}
                    </div>
                    <div>
                      <strong className="text-gray-900 block text-sm">{c.name}</strong>
                      <span className="text-[10px] text-gray-500 line-clamp-1">{c.description}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono text-gray-600">
                    /category/{c.slug}
                  </td>

                  <td className="py-3 px-3">
                    <span className="bg-gray-100 font-bold px-2 py-0.5 rounded text-gray-800">
                      {c.product_count || 0} products
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {c.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1 text-gray-600 hover:text-amber-600"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-xs space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <h3 className="font-bold text-sm text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X size={18} className="text-gray-400 hover:text-gray-700" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-800 p-2 rounded border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCategory) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                    }
                  }}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">URL Slug *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Icon</label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white"
                  >
                    {iconOptions.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                />
              </div>

              <label className="flex items-center space-x-2 pt-1 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span>Active on Public Storefront</span>
              </label>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-2 rounded shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
