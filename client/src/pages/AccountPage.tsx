import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Package,
  Heart,
  MapPin,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Address } from '../types';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading, refreshUser } = useAuth();

  const [activeSection, setActiveSection] = useState<'profile' | 'addresses' | 'security'>('profile');
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState('');
  const [securityError, setSecurityError] = useState('');

  // New address modal
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    landmark: '',
    city: '',
    state: 'Andhra Pradesh',
    postal_code: '',
    is_default: false
  });

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/login?redirect=/account');
      return;
    }
    setFullName(user.full_name);
    setPhone(user.phone || '');
    loadAddresses();
  }, [user, isLoading]);

  const loadAddresses = async () => {
    try {
      const res = await api.auth.getAddresses();
      setAddresses(res.addresses || []);
    } catch (e) {}
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      await api.auth.updateProfile({ full_name: fullName, phone });
      await refreshUser();
      setProfileMsg('Profile updated successfully.');
    } catch (e: any) {
      alert(e.message || 'Update failed');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg('');
    setSecurityError('');
    try {
      await api.auth.changePassword({ current_password: currentPassword, new_password: newPassword });
      setSecurityMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      setSecurityError(e.message || 'Password change failed.');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.addAddress(newAddr);
      setIsAddingAddress(false);
      setNewAddr({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        landmark: '',
        city: '',
        state: 'Andhra Pradesh',
        postal_code: '',
        is_default: false
      });
      loadAddresses();
    } catch (e: any) {
      alert(e.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (window.confirm('Delete this saved address?')) {
      await api.auth.deleteAddress(id);
      loadAddresses();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#eaeded] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-[#eaeded] min-h-screen py-6 sm:py-8 text-left">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-amber-400 text-gray-950 flex items-center justify-center font-black text-xl">
              {user.full_name[0]}
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-amber-600 block">Your Account</span>
              <h1 className="text-xl font-bold text-gray-900">{user.full_name}</h1>
              <p className="text-xs text-gray-500">{user.email} • Customer Account</p>
            </div>
          </div>
          {isAdmin && (
            <Link
              to="/admin"
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1.5 rounded text-xs flex items-center space-x-1 border border-amber-300"
            >
              <ShieldCheck size={14} />
              <span>Admin Console</span>
            </Link>
          )}
        </div>

        {/* Shortcuts cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Link
            to="/orders"
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-amber-400 transition flex items-center space-x-3"
          >
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
              <Package size={24} />
            </div>
            <div>
              <strong className="block text-sm text-gray-900">Your Orders</strong>
              <span className="text-xs text-gray-500">Track shipments, view invoices</span>
            </div>
          </Link>

          <Link
            to="/wishlist"
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-amber-400 transition flex items-center space-x-3"
          >
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <Heart size={24} />
            </div>
            <div>
              <strong className="block text-sm text-gray-900">Your Wishlist</strong>
              <span className="text-xs text-gray-500">Saved DIY projects & kits</span>
            </div>
          </Link>

          <button
            onClick={() => setActiveSection('addresses')}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-amber-400 transition flex items-center space-x-3 text-left w-full"
          >
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
              <MapPin size={24} />
            </div>
            <div>
              <strong className="block text-sm text-gray-900">Your Addresses</strong>
              <span className="text-xs text-gray-500">{addresses.length} saved addresses</span>
            </div>
          </button>
        </div>

        {/* Tabs and Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-bold">
            <button
              onClick={() => setActiveSection('profile')}
              className={`px-5 py-3 border-b-2 transition ${
                activeSection === 'profile' ? 'border-amber-500 text-amber-800 bg-white' : 'text-gray-600 hover:text-gray-900 border-transparent'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveSection('addresses')}
              className={`px-5 py-3 border-b-2 transition ${
                activeSection === 'addresses' ? 'border-amber-500 text-amber-800 bg-white' : 'text-gray-600 hover:text-gray-900 border-transparent'
              }`}
            >
              Saved Delivery Addresses ({addresses.length})
            </button>
            <button
              onClick={() => setActiveSection('security')}
              className={`px-5 py-3 border-b-2 transition ${
                activeSection === 'security' ? 'border-amber-500 text-amber-800 bg-white' : 'text-gray-600 hover:text-gray-900 border-transparent'
              }`}
            >
              Login & Security
            </button>
          </div>

          <div className="p-6 text-xs">
            {activeSection === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="max-w-md space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Personal Details</h3>
                {profileMsg && (
                  <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded border border-emerald-200 flex items-center">
                    <CheckCircle2 size={14} className="mr-1.5" />
                    <span>{profileMsg}</span>
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-gray-500 rounded text-xs cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-5 py-2 rounded text-xs shadow-sm transition"
                >
                  Save Profile Changes
                </button>
              </form>
            )}

            {activeSection === 'addresses' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-900">Saved Addresses</h3>
                  <button
                    onClick={() => setIsAddingAddress(!isAddingAddress)}
                    className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-3 py-1.5 rounded text-xs flex items-center space-x-1"
                  >
                    <Plus size={14} />
                    <span>Add New Address</span>
                  </button>
                </div>

                {isAddingAddress && (
                  <form onSubmit={handleAddAddress} className="bg-gray-50 p-4 rounded-lg border border-gray-300 max-w-lg space-y-3">
                    <h4 className="font-bold text-gray-800">Add a New Address</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Full Name *"
                        value={newAddr.full_name}
                        onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 rounded text-xs"
                      />
                      <input
                        type="tel"
                        required
                        placeholder="Phone Number *"
                        value={newAddr.phone}
                        onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Address Line 1 (Flat, House no., Street) *"
                      value={newAddr.address_line1}
                      onChange={(e) => setNewAddr({ ...newAddr, address_line1: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="City *"
                        value={newAddr.city}
                        onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 rounded text-xs"
                      />
                      <input
                        type="text"
                        required
                        placeholder="State *"
                        value={newAddr.state}
                        onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 rounded text-xs"
                      />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="PIN Code *"
                        value={newAddr.postal_code}
                        onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value.replace(/[^0-9]/g, '') })}
                        className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(false)}
                        className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-1.5 rounded shadow-sm"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="p-3.5 border border-gray-200 rounded-lg relative space-y-1">
                      <strong className="text-gray-900 block">{addr.full_name}</strong>
                      <p className="text-gray-600">{addr.address_line1}</p>
                      <p className="text-gray-600">{addr.city}, {addr.state} - {addr.postal_code}</p>
                      <p className="text-gray-500">Phone: {addr.phone}</p>
                      <button
                        onClick={() => handleDeleteAddress(addr.id!)}
                        className="text-red-600 hover:underline flex items-center space-x-1 mt-2 text-[11px]"
                      >
                        <Trash2 size={12} />
                        <span>Delete address</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Change Password</h3>
                {securityMsg && (
                  <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded border border-emerald-200 flex items-center">
                    <CheckCircle2 size={14} className="mr-1.5" />
                    <span>{securityMsg}</span>
                  </div>
                )}
                {securityError && (
                  <div className="bg-red-50 text-red-800 p-2.5 rounded border border-red-200 flex items-center">
                    <AlertCircle size={14} className="mr-1.5" />
                    <span>{securityError}</span>
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">New Password (min 6 chars)</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-5 py-2 rounded text-xs shadow-sm transition"
                >
                  Update Password
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
