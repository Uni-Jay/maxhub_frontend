import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Loader2, CheckCircle2, Clock, XCircle, ListChecks } from 'lucide-react';
import { hrService, BUSINESS_UNIT_LABELS, type BusinessUnitCode } from '@services/hrService';

const SYNC_STATUS_STYLES: Record<string, string> = {
  Synced: 'bg-green-50 text-green-700 border-green-200',
  Pending: 'bg-gray-50 text-gray-600 border-gray-200',
  Failed: 'bg-red-50 text-red-700 border-red-200',
};

export default function JobSyncDashboard() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [businessUnitFilter, setBusinessUnitFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['job-sync-stats'],
    queryFn: () => hrService.getJobSyncStats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['job-sync-list', { statusFilter, businessUnitFilter, page }],
    queryFn: () => hrService.getJobSyncList({
      page, limit: 20,
      syncStatus: statusFilter || undefined,
      businessUnit: businessUnitFilter || undefined,
    }),
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => hrService.retryJobSync(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-sync-list'] });
      qc.invalidateQueries({ queryKey: ['job-sync-stats'] });
    },
  });

  const statsData = (stats as any)?.data;
  const postings = (data as any)?.data || [];
  const pagination = (data as any)?.pagination;

  const STAT_CARDS = [
    { label: 'Total', value: statsData?.total ?? 0, color: 'from-gray-500 to-gray-600', icon: ListChecks },
    { label: 'Synced', value: statsData?.synced ?? 0, color: 'from-green-500 to-emerald-600', icon: CheckCircle2 },
    { label: 'Pending', value: statsData?.pending ?? 0, color: 'from-amber-500 to-yellow-600', icon: Clock },
    { label: 'Failed', value: statsData?.failed ?? 0, color: 'from-red-500 to-rose-600', icon: XCircle },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Sync Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">External job-portal sync status by business unit</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white flex items-center justify-between`}
          >
            <div>
              <p className="text-white/70 text-xs">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
            <s.icon className="h-6 w-6 text-white/60" />
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Sync Statuses</option>
          {['Pending', 'Synced', 'Failed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={businessUnitFilter}
          onChange={e => { setBusinessUnitFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Business Units</option>
          {(Object.entries(BUSINESS_UNIT_LABELS) as [BusinessUnitCode, string][]).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : postings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No job postings with a business unit yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Job</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-32">Business Unit</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-24 text-center">Attempts</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-24 text-center">Status</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-20 text-center">Retry</p>
            </div>
            {postings.map((job: any, i: number) => (
              <div
                key={job.id}
                className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center ${
                  i !== postings.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
                } hover:bg-gray-50 dark:hover:bg-gray-700/30 transition`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{job.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {job.jobCode}
                    {job.lastSyncError && (
                      <span className="text-red-500" title={job.lastSyncError}> · {job.lastSyncError.slice(0, 60)}{job.lastSyncError.length > 60 ? '…' : ''}</span>
                    )}
                  </p>
                </div>
                <div className="w-32 text-sm text-gray-600 dark:text-gray-400">
                  {job.businessUnit ? BUSINESS_UNIT_LABELS[job.businessUnit as BusinessUnitCode] : '—'}
                </div>
                <div className="w-24 text-center text-sm text-gray-600 dark:text-gray-400">{job.syncAttempts ?? 0}</div>
                <div className="w-24 text-center">
                  <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${SYNC_STATUS_STYLES[job.syncStatus] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {job.syncStatus}
                  </span>
                </div>
                <div className="w-20 text-center">
                  <button
                    onClick={() => retryMutation.mutate(job.id)}
                    disabled={retryMutation.isPending || job.syncStatus === 'Synced'}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    title="Retry sync"
                  >
                    {retryMutation.isPending && retryMutation.variables === job.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RefreshCw className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
          <span className="text-sm text-gray-600">Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
        </div>
      )}
    </div>
  );
}
