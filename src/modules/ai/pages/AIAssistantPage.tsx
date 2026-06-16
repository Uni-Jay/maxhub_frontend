import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Bot, Send, Sparkles, FileText, Calendar, Mail, Bell,
  ListTodo, ChevronRight, Download, Copy, Check, Clock,
  BrainCircuit, Zap, User, CheckCircle, X, RefreshCw,
  FileDown, AlertCircle, Target, AlarmClock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';
import { cn } from '@utils/cn';

type RightTab = 'tasks' | 'reports' | 'meetings' | 'email' | 'reminders';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: Date;
}

const QUICK_PROMPTS = [
  "Summarize today's tasks",
  'Draft a meeting agenda',
  'Generate attendance report',
  'Suggest task priorities',
  'Draft email to team',
];


const TASK_SUGGESTIONS = [
  { id: 1, title: 'Review Q2 staff appraisals', priority: 'High', deadline: 'Jun 20', assignTo: 'HR Manager', category: 'HR' },
  { id: 2, title: 'Update payroll structure for new hires', priority: 'High', deadline: 'Jun 18', assignTo: 'Accountant', category: 'Payroll' },
  { id: 3, title: 'Schedule team-building event', priority: 'Medium', deadline: 'Jun 25', assignTo: 'Head of Admin', category: 'Admin' },
  { id: 4, title: 'Complete compliance training modules', priority: 'High', deadline: 'Jun 19', assignTo: 'All Staff', category: 'Training' },
  { id: 5, title: 'Update client contracts — Visa Max batch', priority: 'Medium', deadline: 'Jun 22', assignTo: 'Legal', category: 'CRM' },
  { id: 6, title: 'Generate monthly attendance summary', priority: 'Low', deadline: 'Jun 30', assignTo: 'HR', category: 'Attendance' },
  { id: 7, title: 'Review inventory reorder thresholds', priority: 'Medium', deadline: 'Jun 24', assignTo: 'Warehouse Manager', category: 'Inventory' },
  { id: 8, title: 'Prepare board report for July meeting', priority: 'High', deadline: 'Jun 28', assignTo: 'Super Admin', category: 'Management' },
];

const MEETING_SUMMARIES = [
  {
    id: 1,
    title: 'Q2 Performance Review',
    date: 'Jun 12, 2026',
    participants: ['Dr. Adeyemi', 'Ngozi Obi', 'Emeka Chukwu'],
    summary: [
      'Q2 revenue exceeded target by 8% — strongest quarter YTD',
      'Staff turnover rate improved to 3.2% from 5.1% in Q1',
      'New LMS platform launched with 340 active student enrollments',
      'Payroll accuracy reached 99.8% after system upgrade',
    ],
    actions: ['Prepare Q3 targets by June 20', 'Schedule individual appraisals'],
  },
  {
    id: 2,
    title: 'IT Infrastructure Planning',
    date: 'Jun 10, 2026',
    participants: ['Tunde Adebayo', 'Chiamaka Eze', 'IT Team'],
    summary: [
      'Cloud migration timeline confirmed for August 2026',
      'Budget approved for new server hardware: ₦2.4M',
      'Cybersecurity audit scheduled for end of July',
      'MaxHub ERP uptime at 99.6% — exceeding SLA',
    ],
    actions: ['Finalise cloud vendor by June 25', 'Submit security audit RFP'],
  },
  {
    id: 3,
    title: 'Student Enrollment Drive',
    date: 'Jun 8, 2026',
    participants: ['Admissions', 'Marketing', 'HOD'],
    summary: [
      'June intake target: 120 students — currently at 87 enrolled',
      'Social media campaign generated 340 leads this month',
      'Scholarship program approved for 15 top-performing applicants',
      'Fashion Design course has highest demand — waitlist of 23',
    ],
    actions: ['Launch referral incentive by June 18', 'Update scholarship FAQ on website'],
  },
  {
    id: 4,
    title: 'HR Policy Updates',
    date: 'Jun 5, 2026',
    participants: ['HR Director', 'Legal', 'HOD Representatives'],
    summary: [
      'Remote work policy updated — up to 2 days/week approved',
      'Annual leave carryover limit increased to 10 days',
      'New maternity/paternity leave policy aligned with Nigerian labour law',
      'Performance bonus structure revised for 2026',
    ],
    actions: ['Circulate new policy document by June 15', 'Update HR module settings'],
  },
];

const EMAIL_PURPOSES = ['Follow-up', 'Reminder', 'Announcement', 'Invitation', 'Apology'];
const EMAIL_TONES = ['Professional', 'Friendly', 'Formal'];

