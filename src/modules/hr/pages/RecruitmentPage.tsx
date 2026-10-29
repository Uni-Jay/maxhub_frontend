import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Mail, Phone, FileText, CalendarClock, MessageSquare, Send, UserPlus, Loader2, Trash2, ChevronDown, ExternalLink, Briefcase } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { departmentService } from '@services/departmentService';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { CURRENCIES } from '@components/erp/RecordBoard';
import { Modal, Drawer, Field, Pill, UploadLink, Empty, inp, btnPrimary, btnGhost, btnDanger, card, money, fmtDate, fmtDateTime } from '@components/erp/Kit';

interface Job { id: number; jobCode: string; title: string; status: string; departmentId: number; departmentName: string; noOfPositions: number; closingDate: string; counts: Record<string, number> }
interface Cand { id: number; jobPostingId: number; applicantName: string; applicantEmail: string; applicantPhone: string; resumeUrl?: string | null; applicationDate: string; source?: string | null; stage: string; rating?: number | null; interviewAt?: string | null; feedbackCount: number; avgScore: number | null; hiredStaffId?: number | null }
interface Data { stages: string[]; jobs: Job[]; candidates: Cand[]; canHire: boolean }

const BOARD = ['New', 'Shortlisted', 'Interview', 'Offer', 'Hired'];
const STAGE_TONE: Record<string, 'gray' | 'blue' | 'violet' | 'amber' | 'green' | 'red'> = { New: 'gray', Shortlisted: 'blue', Interview: 'violet', Offer: 'amber', Hired: 'green', Rejected: 'red', Withdrawn: 'gray' };
const STAGE_BAR: Record<string, string> = { New: 'bg-gray-400', Shortlisted: 'bg-sky-500', Interview: 'bg-violet-500', Offer: 'bg-amber-500', Hired: 'bg-emerald-500' };

function Stars({ value, onChange, size = 'h-4 w-4' }: { value?: number | null; onChange?: (n: number) => void; size?: string }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={(e) => { e.stopPropagation(); onChange?.(n); }} className={cn(!onChange && 'cursor-default')}>
          <Star className={cn(size, n <= (value || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600')} />
        </button>
      ))}
    </span>
  );
}

