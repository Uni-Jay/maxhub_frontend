import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpCircle, CheckCircle2, XCircle, Trash2, TrendingUp } from 'lucide-react';
import { hrService, type EmployeePromotion } from '@services/hrService';

const errMsg = (error: unknown): string =>
  (error as any)?.response?.data?.message || (error as any)?.message || 'Something went wrong';

const STATUS_COLORS: Record<string, string> = {
  Proposed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Effective: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function PromotionsList() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['promotions', statusFilter],
    queryFn: () => hrService.getPromotions(statusFilter || undefined),
  });

  const promotions: EmployeePromotion[] = Array.isArray(data) ? data : [];

  const approveMutation = useMutation({
    mutationFn: (id: number) => hrService.approvePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
    onError: (error) => window.alert(errMsg(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => {
      const reason = window.prompt('Reason for rejecting this promotion:') ?? undefined;
      return hrService.rejectPromotion(id, reason);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
    onError: (error) => window.alert(errMsg(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => hrService.deletePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
    onError: (error) => window.alert(errMsg(error)),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Promotions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Proposed and processed staff promotions</p>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {['Proposed', 'Effective', 'Rejected', 'Completed'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {promotions.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No promotions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <ArrowUpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {p.staff ? `${p.staff.firstName} ${p.staff.lastName}` : `Staff #${p.staffId}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {p.fromDesignation?.name ?? `Designation #${p.fromDesignationId}`} → {p.toDesignation?.name ?? `Designation #${p.toDesignationId}`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Effective {new Date(p.effectiveDate).toLocaleDateString()}
                    {p.salaryIncreasePercentage ? ` · +${p.salaryIncreasePercentage}% salary` : ''}
                  </p>
                  {p.rejectionReason && <p className="text-xs text-red-500 mt-0.5">{p.rejectionReason}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                {p.status === 'Proposed' && (
                  <>
                    <button onClick={() => approveMutation.mutate(p.id)} disabled={approveMutation.isPending}
                      className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => rejectMutation.mutate(p.id)} disabled={rejectMutation.isPending}
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </>
                )}
                <button onClick={() => { if (window.confirm('Delete this promotion record?')) deleteMutation.mutate(p.id); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
