import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Project } from '../../types';
import { Plus, Edit, Trash2, Check, X, Wrench, Layers, ExternalLink } from 'lucide-react';

export const AdminProjects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await api.projects.getAdminAll();
      setProjects(res.projects || []);
    } catch (err) {
      console.error('Failed to load admin projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this DIY project?')) return;
    try {
      await api.projects.delete(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  const handleOpenModal = (proj: any = null) => {
    setEditingProject(proj ? { ...proj } : {
      title: '',
      slug: '',
      category: 'IoT & Smart Agriculture',
      difficulty: 'Beginner',
      estimated_time: '2-3 Hours',
      image_url: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=800&q=80',
      short_description: '',
      description: '',
      circuit_diagram_url: '',
      code_url: '',
      youtube_url: '',
      is_featured: 0,
      is_active: 1
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProject.id) {
        await api.projects.update(editingProject.id, editingProject);
      } else {
        await api.projects.create(editingProject);
      }
      setModalOpen(false);
      loadProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to save project');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center space-x-2">
            <Wrench className="text-amber-500" size={24} />
            <span>DIY Electronics Projects Manager</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage public engineering project tutorials, circuit schematics, and component hardware BOMs.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow"
        >
          <Plus size={15} />
          <span>Add New DIY Project</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-gray-500">Loading projects...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Difficulty</th>
                  <th className="py-2.5 px-3">Est. Time</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-gray-50/80">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-3">
                        <img src={proj.image_url} alt={proj.title} className="w-10 h-10 object-cover rounded bg-gray-100" />
                        <div>
                          <div className="font-bold text-gray-900">{proj.title}</div>
                          <div className="text-[10px] text-gray-400 font-mono">/{proj.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{proj.category}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        proj.difficulty === 'Beginner' ? 'bg-emerald-100 text-emerald-800' :
                        proj.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {proj.difficulty}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{proj.estimated_time}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        proj.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {proj.is_active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(proj)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(proj.id)}
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
              {editingProject?.id ? 'Edit DIY Project' : 'Add New DIY Project'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={editingProject.title}
                  onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={editingProject.category}
                    onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={editingProject.difficulty}
                    onChange={(e) => setEditingProject({ ...editingProject, difficulty: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Estimated Time</label>
                  <input
                    type="text"
                    value={editingProject.estimated_time}
                    onChange={(e) => setEditingProject({ ...editingProject, estimated_time: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Image URL</label>
                  <input
                    type="text"
                    required
                    value={editingProject.image_url}
                    onChange={(e) => setEditingProject({ ...editingProject, image_url: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={editingProject.short_description || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, short_description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Description</label>
                <textarea
                  rows={4}
                  required
                  value={editingProject.description || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Code URL (GitHub)</label>
                  <input
                    type="text"
                    value={editingProject.code_url || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, code_url: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">YouTube URL</label>
                  <input
                    type="text"
                    value={editingProject.youtube_url || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, youtube_url: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
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
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
