import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap, Plus, Search, Loader2, UserCheck, UserX, Mail, Phone, Pencil, Trash2, Award, Sparkles, BookOpen, Printer, RotateCcw, CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool, SchoolBar } from '@components/erp/School';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { Modal, Drawer, Field, Stat, inp, btnPrimary, btnGhost, card, fmtDate } from '@components/erp/Kit';

type StudentStatus = 'Active' | 'Inactive' | 'Graduated' | 'Suspended' | 'Withdrawn';
const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  Graduated: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  Suspended: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Withdrawn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};
const COMPANIES = [{ id: 1, name: 'Kurios SAT' }, { id: 4, name: 'Beadmax Vocational School' }];

interface Course { src: 'E' | 'S'; id: number; courseId: number; title: string; status: string; progress: number; lessonPercent: number | null; startedAt: string | null; completedAt: string | null; certificateCode: string | null }
interface Student {
  id: number; userId: number; studentNumber: string; status: StudentStatus; name: string; firstName: string; lastName: string; email: string; phone?: string | null;
  departmentName?: string | null; enrollmentDate?: string | null; graduationDate?: string | null; guardianName?: string | null; guardianPhone?: string | null; guardianEmail?: string | null; companyId?: number | null;
  courses: Course[]; activeCourses: number; completedCourses: number; certificates: number; readyToGraduate: boolean;
}

const INIT_FORM = { firstName: '', lastName: '', email: '', phone: '', companyId: String(COMPANIES[0].id), departmentId: '', guardianName: '', guardianPhone: '', guardianEmail: '' };
const isActiveCourse = (c: Course) => ['Enrolled', 'InProgress', 'OnHold', 'Active', 'Pending'].includes(c.status);
const pct = (c: Course) => Math.max(c.progress || 0, c.lessonPercent || 0);