function generateEmail(to: string, subject: string, purpose: string, tone: string): string {
  const greeting = tone === 'Friendly' ? 'Hi there,' : tone === 'Formal' ? 'Dear Sir/Madam,' : `Dear ${to || 'Team'},`;
  const closing = tone === 'Friendly' ? 'Cheers,' : tone === 'Formal' ? 'Yours faithfully,' : 'Best regards,';

  const bodies: Record<string, string> = {
    'Follow-up': `I hope this message finds you well.\n\nI'm writing to follow up on our recent discussion regarding ${subject || 'the matter at hand'}. As we discussed, I would like to ensure we are aligned on the next steps.\n\nCould you please provide an update at your earliest convenience? Your timely response would be greatly appreciated.`,
    'Reminder': `I hope you are doing well.\n\nThis is a friendly reminder regarding ${subject || 'the upcoming deadline'}. Please ensure that all necessary actions are completed before the due date to avoid any delays.\n\nIf you have any questions or need clarification, do not hesitate to reach out.`,
    'Announcement': `I am pleased to share an important update with you.\n\nWe would like to announce ${subject || 'a key development within MaxHub'}. This change is effective immediately and we appreciate your cooperation as we implement this update.\n\nPlease review the attached information and share with your respective teams.`,
    'Invitation': `You are cordially invited to ${subject || 'our upcoming event/meeting'}.\n\nWe believe your participation would be invaluable and we look forward to your presence. Please confirm your attendance at your earliest convenience so we can make the necessary arrangements.`,
    'Apology': `I am writing to sincerely apologise regarding ${subject || 'the recent inconvenience'}.\n\nWe understand how this may have impacted you and we take full responsibility. Steps have already been taken to ensure this does not recur. We value your trust and patience.`,
  };

  return `${greeting}\n\n${bodies[purpose] || bodies['Follow-up']}\n\nThank you for your time and continued support.\n\n${closing}\n[Your Name]\nMaxHub ERP`;
}

