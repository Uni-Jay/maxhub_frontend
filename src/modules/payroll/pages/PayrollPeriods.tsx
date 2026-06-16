import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Play, X, CheckCircle2, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { payrollService, type PayrollPeriod } from '@services/payrollService';
import { cn } from '@utils/cn';

const STATUS_STYLES: Record<string, string> = {
  Draft:      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Processed:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Paid:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Cancelled:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const INIT_FORM = {
  periodName: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
  startDate: '', endDate: '',
};

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400';

export default function PayrollPeriods() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INIT_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-periods', { page, statusFilter }],
    queryFn: () => payrollService.getPeriods({ page, limit: 10, status: statusFilter || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => payrollService.createPeriod(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-periods'] }); setShowModal(false); setForm(INIT_FORM); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => payrollService.updatePeriodStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-periods'] }),
  });

  const processMutation = useMutation({
    mutationFn: (id: number) => payrollService.processPeriod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-periods'] }),
  });

  const periods: PayrollPeriod[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pay Periods</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure and manage payroll cycles</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 dark:shadow-none transition">
          <Plus className="h-4 w-4" /> New Pay Period
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className={cn(inputCls, 'w-auto')}>
          <option value="">All Statuses</option>
          {['Draft','Processing','Processed','Paid','Cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Calendar className="h-14 w-14 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No pay periods yet. Create your first one.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
          {periods.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition last:border-b-0">
              {/* Icon */}
              <div className="w-11 h-11 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.periodName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{p.periodCode}</p>
              </div>
              {/* Month / Year */}
              <div className="hidden md:block text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500">Period</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{MONTHS[p.month - 1]} {p.year}</p>
              </div>
              {/* Date Range */}
              <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                {new Date(p.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(p.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              {/* Status */}
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0', STATUS_STYLES[p.status] || STATUS_STYLES.Draft)}>
                {p.status}
              </span>
              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {p.status === 'Draft' && (
                  <button onClick={() => processMutation.mutate(p.id)} disabled={processMutation.isPending}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition font-medium">
                    <Play className="h-3 w-3" /> Process
                  </button>
                )}
                {p.status === 'Draft' && (
                  <button onClick={() => statusMutation.mutate({ id: p.id, status: 'Cancelled' })}
                    className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition px-2 py-1.5">
                    Cancel
                  </button>
                )}
                {p.status === 'Processed' && (
                  <button onClick={() => statusMutation.mutate({ id: p.id, status: 'Paid' })}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Mark Paid
                  </button>
                )}
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition">
            Prev
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition">
            Next
          </button>
        </div>
      )}

      {/* New Pay Period Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
              {/* Modal Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">New Pay Period</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Configure a new payroll cycle</p>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Period Name *</label>
                  <input value={form.periodName} onChange={e => setForm(f => ({ ...f, periodName: e.target.value }))}
                    placeholder="e.g. June 2026 Payroll" className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Month *</label>
                    <select value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))} className={inputCls}>
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Year *</label>
                    <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                      className={inputCls} min={2020} max={2030} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Start Date *</label>
                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">End Date *</label>
                    <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                {createMutation.isError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> Failed to create period. Please try again.
                  </div>
                )}
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  Cancel
                </button>
                <button onClick={() => createMutation.mutate(form)}
                  disabled={createMutation.isPending || !form.periodName || !form.startDate || !form.endDate}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
                  {createMutation.isPending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle2 className="h-4 w-4" />}
                  Create Period
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