export function StudentList() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const { school, setSchool, info, style } = useSchool();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'Active' | 'ready' | 'Graduated' | 'Suspended' | 'all'>('Active');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [graduating, setGraduating] = useState<Student[] | null>(null);
  const [viewing, setViewing] = useState<Student | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');

  const canCreate = hasPermission('stm.student.create.all') || hasPermission('stm.student.create.own_department');
  const canUpdate = hasPermission('stm.student.update.all') || hasPermission('stm.student.update.own_department');
  const canDelete = hasPermission('stm.student.delete.all');
  const canSuspend = canUpdate || hasPermission('stm.student.suspend.all') || hasPermission('stm.student.suspend.own_department');

  const q = useQuery({ queryKey: ['school-students', school], queryFn: () => apiClient.get<{ students: Student[]; counts: Record<string, number> }>('/erp/school/students', { school }) });
  const all = q.data?.students || [];
  const counts = q.data?.counts || {};
  const list = useMemo(() => all.filter((s) => (tab === 'all' || (tab === 'ready' ? s.readyToGraduate : s.status === tab))
    && `${s.name} ${s.email} ${s.studentNumber} ${s.courses.map((c) => c.title).join(' ')}`.toLowerCase().includes(search.toLowerCase())), [all, tab, search]);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['school-students'] }); qc.invalidateQueries({ queryKey: ['students'] }); setSelected(new Set()); };

  const saveMutation = useMutation({
    mutationFn: () => { const { companyId: _c, departmentId: _d, ...rest } = form; void _c; void _d; const payload = { ...rest, school }; return editingId ? apiClient.patch(`/students/${editingId}`, payload) : apiClient.post('/students', payload); },
    onSuccess: () => { toast.success(editingId ? 'Student updated' : 'Student added'); refresh(); setShowForm(false); },
    onError: (err: any) => setFormError(err?.response?.data?.message || err?.message || 'Failed to save student'),
  });
  const statusMutation = useMutation({ mutationFn: ({ id, status }: { id: number; status: StudentStatus }) => apiClient.patch(`/students/${id}/status`, { status }), onSuccess: (_d, v) => { toast.success(`Student ${v.status === 'Active' ? 'reactivated' : v.status.toLowerCase()}`); refresh(); }, onError: (e: any) => toast.fromError(e) });
  const reopen = useMutation({ mutationFn: (id: number) => apiClient.post(`/erp/school/students/${id}/reopen`, {}), onSuccess: () => { toast.success('Student is active again'); refresh(); }, onError: (e: any) => toast.fromError(e) });
  const deleteMutation = useMutation({ mutationFn: (id: number) => apiClient.delete(`/students/${id}`), onSuccess: () => { toast.success('Student removed'); refresh(); }, onError: (e: any) => toast.fromError(e) });

  const openCreate = () => { setFormError(''); setForm(INIT_FORM); setEditingId(null); setShowForm(true); };
  const openEdit = (s: Student) => {
    setFormError('');
    setForm({ firstName: s.firstName || '', lastName: s.lastName || '', email: s.email || '', phone: s.phone || '', companyId: s.companyId ? String(s.companyId) : String(COMPANIES[0].id), departmentId: '', guardianName: s.guardianName || '', guardianPhone: s.guardianPhone || '', guardianEmail: s.guardianEmail || '' });
    setEditingId(s.id); setShowForm(true);
  };
  const toggle = (id: number) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectable = list.filter((s) => s.status !== 'Graduated');
  const chosen = all.filter((s) => selected.has(s.id));

  return (
    <div className="space-y-5" style={style}>
      <SchoolBar school={school} setSchool={setSchool} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{info.name} — courses, progress and graduation in one place.</p>
        </div>
        <div className="flex gap-2">
          {(counts.ready || 0) > 0 && <button onClick={() => setGraduating(all.filter((s) => s.readyToGraduate))} className={cn(btnGhost, 'border-indigo-300 text-indigo-700 dark:text-indigo-300')}><Sparkles className="h-4 w-4" />Graduate all who finished ({counts.ready})</button>}
          {canCreate && <button onClick={openCreate} className={cn(btnPrimary, 'brand-bg')}><Plus className="w-4 h-4" />Add student</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={BookOpen} label="Studying now" value={counts.Active || 0} tone="text-emerald-600" />
        <Stat icon={Sparkles} label="Finished — ready to graduate" value={counts.ready || 0} tone={counts.ready ? 'text-indigo-600' : undefined} />
        <Stat icon={GraduationCap} label="Graduated" value={counts.Graduated || 0} />
        <Stat icon={Award} label="Certificates issued" value={all.reduce((t, s) => t + s.certificates, 0)} />
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/70 w-fit max-w-full overflow-x-auto">
          {([['Active', 'Studying', counts.Active], ['ready', 'Ready to graduate', counts.ready], ['Graduated', 'Graduated', counts.Graduated], ['Suspended', 'Suspended', counts.Suspended], ['all', 'All', counts.all]] as const).map(([k, l, n]) => (
            <button key={k} onClick={() => { setTab(k); setSelected(new Set()); }} className={cn('px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap', tab === k ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400')}>
              {l}{n ? <span className="ml-1.5 text-[11px] text-gray-500">{n}</span> : null}
            </button>
          ))}
        </div>
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, student number or course…" className={cn(inp, 'pl-10')} /></div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-indigo-600 text-white px-4 py-3 shadow-lg">
          <span className="font-semibold">{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-sm text-indigo-100 hover:text-white">Clear</button>
          <span className="flex-1" />
          <button onClick={() => setGraduating(chosen)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-700 text-sm font-semibold"><GraduationCap className="h-4 w-4" />Graduate {selected.size}</button>
        </div>
      )}

      <div className={cn(card, 'overflow-hidden')}>
        {q.isLoading ? <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div> : !list.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400"><GraduationCap className="w-10 h-10 mb-3" /><p className="font-medium">{tab === 'ready' ? 'Nobody has finished all their courses yet' : 'No students here'}</p>{tab === 'ready' && <p className="text-sm mt-1 max-w-md text-center">A student shows here when every course they are on is at 100% (from online lessons or the progress you set). You can still graduate anyone from the Studying tab.</p>}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-500">
                <tr>
                  <th className="w-10 px-4 py-2.5">{selectable.length > 0 && <input type="checkbox" checked={selectable.every((s) => selected.has(s.id))} onChange={(e) => setSelected(e.target.checked ? new Set(selectable.map((s) => s.id)) : new Set())} />}</th>
                  <th className="text-left px-2 py-2.5">Student</th><th className="text-left px-3 py-2.5">Courses & progress</th><th className="text-left px-3 py-2.5">Status</th><th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {list.map((s) => (
                  <tr key={s.id} className={cn('hover:bg-gray-50/60 dark:hover:bg-gray-800/40', selected.has(s.id) && 'bg-indigo-50/60 dark:bg-indigo-500/5')}>
                    <td className="px-4 py-3 align-top">{s.status !== 'Graduated' && <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />}</td>
                    <td className="px-2 py-3 align-top">
                      <button onClick={() => setViewing(s)} className="text-left"><p className="font-medium text-gray-900 dark:text-white hover:text-indigo-600">{s.name}</p></button>
                      <p className="text-xs text-gray-500">{s.studentNumber} · {s.email}</p>
                    </td>
                    <td className="px-3 py-3 align-top min-w-[260px]">
                      {!s.courses.length ? <span className="text-xs text-gray-400">Not enrolled in a course</span> : (
                        <div className="space-y-1.5">
                          {s.courses.slice(0, 3).map((c) => (
                            <div key={`${c.src}${c.id}`} className="flex items-center gap-2">
                              <span className="text-xs w-40 truncate text-gray-700 dark:text-gray-300" title={c.title}>{c.title}</span>
                              {c.status === 'Completed' ? <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Completed{c.certificateCode ? ' · certificate' : ''}</span> : (
                                <><div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className={cn('h-full', pct(c) >= 100 ? 'bg-indigo-500' : 'bg-emerald-500')} style={{ width: `${pct(c)}%` }} /></div><span className="text-[11px] tabular-nums text-gray-500">{pct(c)}%</span></>
                              )}
                            </div>
                          ))}
                          {s.courses.length > 3 && <p className="text-[11px] text-gray-500">+{s.courses.length - 3} more</p>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[s.status])}>{s.status}</span>
                      {s.readyToGraduate && <p className="text-[11px] text-indigo-600 mt-1 font-medium">Finished — ready</p>}
                      {s.graduationDate && <p className="text-[11px] text-gray-500 mt-1">{fmtDate(s.graduationDate)}</p>}
                    </td>
                    <td className="px-3 py-3 align-top text-right whitespace-nowrap">
                      {s.status !== 'Graduated' && s.status !== 'Withdrawn' && <button onClick={() => setGraduating([s])} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300"><GraduationCap className="h-3.5 w-3.5" />Graduate</button>}
                      {canUpdate && <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-indigo-600" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}
                      {canSuspend && s.status === 'Active' && <button onClick={() => statusMutation.mutate({ id: s.id, status: 'Suspended' })} className="p-1.5 text-gray-400 hover:text-rose-600" title="Suspend"><UserX className="w-3.5 h-3.5" /></button>}
                      {canSuspend && s.status === 'Suspended' && <button onClick={() => statusMutation.mutate({ id: s.id, status: 'Active' })} className="p-1.5 text-gray-400 hover:text-emerald-600" title="Reactivate"><UserCheck className="w-3.5 h-3.5" /></button>}
                      {canDelete && <button onClick={() => { if (window.confirm(`Remove ${s.name}? This cannot be undone.`)) deleteMutation.mutate(s.id); }} className="p-1.5 text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {graduating && <GraduateModal students={graduating} onClose={() => setGraduating(null)} onDone={() => { setGraduating(null); refresh(); }} />}
      {viewing && (
        <Drawer onClose={() => setViewing(null)} title={<div className="flex items-center gap-2"><h2 className="font-semibold text-gray-900 dark:text-white">{viewing.name}</h2><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[viewing.status])}>{viewing.status}</span></div>}
          sub={<>{viewing.studentNumber}{viewing.departmentName ? ` · ${viewing.departmentName}` : ''}</>}
          footer={<>
            {viewing.status === 'Graduated' && canUpdate && <button onClick={() => { reopen.mutate(viewing.id); setViewing(null); }} className={btnGhost}><RotateCcw className="h-4 w-4" />Set back to studying</button>}
            {viewing.status !== 'Graduated' && <button onClick={() => { setGraduating([viewing]); setViewing(null); }} className={btnPrimary}><GraduationCap className="h-4 w-4" />Graduate</button>}
          </>}>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a href={`mailto:${viewing.email}`} className="inline-flex items-center gap-1.5 text-indigo-600"><Mail className="h-4 w-4" />{viewing.email}</a>
            {viewing.phone && <a href={`tel:${viewing.phone}`} className="inline-flex items-center gap-1.5 text-indigo-600"><Phone className="h-4 w-4" />{viewing.phone}</a>}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Joined</p><p>{fmtDate(viewing.enrollmentDate)}</p></div>
            <div><p className="text-xs text-gray-500">Graduated</p><p>{fmtDate(viewing.graduationDate)}</p></div>
            {viewing.guardianName && <div className="col-span-2"><p className="text-xs text-gray-500">Guardian</p><p>{viewing.guardianName}{viewing.guardianPhone ? ` · ${viewing.guardianPhone}` : ''}</p></div>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Courses</p>
            {!viewing.courses.length ? <p className="text-sm text-gray-500">Not enrolled in any course. Enrol them from the course page.</p> : (
              <div className="space-y-2">
                {viewing.courses.map((c) => (
                  <div key={`${c.src}${c.id}`} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                    <div className="flex items-center gap-2"><Link to={`/lms/courses/${c.courseId}`} className="font-medium text-sm flex-1 hover:text-indigo-600">{c.title}</Link><span className="text-xs text-gray-500">{c.status}</span></div>
                    {c.status !== 'Completed' ? (
                      <div className="flex items-center gap-2 mt-2"><div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct(c)}%` }} /></div><span className="text-xs tabular-nums">{pct(c)}%</span></div>
                    ) : (
                      <p className="text-xs text-emerald-600 mt-1">Completed {fmtDate(c.completedAt)}</p>
                    )}
                    {c.certificateCode && c.certificateCode !== 'issued' && <Link to={`/certificate/${c.certificateCode}`} className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"><Printer className="h-3.5 w-3.5" />Certificate {c.certificateCode}</Link>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Drawer>
      )}

      {showForm && (
        <Modal title={editingId ? 'Edit student' : 'Add student'} onClose={() => setShowForm(false)}
          footer={<><button onClick={() => setShowForm(false)} className={btnGhost}>Cancel</button><button onClick={() => saveMutation.mutate()} disabled={!form.firstName || !form.lastName || !form.email || saveMutation.isPending} className={btnPrimary}>{saveMutation.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add student'}</button></>}>
          {formError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-3 py-2 text-xs">{formError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name *"><input className={inp} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Last name *"><input className={inp} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            <Field label="Email *"><input type="email" className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <p className="text-xs text-gray-500">School: <strong className="brand-text">{info.name}</strong></p>
          <p className="text-xs font-semibold text-gray-500 pt-1">Guardian (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Guardian name"><input className={inp} value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></Field>
            <Field label="Guardian phone"><input className={inp} value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} /></Field>
          </div>
          <Field label="Guardian email"><input type="email" className={inp} value={form.guardianEmail} onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })} /></Field>
          {!editingId && <p className="text-[11px] text-gray-400">A temporary password (Student@123) is set automatically — the student should change it on first login.</p>}
        </Modal>
      )}
    </div>
  );
}

function GraduateModal({ students, onClose, onDone }: { students: Student[]; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [certs, setCerts] = useState(true);
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any[] | null>(null);
  const unfinished = students.filter((s) => s.courses.some((c) => isActiveCourse(c) && pct(c) < 100));
  const go = useMutation({
    mutationFn: () => apiClient.post<{ results: any[] }>('/erp/school/graduate', { studentIds: students.map((s) => s.id), graduationDate: date, issueCertificates: certs, notify, message }),
    onSuccess: (d) => { setResult(d.results); toast.success('Done', `${d.results.filter((r) => r.graduated).length} graduated`); },
    onError: (e: any) => toast.fromError(e, 'Could not graduate'),
  });
  if (result) return (
    <Modal title="Graduation complete 🎓" onClose={onDone} footer={<button onClick={onDone} className={btnPrimary}>Done</button>}>
      <div className="space-y-2">
        {result.map((r) => (
          <div key={r.studentId} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-sm">
            <p className="font-semibold">{r.name} {r.graduated ? <span className="text-indigo-600">— graduated</span> : <span className="text-amber-600">— courses completed, still on {r.stillActive} other course(s)</span>}</p>
            {r.courses.map((c: any, i: number) => <p key={i} className="text-xs text-gray-600 dark:text-gray-400">{c.course}{c.certificateCode ? <> · <Link className="text-indigo-600 hover:underline" to={`/certificate/${c.certificateCode}`}>certificate {c.certificateCode}</Link></> : ''}</p>)}
          </div>
        ))}
      </div>
    </Modal>
  );
  return (
    <Modal title={students.length === 1 ? `Graduate ${students[0].name}` : `Graduate ${students.length} students`} sub="Completes their courses, issues certificates and marks them Graduated — in one step." onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => go.mutate()} disabled={go.isPending} className={cn(btnPrimary, 'bg-indigo-600')}>{go.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}Graduate</button></>}>
      <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {students.map((s) => (
          <div key={s.id} className="px-3 py-2 text-sm"><p className="font-medium">{s.name}</p><p className="text-xs text-gray-500">{s.courses.filter((c) => isActiveCourse(c) || c.status === 'Completed').map((c) => `${c.title} (${c.status === 'Completed' ? 'done' : `${pct(c)}%`})`).join(' · ') || 'No courses'}</p></div>
        ))}
      </div>
      {unfinished.length > 0 && <p className="text-xs rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 p-3">{unfinished.length === 1 ? `${unfinished[0].name} has` : `${unfinished.length} students have`} a course below 100%. Graduating marks it complete anyway — fine if they finished in class.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Graduation date"><input type="date" className={inp} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={certs} onChange={(e) => setCerts(e.target.checked)} />Issue a certificate for each course</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />Congratulate them by email and in their portal</label>
      {notify && <Field label="A personal message (optional)"><textarea rows={2} className={inp} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Your graduation ceremony is on Saturday 14 November at 11am." /></Field>}
    </Modal>
  );
}

export default StudentList;
