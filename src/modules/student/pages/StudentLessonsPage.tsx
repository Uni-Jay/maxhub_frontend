import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlayCircle, BookOpen, CheckCircle2, Circle, Clock, FileText, Download, ChevronLeft, ChevronRight, Loader2, Trophy, HelpCircle, XCircle } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

interface CourseCard { id: number; title: string; description?: string | null; lessons: number; minutes: number; completed: number; percent: number }
interface LessonRow { id: number; section: string | null; title: string; summary?: string | null; minutes: number | null; questions: number; done: boolean; bestScore: number | null; attempts: number }
interface Lesson { id: number; courseId: number; section: string | null; title: string; summary?: string | null; videoUrl?: string | null; body?: string | null; files: Array<{ name: string; url: string }>; quiz: Array<{ q: string; options: string[] }>; passMark: number; minutes: number | null; progress: { completedAt: string | null; bestScore: number | null; attempts: number } | null }

/** Turns a YouTube / Vimeo / Google Drive link into something we can embed. */
export function videoEmbed(url?: string | null): { kind: 'iframe' | 'video'; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` };
  const gd = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (gd) return { kind: 'iframe', src: `https://drive.google.com/file/d/${gd[1]}/preview` };
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || /res\.cloudinary\.com\/.+\/video\//.test(url)) return { kind: 'video', src: url };
  return { kind: 'iframe', src: url };
}

