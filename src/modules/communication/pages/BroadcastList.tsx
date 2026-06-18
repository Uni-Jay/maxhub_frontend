import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, X, Trash2, Users } from 'lucide-react';
import { broadcastService, BUSINESS_UNIT_LABELS, type Broadcast } from '@services/broadcastService';
import { departmentService } from '@services/departmentService';

const errMsg = (error: unknown): string =>
  (error as any)?.response?.data?.message || (error as any)?.message || 'Something went wrong';

const inputClass = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const INIT_FORM = { title: '', message: '', audienceType: 'All' as 'All' | 'BusinessUnit' | 'Department', audienceValue: '' };

export default function BroadcastList() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INIT_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => broadcastService.getAll(),
  });
  const broadcasts: Broadcast[] = Array.isArray(data) ? data : [];

  const { data: departments } = useQuery({
    queryKey: ['departments-picker'],
    queryFn: () => departmentService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: () => broadcastService.create({
      title: form.title,
      message: form.message,
      audienceType: form.audienceType,
      audienceValue: form.audienceType === 'All' ? undefined : form.audienceValue,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['broadcasts'] }); setShowModal(false); setForm(INIT_FORM); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => broadcastService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcasts'] }),
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Broadcasts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Org-wide announcements delivered as notifications</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> New Broadcast
        </button>
      </div>

      {broadcasts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No broadcasts sent yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{b.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{b.message}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5">
                      <Users className="h-3 w-3" />
                      <span>
                        {b.audienceType === 'All' ? 'All Staff' : b.audienceType === 'BusinessUnit'
                          ? (BUSINESS_UNIT_LABELS as any)[b.audienceValue ?? ''] ?? b.audienceValue
                          : `Department #${b.audienceValue}`}
                      </span>
                      <span>·</span>
                      <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => { if (window.confirm('Delete this broadcast?')) deleteMutation.mutate(b.id); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Broadcast</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Message *</label>
                  <textarea rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Audience</label>
                  <select value={form.audienceType}
                    onChange={e => setForm(f => ({ ...f, audienceType: e.target.value as typeof f.audienceType, audienceValue: '' }))}
                    className={inputClass}>
                    <option value="All">All Staff</option>
                    <option value="BusinessUnit">Business Unit</option>
                    <option value="Department">Department</option>
                  </select>
                </div>
                {form.audienceType === 'BusinessUnit' && (
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Business Unit *</label>
                    <select value={form.audienceValue} onChange={e => setForm(f => ({ ...f, audienceValue: e.target.value }))} className={inputClass}>
                      <option value="">Select...</option>
                      {Object.entries(BUSINESS_UNIT_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                    </select>
                  </div>
                )}
                {form.audienceType === 'Department' && (
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Department *</label>
                    <select value={form.audienceValue} onChange={e => setForm(f => ({ ...f, audienceValue: e.target.value }))} className={inputClass}>
                      <option value="">Select...</option>
                      {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}
                {createMutation.isError && <p className="text-xs text-red-600">{errMsg(createMutation.error)}</p>}
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!form.title || !form.message || (form.audienceType !== 'All' && !form.audienceValue) || createMutation.isPending}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold"
                >
                  {createMutation.isPending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
