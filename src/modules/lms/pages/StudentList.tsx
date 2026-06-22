import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap, Plus, Search, X, Eye, Loader2, UserCheck, UserX, Mail, Phone, Pencil, Trash2,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { departmentService } from '@services/departmentService';
import { useAuth } from '@/contexts/AuthContext';

type StudentStatus = 'Active' | 'Inactive' | 'Graduated' | 'Suspended' | 'Withdrawn';

const STATUS_STYLES: Record<StudentStatus, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-600',
  Graduated: 'bg-indigo-100 text-indigo-700',
  Suspended: 'bg-rose-100 text-rose-700',
  Withdrawn: 'bg-amber-100 text-amber-700',
};

// The only two companies that actually register students today — also
// drives the student ID prefix server-side (KST for Kurios SAT, BM-VS for
// Beadmax Vocational School instead of the old one-size-fits-all BVS-).
const COMPANIES = [
  { id: 1, name: 'Kurios SAT' },
  { id: 4, name: 'Beadmax Vocational School' },
];

interface Student {
  id: number; studentNumber: string; status: StudentStatus;
  user?: { firstName: string; lastName: string; email: string; phone?: string };
  department?: { id: number; name: string; code: string };
  companyId?: number;
  program?: { name: string; code: string };
  guardianName?: string; guardianPhone?: string; guardianEmail?: string; enrollmentDate?: string;
}

const INIT_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  companyId: String(COMPANIES[0].id), departmentId: '',
  guardianName: '', guardianPhone: '', guardianEmail: '',
};

export function StudentList() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StudentStatus | 'All'>('All');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Student | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [formError, setFormError] = useState('');

  const canCreate = hasPermission('stm.student.create.all') || hasPermission('stm.student.create.own_department');
  const canUpdate = hasPermission('stm.student.update.all') || hasPermission('stm.student.update.own_department');
  const canDelete = hasPermission('stm.student.delete.all');
  const canSuspend = canUpdate || hasPermission('stm.student.suspend.all') || hasPermission('stm.student.suspend.own_department');

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, status],
    queryFn: () => apiClient.getRaw('/students', { page: 1, limit: 100, ...(search && { search }), ...(status !== 'All' && { status }) }),
  });
  const students: Student[] = (data as any)?.data?.students ?? [];

  const { data: deptData } = useQuery({ queryKey: ['departments'], queryFn: () => departmentService.getAll() });
  const departments = (deptData as any[]) ?? [];

  const closeModal = () => { setShowCreate(false); setEditingId(null); setForm(INIT_FORM); setFormError(''); };

  const openCreate = () => { setFormError(''); setForm(INIT_FORM); setEditingId(null); setShowCreate(true); };

  const openEdit = (s: Student) => {
    setFormError('');
    setForm({
      firstName: s.user?.firstName || '', lastName: s.user?.lastName || '',
      email: s.user?.email || '', phone: s.user?.phone || '',
      companyId: s.companyId ? String(s.companyId) : String(COMPANIES[0].id),
      departmentId: s.department?.id ? String(s.department.id) : '',
      guardianName: s.guardianName || '', guardianPhone: s.guardianPhone || '', guardianEmail: s.guardianEmail || '',
    });
    setEditingId(s.id);
    setShowCreate(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, departmentId: form.departmentId || undefined };
      return editingId ? apiClient.patch(`/students/${editingId}`, payload) : apiClient.post('/students', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); closeModal(); },
    onError: (err: any) => setFormError(err?.response?.data?.message || err?.message || 'Failed to save student'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StudentStatus }) => apiClient.patch(`/students/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/students/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });

  const handleDelete = (s: Student) => {
    if (window.confirm(`Remove ${s.user?.firstName} ${s.user?.lastName}? This cannot be undone.`)) {
      deleteMutation.mutate(s.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kurios SAT — Student Roster</p>
        </div>
        {canCreate && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['All', 'Active', 'Inactive', 'Graduated', 'Suspended', 'Withdrawn'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition ${status === s ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {students.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.user?.firstName} {s.user?.lastName}</p>
                    <p className="text-xs text-gray-500">{s.studentNumber} • {s.user?.email}{s.department ? ` • ${s.department.name}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                  <button onClick={() => setViewing(s)} className="p-1.5 text-gray-400 hover:text-indigo-600" title="View"><Eye className="w-3.5 h-3.5" /></button>
                  {canUpdate && (
                    <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-indigo-600" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  )}
                  {canSuspend && s.status === 'Active' && (
                    <button onClick={() => statusMutation.mutate({ id: s.id, status: 'Suspended' })} className="p-1.5 text-gray-400 hover:text-rose-600" title="Suspend"><UserX className="w-3.5 h-3.5" /></button>
                  )}
                  {canSuspend && s.status === 'Suspended' && (
                    <button onClick={() => statusMutation.mutate({ id: s.id, status: 'Active' })} className="p-1.5 text-gray-400 hover:text-emerald-600" title="Reactivate"><UserCheck className="w-3.5 h-3.5" /></button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(s)} className="p-1.5 text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <GraduationCap className="w-10 h-10 mb-3" />
                <p className="font-medium">No students yet</p>
                <p className="text-sm mt-1">Add your first student to get started</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-3 py-2 text-xs">{formError}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">School *</label>
                  <select value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
                    disabled={!!editingId}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 disabled:opacity-50">
                    {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {editingId && <p className="text-[11px] text-gray-400 mt-1">School can't be changed after registration</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900">
                    <option value="">Select department</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <p className="text-xs font-medium text-gray-500 pt-2">Guardian (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Name</label>
                  <input value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Phone</label>
                  <input value={form.guardianPhone} onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Email</label>
                <input type="email" value={form.guardianEmail} onChange={e => setForm(f => ({ ...f, guardianEmail: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
              </div>

              {!editingId && <p className="text-[11px] text-gray-400">A temporary password (Student@123) is set automatically — the student should change it on first login.</p>}

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300">Cancel</button>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.firstName || !form.lastName || !form.email || saveMutation.isPending}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Add Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{viewing.user?.firstName} {viewing.user?.lastName}</h2>
              <button onClick={() => setViewing(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p className="text-xs text-gray-500">{viewing.studentNumber}</p>
              <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300"><Mail className="w-3.5 h-3.5 text-gray-400" /> {viewing.user?.email}</p>
              {viewing.user?.phone && <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300"><Phone className="w-3.5 h-3.5 text-gray-400" /> {viewing.user.phone}</p>}
              <p><span className="text-gray-500">Department:</span> {viewing.department?.name ?? '—'}</p>
              <p><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[viewing.status]}`}>{viewing.status}</span></p>
              {viewing.guardianName && <p><span className="text-gray-500">Guardian:</span> {viewing.guardianName} {viewing.guardianPhone ? `(${viewing.guardianPhone})` : ''}</p>}
              {viewing.enrollmentDate && <p><span className="text-gray-500">Enrolled:</span> {viewing.enrollmentDate}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentList;
