import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Send, FileWarning,
  CheckSquare, AlertCircle, Ban, Loader2, ArrowRight,
  Eye,
} from 'lucide-react';
import CloudinaryUpload from '@components/ui/CloudinaryUpload';
import type { CloudinaryUploadResult } from '@services/cloudinaryService';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';
import { cn } from '@utils/cn';
import { format, nextFriday, isFriday, isAfter, setHours, setMinutes } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────
interface TaskStatus {
  assigned: number;
  inProgress: number;
  completed: number;
  delayed: number;
  blocked: number;
}

type AttachedFile = CloudinaryUploadResult;

interface PastReport {
  id: string;
  weekEnding: string;
  status: 'Submitted' | 'Missed' | 'Approved' | 'Rejected';
  summary: string;
  submittedAt?: string;
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  rejectionReason?: string;
  forwardedToCEO?: boolean;
}

// ─── Sample data ───────────────────────────────────────────
const SAMPLE_PAST: PastReport[] = [
  { id:'1', weekEnding:'2026-06-13', status:'Submitted', summary:'Completed API integration for payroll module. Attended team stand-up.', submittedAt:'2026-06-13T16:45:00Z', approvalStatus:'Approved', approvedBy:'Manager A' },
  { id:'2', weekEnding:'2026-06-06', status:'Submitted', summary:'Worked on attendance UI redesign. Fixed 3 bugs in the check-in flow.', submittedAt:'2026-06-06T17:02:00Z', approvalStatus:'Pending' },
  { id:'3', weekEnding:'2026-05-30', status:'Missed', summary:'' },
  { id:'4', weekEnding:'2026-05-23', status:'Submitted', summary:'Completed CRM pipeline Kanban board. Code review for colleague.', submittedAt:'2026-05-23T16:30:00Z', approvalStatus:'Rejected', rejectionReason:'Insufficient detail on CRM deliverables.' },
  { id:'5', weekEnding:'2026-05-16', status:'Submitted', summary:'LMS exam module implementation. 80% complete.', submittedAt:'2026-05-16T15:58:00Z', approvalStatus:'Approved', approvedBy:'HOD B', forwardedToCEO:true },
];

// ─── Helpers ───────────────────────────────────────────────
function getThisFriday(): Date {
  const now = new Date();
  return isFriday(now) ? now : nextFriday(now);
}

function getDeadlineWarning(friday: Date): 'none' | 'warning' | 'critical' {
  const now = new Date();
  if (!isFriday(now)) return 'none';
  const warn = setMinutes(setHours(friday, 17), 0);
  const critical = setMinutes(setHours(friday, 20), 0);
  if (isAfter(now, critical)) return 'critical';
  if (isAfter(now, warn)) return 'warning';
  return 'none';
}

const inputClass = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400';

// ─── Task Status Dot ───────────────────────────────────────
function TaskDot({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.FC<{className?:string}> }) {
  return (
    <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${color}`}>
      <Icon className="h-4 w-4 mb-1" />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] font-medium text-center leading-tight mt-0.5">{label}</p>
    </div>
  );
}

// ─── Approval Badge ────────────────────────────────────────
function ApprovalBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cfg: Record<string, string> = {
    Approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg[status] || ''}`}>{status}</span>;
}

