import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Mail,
  Phone,
  Shield,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminStaff: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add staff modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [role, setRole] = useState('PRODUCT_MANAGER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setIsLoading(true);
      const res = await api.staff.getAdminAll();
      setStaff(res.staff || []);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    try {
      setIsSubmitting(true);
      await api.staff.create({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        role
      });
      setShowAddModal(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('+91 ');
      loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to create staff account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (id: number, newRole: string) => {
    try {
      await api.staff.updateRole(id, newRole);
      loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleDeleteStaff = async (id: number, staffEmail: string) => {
    if (!window.confirm(`Are you sure you want to remove administrator ${staffEmail}?`)) return;
    try {
      await api.staff.delete(id);
      loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to delete staff member');
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'SUPER_ADMIN':
      case 'admin':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200">Super Admin (Full Access)</span>;
      case 'PRODUCT_MANAGER':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">Product Manager</span>;
      case 'ORDER_MANAGER':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">Order & Shipping Manager</span>;
      case 'INVENTORY_MANAGER':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">Inventory Manager</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">{r}</span>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-100 text-purple-900 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide">
              Role-Based Access Control (RBAC)
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Staff & Permissions
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure multi-admin access, grant department roles, and enforce least-privilege security.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold rounded-lg text-xs shadow-sm transition"
        >
          <Plus size={15} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Role Matrix Explainer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-purple-200 text-xs space-y-1">
          <div className="font-extrabold text-purple-950 flex items-center space-x-1.5">
            <Shield size={14} className="text-purple-600" />
            <span>SUPER_ADMIN</span>
          </div>
          <p className="text-[11px] text-gray-600">Full system access, staff management, database backup/restore, financial analytics, and credentials.</p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-blue-200 text-xs space-y-1">
          <div className="font-extrabold text-blue-950 flex items-center space-x-1.5">
            <Shield size={14} className="text-blue-600" />
            <span>PRODUCT_MANAGER</span>
          </div>
          <p className="text-[11px] text-gray-600">Create, edit, and organize products, categories, technical specs, datasheet links, and DIY projects.</p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-amber-200 text-xs space-y-1">
          <div className="font-extrabold text-amber-950 flex items-center space-x-1.5">
            <Shield size={14} className="text-amber-600" />
            <span>ORDER_MANAGER</span>
          </div>
          <p className="text-[11px] text-gray-600">Manage orders, update package tracking, confirm delivery, verify UPI payments, and generate GST invoices.</p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-emerald-200 text-xs space-y-1">
          <div className="font-extrabold text-emerald-950 flex items-center space-x-1.5">
            <Shield size={14} className="text-emerald-600" />
            <span>INVENTORY_MANAGER</span>
          </div>
          <p className="text-[11px] text-gray-600">Track stock levels, monitor low-stock alerts, record restock shipments, and record supplier deliveries.</p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
            Loading staff accounts...
          </div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No administrative staff records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">2FA Protection</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((u: any) => {
                  const isOwner = u.email === 'karthik.suroju@gmail.com' || u.email === 'admin@vktechnology.shop';

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-black flex items-center justify-center text-xs shadow-sm">
                            {u.full_name?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <div>{u.full_name}</div>
                            {isOwner && (
                              <span className="text-[10px] text-amber-700 font-bold">Store Proprietor</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 font-mono text-[11px]">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {u.phone || '+91 8555997052'}
                      </td>
                      <td className="py-3.5 px-4">
                        {isOwner ? (
                          getRoleBadge('SUPER_ADMIN')
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className="px-2.5 py-1 bg-white border border-gray-300 rounded text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-400 outline-none"
                          >
                            <option value="SUPER_ADMIN">Super Admin</option>
                            <option value="PRODUCT_MANAGER">Product Manager</option>
                            <option value="ORDER_MANAGER">Order & Shipping Manager</option>
                            <option value="INVENTORY_MANAGER">Inventory Manager</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <ShieldCheck size={11} className="mr-1" />
                          Enforced
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isOwner && (
                          <button
                            onClick={() => handleDeleteStaff(u.id, u.email)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                            title="Remove staff member"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                <Users size={18} className="text-purple-600" />
                <span>Add Administrative Staff Account</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Staff Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@vktechnology.shop"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Assigned Department Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-400 outline-none"
                >
                  <option value="PRODUCT_MANAGER">Product Manager (Catalog & Specs)</option>
                  <option value="ORDER_MANAGER">Order & Shipping Manager (Fulfillment & Invoices)</option>
                  <option value="INVENTORY_MANAGER">Inventory Manager (Stock & Restocking)</option>
                  <option value="SUPER_ADMIN">Super Admin (Full Administrative Authority)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 rounded-lg text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
