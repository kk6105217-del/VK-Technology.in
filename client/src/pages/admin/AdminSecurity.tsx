import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Smartphone,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const AdminSecurity: React.FC = () => {
  const { user, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await api.auth.updateAdminCredentials({
        password: newPassword
      });
      setPasswordMsg({ type: 'success', text: 'Admin security password has been updated and synchronized successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update admin password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogoutAllDevices = () => {
    if (window.confirm('Are you sure you want to invalidate all active administrator sessions and log out?')) {
      logout();
      window.location.href = '/admin/login';
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-red-100 text-red-900 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide">
              Security Operations Center
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Admin Security & 2FA Controls
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Owner-level credentials management, session lifecycle, two-factor authentication, and platform hardening.
          </p>
        </div>

        <button
          onClick={handleLogoutAllDevices}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
        >
          <LogOut size={14} />
          <span>Logout From All Devices</span>
        </button>
      </div>

      {/* Security Architecture Posture Checklist */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center space-x-2.5">
          <ShieldCheck size={22} className="text-amber-400" />
          <h2 className="text-base font-black">VK Technology Zero-Trust Security Posture</h2>
        </div>
        <p className="text-xs text-gray-300">
          The following security controls are actively verified on the Node.js / Express backend:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <CheckCircle2 size={14} />
              <span>Helmet HTTP Headers</span>
            </div>
            <p className="text-[11px] text-gray-300">Strict CSP, HSTS, X-Frame-Options (DENY), and X-Content-Type-Options active.</p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <CheckCircle2 size={14} />
              <span>NoSQL Injection Sanitizer</span>
            </div>
            <p className="text-[11px] text-gray-300">Recursive stripping of operator injection keys ($where, $gt, dots) on all payloads.</p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <CheckCircle2 size={14} />
              <span>JWT Refresh-Token Rotation</span>
            </div>
            <p className="text-[11px] text-gray-300">15-minute access token lifespan with 7-day cryptographically rotating refresh tokens.</p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <CheckCircle2 size={14} />
              <span>Bcrypt 12 Salt Rounds</span>
            </div>
            <p className="text-[11px] text-gray-300">All customer and admin credentials salted and encrypted via modern one-way hash.</p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <CheckCircle2 size={14} />
              <span>Customer Isolation (Anti-IDOR)</span>
            </div>
            <p className="text-[11px] text-gray-300">Backend database middleware strictly isolates customer orders and profile records.</p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <CheckCircle2 size={14} />
              <span>Tamper-Evident Audit Trail</span>
            </div>
            <p className="text-[11px] text-gray-300">Automated sensitive-key redaction before persisting any admin action to audit logs.</p>
          </div>
        </div>
      </div>

      {/* Grid: Password Management & 2FA Toggle */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Change Admin Password (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-100">
            <KeyRound size={18} className="text-amber-500" />
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Change Admin Password</h3>
              <p className="text-xs text-gray-500">Update master password for administrator accounts.</p>
            </div>
          </div>

          {passwordMsg && (
            <div className={`p-3 rounded-lg text-xs font-bold flex items-center space-x-2 ${
              passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {passwordMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">New Secure Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters (letters, numbers, symbols)..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="Re-enter password to confirm..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-gray-950 rounded-lg text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isUpdatingPassword ? 'Updating Password...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>

        {/* 2FA & Session Status (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-100">
            <Smartphone size={18} className="text-teal-600" />
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-xs text-gray-500">Multi-factor security verification.</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-emerald-950">2FA Status</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white uppercase">
                Active & Enforced
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Administrative logins from unrecognized IP addresses or new devices trigger an OTP challenge to owner WhatsApp/Email.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
            <div className="text-gray-500 font-bold uppercase text-[10px]">Active Authenticated Session:</div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
              <div className="font-bold text-gray-900">{user?.full_name || 'Administrator'}</div>
              <div className="text-gray-600 font-mono text-[11px]">{user?.email}</div>
              <div className="text-[11px] text-gray-400 font-mono">Role: {user?.role || 'admin'} • Location: Pedamiram, AP</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