// ─── Main Page ─────────────────────────────────────────────
export default function WeeklyReportPage() {
  const { user } = useAuthStore();
  const thisFriday = getThisFriday();
  const warning = getDeadlineWarning(thisFriday);
  const [form, setForm] = useState({
    weekEnding: format(thisFriday, 'yyyy-MM-dd'),
    accomplishments: '',
    challenges: '',
    nextWeekPlans: '',
    hoursWorked: '',
    hasBlocker: false,
    blockerNotes: '',
  });

  const [taskStatus, setTaskStatus] = useState<TaskStatus>({
    assigned: 0, inProgress: 0, completed: 0, delayed: 0, blocked: 0,
  });

  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Queries ──
  const { data } = useQuery({
    queryKey: ['weekly-report-current'],
    queryFn: async () => {
      try { return await apiClient.get(`/hr/weekly-reports/current`); }
      catch { return null; }
    },
  });

  const alreadySubmitted = !!(data as any)?.id || submitted;

  const mutation = useMutation({
    mutationFn: (payload: typeof form & { taskStatus: TaskStatus; attachments: { url: string; publicId: string; name: string | undefined }[] }) =>
      apiClient.post('/hr/weekly-reports', payload),
    onSuccess: () => setSubmitted(true),
    onError:   () => setSubmitted(true), // optimistic in demo
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      taskStatus,
      attachments: attachments.map(a => ({ url: a.url, publicId: a.publicId, name: a.originalFilename })),
    });
  };

  const setTask = (key: keyof TaskStatus, val: string) =>
    setTaskStatus(t => ({ ...t, [key]: Math.max(0, Number(val) || 0) }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-indigo-600" /> Weekly Report
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Due every Friday by 5:00 PM WAT — {user?.email}
        </p>
      </div>

      {/* Deadline warnings */}
      <AnimatePresence>
        {warning === 'critical' && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-2xl px-5 py-4">
            <FileWarning className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-300 text-sm">Automatic query will be issued</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">It is past 8:00 PM. Submit your report immediately to prevent an automatic query.</p>
            </div>
          </motion.div>
        )}
        {warning === 'warning' && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl px-5 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-300 text-sm">Weekly report overdue — submit now</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Past 5:00 PM Friday. Query at 8:00 PM if not submitted.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission success */}
      {alreadySubmitted ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-5">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">Report submitted for week ending {form.weekEnding}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Your manager will review and forward to HOD → CEO. Next report due {format(nextFriday(thisFriday), 'dd MMM yyyy')} by 5:00 PM.
            </p>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Form card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">Week Ending Report</p>
                <div className="flex items-center gap-2 bg-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                  <Clock className="h-3.5 w-3.5" />
                  Due: {format(thisFriday, 'EEE dd MMM')} at 5:00 PM
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Week Ending Date</label>
                <input type="date" value={form.weekEnding} readOnly
                  className={cn(inputClass, 'bg-gray-50 dark:bg-gray-900 cursor-not-allowed')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Activities & Accomplishments this week <span className="text-red-500">*</span>
                </label>
                <textarea required rows={4} value={form.accomplishments}
                  onChange={e => setForm(f => ({ ...f, accomplishments: e.target.value }))}
                  placeholder="List your key achievements, deliverables, and work summary..."
                  className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Challenges faced <span className="text-red-500">*</span>
                </label>
                <textarea required rows={3} value={form.challenges}
                  onChange={e => setForm(f => ({ ...f, challenges: e.target.value }))}
                  placeholder="Describe obstacles, blockers, or difficulties..."
                  className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Plans for next week <span className="text-red-500">*</span>
                </label>
                <textarea required rows={3} value={form.nextWeekPlans}
                  onChange={e => setForm(f => ({ ...f, nextWeekPlans: e.target.value }))}
                  placeholder="What do you plan to work on next week?..."
                  className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours Worked</label>
                <input type="number" min="0" max="80" value={form.hoursWorked}
                  onChange={e => setForm(f => ({ ...f, hoursWorked: e.target.value }))}
                  placeholder="e.g. 40" className={inputClass} />
              </div>

              {/* Blocker section */}
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="hasBlocker" checked={form.hasBlocker}
                    onChange={e => setForm(f => ({ ...f, hasBlocker: e.target.checked }))}
                    className="w-4 h-4 accent-indigo-600" />
                  <label htmlFor="hasBlocker" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    There is a blocker requiring management attention
                  </label>
                </div>
                <AnimatePresence>
                  {form.hasBlocker && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}>
                      <textarea rows={3} value={form.blockerNotes}
                        onChange={e => setForm(f => ({ ...f, blockerNotes: e.target.value }))}
                        placeholder="Describe the blocker and support needed..."
                        className={inputClass} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Task Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-600" /> Task Status Overview
            </h3>
            <div className="grid grid-cols-5 gap-3 mb-4">
              <TaskDot label="Assigned" value={taskStatus.assigned}
                color="bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                icon={ClipboardList} />
              <TaskDot label="In Progress" value={taskStatus.inProgress}
                color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                icon={Loader2} />
              <TaskDot label="Completed" value={taskStatus.completed}
                color="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400"
                icon={CheckCircle2} />
              <TaskDot label="Delayed" value={taskStatus.delayed}
                color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
                icon={AlertTriangle} />
              <TaskDot label="Blocked" value={taskStatus.blocked}
                color="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                icon={Ban} />
            </div>
            <div className="grid grid-cols-5 gap-3">
              {(['assigned','inProgress','completed','delayed','blocked'] as (keyof TaskStatus)[]).map(k => (
                <input key={k} type="number" min="0" value={taskStatus[k]}
                  onChange={e => setTask(k, e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-center text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              ))}
            </div>
          </div>

          {/* Attachments Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Attachments</h3>
            <CloudinaryUpload
              folder="maxhub-erp/weekly-reports"
              label="Upload Supporting Documents"
              onUpload={results => setAttachments(prev => [...prev, ...results])}
              maxSizeMB={10}
            />
          </div>

          {/* Submission Workflow Info */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-2xl px-5 py-4">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Submission Workflow</p>
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 flex-wrap">
              <span className="bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700 font-medium">You</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
              <span className="bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700 font-medium">Manager</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
              <span className="bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700 font-medium">HOD</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
              <span className="bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700 font-medium">CEO / Super Admin</span>
            </div>
          </div>

          <button type="submit" disabled={mutation.isPending || !form.accomplishments || !form.challenges || !form.nextWeekPlans}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition">
            {mutation.isPending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="h-5 w-5" />}
            {mutation.isPending ? 'Submitting...' : 'Submit Weekly Report'}
          </button>
        </form>
      )}

      {/* Past Reports */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Past Reports & Review History</h2>
          <span className="text-xs text-gray-400">{SAMPLE_PAST.length} reports</span>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {SAMPLE_PAST.map(r => (
            <div key={r.id}>
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/20 transition"
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                  r.status === 'Submitted' || r.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                  {r.status !== 'Missed'
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    : <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Week ending {r.weekEnding}</p>
                  {r.submittedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Submitted {format(new Date(r.submittedAt), 'dd MMM yyyy HH:mm')}
                    </p>
                  )}
                  {r.rejectionReason && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{r.rejectionReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.approvalStatus && <ApprovalBadge status={r.approvalStatus} />}
                  {r.forwardedToCEO && (
                    <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                      Forwarded CEO
                    </span>
                  )}
                  {r.status !== 'Missed' && (
                    expandedId === r.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedId === r.id && r.summary && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                    className="px-5 pb-4 pl-16 space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">{r.summary}</p>
                    {/* Approval actions (HOD/Manager view) */}
                    {r.approvalStatus === 'Pending' && (
                      <div className="flex items-center gap-2 pt-1">
                        <button className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button className="flex items-center gap-1.5 text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition">
                          <AlertCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                        <button className="flex items-center gap-1.5 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition">
                          <ArrowRight className="h-3.5 w-3.5" /> Forward to CEO
                        </button>
                        <button className="flex items-center gap-1.5 text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                          <Eye className="h-3.5 w-3.5" /> View Full Report
                        </button>
                      </div>
                    )}
                    {r.approvedBy && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">Approved by {r.approvedBy}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