const SMART_REMINDERS = [
  { id: 1, icon: Clock, text: '3 leave requests pending approval', time: 'Due today', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', snoozed: false },
  { id: 2, icon: Target, text: 'Payroll processing deadline', time: 'Tomorrow, 5 PM', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', snoozed: false },
  { id: 3, icon: Calendar, text: 'Board meeting scheduled', time: 'Jun 18, 10:00 AM', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', snoozed: false },
  { id: 4, icon: AlarmClock, text: '2 staff probation reviews due', time: 'Jun 20', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', snoozed: false },
  { id: 5, icon: FileText, text: 'Monthly compliance report due', time: 'Jun 30', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', snoozed: false },
  { id: 6, icon: AlertCircle, text: 'IT security audit follow-up', time: 'Jun 25', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', snoozed: false },
];

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const REPORT_TYPES = ['Attendance', 'Payroll', 'Sales', 'HR', 'Performance'];
const REPORT_PERIODS = ['This Week', 'This Month', 'This Quarter', 'This Year'];
const REPORT_FORMATS = ['PDF', 'Excel', 'CSV'];

const REPORT_CHART_DATA = [
  { name: 'Attendance', value: 94 },
  { name: 'Payroll', value: 78 },
  { name: 'Sales', value: 61 },
  { name: 'HR', value: 45 },
  { name: 'Performance', value: 82 },
];

export default function AIAssistantPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const userId = (user as any)?.id;
  const userRole = (user as any)?.role || 'STAFF';
  const userName = (user as any)?.firstName || 'there';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hello ${userName}! I'm MaxHub AI, your intelligent ERP assistant. How can I help you today?\n\nYou can ask me about tasks, reports, meetings, emails, or use the quick prompts below.`,
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [activeTab, setActiveTab] = useState<RightTab>('tasks');

  const [acceptedTasks, setAcceptedTasks] = useState<Set<number>>(new Set());

  const [reportForm, setReportForm] = useState({ type: 'Attendance', period: 'This Month', format: 'PDF', description: '' });
  const [reportState, setReportState] = useState<'idle' | 'generating' | 'ready'>('idle');

  const [emailForm, setEmailForm] = useState({ to: '', subject: '', purpose: 'Follow-up', tone: 'Professional' });
  const [emailDraft, setEmailDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const [reminders] = useState(SMART_REMINDERS);
  const [snoozedIds, setSnoozedIds] = useState<Set<number>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useQuery({
    queryKey: ['ai-tasks', userId],
    queryFn: async () => {
      try { return await apiClient.get(`/tasks?assignedTo=${userId}&limit=8`); } catch { return null; }
    },
  });

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content, ts: new Date() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const apiMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ];

      const response = await apiClient.post<{ reply: string; model: string }>('/ai/chat', { messages: apiMessages });
      const reply: string = response.reply ?? 'I was unable to generate a response. Please try again.';
      setMessages(m => [...m, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, ts: new Date() }]);
    } catch (err: any) {
      const serverMsg: string | undefined = err?.response?.data?.message;
      const errorReply = serverMsg?.includes('ANTHROPIC_API_KEY')
        ? 'AI service is not configured yet. Please set the `ANTHROPIC_API_KEY` in the backend `.env` file.'
        : 'Failed to reach the AI service. Please check your connection and try again.';
      setMessages(m => [...m, { id: (Date.now() + 1).toString(), role: 'assistant', content: errorReply, ts: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleGenerateReport = () => {
    setReportState('generating');
    setTimeout(() => setReportState('ready'), 2200);
  };

  const handleGenerateDraft = () => {
    setEmailDraft(generateEmail(emailForm.to, emailForm.subject, emailForm.purpose, emailForm.tone));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(emailDraft).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSnooze = (id: number) => {
    setSnoozedIds(s => new Set(s).add(id));
    setTimeout(() => setSnoozedIds(s => { const n = new Set(s); n.delete(id); return n; }), 3000);
  };

  const handleDismiss = (id: number) => setDismissedIds(d => new Set(d).add(id));

  const TABS: { key: RightTab; label: string; icon: React.ElementType }[] = [
    { key: 'tasks', label: 'Task Suggestions', icon: ListTodo },
    { key: 'reports', label: 'Report Generator', icon: FileText },
    { key: 'meetings', label: 'Meeting Summaries', icon: Calendar },
    { key: 'email', label: 'Email Drafts', icon: Mail },
    { key: 'reminders', label: 'Smart Reminders', icon: Bell },
  ];

  const visibleReminders = reminders.filter(r => !dismissedIds.has(r.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-indigo-600" />
            MaxHub AI Assistant
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Intelligent ERP assistance for {userRole.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          AI Online
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-160px)] min-h-[600px]">
        {/* ── LEFT: Chat (40%) ── */}
        <div className="w-[40%] flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">MaxHub AI</p>
              <p className="text-xs text-indigo-200">Your intelligent ERP companion</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-gray-50 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-gray-700'
                  )}>
                    {msg.content}
                    <p className={cn('text-[10px] mt-1', msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-gray-400')}>
                      {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/40 transition-colors font-medium border border-indigo-100 dark:border-indigo-800/50">
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask MaxHub AI anything..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none py-1 max-h-24 overflow-y-auto leading-relaxed"
                style={{ height: Math.min(Math.max(input.split('\n').length, 1) * 20 + 18, 96) + 'px' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center justify-center text-white transition flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Smart Features (60%) ── */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors',
                    activeTab === t.key
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/20'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* ── TASK SUGGESTIONS ── */}
            {activeTab === 'tasks' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    AI-Generated Task Recommendations
                  </p>
                  <span className="text-xs text-gray-400">{TASK_SUGGESTIONS.length} suggestions</span>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {TASK_SUGGESTIONS.map(task => (
                    <div key={task.id} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-sm transition">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug">{task.title}</p>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', PRIORITY_COLORS[task.priority])}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task.deadline}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{task.assignTo}</span>
                        <span className="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded text-[10px]">{task.category}</span>
                      </div>
                      {acceptedTasks.has(task.id) ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                          <CheckCircle className="h-4 w-4" /> Added to Tasks
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAcceptedTasks(s => new Set(s).add(task.id)); navigate('/tasks/create'); }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
                        >
                          Accept <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── REPORT GENERATOR ── */}
            {activeTab === 'reports' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Generate AI Reports
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Report Type</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {REPORT_TYPES.map(t => (
                        <button key={t} onClick={() => setReportForm(f => ({ ...f, type: t }))}
                          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition',
                            reportForm.type === t
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300')}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Period</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {REPORT_PERIODS.map(p => (
                        <button key={p} onClick={() => setReportForm(f => ({ ...f, period: p }))}
                          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition',
                            reportForm.period === p
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300')}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Format</label>
                    <div className="flex gap-2 mt-2">
                      {REPORT_FORMATS.map(f => (
                        <button key={f} onClick={() => setReportForm(rf => ({ ...rf, format: f }))}
                          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition',
                            reportForm.format === f
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300')}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description (optional)</label>
                    <textarea
                      value={reportForm.description}
                      onChange={e => setReportForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Additional notes or parameters..."
                      rows={2}
                      className="w-full mt-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Report Volume by Type</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={REPORT_CHART_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}%`, 'Completion']} />
                      <Bar dataKey="value" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {reportState === 'idle' && (
                  <button onClick={handleGenerateReport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm">
                    <Sparkles className="h-4 w-4" /> Generate {reportForm.type} Report
                  </button>
                )}

                {reportState === 'generating' && (
                  <div className="flex items-center gap-3 px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin" />
                    <div>
                      <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Generating report...</p>
                      <p className="text-xs text-indigo-500 dark:text-indigo-400">Analysing {reportForm.period.toLowerCase()} data</p>
                    </div>
                  </div>
                )}

                {reportState === 'ready' && (
                  <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-3">
                      <FileDown className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Report Ready</p>
                        <p className="text-xs text-emerald-500 dark:text-emerald-400">{reportForm.type}_{reportForm.period.replace(/\s/g, '_')}.{reportForm.format.toLowerCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setReportState('idle')}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded">
                        <X className="h-4 w-4" />
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition">
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── MEETING SUMMARIES ── */}
            {activeTab === 'meetings' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  AI-Generated Meeting Summaries
                </p>
                {MEETING_SUMMARIES.map((meeting, i) => (
                  <motion.div key={meeting.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{meeting.title}</h3>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{meeting.date}</span>
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{meeting.participants.join(', ')}</span>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Zap className="h-2.5 w-2.5" /> AI Summary
                      </span>
                    </div>
                    <ul className="space-y-1 mb-3">
                      {meeting.summary.map((point, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5">
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Action Items</p>
                      <div className="flex flex-wrap gap-1.5">
                        {meeting.actions.map((a, j) => (
                          <span key={j} className="text-[11px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800/40">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* ── EMAIL DRAFTS ── */}
            {activeTab === 'email' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-indigo-500" />
                  AI Email Composer
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">To</label>
                    <input
                      value={emailForm.to}
                      onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
                      placeholder="Recipient name or team..."
                      className="w-full mt-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subject</label>
                    <input
                      value={emailForm.subject}
                      onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder="Email subject..."
                      className="w-full mt-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Purpose</label>
                    <select
                      value={emailForm.purpose}
                      onChange={e => setEmailForm(f => ({ ...f, purpose: e.target.value }))}
                      className="w-full mt-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    >
                      {EMAIL_PURPOSES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tone</label>
                    <div className="flex gap-2 mt-1.5">
                      {EMAIL_TONES.map(t => (
                        <button key={t} onClick={() => setEmailForm(f => ({ ...f, tone: t }))}
                          className={cn('flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition',
                            emailForm.tone === t
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300')}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={handleGenerateDraft}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm">
                  <Sparkles className="h-4 w-4" /> Generate Draft
                </button>

                {emailDraft && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Generated Draft</p>
                      <button onClick={handleCopy}
                        className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium">
                        {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                      </button>
                    </div>
                    <textarea
                      value={emailDraft}
                      onChange={e => setEmailDraft(e.target.value)}
                      rows={12}
                      className="w-full text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white resize-none font-mono leading-relaxed"
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* ── SMART REMINDERS ── */}
            {activeTab === 'reminders' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-indigo-500" />
                    Smart Reminders
                  </p>
                  <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium">
                    {visibleReminders.length} active
                  </span>
                </div>
                <AnimatePresence>
                  {visibleReminders.map((r, i) => {
                    const Icon = r.icon;
                    const isSnoozed = snoozedIds.has(r.id);
                    return (
                      <motion.div key={r.id} layout
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: isSnoozed ? 0.5 : 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={cn('flex items-center gap-3 p-3.5 rounded-xl border transition', r.bg,
                          isSnoozed ? 'border-gray-200 dark:border-gray-700' : 'border-transparent')}>
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', r.bg)}>
                          <Icon className={cn('h-5 w-5', r.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium', isSnoozed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100')}>
                            {isSnoozed ? 'Snoozed for 3s...' : r.text}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {r.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleSnooze(r.id)}
                            disabled={isSnoozed}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition disabled:opacity-40"
                          >
                            Snooze
                          </button>
                          <button
                            onClick={() => handleDismiss(r.id)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition"
                          >
                            Dismiss
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {visibleReminders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
                    <Bell className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm font-medium">All reminders cleared</p>
                    <button onClick={() => setDismissedIds(new Set())}
                      className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                      Restore all
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
