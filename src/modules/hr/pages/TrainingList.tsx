import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, Users, Calendar, X, Check, ChevronDown, ChevronUp, Search, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { hrService, type TrainingProgram } from '@services/hrService';
import { useCurrentRoles, useCurrentPermissions, hasPermission } from '@utils/role';

const errMsg = (error: unknown): string =>
  (error as any)?.response?.data?.message || (error as any)?.message || 'Something went wrong';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Active: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const STATUS_NEXT: Record<string, string | null> = {
  Draft: 'Active', Active: 'Completed', Completed: null, Cancelled: null,
};

const INIT_FORM = {
  trainingName: '', trainingCode: '', description: '',
  trainingType: 'Mandatory' as const,
  duration: 1, durationUnit: 'Days' as const,
  startDate: '', endDate: '', location: '', budget: '',
};

export default function TrainingList() {
  const qc = useQueryClient();
  const { roles } = useCurrentRoles();
  const permissions = useCurrentPermissions();
  const canCreate = hasPermission(roles, permissions, 'train.program.create.all');
  const canUpdate = hasPermission(roles, permissions, 'train.program.update.all');
  const canDelete = hasPermission(roles, permissions, 'train.program.delete.all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(INIT_FORM); };

  const openEdit = (p: TrainingProgram) => {
    setEditingId(p.id);
    setForm({
      trainingName: p.trainingName,
      trainingCode: p.trainingCode || '',
      description: p.description || '',
      trainingType: p.trainingType as typeof INIT_FORM['trainingType'],
      duration: p.duration,
      durationUnit: p.durationUnit as typeof INIT_FORM['durationUnit'],
      startDate: p.startDate?.slice(0, 10) || '',
      endDate: p.endDate?.slice(0, 10) || '',
      location: p.location || '',
      budget: p.budget != null ? String(p.budget) : '',
    });
    setShowModal(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['training-programs', { statusFilter, search, page }],
    queryFn: () => hrService.getTrainingPrograms({ page, limit: 10, status: statusFilter || undefined, search: search || undefined }),
  });

  const { data: statsRaw } = useQuery({
    queryKey: ['training-stats'],
    queryFn: () => hrService.getTrainingStats(),
  });

  const { data: attendanceRaw, isLoading: attendanceLoading } = useQuery({
    queryKey: ['training-attendance', expanded],
    queryFn: () => hrService.getAttendance(expanded!),
    enabled: !!expanded,
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      hrService.createTrainingProgram({
        trainingName: payload.trainingName,
        trainingType: payload.trainingType,
        duration: Number(payload.duration),
        durationUnit: payload.durationUnit,
        startDate: payload.startDate,
        endDate: payload.endDate,
        trainingCode: payload.trainingCode || undefined,
        description: payload.description || undefined,
        location: payload.location || undefined,
        budget: payload.budget ? Number(payload.budget) : undefined,
      } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-programs'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      hrService.updateTraining(editingId!, {
        trainingName: payload.trainingName, trainingType: payload.trainingType,
        duration: Number(payload.duration), durationUnit: payload.durationUnit,
        startDate: payload.startDate, endDate: payload.endDate,
        description: payload.description || undefined, location: payload.location || undefined,
        budget: payload.budget ? Number(payload.budget) : undefined,
      } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-programs'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => hrService.deleteTrainingProgram(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-programs'] }); qc.invalidateQueries({ queryKey: ['training-stats'] }); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => hrService.updateTrainingStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-programs'] }); qc.invalidateQueries({ queryKey: ['training-stats'] }); },
  });

  const handleDelete = (p: TrainingProgram) => {
    if (!window.confirm(`Delete "${p.trainingName}"? This cannot be undone.`)) return;
    deleteMutation.mutate(p.id);
  };

  const programs: TrainingProgram[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination;
  const stats = (statsRaw as any)?.data;
  const attendance: any[] = (attendanceRaw as any) || [];

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Training Programs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage employee training and development</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
            <Plus className="h-4 w-4" /> New Training
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'from-gray-500 to-slate-600' },
            { label: 'Active', value: stats.active, color: 'from-blue-500 to-indigo-600' },
            { label: 'Completed', value: stats.completed, color: 'from-green-500 to-emerald-600' },
            { label: 'Total Budget', value: stats.totalBudget ? `₦${Number(stats.totalBudget).toLocaleString()}` : '—', color: 'from-amber-500 to-orange-600' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white`}>
              <p className="text-white/70 text-xs">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search training programs..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {['Draft','Active','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {(statusMutation.isError || deleteMutation.isError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-2.5">
          {errMsg(statusMutation.error || deleteMutation.error)}
        </div>
      )}

      {programs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No training programs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{p.trainingName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.trainingCode} · {p.trainingType}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {p.startDate && (
                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(p.startDate).toLocaleDateString()} – {p.endDate ? new Date(p.endDate).toLocaleDateString() : '?'}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Users className="h-3 w-3" /> {p.duration} {p.durationUnit}
                      </span>
                      {p.location && <span className="text-xs text-gray-400 dark:text-gray-500">{p.location}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {p.budget && <span className="text-xs font-medium text-gray-600 dark:text-gray-300">₦{Number(p.budget).toLocaleString()}</span>}
                  {(p as any).approvedAt && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700" title={`Approved ${new Date((p as any).approvedAt).toLocaleDateString()}`}>
                      <ShieldCheck className="h-3 w-3" /> Approved
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                  {canUpdate && STATUS_NEXT[p.status] && (
                    <button
                      onClick={e => { e.stopPropagation(); statusMutation.mutate({ id: p.id, status: STATUS_NEXT[p.status]! }); }}
                      className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-200"
                    >
                      → {STATUS_NEXT[p.status]}
                    </button>
                  )}
                  {canUpdate && (
                    <button onClick={e => { e.stopPropagation(); openEdit(p); }} className="p-1 text-gray-400 hover:text-indigo-600 transition" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={e => { e.stopPropagation(); handleDelete(p); }} className="p-1 text-gray-400 hover:text-red-600 transition" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {expanded === p.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {expanded === p.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
                  {p.description && <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{p.description}</p>}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Attendance</p>
                    {attendanceLoading ? (
                      <div className="text-center py-2"><div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                    ) : attendance.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500">No attendance recorded</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {attendance.map((a: any) => (
                          <div key={a.id} className="bg-white dark:bg-gray-800 rounded-lg p-2 text-xs border border-gray-100 dark:border-gray-700">
                            <p className="font-medium text-gray-800 dark:text-gray-100">
                              {a.staff ? `${a.staff.user.firstName} ${a.staff.user.lastName}` : `Staff #${a.staffId}`}
                            </p>
                            <p className={`mt-0.5 ${a.status === 'Present' ? 'text-green-600 dark:text-green-400' : a.status === 'Late' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`}>{a.status}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Prev</button>
          <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Next</button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? 'Edit Training Program' : 'New Training Program'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Program Name *</label><input value={form.trainingName} onChange={e => setForm(f => ({ ...f, trainingName: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Program Code</label><input value={form.trainingCode} onChange={e => setForm(f => ({ ...f, trainingCode: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Training Type *</label>
                  <select value={form.trainingType} onChange={e => setForm(f => ({ ...f, trainingType: e.target.value as any }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {['Mandatory','Optional','InductionProgram','SkillDevelopment','Leadership'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Duration *</label><input type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Unit *</label>
                    <select value={form.durationUnit} onChange={e => setForm(f => ({ ...f, durationUnit: e.target.value as any }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {['Hours','Days','Weeks','Months'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Start Date *</label><input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">End Date</label><input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Location</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Budget (₦)</label><input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</label><textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
              {(createMutation.isError || updateMutation.isError) && (
                <p className="text-red-500 text-xs mt-3">{errMsg(createMutation.error || updateMutation.error)}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">Cancel</button>
              <button
                onClick={() => editingId ? updateMutation.mutate(form) : createMutation.mutate(form)}
                disabled={createMutation.isPending || updateMutation.isPending || !form.trainingName || !form.startDate}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
