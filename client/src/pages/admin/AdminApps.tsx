import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppItem } from '../../types';
import { Plus, Edit, Trash2, Smartphone, CheckCircle2, AppWindow } from 'lucide-react';

export const AdminApps: React.FC = () => {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<any>(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const res = await api.apps.getAdminAll();
      setApps(res.apps || []);
    } catch (err) {
      console.error('Failed to load admin apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this app listing?')) return;
    try {
      await api.apps.delete(id);
      setApps(apps.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete app');
    }
  };

  const handleOpenModal = (appItem: any = null) => {
    setEditingApp(appItem ? { ...appItem } : {
      name: '',
      slug: '',
      short_description: '',
      description: '',
      platform: 'Android & Web',
      status: 'Coming Soon',
      version: '1.0.0',
      icon: 'Activity',
      image_url: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=800&q=80',
      download_url: '',
      play_store_url: '',
      web_url: '',
      features: ['Real-time device monitoring', 'Cloud telemetry data export'],
      sort_order: 1,
      is_active: 1
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingApp.id) {
        await api.apps.update(editingApp.id, editingApp);
      } else {
        await api.apps.create(editingApp);
      }
      setModalOpen(false);
      loadApps();
    } catch (err: any) {
      alert(err.message || 'Failed to save app');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center space-x-2">
            <Smartphone className="text-amber-500" size={24} />
            <span>VK Technology Apps Manager</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure mobile companion applications, telemetry portals, and software release statuses.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow"
        >
          <Plus size={15} />
          <span>Add New App</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-gray-500">Loading apps...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <th className="py-2.5 px-3">App Name</th>
                  <th className="py-2.5 px-3">Platform</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Active</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/80">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-gray-900">{a.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">/{a.slug}</div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{a.platform}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-500">v{a.version}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {a.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(a)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-gray-900 border-b border-gray-100 pb-3">
              {editingApp?.id ? 'Edit App Listing' : 'Add New App'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">App Name</label>
                <input
                  type="text"
                  required
                  value={editingApp.name}
                  onChange={(e) => setEditingApp({ ...editingApp, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Platform</label>
                  <input
                    type="text"
                    required
                    value={editingApp.platform}
                    onChange={(e) => setEditingApp({ ...editingApp, platform: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={editingApp.status}
                    onChange={(e) => setEditingApp({ ...editingApp, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  >
                    <option value="Coming Soon">Coming Soon</option>
                    <option value="Beta">Beta</option>
                    <option value="Live">Live</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={editingApp.version}
                    onChange={(e) => setEditingApp({ ...editingApp, version: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Image URL</label>
                  <input
                    type="text"
                    required
                    value={editingApp.image_url}
                    onChange={(e) => setEditingApp({ ...editingApp, image_url: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={editingApp.description || ''}
                  onChange={(e) => setEditingApp({ ...editingApp, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded text-xs"
                >
                  Save App
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