export default function RecruitmentPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const q = useQuery({ queryKey: ['recruitment'], queryFn: () => apiClient.get<Data>('/erp/recruitment') });
  const [jobId, setJobId] = useState<number | 'all'>('all');
  const [showClosed, setShowClosed] = useState(false);
  const [adding, setAdding] = useState(false);
  const data = q.data;
  const jobs = data?.jobs || [];
  const cands = (data?.candidates || []).filter((c) => jobId === 'all' || c.jobPostingId === jobId);
  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const openId = Number(params.get('open')) || null;
  const setOpen = (id: number | null) => { const p = new URLSearchParams(params); if (id) p.set('open', String(id)); else p.delete('open'); setParams(p, { replace: true }); };
  const closed = cands.filter((c) => c.stage === 'Rejected' || c.stage === 'Withdrawn');
  const refresh = () => qc.invalidateQueries({ queryKey: ['recruitment'] });

  if (q.error) return <div className={cn(card, 'p-8 text-center text-sm text-red-600')}>{(q.error as any)?.message || 'Could not load recruitment'}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recruitment</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Everyone who applied — from the brand websites or added by hand — from first look to hired.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/hr/jobs" className={btnGhost}><Briefcase className="h-4 w-4" />Job adverts</Link>
          <button onClick={() => setAdding(true)} disabled={!jobs.length} className={btnPrimary}><Plus className="h-4 w-4" />Add applicant</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setJobId('all')} className={cn('shrink-0 px-3 py-2 rounded-xl border text-sm text-left', jobId === 'all' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900')}>
          <p className="font-semibold">All jobs</p><p className="text-xs text-gray-500">{(data?.candidates || []).length} applicants</p>
        </button>
        {jobs.map((j) => {
          const total = Object.values(j.counts).reduce((t, n) => t + n, 0);
          return (
            <button key={j.id} onClick={() => setJobId(j.id)} className={cn('shrink-0 px-3 py-2 rounded-xl border text-sm text-left max-w-[240px]', jobId === j.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900')}>
              <p className="font-semibold truncate">{j.title}</p>
              <p className="text-xs text-gray-500 truncate">{j.departmentName} · {total} applicant{total === 1 ? '' : 's'} · <span className={j.status === 'Open' ? 'text-emerald-600' : ''}>{j.status}</span></p>
            </button>
          );
        })}
      </div>

      {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : !jobs.length ? (
        <div className={card}><Empty icon={Briefcase} title="No job adverts yet" text="Create a job advert first. Open adverts appear on the brand websites and applications land here." action={<Link to="/hr/jobs" className={btnPrimary}>Go to job adverts</Link>} /></div>
      ) : (
        <>
          <div className="grid grid-flow-col auto-cols-[minmax(195px,1fr)] gap-3 overflow-x-auto pb-2">
            {BOARD.map((stage) => {
              const list = cands.filter((c) => c.stage === stage);
              return (
                <div key={stage} className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex flex-col min-h-[200px]">
                  <div className="px-3 py-2.5 flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', STAGE_BAR[stage])} /><p className="text-sm font-semibold flex-1">{stage}</p><span className="text-xs text-gray-500">{list.length}</span></div>
                  <div className="px-2 pb-2 space-y-2 flex-1">
                    {list.map((c) => (
                      <button key={c.id} onClick={() => setOpen(c.id)} className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 hover:border-indigo-400 transition">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{c.applicantName}</p>
                        {jobId === 'all' && <p className="text-xs text-gray-500 truncate">{jobById.get(c.jobPostingId)?.title}</p>}
                        <div className="flex items-center justify-between mt-1.5"><Stars value={c.rating} size="h-3 w-3" /><span className="text-[11px] text-gray-400">{fmtDate(c.applicationDate, { day: 'numeric', month: 'short' })}</span></div>
                        {c.interviewAt && stage === 'Interview' && <p className="text-[11px] text-violet-700 dark:text-violet-300 mt-1.5 flex items-center gap-1"><CalendarClock className="h-3 w-3" />{fmtDateTime(c.interviewAt)}</p>}
                        {c.feedbackCount > 0 && <p className="text-[11px] text-gray-500 mt-1">Panel score {c.avgScore}/5 ({c.feedbackCount})</p>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {closed.length > 0 && (
            <div className={card}>
              <button onClick={() => setShowClosed(!showClosed)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium">
                <span>Not going ahead ({closed.length})</span><ChevronDown className={cn('h-4 w-4 transition', showClosed && 'rotate-180')} />
              </button>
              {showClosed && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                  {closed.map((c) => (
                    <button key={c.id} onClick={() => setOpen(c.id)} className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-sm">
                      <span className="flex-1">{c.applicantName} <span className="text-gray-500">· {jobById.get(c.jobPostingId)?.title}</span></span><Pill tone={STAGE_TONE[c.stage]}>{c.stage}</Pill>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {adding && <AddApplicant jobs={jobs} defaultJob={jobId === 'all' ? jobs.find((j) => j.status === 'Open')?.id : jobId} onClose={() => setAdding(false)} onSaved={(id) => { setAdding(false); refresh(); setOpen(id); }} />}
      {openId && <CandidateDrawer id={openId} canHire={!!data?.canHire} onClose={() => setOpen(null)} onChanged={refresh} />}
    </div>
  );
}

function AddApplicant({ jobs, defaultJob, onClose, onSaved }: { jobs: Job[]; defaultJob?: number; onClose: () => void; onSaved: (id: number) => void }) {
  const [f, setF] = useState({ jobPostingId: String(defaultJob || jobs[0]?.id || ''), name: '', email: '', phone: '', source: 'Referral', resumeUrl: null as string | null, notes: '' });
  const save = useMutation({ mutationFn: () => apiClient.post<any>('/erp/recruitment', f), onSuccess: (d: any) => { toast.success('Applicant added'); onSaved(Number(d.id)); }, onError: (e: any) => toast.fromError(e) });
  return (
    <Modal title="Add an applicant" sub="For CVs that came by email, referrals or walk-ins" onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending || !f.name || !f.email} className={btnPrimary}>Add</button></>}>
      <Field label="Job"><select className={inp} value={f.jobPostingId} onChange={(e) => setF({ ...f, jobPostingId: e.target.value })}>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title} ({j.departmentName})</option>)}</select></Field>
      <Field label="Full name"><input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email"><input type="email" className={inp} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Phone"><input className={inp} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      </div>
      <Field label="Where did they come from?"><select className={inp} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>{['Referral', 'Walk-in', 'Email', 'LinkedIn', 'Jobberman', 'Social media', 'Other'].map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="CV"><UploadLink value={f.resumeUrl} onChange={(u) => setF({ ...f, resumeUrl: u })} label="Attach CV" folder="maxhub-cvs" /></Field>
      <Field label="Notes"><textarea rows={2} className={inp} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
    </Modal>
  );
}

function CandidateDrawer({ id, canHire, onClose, onChanged }: { id: number; canHire: boolean; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['candidate', id], queryFn: () => apiClient.get<any>(`/erp/recruitment/${id}`) });
  const [modal, setModal] = useState<null | 'stage' | 'interview' | 'feedback' | 'offer' | 'hire'>(null);
  const [stageTarget, setStageTarget] = useState('Rejected');
  const [note, setNote] = useState('');
  const c = q.data;
  const reload = () => { qc.invalidateQueries({ queryKey: ['candidate', id] }); onChanged(); };
  const rate = useMutation({ mutationFn: (rating: number) => apiClient.post(`/erp/recruitment/${id}/rating`, { rating }), onSuccess: reload });
  const addNote = useMutation({ mutationFn: () => apiClient.post(`/erp/recruitment/${id}/note`, { note }), onSuccess: () => { setNote(''); reload(); }, onError: (e: any) => toast.fromError(e) });
  const respond = useMutation({ mutationFn: (response: string) => apiClient.post(`/erp/recruitment/${id}/offer-response`, { response }), onSuccess: () => { toast.success('Offer updated'); reload(); }, onError: (e: any) => toast.fromError(e) });
  const del = useMutation({ mutationFn: () => apiClient.delete(`/erp/recruitment/${id}`), onSuccess: () => { toast.success('Applicant removed'); onChanged(); onClose(); }, onError: (e: any) => toast.fromError(e) });
  const move = (s: string) => { setStageTarget(s); setModal('stage'); };

  if (!c) return <Drawer title="Applicant" onClose={onClose}><Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /></Drawer>;
  const fb: any[] = c.interview?.feedback || [];
  const stage: string = c.stage;
  return (
    <Drawer onClose={onClose}
      title={<div className="flex items-center gap-2 flex-wrap"><h2 className="font-semibold text-gray-900 dark:text-white">{c.applicantName}</h2><Pill tone={STAGE_TONE[stage]}>{stage}</Pill></div>}
      sub={<>{c.jobTitle} · applied {fmtDate(c.applicationDate)}{c.source ? ` · ${c.source}` : ''}</>}
      footer={<>
        {canHire && stage !== 'Hired' && <button onClick={() => { if (confirm('Remove this applicant?')) del.mutate(); }} className={btnDanger}><Trash2 className="h-4 w-4" /></button>}
        {!['Hired', 'Rejected', 'Withdrawn'].includes(stage) && <button onClick={() => move('Rejected')} className={btnGhost}>Not going ahead</button>}
        {stage === 'New' && <button onClick={() => move('Shortlisted')} className={btnPrimary}>Shortlist</button>}
        {['New', 'Shortlisted', 'Interview'].includes(stage) && <button onClick={() => setModal('interview')} className={stage === 'Shortlisted' ? btnPrimary : btnGhost}><CalendarClock className="h-4 w-4" />{c.interview?.at ? 'Rebook interview' : 'Book interview'}</button>}
        {stage === 'Interview' && <button onClick={() => setModal('feedback')} className={btnGhost}><MessageSquare className="h-4 w-4" />Give feedback</button>}
        {canHire && ['Interview', 'Shortlisted'].includes(stage) && <button onClick={() => setModal('offer')} className={stage === 'Interview' ? btnPrimary : btnGhost}><Send className="h-4 w-4" />Make offer</button>}
        {canHire && stage === 'Offer' && <button onClick={() => setModal('hire')} className={cn(btnPrimary, 'bg-emerald-600 hover:bg-emerald-700')}><UserPlus className="h-4 w-4" />Hire</button>}
        {['Rejected', 'Withdrawn'].includes(stage) && <button onClick={() => move('Shortlisted')} className={btnGhost}>Reconsider</button>}
      </>}>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href={`mailto:${c.applicantEmail}`} className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline"><Mail className="h-4 w-4" />{c.applicantEmail}</a>
        {c.applicantPhone && c.applicantPhone !== '-' && <a href={`tel:${c.applicantPhone}`} className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline"><Phone className="h-4 w-4" />{c.applicantPhone}</a>}
        {c.resumeUrl ? <a href={c.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline"><FileText className="h-4 w-4" />CV <ExternalLink className="h-3 w-3" /></a> : <span className="text-gray-400 inline-flex items-center gap-1.5"><FileText className="h-4 w-4" />No CV</span>}
      </div>
      <div className="flex items-center gap-3"><span className="text-xs font-semibold text-gray-500">Your rating</span><Stars value={c.rating} onChange={(n) => rate.mutate(n)} size="h-5 w-5" /></div>
      {c.notes && <div><p className="text-xs font-semibold text-gray-500 mb-1">Cover letter / notes</p><p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto">{c.notes}</p></div>}

      {c.interview?.at && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-900 p-4 space-y-2">
          <p className="font-semibold text-sm flex items-center gap-2"><CalendarClock className="h-4 w-4 text-violet-600" />Interview — {fmtDateTime(c.interview.at)}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{c.interview.mode}{c.interview.place ? ` · ${c.interview.place}` : ''}</p>
          {!!c.interviewers?.length && <p className="text-xs text-gray-500">Panel: {c.interviewers.map((i: any) => i.name).join(', ')}</p>}
          {fb.map((f, i) => (
            <div key={i} className="text-sm border-t border-gray-100 dark:border-gray-800 pt-2">
              <div className="flex items-center gap-2"><b>{f.by}</b><Stars value={f.rating} size="h-3 w-3" /><Pill tone={f.recommendation === 'Hire' ? 'green' : f.recommendation === 'Maybe' ? 'amber' : 'red'}>{f.recommendation}</Pill></div>
              {f.note && <p className="text-gray-600 dark:text-gray-400 mt-0.5">{f.note}</p>}
            </div>
          ))}
        </div>
      )}

      {c.offer && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 p-4 space-y-1.5 text-sm">
          <p className="font-semibold">Offer — {c.offer.position}</p>
          <p className="text-gray-600 dark:text-gray-400">{c.offer.salary ? `${money(c.offer.salary, c.offer.currency)} a month · ` : ''}{c.offer.employmentStatus}{c.offer.startDate ? ` · starts ${fmtDate(c.offer.startDate)}` : ''}</p>
          <div className="flex items-center gap-2 pt-1">
            <Pill tone={c.offer.response === 'Accepted' ? 'green' : c.offer.response === 'Declined' ? 'red' : 'amber'}>{c.offer.response || 'Waiting'}</Pill>
            {canHire && stage === 'Offer' && c.offer.response !== 'Accepted' && <button onClick={() => respond.mutate('Accepted')} className="text-xs text-emerald-700 hover:underline">Mark accepted</button>}
            {canHire && stage === 'Offer' && c.offer.response !== 'Declined' && <button onClick={() => respond.mutate('Declined')} className="text-xs text-red-600 hover:underline">Mark declined</button>}
          </div>
        </div>
      )}
      {stage === 'Hired' && c.hiredStaffId && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-200">
          Hired. Their login was emailed to them. <Link className="underline font-medium" to={`/hr/onboarding?staff=${c.hiredStaffId}`}>Open their onboarding checklist</Link>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">Timeline</p>
        <ol className="space-y-2.5 border-l-2 border-gray-100 dark:border-gray-800 ml-1.5">
          {[...(c.timeline || [])].reverse().map((t: any, i: number) => (
            <li key={i} className="pl-4 relative"><span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
              <p className="text-sm"><b>{t.action}</b> — {t.by}</p><p className="text-xs text-gray-500">{fmtDateTime(t.at)}</p>{t.note && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{t.note}</p>}
            </li>
          ))}
          <li className="pl-4 relative"><span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-gray-300" /><p className="text-sm">Applied</p><p className="text-xs text-gray-500">{fmtDateTime(c.applicationDate)}</p></li>
        </ol>
        <div className="flex gap-2 mt-3"><input className={inp} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (call outcome, reference check…)" onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) addNote.mutate(); }} /><button onClick={() => addNote.mutate()} disabled={!note.trim()} className={btnGhost}>Add</button></div>
      </div>
      {!!c.otherApplications?.length && <p className="text-xs text-gray-500">Also applied for: {c.otherApplications.map((o: any) => `${o.jobTitle} (${fmtDate(o.applicationDate)})`).join(', ')}</p>}

      {modal === 'stage' && <StageModal id={id} c={c} stage={stageTarget} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal === 'interview' && <InterviewModal id={id} c={c} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal === 'feedback' && <FeedbackModal id={id} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal === 'offer' && <OfferModal id={id} c={c} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal === 'hire' && <HireModal id={id} c={c} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
    </Drawer>
  );
}

function StageModal({ id, c, stage, onClose, onDone }: { id: number; c: any; stage: string; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(stage === 'Rejected' || stage === 'Shortlisted');
  const save = useMutation({ mutationFn: () => apiClient.post<any>(`/erp/recruitment/${id}/stage`, { stage, note, notifyCandidate: notify }), onSuccess: () => { toast.success(stage === 'Rejected' ? 'Marked as not going ahead' : `Moved to ${stage}`); onDone(); }, onError: (e: any) => toast.fromError(e) });
  return (
    <Modal title={stage === 'Rejected' ? `Not going ahead with ${c.applicantName}` : `Move ${c.applicantName} to ${stage}`} onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending} className={stage === 'Rejected' ? cn(btnPrimary, 'bg-red-600 hover:bg-red-700') : btnPrimary}>Confirm</button></>}>
      <Field label={stage === 'Rejected' ? 'Reason (for your records — not sent to them)' : 'Note (optional)'}><textarea rows={3} className={inp} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {(stage === 'Rejected' || stage === 'Shortlisted') && (
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-1" />
          <span>Email {c.applicantName.split(' ')[0]} {stage === 'Rejected' ? 'a polite “thank you, but not this time” message' : 'that they have been shortlisted'}</span></label>
      )}
    </Modal>
  );
}

function InterviewModal({ id, c, onClose, onDone }: { id: number; c: any; onClose: () => void; onDone: () => void }) {
  const people = useQuery({ queryKey: ['erp-people'], queryFn: () => apiClient.get<any[]>('/erp/people') });
  const toLocal = (d?: string) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
  const [f, setF] = useState({ at: toLocal(c.interview?.at), mode: c.interview?.mode || 'In person', place: c.interview?.place || '', interviewerIds: (c.interview?.interviewerIds || []) as number[], notifyCandidate: true });
  const [search, setSearch] = useState('');
  const save = useMutation({ mutationFn: () => apiClient.post<any>(`/erp/recruitment/${id}/interview`, { ...f, at: f.at ? new Date(f.at).toISOString() : null }), onSuccess: () => { toast.success('Interview booked', 'Added to the calendar and the panel was told'); onDone(); }, onError: (e: any) => toast.fromError(e) });
  const list = (people.data || []).filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <Modal title="Book an interview" sub={c.applicantName} onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending || !f.at} className={btnPrimary}>Book interview</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date and time"><input type="datetime-local" className={inp} value={f.at} onChange={(e) => setF({ ...f, at: e.target.value })} /></Field>
        <Field label="How"><select className={inp} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>{['In person', 'Video call', 'Phone call'].map((m) => <option key={m}>{m}</option>)}</select></Field>
      </div>
      <Field label={f.mode === 'In person' ? 'Where' : f.mode === 'Video call' ? 'Meeting link' : 'Who calls whom'}><input className={inp} value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} placeholder={f.mode === 'In person' ? 'e.g. Head office, Lekki' : f.mode === 'Video call' ? 'https://…' : 'We will call you on your number'} /></Field>
      <Field label={`Interview panel (${f.interviewerIds.length})`}>
        <input className={cn(inp, 'mb-2')} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff" />
        <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {list.map((p: any) => (
            <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <input type="checkbox" checked={f.interviewerIds.includes(p.id)} onChange={(e) => setF({ ...f, interviewerIds: e.target.checked ? [...f.interviewerIds, p.id] : f.interviewerIds.filter((x) => x !== p.id) })} />
              <span className="flex-1">{p.name}</span><span className="text-xs text-gray-500">{p.position || ''}</span>
            </label>
          ))}
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.notifyCandidate} onChange={(e) => setF({ ...f, notifyCandidate: e.target.checked })} />Email the invitation to {c.applicantName.split(' ')[0]}</label>
    </Modal>
  );
}

function FeedbackModal({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ rating: 3, recommendation: 'Maybe', note: '' });
  const save = useMutation({ mutationFn: () => apiClient.post(`/erp/recruitment/${id}/feedback`, f), onSuccess: () => { toast.success('Feedback saved'); onDone(); }, onError: (e: any) => toast.fromError(e) });
  return (
    <Modal title="Interview feedback" onClose={onClose} footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} className={btnPrimary}>Save</button></>}>
      <Field label="Overall"><Stars value={f.rating} onChange={(n) => setF({ ...f, rating: n })} size="h-6 w-6" /></Field>
      <Field label="Recommendation">
        <div className="flex gap-2">{['Hire', 'Maybe', 'Do not hire'].map((r) => <button key={r} type="button" onClick={() => setF({ ...f, recommendation: r })} className={cn(btnGhost, f.recommendation === r && 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700')}>{r}</button>)}</div>
      </Field>
      <Field label="Comments"><textarea rows={4} className={inp} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Strengths, concerns, how they answered key questions" /></Field>
    </Modal>
  );
}

function OfferModal({ id, c, onClose, onDone }: { id: number; c: any; onClose: () => void; onDone: () => void }) {
  const depts = useQuery({ queryKey: ['departments'], queryFn: () => departmentService.getAll() });
  const deptList: any[] = Array.isArray(depts.data) ? depts.data : [];
  const [f, setF] = useState({ position: c.offer?.position || c.jobTitle, departmentId: String(c.offer?.departmentId || c.departmentId || ''), salary: String(c.offer?.salary || c.salaryMin || ''), currency: c.offer?.currency || 'NGN', startDate: c.offer?.startDate || '', employmentStatus: c.offer?.employmentStatus || 'Full-Time', notes: c.offer?.notes || '', notifyCandidate: true });
  const save = useMutation({ mutationFn: () => apiClient.post(`/erp/recruitment/${id}/offer`, { ...f, salary: Number(f.salary) || 0 }), onSuccess: () => { toast.success('Offer saved'); onDone(); }, onError: (e: any) => toast.fromError(e) });
  return (
    <Modal title="Make an offer" sub={c.applicantName} onClose={onClose} footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending} className={btnPrimary}>Save offer</button></>}>
      <Field label="Position"><input className={inp} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></Field>
      <Field label="Department"><select className={inp} value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })}>{deptList.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Monthly pay" className="col-span-2"><input className={cn(inp, 'text-right')} inputMode="decimal" value={f.salary} onChange={(e) => setF({ ...f, salary: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
        <Field label="Currency"><select className={inp} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((x) => <option key={x}>{x}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date"><input type="date" className={inp} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        <Field label="Type"><select className={inp} value={f.employmentStatus} onChange={(e) => setF({ ...f, employmentStatus: e.target.value })}>{['Full-Time', 'Part-Time', 'Contract', 'Intern', 'Probation'].map((x) => <option key={x}>{x}</option>)}</select></Field>
      </div>
      <Field label="Anything else to tell them"><textarea rows={2} className={inp} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. Three-month probation; documents to bring on day one" /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.notifyCandidate} onChange={(e) => setF({ ...f, notifyCandidate: e.target.checked })} />Email the offer to {c.applicantName.split(' ')[0]}</label>
    </Modal>
  );
}

function HireModal({ id, c, onClose, onDone }: { id: number; c: any; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ fullName: c.applicantName, email: c.applicantEmail, phone: c.applicantPhone === '-' ? '' : c.applicantPhone, dateOfBirth: '', gender: '', startDate: c.offer?.startDate || new Date().toISOString().slice(0, 10) });
  const save = useMutation({ mutationFn: () => apiClient.post<any>(`/erp/recruitment/${id}/hire`, f), onSuccess: () => { toast.success(`${f.fullName.split(' ')[0]} is hired`, 'Welcome email with login sent and onboarding started'); onDone(); }, onError: (e: any) => toast.fromError(e, 'Could not hire') });
  return (
    <Modal title={`Hire ${c.applicantName}`} sub={c.offer ? `${c.offer.position}${c.offer.salary ? ` · ${money(c.offer.salary, c.offer.currency)} a month` : ''}` : c.jobTitle} onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending || !f.dateOfBirth} className={cn(btnPrimary, 'bg-emerald-600 hover:bg-emerald-700')}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Create staff account</button></>}>
      <p className="text-sm text-gray-600 dark:text-gray-400">This creates their MaxHub account, emails a temporary login, sets their pay from the offer and starts their onboarding checklist.</p>
      <Field label="Full name"><input className={inp} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email"><input className={inp} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Phone"><input className={inp} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Date of birth"><input type="date" className={inp} value={f.dateOfBirth} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} /></Field>
        <Field label="Gender"><select className={inp} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="">—</option><option>Male</option><option>Female</option></select></Field>
        <Field label="Start date"><input type="date" className={inp} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}


