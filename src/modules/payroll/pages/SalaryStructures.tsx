import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Plus, Edit2, Trash2, X, Check, Building2, Briefcase, Calendar, AlertCircle } from 'lucide-react';
import { payrollService, type SalaryStructure } from '@services/payrollService';
import { departmentService, designationService } from '@services/departmentService';
import { useCurrentRoles, useCurrentPermissions, hasPermission } from '@utils/role';
import { cn } from '@utils/cn';

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

const INIT_FORM = {
  code: '', name: '', description: '', baseSalary: '',
  status: 'Active' as 'Active' | 'Inactive',
  applicableFromDate: todayISO(), applicableToDate: '',
  departmentId: '', designationId: '',
};

const inputCls = 'w-full mt-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400';
const labelCls = 'text-xs font-semibold text-gray-700 dark:text-gray-300';

export default function SalaryStructures() {
  const qc = useQueryClient();
  const { roles } = useCurrentRoles();
  const permissions = useCurrentPermissions();
  const canManage = hasPermission(roles, permissions, 'hr.payroll.manage.all');

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SalaryStructure | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: () => payrollService.getStructures(),
  });

  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: () => departmentService.getAll() });
  const { data: designations } = useQuery({ queryKey: ['designations'], queryFn: () => designationService.getAll() });

  const structures: SalaryStructure[] = Array.isArray(data) ? data : (data as any)?.data || [];

  const closeModal = () => { setShowModal(false); setEditTarget(null); setForm(INIT_FORM); setFormError(''); };

  const createMutation = useMutation({
    mutationFn: (payload: any) => payrollService.createStructure(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-structures'] }); closeModal(); },
    onError: (err: any) => setFormError(err?.message || 'Failed to create structure'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => payrollService.updateStructure(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-structures'] }); closeModal(); },
    onError: (err: any) => setFormError(err?.message || 'Failed to update structure'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => payrollService.deleteStructure(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-structures'] }),
  });

  const openCreate = () => { setEditTarget(null); setForm({ ...INIT_FORM, code: `SAL-${Date.now().toString(36).toUpperCase()}` }); setFormError(''); setShowModal(true); };
  const openEdit = (s: SalaryStructure) => {
    setEditTarget(s);
    setForm({
      code: s.code, name: s.name, description: s.description || '',
      baseSalary: String(s.baseSalary), status: s.status,
      applicableFromDate: s.applicableFromDate?.slice(0, 10) || todayISO(),
      applicableToDate: s.applicableToDate?.slice(0, 10) || '',
      departmentId: String(s.departmentId || ''), designationId: String(s.designationId || ''),
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = () => {
    setFormError('');
    if (!form.code || !form.name || !form.baseSalary || !form.applicableFromDate) {
      setFormError('Code, name, base salary and applicable-from date are required');
      return;
    }
    const payload = {
      code: form.code,
      name: form.name,
      description: form.description || undefined,
      baseSalary: Number(form.baseSalary),
      status: form.status,
      applicableFromDate: form.applicableFromDate,
      applicableToDate: form.applicableToDate || undefined,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined,
      designationId: form.designationId ? Number(form.designationId) : undefined,
    };

    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload });
    else createMutation.mutate(payload);
  };

  const deptMap = useMemo(() => new Map((departments || []).map(d => [d.id, d.name])), [departments]);
  const desigMap = useMemo(() => new Map((designations || []).map(d => [d.id, d.name])), [designations]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Structures</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure pay templates by department or designation</p>
        </div>
        {canManage && (
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 dark:shadow-none transition">
            <Plus className="h-4 w-4" /> New Structure
          </button>
        )}
      </div>

      {structures.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Settings className="h-14 w-14 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No salary structures yet{canManage ? ' — create your first one.' : '.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {structures.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{s.name}</h3>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold',
                      s.status === 'Active'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400')}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{s.code}</p>
                </div>
                {canManage && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>

              {s.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{s.description}</p>}

              <div className="bg-indigo-50/60 dark:bg-indigo-900/10 rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Base Salary</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-400">{fmt(s.baseSalary)}</span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                {(s.departmentId || s.department) && (
                  <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {s.department?.name || deptMap.get(s.departmentId!) || '—'}</div>
                )}
                {(s.designationId || s.designation) && (
                  <div className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {s.designation?.name || desigMap.get(s.designationId!) || '—'}</div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Valid from {new Date(s.applicableFromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {s.applicableToDate && ` – ${new Date(s.applicableToDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{editTarget ? 'Edit Structure' : 'New Salary Structure'}</h2>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>Code *</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className={inputCls}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Structure Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Senior Staff Grade A" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>Department</label>
                    <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} className={inputCls}>
                      <option value="">Any department</option>
                      {(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Designation</label>
                    <select value={form.designationId} onChange={e => setForm(f => ({ ...f, designationId: e.target.value }))} className={inputCls}>
                      <option value="">Any designation</option>
                      {(designations || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Base Salary (₦) *</label>
                  <input type="number" min={0} value={form.baseSalary} onChange={e => setForm(f => ({ ...f, baseSalary: e.target.value }))} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>Applicable From *</label><input type="date" value={form.applicableFromDate} onChange={e => setForm(f => ({ ...f, applicableFromDate: e.target.value }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Applicable To</label><input type="date" value={form.applicableToDate} onChange={e => setForm(f => ({ ...f, applicableToDate: e.target.value }))} className={inputCls} /></div>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {formError}
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  {isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                  {editTarget ? 'Save Changes' : 'Create Structure'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
