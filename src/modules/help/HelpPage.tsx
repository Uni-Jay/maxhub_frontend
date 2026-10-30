import { useMemo, useState } from 'react';
import { BookOpen, Download, Search, ChevronDown, MapPin, Lightbulb, LifeBuoy } from 'lucide-react';
import manual from '@/data/userManual.json';
import { useCurrentRoles } from '@utils/role';
import { cn } from '@utils/cn';

interface Topic { title: string; where?: string; steps: string[]; tips?: string[] }
interface Chapter { id: string; title: string; audience: string[]; summary: string; topics: Topic[] }
interface Guide { title: string; intro: string; chapters: Chapter[] }

const AUD: Record<string, string> = { all: 'Everyone', hr: 'HR', hod: 'Heads of department', accountant: 'Accounts', admin: 'Management', superadmin: 'Management', staff: 'Staff', student: 'Students' };
const PDF = { staff: '/manuals/MaxHub-Staff-Manual.pdf', student: '/manuals/MaxHub-Student-Guide.pdf' };

/** Help & User Guide — the same content as the downloadable PDF manuals. */
export default function HelpPage({ audience = 'staff' }: { audience?: 'staff' | 'student' }) {
  const guide = (manual as any)[audience] as Guide;
  const { roles } = useCurrentRoles();
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(guide.chapters[0]?.id || null);
  const mine = (c: Chapter) => audience === 'student' || c.audience.includes('all') || c.audience.some((a) => roles.has(a as any)) || roles.has('superadmin' as any);
  const chapters = useMemo(() => {
    const list = guide.chapters.filter((c) => showAll || mine(c));
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.map((c) => ({ ...c, topics: c.topics.filter((t) => `${t.title} ${t.where || ''} ${t.steps.join(' ')} ${(t.tips || []).join(' ')}`.toLowerCase().includes(s)) })).filter((c) => c.topics.length);
  }, [guide, showAll, q, roles]); // eslint-disable-line react-hooks/exhaustive-deps
  const hidden = guide.chapters.length - guide.chapters.filter(mine).length;
  const accent = audience === 'student' ? 'violet' : 'indigo';

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className={cn('rounded-2xl p-6 text-white', audience === 'student' ? 'bg-gradient-to-br from-violet-600 to-purple-700' : 'bg-gradient-to-br from-indigo-600 to-violet-700')}>
        <div className="flex flex-wrap items-start gap-4">
          <LifeBuoy className="h-10 w-10 opacity-90" />
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-2xl font-bold">Help & User Guide</h1>
            <p className="text-white/80 text-sm mt-1 max-w-2xl">{guide.intro}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          <a href={PDF[audience]} download className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50"><Download className="h-4 w-4" />Download the {audience === 'student' ? 'Student Guide' : 'Staff Manual'} (PDF)</a>
          {audience === 'staff' && <a href={PDF.student} download className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold"><Download className="h-4 w-4" />Student Guide (PDF) — to give to students</a>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the guide — e.g. leave, payslip, receipt, graduate" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        {audience === 'staff' && hidden > 0 && (
          <button onClick={() => setShowAll(!showAll)} className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{showAll ? 'Show only my chapters' : `Show all chapters (+${hidden} for other roles)`}</button>
        )}
      </div>

      <div className="space-y-3">
        {!chapters.length && <p className="text-center text-sm text-gray-500 py-10">Nothing matches “{q}”. Try another word.</p>}
        {chapters.map((c, i) => {
          const isOpen = !!q.trim() || open === c.id;
          return (
            <div key={c.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <button onClick={() => setOpen(isOpen && !q.trim() ? null : c.id)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
                <span className={cn('h-9 w-9 rounded-xl text-white flex items-center justify-center font-bold shrink-0', accent === 'violet' ? 'bg-violet-600' : 'bg-indigo-600')}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{c.title}</p>
                  <p className="text-xs text-gray-500">{c.summary}{audience === 'staff' && !c.audience.includes('all') ? ` · For ${[...new Set(c.audience.map((a) => AUD[a] || a))].join(', ')}` : ''}</p>
                </div>
                <ChevronDown className={cn('h-5 w-5 text-gray-400 transition', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 grid gap-3">
                  {c.topics.map((t) => (
                    <div key={t.title} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2"><BookOpen className="h-4 w-4 text-indigo-500" />{t.title}</p>
                      {t.where && <p className="mt-1.5 text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"><MapPin className="h-3.5 w-3.5" />{t.where}</p>}
                      <ol className="mt-2 space-y-1.5 text-sm text-gray-700 dark:text-gray-300 list-decimal pl-5">{t.steps.map((s, k) => <li key={k}>{s}</li>)}</ol>
                      {(t.tips || []).map((tip, k) => <p key={k} className="mt-2 text-xs rounded-lg bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 px-3 py-2 flex gap-1.5"><Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />{tip}</p>)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StudentHelpPage() { return <HelpPage audience="student" />; }
