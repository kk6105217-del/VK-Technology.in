import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AppItem } from '../types';
import {
  Smartphone, Activity, Home, Cpu, Gauge, Gamepad2, Radio, BookOpen,
  Sparkles, CheckCircle2, Bell, AppWindow, ExternalLink, ShieldCheck
} from 'lucide-react';

export const AppsPage: React.FC = () => {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifiedEmail, setNotifiedEmail] = useState('');
  const [subscribedMsg, setSubscribedMsg] = useState(false);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const res = await api.apps.getAll();
      setApps(res.apps || []);
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (notifiedEmail.trim()) {
      setSubscribedMsg(true);
      setNotifiedEmail('');
      setTimeout(() => setSubscribedMsg(false), 5000);
    }
  };

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Activity': return <Activity size={24} className="text-amber-500" />;
      case 'Home': return <Home size={24} className="text-blue-500" />;
      case 'Cpu': return <Cpu size={24} className="text-emerald-500" />;
      case 'Gauge': return <Gauge size={24} className="text-purple-500" />;
      case 'Gamepad2': return <Gamepad2 size={24} className="text-red-500" />;
      case 'Radio': return <Radio size={24} className="text-cyan-500" />;
      case 'BookOpen': return <BookOpen size={24} className="text-orange-500" />;
      default: return <Smartphone size={24} className="text-amber-500" />;
    }
  };

  return (
    <div className="bg-[#eaeded] min-h-screen py-6 sm:py-8">
      <div className="max-w-[1300px] mx-auto px-4 space-y-6">

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-indigo-950 text-white rounded-xl p-6 sm:p-10 shadow-lg border border-indigo-500/20 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
              <Sparkles size={14} />
              <span>VK Technology Software Ecosystem</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Hardware Companion Apps & Tools
            </h1>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
              Purpose-built mobile and web applications designed to monitor, calibrate, and remotely steer your DIY electronics kits, robotics rovers, and IoT sensor networks.
            </p>
          </div>
        </div>

        {/* Apps Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse space-y-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="w-2/3 h-5 bg-gray-200 rounded"></div>
                <div className="w-full h-16 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow relative"
              >
                <div>
                  {/* Header with Icon and Badge */}
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl shadow-xs">
                      {getIcon(app.icon)}
                    </div>
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full">
                      {app.status || 'Coming Soon'}
                    </span>
                  </div>

                  {/* Title & Platform */}
                  <div className="mt-4 space-y-1">
                    <h3 className="font-extrabold text-base text-gray-900">{app.name}</h3>
                    <div className="text-[11px] font-semibold text-gray-500">
                      Platform: <span className="text-gray-800">{app.platform}</span> • v{app.version}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-2.5 text-xs text-gray-600 leading-relaxed">
                    {app.description || app.short_description}
                  </p>

                  {/* Features List */}
                  {app.features && app.features.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Key Features
                      </div>
                      {app.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start text-xs text-gray-700">
                          <CheckCircle2 size={13} className="mr-1.5 mt-0.5 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-6 pt-3 border-t border-gray-100">
                  <button
                    disabled
                    className="w-full py-2 px-3 bg-gray-100 text-gray-500 font-bold rounded-lg text-xs cursor-not-allowed flex items-center justify-center space-x-1.5"
                  >
                    <Bell size={13} />
                    <span>In Active Development (Coming Soon)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Waitlist Subscription Bar */}
        <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-gray-200 text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-full">
            <Bell size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Be First to Know When VK Apps Launch</h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Get early beta access and direct APK / Web App installation links as soon as testing builds go live.
          </p>

          {subscribedMsg ? (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-md text-xs font-bold border border-emerald-200">
              ✓ Thank you! You will be notified the moment VK Technology Companion Apps launch.
            </div>
          ) : (
            <form onSubmit={handleNotifySubmit} className="flex gap-2 max-w-md mx-auto pt-2">
              <input
                type="email"
                required
                placeholder="Enter your email address..."
                value={notifiedEmail}
                onChange={(e) => setNotifiedEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-md text-xs transition shrink-0"
              >
                Notify Me
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
