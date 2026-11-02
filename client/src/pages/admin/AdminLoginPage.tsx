import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading, adminLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already logged in as admin, redirect directly to admin dashboard
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your admin email and password.');
      return;
    }

    try {
      setIsLoading(true);
      await adminLogin({ email: email.trim(), password });
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your administrator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen py-12 px-4 flex flex-col justify-center items-center text-left">
      {/* Brand */}
      <Link to="/" className="flex items-center space-x-3 mb-6">
        <img
          src="/logo.png"
          alt="VK Technology Logo"
          className="w-14 h-14 rounded-full bg-white p-1 object-contain shadow-2xl shrink-0"
        />
        <div className="text-white text-left">
          <div className="flex items-center">
            <span className="text-2xl font-black">VK</span>
            <span className="text-2xl font-bold text-amber-400 ml-1.5">Technology</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-semibold">
            Administrative Control Center
          </span>
        </div>
      </Link>

      {/* Card */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="flex items-center space-x-2 text-amber-600 font-bold text-xs uppercase tracking-wider mb-2">
          <Lock size={14} />
          <span>Restricted Portal • Authorized Owner Only</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Administrator Login
        </h1>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Manage products, categories, orders, inventory, and customer fulfillment for VK Technology.
        </p>

        {errorMsg && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-xs mb-4 flex items-center">
            <AlertCircle size={16} className="mr-2 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Admin Email or Username</label>
            <div className="relative">
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@vktechnology.shop"
                className="w-full px-3 py-2 pl-9 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 font-medium text-gray-900 bg-white"
              />
              <Mail size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-gray-700">Admin Password</label>
              <Link to="/forgot-password" className="text-vk-blue hover:underline text-[11px]">
                Reset password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your administrative password"
                className="w-full px-3 py-2 pl-9 pr-10 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <Lock size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold py-2.5 rounded text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Dashboard'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs">
          <Link to="/" className="text-gray-500 hover:text-gray-900 font-medium">
            ← Return to Public Storefront
          </Link>
        </div>
      </div>
    </div>
  );
};
