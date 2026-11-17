import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  ShieldCheck,
  RefreshCw,
  Clock,
  User,
  Filter,
  Eye,
  Lock
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter]);

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.databaseAdmin.getAuditLogs({
        limit: 100,
        action: actionFilter === 'all' ? undefined : actionFilter
      });
      setLogs(res.auditLogs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = logs.filter((l: any) => {
    const adminStr = (l.admin_email || l.adminEmail || '').toLowerCase();
    const actionStr = (l.action || '').toLowerCase();
    const typeStr = (l.target_type || l.resourceType || '').toLowerCase();
    const q = search.toLowerCase();
    return adminStr.includes(q) || actionStr.includes(q) || typeStr.includes(q);
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-100 text-purple-900 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide">
              Compliance & Security Telemetry
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Tamper-Evident Admin Activity Logs
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Immutable audit record of all administrative operations, product modifications, and sensitive events.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by admin email, action, resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
          <span className="text-gray-500 font-bold">Action Type:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-400 outline-none"
          >
            <option value="all">All Administrative Events</option>
            <option value="CREATE_PRODUCT">Product Created</option>
            <option value="UPDATE_PRODUCT">Product Updated</option>
            <option value="ARCHIVE_PRODUCT">Product Archived</option>
            <option value="PERMANENT_DELETE_PRODUCT">Permanent Delete</option>
            <option value="BLOCK_CUSTOMER">Customer Suspended</option>
            <option value="UNBLOCK_CUSTOMER">Customer Reactivated</option>
            <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
            <option value="DATABASE_BACKUP">Database Backup</option>
            <option value="DATABASE_RESTORE">Database Restore</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
            Loading activity audit records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No audit records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin Email</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Resource ID</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((log: any, idx: number) => {
                  const action = log.action || 'ACTION';
                  const isDangerous = action.includes('DELETE') || action.includes('BLOCK');
                  const isCreate = action.includes('CREATE') || action.includes('RESTORE');

                  return (
                    <tr key={log.id || log._id || idx} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                        {log.created_at?.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-gray-900">
                        {log.admin_email || log.adminEmail || 'admin@vktechnology.shop'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isDangerous ? 'bg-red-100 text-red-800' :
                          isCreate ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-700">
                        {log.target_type || log.resourceType || 'General'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                        #{log.target_id || log.resourceId || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded text-xs transition inline-flex items-center"
                        >
                          <Eye size={12} className="mr-1" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                <ShieldCheck size={18} className="text-purple-600" />
                <span>Audit Event Record Inspector</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div>
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Actor Admin</span>
                  <span className="font-mono font-bold text-gray-900">{selectedLog.admin_email || selectedLog.adminEmail}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Event Timestamp</span>
                  <span className="font-mono text-gray-700">{selectedLog.created_at}</span>
                </div>
                <div className="mt-2">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Action Name</span>
                  <span className="font-bold text-purple-700">{selectedLog.action}</span>
                </div>
                <div className="mt-2">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Target Entity</span>
                  <span className="font-mono text-gray-900">{selectedLog.target_type || selectedLog.resourceType} (#{selectedLog.target_id || selectedLog.resourceId})</span>
                </div>
              </div>

              <div>
                <span className="text-gray-700 font-bold block mb-1">Payload / State Changes:</span>
                <pre className="bg-gray-900 text-gray-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
                  {typeof selectedLog.details === 'string'
                    ? selectedLog.details
                    : JSON.stringify(selectedLog.details || selectedLog.changeSummary || {}, null, 2)}
                </pre>
              </div>

              <div className="flex items-center space-x-1.5 text-[11px] text-gray-500 pt-1">
                <Lock size={12} className="text-emerald-600" />
                <span>Sensitive tokens, passwords, and secrets are cryptographically redacted before log storage.</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
