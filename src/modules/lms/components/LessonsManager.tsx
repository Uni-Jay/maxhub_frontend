import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, PlayCircle, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Loader2, HelpCircle, FileText, Users, Video, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { Modal, Field, Pill, UploadLink, Tabs, inp, btnPrimary, btnGhost, card, fmtDate } from '@components/erp/Kit';
import { videoEmbed } from '@modules/student/pages/StudentLessonsPage';

interface QuizQ { q: string; options: string[]; answer: number; explain?: string | null }
interface Lesson { id: number; section: string | null; title: string; summary: string | null; videoUrl: string | null; body: string | null; files: Array<{ name: string; url: string }> | null; quiz: QuizQ[] | null; passMark: number; minutes: number | null; status: string; completed: number; avgScore: number | null }

/** "Online lessons" tab on a course: build lessons and see each student's progress. */
export default function LessonsManager({ courseId }: { courseId: number }) {
  const qc = useQueryClient();
  const [view, setView] = useState<'lessons' | 'progress'>('lessons');
  const [editing, setEditing] = useState<Partial<Lesson> | null>(null);
  const q = useQuery({ queryKey: ['course-lessons', courseId], queryFn: () => apiClient.get<{ lessons: Lesson[]; students: number }>(`/erp/courses/${courseId}/lessons`) });
  const lessons = q.data?.lessons || [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['course-lessons', courseId] });
  const order = useMutation({ mutationFn: (ids: number[]) => apiClient.post(`/erp/courses/${courseId}/lessons/order`, { ids }), onSuccess: refresh });
  const publish = useMutation({ mutationFn: (l: Lesson) => apiClient.put(`/erp/lessons/${l.id}`, { status: l.status === 'Published' ? 'Draft' : 'Published' }), onSuccess: (_d, l) => { toast.success(l.status === 'Published' ? 'Hidden from students' : 'Published — students have been told'); refresh(); }, onError: (e: any) => toast.fromError(e) });
  const del = useMutation({ mutationFn: (id: number) => apiClient.delete(`/erp/lessons/${id}`), onSuccess: () => { toast.success('Lesson deleted'); refresh(); }, onError: (e: any) => toast.fromError(e) });
  const move = (i: number, d: -1 | 1) => { const ids = lessons.map((l) => l.id); const j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; order.mutate(ids); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={view} onChange={setView} tabs={[{ id: 'lessons', label: `Lessons (${lessons.length})` }, { id: 'progress', label: `Student progress (${q.data?.students ?? 0})` }]} />
        <span className="flex-1" />
        <Link to={`/lms/lessons/${courseId}`} className={btnGhost}><Eye className="h-4 w-4" />Preview as student</Link>
        <button onClick={() => setEditing({ section: lessons[lessons.length - 1]?.section || '', passMark: 60, status: 'Draft', quiz: [], files: [] })} className={btnPrimary}><Plus className="h-4 w-4" />Add lesson</button>
      </div>
      {view === 'progress' ? <Progress courseId={courseId} /> : (
        <div className={card}>
          {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-10" /> : !lessons.length ? (
            <div className="text-center py-12 px-6">
              <PlayCircle className="h-12 w-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
              <p className="font-medium">No online lessons yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">Add a lesson with a video (YouTube, Vimeo, Google Drive or an uploaded file), notes, handouts and a short quiz. Students see published lessons in their portal.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {lessons.map((l, i) => (
                <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex flex-col">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === lessons.length - 1} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{l.title}</p>
                    <p className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                      {l.section && <span>{l.section}</span>}
                      {l.videoUrl && <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" />video</span>}
                      {!!l.files?.length && <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{l.files.length} file{l.files.length === 1 ? '' : 's'}</span>}
                      {!!l.quiz?.length && <span className="inline-flex items-center gap-1"><HelpCircle className="h-3 w-3" />{l.quiz.length}-question quiz</span>}
                      {l.status === 'Published' && <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{l.completed} done{l.avgScore != null ? ` · avg ${l.avgScore}%` : ''}</span>}
                    </p>
                  </div>
                  <Pill tone={l.status === 'Published' ? 'green' : 'gray'}>{l.status === 'Published' ? 'Published' : 'Draft'}</Pill>
                  <button onClick={() => publish.mutate(l)} title={l.status === 'Published' ? 'Hide from students' : 'Publish'} className="p-1.5 text-gray-500 hover:text-indigo-600">{l.status === 'Published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  <button onClick={() => setEditing(l)} className="p-1.5 text-gray-500 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm(`Delete “${l.title}” and students’ progress on it?`)) del.mutate(l.id); }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {editing && <LessonEditor courseId={courseId} l={editing} sections={[...new Set(lessons.map((x) => x.section).filter(Boolean) as string[])]} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}

function LessonEditor({ courseId, l, sections, onClose, onSaved }: { courseId: number; l: Partial<Lesson>; sections: string[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    section: l.section || '', title: l.title || '', summary: l.summary || '', videoUrl: l.videoUrl || '', body: l.body || '',
    files: (l.files || []) as Array<{ name: string; url: string }>, quiz: (l.quiz || []) as QuizQ[], passMark: l.passMark ?? 60, minutes: l.minutes ? String(l.minutes) : '', status: l.status || 'Draft',
  });
  const [tab, setTab] = useState<'content' | 'quiz'>('content');
  const save = useMutation({
    mutationFn: (status: string) => (l.id ? apiClient.put(`/erp/lessons/${l.id}`, { ...f, status }) : apiClient.post(`/erp/courses/${courseId}/lessons`, { ...f, status })),
    onSuccess: (_d, status) => { toast.success(status === 'Published' ? 'Lesson published' : 'Lesson saved as draft'); onSaved(); },
    onError: (e: any) => toast.fromError(e),
  });
  const embed = videoEmbed(f.videoUrl);
  const setQ = (i: number, patch: Partial<QuizQ>) => setF({ ...f, quiz: f.quiz.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
  const badQuiz = f.quiz.some((x) => !x.q.trim() || x.options.filter((o) => o.trim()).length < 2);
  return (
    <Modal wide title={l.id ? 'Edit lesson' : 'New lesson'} onClose={onClose}
      footer={<>
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button onClick={() => save.mutate('Draft')} disabled={save.isPending || !f.title.trim()} className={btnGhost}>Save as draft</button>
        <button onClick={() => save.mutate('Published')} disabled={save.isPending || !f.title.trim() || badQuiz} className={btnPrimary}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{l.status === 'Published' ? 'Save' : 'Publish to students'}</button>
      </>}>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'content', label: 'Lesson' }, { id: 'quiz', label: `Quiz (${f.quiz.length})` }]} />
      {tab === 'content' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Title" className="sm:col-span-2"><input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Your first HTML page" /></Field>
            <Field label="Minutes"><input className={inp} inputMode="numeric" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value.replace(/\D/g, '') })} placeholder="15" /></Field>
          </div>
          <Field label="Section / week" hint="Lessons with the same section are grouped together"><input className={inp} list="lesson-sections" value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} placeholder="e.g. Week 1 — Getting started" /><datalist id="lesson-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist></Field>
          <Field label="Short summary"><input className={inp} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="What students will learn" /></Field>
          <Field label="Video" hint="Paste a YouTube, Vimeo or Google Drive link — or upload a video file">
            <div className="space-y-2">
              <input className={inp} value={f.videoUrl} onChange={(e) => setF({ ...f, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
              <UploadLink value={null} onChange={(u) => u && setF({ ...f, videoUrl: u })} label="Upload a video" folder="maxhub-lessons" accept="video/*" />
              {embed && (embed.kind === 'iframe' ? <iframe src={embed.src} title="preview" className="w-full aspect-video rounded-xl bg-black" allowFullScreen /> : <video src={embed.src} controls className="w-full rounded-xl bg-black" />)}
            </div>
          </Field>
          <Field label="Lesson notes"><textarea rows={8} className={inp} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Explain the topic, steps, examples and key words…" /></Field>
          <Field label="Handouts and files">
            <div className="space-y-2">
              {f.files.map((x, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className={cn(inp, 'flex-1')} value={x.name} onChange={(e) => setF({ ...f, files: f.files.map((y, k) => (k === i ? { ...y, name: e.target.value } : y)) })} />
                  <a href={x.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600">Open</a>
                  <button onClick={() => setF({ ...f, files: f.files.filter((_, k) => k !== i) })} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <UploadLink value={null} onChange={(u) => u && setF({ ...f, files: [...f.files, { name: decodeURIComponent(u.split('/').pop() || 'File').replace(/\.[^.]+$/, '').slice(0, 60), url: u }] })} label="Add a file" folder="maxhub-lessons" />
            </div>
          </Field>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">Students must pass the quiz to complete the lesson. Without a quiz they just press “Mark as done”.</p>
            <Field label="Pass mark %" className="w-28"><input className={inp} inputMode="numeric" value={f.passMark} onChange={(e) => setF({ ...f, passMark: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></Field>
          </div>
          {f.quiz.map((x, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <div className="flex gap-2"><span className="text-sm font-semibold mt-2">{i + 1}.</span><input className={inp} value={x.q} onChange={(e) => setQ(i, { q: e.target.value })} placeholder="Question" /><button onClick={() => setF({ ...f, quiz: f.quiz.filter((_, k) => k !== i) })} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
              {x.options.map((o, j) => (
                <label key={j} className="flex items-center gap-2 pl-5">
                  <input type="radio" name={`ans-${i}`} checked={x.answer === j} onChange={() => setQ(i, { answer: j })} title="Correct answer" />
                  <input className={cn(inp, x.answer === j && 'border-emerald-400')} value={o} onChange={(e) => setQ(i, { options: x.options.map((y, k) => (k === j ? e.target.value : y)) })} placeholder={`Option ${j + 1}`} />
                  {x.options.length > 2 && <button type="button" onClick={() => setQ(i, { options: x.options.filter((_, k) => k !== j), answer: x.answer === j ? 0 : x.answer > j ? x.answer - 1 : x.answer })} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                </label>
              ))}
              <div className="flex items-center gap-3 pl-5">
                {x.options.length < 6 && <button type="button" onClick={() => setQ(i, { options: [...x.options, ''] })} className="text-xs text-indigo-600">+ Add option</button>}
                <span className="text-[11px] text-gray-500">Tick the circle next to the right answer</span>
              </div>
              <input className={cn(inp, 'ml-5 w-[calc(100%-1.25rem)] text-xs')} value={x.explain || ''} onChange={(e) => setQ(i, { explain: e.target.value })} placeholder="Explanation shown after answering (optional)" />
            </div>
          ))}
          <button onClick={() => setF({ ...f, quiz: [...f.quiz, { q: '', options: ['', '', ''], answer: 0, explain: '' }] })} className={btnGhost}><Plus className="h-4 w-4" />Add question</button>
          {badQuiz && <p className="text-xs text-amber-700">Each question needs text and at least two options.</p>}
        </div>
      )}
    </Modal>
  );
}

function Progress({ courseId }: { courseId: number }) {
  const q = useQuery({ queryKey: ['course-lesson-progress', courseId], queryFn: () => apiClient.get<{ lessons: Array<{ id: number; title: string }>; students: Array<{ id: number; name: string; cells: Array<{ done: boolean; score: number | null; opened: boolean } | null>; done: number; percent: number; lastSeen: string | null }> }>(`/erp/courses/${courseId}/lessons/progress`) });
  const d = q.data;
  if (q.isLoading) return <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-10" />;
  if (!d?.students.length) return <div className={cn(card, 'text-center py-10 text-sm text-gray-500')}><Users className="h-10 w-10 mx-auto mb-2 text-gray-200" />No students enrolled yet.</div>;
  return (
    <div className={cn(card, 'overflow-x-auto')}>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-500">
          <tr><th className="text-left px-4 py-2.5">Student</th><th className="px-3 py-2.5">Progress</th>{d.lessons.map((l, i) => <th key={l.id} className="px-2 py-2.5 font-medium" title={l.title}>{i + 1}</th>)}<th className="text-left px-4 py-2.5">Last seen</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {d.students.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-2.5 font-medium whitespace-nowrap">{s.name}</td>
              <td className="px-3 py-2.5"><div className="flex items-center gap-2"><div className="w-20 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${s.percent}%` }} /></div><span className="text-xs tabular-nums">{s.percent}%</span></div></td>
              {s.cells.map((c, i) => (
                <td key={i} className="px-2 py-2.5 text-center" title={d.lessons[i].title}>
                  {c?.done ? <span className="inline-flex h-6 min-w-6 px-1 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 text-[11px] font-semibold">{c.score != null ? c.score : '✓'}</span>
                    : c?.opened ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-500/10 text-[11px]">…</span>
                      : <span className="inline-block h-6 w-6 rounded-md bg-gray-100 dark:bg-gray-800" />}
                </td>
              ))}
              <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{s.lastSeen ? fmtDate(s.lastSeen) : 'Not started'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-gray-500 px-4 py-2">Green = done (number = quiz score) · amber = opened, not finished · grey = not started.</p>
    </div>
  );
}

