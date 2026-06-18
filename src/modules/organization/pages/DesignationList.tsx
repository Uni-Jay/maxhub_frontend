import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { designationService, departmentService, type Designation } from '@services/departmentService';

const errMsg = (error: unknown): string =>
  (error as any)?.response?.data?.message || (error as any)?.message || 'Something went wrong';

const inputClass = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const INIT_FORM = { name: '', code: '', departmentId: '', level: '1' };

export default function DesignationList() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [departmentFilter, setDepartmentFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['designations', departmentFilter],
    queryFn: () => designationService.getAll(departmentFilter ? Number(departmentFilter) : undefined),
  });
  const designations: Designation[] = Array.isArray(data) ? data : [];

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll(),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        code: form.code || undefined,
        departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        level: Number(form.level) || 1,
      };
      return editing ? designationService.update(editing.id, payload) : designationService.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['designations'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => designationService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designations'] }),
  });

  const openCreate = () => { setEditing(null); setForm(INIT_FORM); setShowModal(true); };
  const openEdit = (d: Designation) => {
    setEditing(d);
    setForm({ name: d.name, code: d.code, departmentId: d.departmentId ? String(d.departmentId) : '', level: String(d.level) });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(INIT_FORM); };

  const deptName = (id?: number) => (departments ?? []).find((d: any) => d.id === id)?.name ?? '—';

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Designations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Job titles and seniority levels</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Departments</option>
            {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
            <Plus className="h-4 w-4" /> New Designation
          </button>
        </div>
      </div>

      {designations.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No designations found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {designations.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{d.name}</p>
                  <p className="text-xs text-gray-400">{deptName(d.departmentId)} · Level {d.level}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(d)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { if (window.confirm(`Delete designation "${d.name}"?`)) deleteMutation.mutate(d.id); }}
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
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit' : 'New'} Designation</h2>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Code</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Department</label>
                  <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} className={inputClass}>
                    <option value="">None</option>
                    {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Level</label>
                  <input type="number" min={1} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className={inputClass} />
                </div>
                {saveMutation.isError && <p className="text-xs text-red-600">{errMsg(saveMutation.error)}</p>}
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.name || saveMutation.isPending}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold"
                >
                  {saveMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Designation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