/** /student/lessons — every course with online lessons and how far you are. */
export default function StudentLessonsPage() {
  const q = useQuery({ queryKey: ['my-lessons'], queryFn: () => apiClient.get<{ courses: CourseCard[]; student: boolean }>('/erp/my-lessons') });
  const courses = q.data?.courses || [];
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Online Lessons</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Watch, read and take the short quiz at your own pace.</p>
      </div>
      {q.isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">{[1, 2].map((i) => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : !courses.length ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">You are not enrolled in any course yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {courses.map((c) => (
            <Link key={c.id} to={`/student/lessons/${c.id}`} className="block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:border-violet-300 hover:shadow-sm transition">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center shrink-0"><PlayCircle className="h-6 w-6 text-violet-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.lessons ? `${c.lessons} lesson${c.lessons === 1 ? '' : 's'}${c.minutes ? ` · about ${Math.round(c.minutes / 6) / 10 >= 1 ? `${Math.round(c.minutes / 6) / 10} h` : `${c.minutes} min`}` : ''}` : 'Lessons coming soon'}</p>
                </div>
                {c.percent === 100 && <Trophy className="h-5 w-5 text-amber-500" />}
              </div>
              <div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${c.percent}%` }} /></div>
              <p className="text-xs text-gray-500 mt-1.5">{c.completed} of {c.lessons} done · {c.percent}%</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** /student/lessons/:courseId — lesson list and the lesson player. */
export function StudentCoursePlayer() {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['my-lessons', courseId], queryFn: () => apiClient.get<{ course: { id: number; title: string }; lessons: LessonRow[]; completed: number; percent: number; preview: boolean }>(`/erp/my-lessons/${courseId}`) });
  const lessons = list.data?.lessons || [];
  const current = Number(params.get('lesson')) || lessons.find((l) => !l.done)?.id || lessons[0]?.id || null;
  const idx = lessons.findIndex((l) => l.id === current);
  const go = (id: number) => { const p = new URLSearchParams(params); p.set('lesson', String(id)); setParams(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const sections = useMemo(() => {
    const out: Array<{ name: string; items: LessonRow[] }> = [];
    for (const l of lessons) { const n = l.section || 'Lessons'; const last = out[out.length - 1]; if (last && last.name === n) last.items.push(l); else out.push({ name: n, items: [l] }); }
    return out;
  }, [lessons]);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['my-lessons'] }); };

  if (list.error) return <div className="max-w-3xl mx-auto text-center py-16 text-sm text-red-600">{(list.error as any)?.message || 'Could not open this course'}</div>;
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => (list.data?.preview ? navigate(-1) : navigate('/student/lessons'))} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{list.data?.course.title || 'Course'}{list.data?.preview && <span className="ml-2 align-middle text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Student preview</span>}</h1>
          <div className="flex items-center gap-2 mt-1"><div className="h-1.5 w-40 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-violet-600" style={{ width: `${list.data?.percent || 0}%` }} /></div><span className="text-xs text-gray-500">{list.data?.percent || 0}% complete</span></div>
        </div>
      </div>
      {list.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-violet-500 mx-auto my-16" /> : !lessons.length ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-sm text-gray-500">Your teacher has not published any lessons yet.</div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
          {current && <LessonView key={current} id={current} onDone={refresh} next={idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null} prev={idx > 0 ? lessons[idx - 1] : null} go={go} preview={!!list.data?.preview} />}
          <aside className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 lg:sticky lg:top-4 max-h-[80vh] overflow-y-auto">
            {sections.map((s) => (
              <div key={s.name} className="mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 px-2 py-1.5">{s.name}</p>
                {s.items.map((l) => (
                  <button key={l.id} onClick={() => go(l.id)} className={cn('w-full text-left flex items-start gap-2.5 px-2 py-2 rounded-xl text-sm', l.id === current ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-800 dark:text-violet-200' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60')}>
                    {l.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> : <Circle className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />}
                    <span className="flex-1">{l.title}<span className="block text-[11px] text-gray-500">{l.minutes ? `${l.minutes} min` : ''}{l.questions ? `${l.minutes ? ' · ' : ''}quiz${l.bestScore != null ? ` ${l.bestScore}%` : ''}` : ''}</span></span>
                  </button>
                ))}
              </div>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}

function LessonView({ id, onDone, next, prev, go, preview }: { id: number; onDone: () => void; next: LessonRow | null; prev: LessonRow | null; go: (id: number) => void; preview: boolean }) {
  const q = useQuery({ queryKey: ['lesson', id], queryFn: () => apiClient.get<Lesson>(`/erp/my-lessons/lesson/${id}`) });
  const qc = useQueryClient();
  const l = q.data;
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [result, setResult] = useState<any | null>(null);
  useEffect(() => { setAnswers(l ? l.quiz.map(() => null) : []); setResult(null); }, [l?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const complete = useMutation({
    mutationFn: () => apiClient.post<any>(`/erp/my-lessons/lesson/${id}/complete`, {}),
    onSuccess: (d: any) => { toast.success(d?.coursePercent === 100 ? 'Course complete! 🎉' : 'Lesson complete'); qc.invalidateQueries({ queryKey: ['lesson', id] }); onDone(); },
    onError: (e: any) => toast.fromError(e),
  });
  const submit = useMutation({
    mutationFn: () => apiClient.post<any>(`/erp/my-lessons/lesson/${id}/quiz`, { answers }),
    onSuccess: (d: any) => { setResult(d); qc.invalidateQueries({ queryKey: ['lesson', id] }); onDone(); },
    onError: (e: any) => toast.fromError(e),
  });
  if (!l) return <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 h-96 animate-pulse" />;
  const embed = videoEmbed(l.videoUrl);
  const done = !!l.progress?.completedAt;
  return (
    <article className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {embed && (
        <div className="aspect-video bg-black">
          {embed.kind === 'iframe'
            ? <iframe src={embed.src} title={l.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            : <video src={embed.src} controls className="w-full h-full" />}
        </div>
      )}
      <div className="p-5 sm:p-7 space-y-5">
        <div>
          {l.section && <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">{l.section}</p>}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{l.title}</h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-3">{l.minutes ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{l.minutes} min</span> : null}{done && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Completed</span>}</p>
          {l.summary && <p className="text-gray-600 dark:text-gray-400 mt-3">{l.summary}</p>}
        </div>
        {l.body && <div className="text-[15px] leading-7 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{l.body}</div>}
        {l.files.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Downloads</p>
            {l.files.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5 hover:border-violet-300 text-sm">
                <FileText className="h-4 w-4 text-violet-600" /><span className="flex-1">{f.name}</span><Download className="h-4 w-4 text-gray-400" />
              </a>
            ))}
          </div>
        )}

        {l.quiz.length > 0 && (
          <div className="rounded-2xl border border-violet-200 dark:border-violet-900 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-violet-600" /><p className="font-semibold flex-1">Quick quiz</p><span className="text-xs text-gray-500">Pass mark {l.passMark}%{l.progress?.bestScore != null ? ` · your best ${l.progress.bestScore}%` : ''}</span></div>
            {l.quiz.map((qq, i) => {
              const rv = result?.review?.[i];
              return (
                <div key={i}>
                  <p className="text-sm font-medium mb-2">{i + 1}. {qq.q}</p>
                  <div className="space-y-1.5">
                    {qq.options.map((o, j) => {
                      const chosen = answers[i] === j;
                      const tone = rv ? (j === rv.answer ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : chosen ? 'border-red-300 bg-red-50 dark:bg-red-500/10' : 'border-gray-200 dark:border-gray-700') : chosen ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-violet-300';
                      return (
                        <button key={j} type="button" disabled={!!result || preview} onClick={() => setAnswers(answers.map((a, k) => (k === i ? j : a)))} className={cn('w-full text-left px-3 py-2 rounded-xl border text-sm flex items-center gap-2', tone)}>
                          {rv && j === rv.answer ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : rv && chosen ? <XCircle className="h-4 w-4 text-red-500" /> : <span className={cn('h-4 w-4 rounded-full border', chosen ? 'border-violet-600 bg-violet-600' : 'border-gray-300')} />}
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  {rv?.explain && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">{rv.explain}</p>}
                </div>
              );
            })}
            {result ? (
              <div className={cn('rounded-xl p-3 text-sm flex items-center gap-3', result.passed ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200')}>
                <span className="flex-1"><b>{result.score}%</b> — {result.right} of {result.total} right. {result.passed ? 'Lesson complete!' : `You need ${result.passMark}% to pass.`}</span>
                {!result.passed && <button onClick={() => { setResult(null); setAnswers(l.quiz.map(() => null)); }} className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border text-xs font-semibold">Try again</button>}
              </div>
            ) : !preview && (
              <button onClick={() => submit.mutate()} disabled={submit.isPending || answers.some((a) => a === null)} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50">
                {submit.isPending ? 'Marking…' : answers.some((a) => a === null) ? `Answer all ${l.quiz.length} questions` : 'Check my answers'}
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          {prev && <button onClick={() => go(prev.id)} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"><ChevronLeft className="h-4 w-4" />Previous</button>}
          <span className="flex-1" />
          {!preview && !l.quiz.length && !done && <button onClick={() => complete.mutate()} disabled={complete.isPending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><CheckCircle2 className="h-4 w-4" />Mark as done</button>}
          {next && <button onClick={() => go(next.id)} className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">Next lesson<ChevronRight className="h-4 w-4" /></button>}
        </div>
      </div>
    </article>
  );
}
