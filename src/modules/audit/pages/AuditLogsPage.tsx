import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, Download, RefreshCw, X,
  Plus, Edit, Trash2, LogIn, LogOut, Eye, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';
import { format } from 'date-fns';

type Action = 'all' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  update: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  login: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  logout: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  export: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  create: Plus, update: Edit, delete: Trash2,
  login: LogIn, logout: LogOut, export: Download, view: Eye,
};

const SAMPLE_LOGS = [
  { id: 1, action: 'login', module: 'Auth', resource: 'Session', userId: 1, userEmail: 'superadmin@maxhub.com', userName: 'Super Admin', ipAddress: '192.168.1.10', details: { browser: 'Chrome 121', os: 'Windows 11' }, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 2, action: 'create', module: 'HR', resource: 'Staff', userId: 1, userEmail: 'hr@maxhub.com', userName: 'Human Resources', ipAddress: '192.168.1.12', details: { staffName: 'John Doe', department: 'Engineering' }, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 3, action: 'update', module: 'Payroll', resource: 'SalaryStructure', userId: 2, userEmail: 'accountant@maxhub.com', userName: 'Finance Accountant', ipAddress: '192.168.1.15', details: { field: 'baseSalary', from: '80000', to: '95000' }, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: 4, action: 'delete', module: 'Projects', resource: 'Task', userId: 3, userEmail: 'hod@maxhub.com', userName: 'Department Head', ipAddress: '192.168.1.18', details: { taskName: 'Old Task #4', projectId: 12 }, createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: 5, action: 'export', module: 'Reports', resource: 'AttendanceReport', userId: 1, userEmail: 'headofadmin@maxhub.com', userName: 'Admin Head', ipAddress: '192.168.1.10', details: { format: 'PDF', records: 240 }, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: 6, action: 'login', module: 'Auth', resource: 'Session', userId: 5, userEmail: 'staff@maxhub.com', userName: 'Regular Staff', ipAddress: '10.0.0.45', details: { browser: 'Firefox 122', os: 'macOS' }, createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
  { id: 7, action: 'update', module: 'LMS', resource: 'Course', userId: 6, userEmail: 'instructor@maxhub.com', userName: 'Course Instructor', ipAddress: '192.168.1.22', details: { courseTitle: 'Fashion Design Basics', field: 'status', to: 'Published' }, createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
  { id: 8, action: 'create', module: 'CRM', resource: 'Opportunity', userId: 2, userEmail: 'staff@maxhub.com', userName: 'Regular Staff', ipAddress: '10.0.0.45', details: { client: 'ABC Corp', value: 250000 }, createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString() },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LogDetailModal({ log, onClose }: { log: any; onClose: () => void }) {
  const Icon = ACTION_ICONS[log.action] || Eye;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold', ACTION_COLORS[log.action] || 'bg-gray-100')}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white capitalize">{log.action} — {log.resource}</p>
              <p className="text-xs text-gray-500">{format(new Date(log.createdAt), 'PPpp')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3 text-sm">
          {[
            { label: 'User', value: `${log.userName} (${log.userEmail})` },
            { label: 'Module', value: log.module },
            { label: 'Resource', value: log.resource },
            { label: 'IP Address', value: log.ipAddress },
            { label: 'Timestamp', value: format(new Date(log.createdAt), 'PPpp') },
          ].map(r => (
            <div key={r.label} className="flex gap-3">
              <span className="text-gray-500 w-24 flex-shrink-0">{r.label}</span>
              <span className="text-gray-900 dark:text-white font-medium">{r.value}</span>
            </div>
          ))}
          <div>
            <p className="text-gray-500 mb-2">Details</p>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-40">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action>('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const LIMIT = 15;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, action, search, startDate, endDate],
    queryFn: async () => {
      try {
        return await apiClient.getRaw('/audit-logs', {
          page, limit: LIMIT,
          ...(action !== 'all' && { action }),
          ...(search && { search }),
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        }) as any;
      } catch {
        const filtered = SAMPLE_LOGS.filter(l =>
          (action === 'all' || l.action === action) &&
          (!search || l.userName.toLowerCase().includes(search.toLowerCase()) || l.userEmail.toLowerCase().includes(search.toLowerCase()))
        );
        return { data: filtered, pagination: { total: filtered.length, page: 1, limit: LIMIT, totalPages: 1 } };
      }
    },
  });

  const logs: any[] = (data as any)?.data || SAMPLE_LOGS;
  const pagination = (data as any)?.pagination || { total: logs.length, totalPages: 1 };

  const exportCSV = useCallback(() => {
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Module', 'Resource', 'IP Address'];
    const rows = logs.map(l => [
      format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      l.userName, l.userEmail, l.action, l.module, l.resource, l.ipAddress,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-logs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  const ACTIONS: { key: Action; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'create', label: 'Create' }, { key: 'update', label: 'Update' },
    { key: 'delete', label: 'Delete' }, { key: 'login', label: 'Login' }, { key: 'logout', label: 'Logout' },
    { key: 'export', label: 'Export' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <Shield className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
            <p className="text-xs text-gray-500">User activity and security monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user name or email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {(search || startDate || endDate) && (
            <button onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Action filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {ACTIONS.map(a => (
            <button key={a.key} onClick={() => { setAction(a.key); setPage(1); }}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize', action === a.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600')}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {['Timestamp', 'User', 'Action', 'Module', 'Resource', 'IP Address', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                  <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No audit logs found</p>
                </td></tr>
              ) : logs.map((log, i) => {
                const Icon = ACTION_ICONS[log.action] || Eye;
                return (
                  <tr key={log.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors" onClick={() => setSelectedLog(log)}>
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-white text-xs">{timeAgo(log.createdAt)}</span>
                      <p className="text-gray-400 text-[10px]">{format(new Date(log.createdAt), 'MMM d, HH:mm')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-bold text-indigo-600">
                          {(log.userName || '?')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-xs">{log.userName}</p>
                          <p className="text-gray-400 text-[10px]">{log.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize', ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600')}>
                        <Icon className="h-2.5 w-2.5" /> {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{log.module}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{log.resource}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.ipAddress}</td>
                    <td className="px-4 py-3">
                      <button className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors" onClick={e => { e.stopPropagation(); setSelectedLog(log); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, pagination.total)} of {pagination.total}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium px-2">{page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
      </AnimatePresence>
    </div>
  );
}
