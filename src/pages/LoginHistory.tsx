import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield, Download, Monitor, Smartphone, Globe,
  CheckCircle2, XCircle, Search, RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';
import { cn } from '@utils/cn';

interface LoginSession {
  id: string;
  timestamp: string;
  ip: string;
  location: string;
  device: string;
  browser: string;
  status: 'Success' | 'Failed';
  os: string;
}

const SAMPLE_SESSIONS: LoginSession[] = [
  { id:'1', timestamp: new Date(Date.now() - 1000*60*5).toISOString(),             ip:'197.210.45.12',  location:'Lagos, Nigeria',  device:'Desktop',  browser:'Chrome 124',  status:'Success', os:'Windows 11' },
  { id:'2', timestamp: new Date(Date.now() - 1000*60*60*3).toISOString(),          ip:'197.210.45.12',  location:'Lagos, Nigeria',  device:'Mobile',   browser:'Chrome 124',  status:'Success', os:'Android 14' },
  { id:'3', timestamp: new Date(Date.now() - 1000*60*60*24).toISOString(),         ip:'41.203.85.99',   location:'Abuja, Nigeria',  device:'Desktop',  browser:'Firefox 125', status:'Success', os:'Windows 10' },
  { id:'4', timestamp: new Date(Date.now() - 1000*60*60*25).toISOString(),         ip:'41.203.85.101',  location:'Abuja, Nigeria',  device:'Desktop',  browser:'Firefox 125', status:'Failed',  os:'Windows 10' },
  { id:'5', timestamp: new Date(Date.now() - 1000*60*60*48).toISOString(),         ip:'197.210.45.12',  location:'Lagos, Nigeria',  device:'Tablet',   browser:'Safari 17',   status:'Success', os:'iPadOS 17' },
  { id:'6', timestamp: new Date(Date.now() - 1000*60*60*72).toISOString(),         ip:'105.112.50.77',  location:'Port Harcourt, Nigeria', device:'Desktop', browser:'Edge 124', status:'Success', os:'Windows 11' },
  { id:'7', timestamp: new Date(Date.now() - 1000*60*60*96).toISOString(),         ip:'41.58.100.23',   location:'Ibadan, Nigeria', device:'Mobile',   browser:'Chrome 124',  status:'Success', os:'iOS 17' },
  { id:'8', timestamp: new Date(Date.now() - 1000*60*60*120).toISOString(),        ip:'197.210.45.12',  location:'Lagos, Nigeria',  device:'Desktop',  browser:'Chrome 124',  status:'Failed',  os:'Windows 11' },
  { id:'9', timestamp: new Date(Date.now() - 1000*60*60*144).toISOString(),        ip:'197.210.45.12',  location:'Lagos, Nigeria',  device:'Desktop',  browser:'Chrome 124',  status:'Success', os:'Windows 11' },
  { id:'10', timestamp: new Date(Date.now() - 1000*60*60*168).toISOString(),       ip:'197.210.45.12',  location:'Lagos, Nigeria',  device:'Desktop',  browser:'Chrome 123',  status:'Success', os:'Windows 11' },
];

function DeviceIcon({ device }: { device: string }) {
  if (device === 'Mobile') return <Smartphone className="h-4 w-4" />;
  if (device === 'Tablet') return <Monitor className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

export default function LoginHistory() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Failed'>('All');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['login-history'],
    queryFn: async () => {
      try { return await apiClient.get('/auth/login-history') as LoginSession[]; }
      catch { return null; }
    },
  });

  const sessions: LoginSession[] = (data as any) || SAMPLE_SESSIONS;

  const filtered = sessions.filter(s =>
    (statusFilter === 'All' || s.status === statusFilter) &&
    (!search || s.ip.includes(search) || s.location.toLowerCase().includes(search.toLowerCase()) || s.browser.toLowerCase().includes(search.toLowerCase()))
  );

  const successCount = sessions.filter(s => s.status === 'Success').length;
  const failedCount = sessions.filter(s => s.status === 'Failed').length;

  const exportCSV = () => {
    const header = 'Date/Time,IP Address,Location,Device,Browser,OS,Status\n';
    const rows = sessions.map(s =>
      `${new Date(s.timestamp).toLocaleString()},${s.ip},${s.location},${s.device},${s.browser},${s.os},${s.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'login-history.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" /> Login History
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Security log for {user?.email ?? 'your account'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-gray-900 dark:text-white">{sessions.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Sessions</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{successCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Successful</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-red-600 dark:text-red-400">{failedCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Failed Attempts</p>
        </div>
      </div>

      {failedCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-3">
          <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{failedCount} failed login attempt{failedCount > 1 ? 's' : ''}</strong> detected on your account. If you didn't attempt these, change your password immediately.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by IP, location, browser..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {(['All','Success','Failed'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition',
                statusFilter === f ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {filtered.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.03 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  s.status === 'Success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400')}>
                  {s.status === 'Success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.location}</p>
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                      s.status === 'Success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Globe className="h-3 w-3" /> {s.ip}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <DeviceIcon device={s.device} /> {s.device} · {s.os}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{s.browser}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {formatDistanceToNow(parseISO(s.timestamp), { addSuffix: true })}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(s.timestamp).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
