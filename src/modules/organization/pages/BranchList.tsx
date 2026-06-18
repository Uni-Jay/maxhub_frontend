import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { branchService, type Branch } from '@services/branchService';

const errMsg = (error: unknown): string =>
  (error as any)?.response?.data?.message || (error as any)?.message || 'Something went wrong';

const inputClass = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const INIT_FORM = { branchCode: '', branchName: '', city: '', state: '', country: '', phone: '', email: '' };

export default function BranchList() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(INIT_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getAll({ limit: 100 }),
  });
  const branches: Branch[] = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? branchService.update(editing.id, form)
      : branchService.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => branchService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });

  const openCreate = () => { setEditing(null); setForm(INIT_FORM); setShowModal(true); };
  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({ branchCode: b.branchCode, branchName: b.branchName, city: b.city ?? '', state: b.state ?? '', country: b.country ?? '', phone: b.phone ?? '', email: b.email ?? '' });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(INIT_FORM); };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branches</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Physical office / branch locations</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> New Branch
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No branches found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {branches.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{b.branchName}</p>
                  <p className="text-xs text-gray-400">{b.branchCode} · {[b.city, b.country].filter(Boolean).join(', ') || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { if (window.confirm(`Delete branch "${b.branchName}"?`)) deleteMutation.mutate(b.id); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
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
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit' : 'New'} Branch</h2>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Branch Code *</label>
                  <input value={form.branchCode} onChange={e => setForm(f => ({ ...f, branchCode: e.target.value }))} disabled={!!editing} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Branch Name *</label>
                  <input value={form.branchName} onChange={e => setForm(f => ({ ...f, branchName: e.target.value }))} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">City</label>
                    <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">State</label>
                    <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Country</label>
                  <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
                  </div>
                </div>
                {saveMutation.isError && <p className="text-xs text-red-600">{errMsg(saveMutation.error)}</p>}
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.branchCode || !form.branchName || saveMutation.isPending}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold"
                >
                  {saveMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
