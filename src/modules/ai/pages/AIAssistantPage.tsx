import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot, Send, Sparkles, FileText, Calendar, Mail, Bell,
  ListTodo, Copy, Check, BrainCircuit, Zap, User,
  AlertCircle, ChevronDown, Loader2,
  CheckCircle, Clock, XCircle, Download,
  Plus, History, RotateCcw, MessageSquare,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';
import { cn } from '@utils/cn';

type RightTab = 'tasks' | 'report' | 'meeting' | 'email' | 'reminder';
type GeminiModel = 'gemini-2.0-flash' | 'gemini-1.5-flash' | 'gemini-1.5-pro';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: Date;
}

interface ConversationSummary {
  id: number;
  uuid: string;
  title: string;
  updatedAt?: string;
  createdAt?: string;
}

const MODELS: { value: GeminiModel; label: string }[] = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro' },
];

const QUICK_PROMPTS = [
  "Summarize today's pending tasks",
  'What are the key HR compliance requirements?',
  'Draft a weekly team update email',
  'Explain our leave policy',
  'Tips for improving staff attendance',
];

const TABS: { key: RightTab; label: string; icon: React.ElementType }[] = [
  { key: 'tasks',   label: 'Tasks',    icon: ListTodo },
  { key: 'report',  label: 'Reports',  icon: FileText },
  { key: 'meeting', label: 'Meetings', icon: Calendar },
  { key: 'email',   label: 'Email',    icon: Mail },
  { key: 'reminder',label: 'Reminders',icon: Bell },
];

const REPORT_TYPES = ['attendance', 'payroll', 'leave', 'performance'] as const;
const EMAIL_TYPES = [
  { value: 'leave_approval',       label: 'Leave Approval' },
  { value: 'leave_rejection',      label: 'Leave Rejection' },
  { value: 'meeting_invitation',   label: 'Meeting Invitation' },
  { value: 'payroll_notification', label: 'Payroll Notification' },
  { value: 'warning_letter',       label: 'Warning Letter' },
  { value: 'onboarding',           label: 'Onboarding Welcome' },
] as const;
const REMINDER_TYPES = ['payroll', 'meeting', 'approval', 'contract_renewal', 'leave'] as const;
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

// ── markdown renderer (tables/code/links via remark-gfm) ───
function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="prose-chat text-sm leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:ml-3 [&_table]:text-xs [&_table]:border-collapse [&_th]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-600 [&_td]:border [&_td]:border-gray-300 dark:[&_td]:border-gray-600 [&_th]:px-2 [&_td]:px-2 [&_code]:bg-gray-200 dark:[&_code]:bg-gray-900 [&_code]:rounded [&_code]:px-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

export default function AIAssistantPage() {
  const user = useAuthStore(s => s.user);
  const userName = (user as any)?.firstName || 'there';

  const [model, setModel] = useState<GeminiModel>('gemini-2.0-flash');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<RightTab>('tasks');
  const [copied, setCopied] = useState(false);

  const greeting = useCallback((): ChatMessage => ({
    id: '0', role: 'assistant', ts: new Date(),
    content: `Hello ${userName}! I'm MaxHub AI, powered by Gemini. I can help you with ERP tasks, attendance, payroll, leave, employee search, reports, and more. What would you like to do?`,
  }), [userName]);

  // ── Chat state ────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '0', role: 'assistant', ts: new Date(),
    content: `Hello ${userName}! I'm MaxHub AI. I can help you with ERP tasks, reports, and more. What would you like to do?`,
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Conversation history ──────────────────────────────────
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const list = await apiClient.get<ConversationSummary[]>('/ai/conversations?feature=chat');
      setConversations(Array.isArray(list) ? list : []);
    } catch {
      setConversations([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([greeting()]);
    setConversationId(undefined);
    setShowHistory(false);
  }, [greeting]);

  const openConversation = useCallback(async (uuid: string) => {
    try {
      const data = await apiClient.get<{ conversation: { uuid: string }; messages: { id: number; role: 'user' | 'assistant' | 'system'; content: string; createdAt: string }[] }>(`/ai/conversations/${uuid}`);
      const loaded: ChatMessage[] = data.messages
        .filter(m => m.role !== 'system')
        .map(m => ({ id: String(m.id), role: m.role as 'user' | 'assistant', content: m.content, ts: new Date(m.createdAt) }));
      setMessages(loaded.length ? loaded : [greeting()]);
      setConversationId(data.conversation.uuid);
      setShowHistory(false);
    } catch {
      // leave current chat untouched if loading fails
    }
  }, [greeting]);

  // ── Panel state ───────────────────────────────────────────
  const [taskForm, setTaskForm]       = useState({ notes: '' });
  const [taskResult, setTaskResult]   = useState<any>(null);
  const [taskLoading, setTaskLoading] = useState(false);

  const [reportForm, setReportForm]     = useState({ type: 'attendance' as typeof REPORT_TYPES[number], period: 'This Month', notes: '' });
  const [reportResult, setReportResult] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const [meetForm, setMeetForm]     = useState({ title: '', participants: '', transcript: '' });
  const [meetResult, setMeetResult] = useState<any>(null);
  const [meetLoading, setMeetLoading] = useState(false);

  const [emailForm, setEmailForm]     = useState({ type: 'leave_approval' as typeof EMAIL_TYPES[number]['value'], recipient: '', notes: '' });
  const [emailResult, setEmailResult] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [reminderForm, setReminderForm]     = useState({ type: 'payroll' as typeof REMINDER_TYPES[number], notes: '' });
  const [reminderResult, setReminderResult] = useState<any>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  // ── AI provider status check ──────────────────────────────
  useEffect(() => {
    apiClient.get<{ available: boolean }>('/ai/status')
      .then(d => {
        setAvailable(d.available);
        setMessages(prev => (prev.length === 1 && prev[0].id === '0' ? [greeting()] : prev));
      })
      .catch(() => setAvailable(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Chat ──────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string, history?: ChatMessage[]) => {
    const content = (text ?? input).trim();
    if (!content) return;
    const base = history ?? messages;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content, ts: new Date() };
    setMessages([...base, userMsg]);
    setInput('');
    setIsTyping(true);
    try {
      const apiMessages = [
        ...base.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ];
      const resp = await apiClient.post<{ reply: string; model: string; conversationId?: string }>('/ai/chat', { messages: apiMessages, model, conversationId });
      if (resp.conversationId) setConversationId(resp.conversationId);
      setMessages(m => [...m, { id: (Date.now() + 1).toString(), role: 'assistant', content: resp.reply, ts: new Date() }]);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? '';
      const errorText = msg.includes('429') || msg.toLowerCase().includes('quota')
        ? '⚠️ Gemini rate limit reached. Please wait a moment and try again.'
        : 'Failed to reach the AI service. Please try again.';
      setMessages(m => [...m, { id: (Date.now() + 1).toString(), role: 'assistant', content: errorText, ts: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, messages, model, conversationId]);

  // ── Regenerate last response ──────────────────────────────
  const regenerate = useCallback(() => {
    if (isTyping) return;
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx === -1) return;
    const idx = messages.length - 1 - lastUserIdx;
    const lastUserMsg = messages[idx];
    const historyBefore = messages.slice(0, idx);
    sendMessage(lastUserMsg.content, historyBefore);
  }, [messages, isTyping, sendMessage]);

  // ── Panel API calls ───────────────────────────────────────
  const runTasks = async () => {
    setTaskLoading(true); setTaskResult(null);
    try {
      const r = await apiClient.post<any>('/ai/task-suggestions', {
        model,
        overdueTasks: [],
        pendingTasks: [],
        teamWorkload: [],
        ...( taskForm.notes ? { context: taskForm.notes } : {} ),
      });
      setTaskResult(r);
    } catch { setTaskResult({ error: true }); }
    finally { setTaskLoading(false); }
  };

  const runReport = async () => {
    setReportLoading(true); setReportResult('');
    try {
      const r = await apiClient.post<{ report: string }>('/ai/report', {
        model,
        type: reportForm.type,
        period: reportForm.period,
        data: { period: reportForm.period, notes: reportForm.notes, generatedAt: new Date().toISOString() },
      });
      setReportResult(r.report);
    } catch { setReportResult('Failed to generate report. Please try again.'); }
    finally { setReportLoading(false); }
  };

  const runMeeting = async () => {
    if (!meetForm.transcript.trim()) return;
    setMeetLoading(true); setMeetResult(null);
    try {
      const r = await apiClient.post<any>('/ai/summarize', {
        model,
        title: meetForm.title || 'Meeting Summary',
        transcript: meetForm.transcript,
        participants: meetForm.participants ? meetForm.participants.split(',').map(s => s.trim()) : [],
      });
      setMeetResult(r);
    } catch { setMeetResult({ error: true }); }
    finally { setMeetLoading(false); }
  };

  const runEmail = async () => {
    setEmailLoading(true); setEmailResult(null);
    try {
      const r = await apiClient.post<any>('/ai/email-draft', {
        model,
        type: emailForm.type,
        recipient: emailForm.recipient || 'Team Member',
        context: { notes: emailForm.notes, date: new Date().toLocaleDateString() },
      });
      setEmailResult(r);
    } catch { setEmailResult({ error: true }); }
    finally { setEmailLoading(false); }
  };

  const runReminder = async () => {
    setReminderLoading(true); setReminderResult(null);
    try {
      const r = await apiClient.post<any>('/ai/reminder', {
        model,
        type: reminderForm.type,
        context: { notes: reminderForm.notes, date: new Date().toLocaleDateString() },
      });
      setReminderResult(r);
    } catch { setReminderResult({ error: true }); }
    finally { setReminderLoading(false); }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* AI provider status banner */}
      {available === false && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-xs">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>AI Assistant is currently unavailable. Please try again shortly.</span>
        </div>
      )}
      {available !== false && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 text-xs">
          <Sparkles className="h-3 w-3" />
          <span>Powered by Gemini — can look up attendance, payroll, leave, employees, and dashboard insights for you</span>
        </div>
      )}

      <div className="flex flex-1 min-h-0 gap-4 p-4">
        {/* ── Left: Chat ──────────────────────────────────── */}
        <div className="flex flex-col w-full max-w-xl flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
                <BrainCircuit className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">MaxHub AI</p>
                <p className="text-[10px] text-gray-400">Powered by Gemini</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={startNewChat}
                title="New Chat"
                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setShowHistory(s => !s); if (!showHistory) loadConversations(); }}
                title="Conversation history"
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition',
                  showHistory
                    ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
                )}
              >
                <History className="h-3.5 w-3.5" />
              </button>
              {/* Model selector */}
              <div className="relative">
                <select
                  value={model}
                  onChange={e => setModel(e.target.value as GeminiModel)}
                  className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 pr-6 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                  {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Conversation history panel */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
                  ) : conversations.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No past conversations yet</p>
                  ) : (
                    conversations.map(c => (
                      <button
                        key={c.uuid}
                        onClick={() => openConversation(c.uuid)}
                        className={cn(
                          'w-full flex items-center gap-2 text-left text-xs px-2.5 py-2 rounded-lg transition',
                          conversationId === c.uuid
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
                        )}
                      >
                        <MessageSquare className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{c.title || 'Untitled chat'}</span>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1 && !isTyping;
                return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}
                >
                  <div className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm',
                    )}>
                      <ChatMarkdown text={msg.content} />
                      <p className={cn('text-[10px] mt-1', msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400')}>
                        {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    )}
                  </div>
                  {isLastAssistant && (
                    <div className="flex items-center gap-2 mt-1 ml-9">
                      <button onClick={() => copyText(msg.content)} title="Copy" className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <button onClick={regenerate} title="Regenerate response" className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </motion.div>
                );
              })}
            </AnimatePresence>
            {isTyping && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-3 py-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition whitespace-nowrap"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask anything about your ERP..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none max-h-24"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 text-white transition flex-shrink-0"
              >
                {isTyping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Feature Panels ────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition',
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* ── Task Suggestions ─────────────────────────── */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Smart Task Suggestions</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI analyses your workload and suggests next actions.</p>
                </div>
                <textarea
                  value={taskForm.notes}
                  onChange={e => setTaskForm({ notes: e.target.value })}
                  placeholder="Describe your current task situation or paste overdue tasks..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={runTasks}
                  disabled={taskLoading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                >
                  {taskLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {taskLoading ? 'Analysing...' : 'Get AI Suggestions'}
                </button>
                {taskResult && !taskResult.error && (
                  <div className="space-y-3">
                    {taskResult.workloadNotes && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 text-sm text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                        {taskResult.workloadNotes}
                      </div>
                    )}
                    {taskResult.suggestions?.map((s: any, i: number) => (
                      <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{s.action}</p>
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', PRIORITY_COLORS[s.priority] ?? PRIORITY_COLORS.medium)}>
                            {s.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
                {taskResult?.error && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    Failed to get suggestions. Please try again.
                  </div>
                )}
              </div>
            )}

            {/* ── Report Generator ─────────────────────────── */}
            {activeTab === 'report' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">AI Report Generator</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Generate professional ERP reports with AI narrative.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Report Type</label>
                    <select
                      value={reportForm.type}
                      onChange={e => setReportForm(f => ({ ...f, type: e.target.value as any }))}
                      className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {REPORT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Period</label>
                    <input
                      value={reportForm.period}
                      onChange={e => setReportForm(f => ({ ...f, period: e.target.value }))}
                      placeholder="e.g. June 2026"
                      className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <textarea
                  value={reportForm.notes}
                  onChange={e => setReportForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Add context, data points, or special notes for the AI..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={runReport}
                  disabled={reportLoading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                >
                  {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {reportLoading ? 'Generating...' : 'Generate Report'}
                </button>
                {reportResult && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Generated Report</p>
                      <div className="flex gap-2">
                        <button onClick={() => copyText(reportResult)} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800">
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                        <button onClick={() => {
                          const blob = new Blob([reportResult], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = `${reportForm.type}-report.txt`; a.click();
                        }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                          <Download className="h-3 w-3" /> Download
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{reportResult}</div>
                  </div>
                )}
              </div>
            )}

            {/* ── Meeting Summary ───────────────────────────── */}
            {activeTab === 'meeting' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Meeting Summarizer</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Paste your transcript — AI extracts summary, action items, and decisions.</p>
                </div>
                <input
                  value={meetForm.title}
                  onChange={e => setMeetForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Meeting title (optional)"
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  value={meetForm.participants}
                  onChange={e => setMeetForm(f => ({ ...f, participants: e.target.value }))}
                  placeholder="Participants (comma separated)"
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <textarea
                  value={meetForm.transcript}
                  onChange={e => setMeetForm(f => ({ ...f, transcript: e.target.value }))}
                  placeholder="Paste meeting transcript here..."
                  rows={5}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={runMeeting}
                  disabled={meetLoading || !meetForm.transcript.trim()}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                >
                  {meetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {meetLoading ? 'Summarizing...' : 'Summarize Meeting'}
                </button>
                {meetResult && !meetResult.error && (
                  <div className="space-y-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800">
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1">Summary</p>
                      <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">{meetResult.summary}</p>
                    </div>
                    {meetResult.actionItems?.length > 0 && (
                      <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Action Items</p>
                        <div className="space-y-2">
                          {meetResult.actionItems.map((item: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-3.5 w-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-gray-800 dark:text-gray-200">{item.task}</p>
                                {(item.assignee || item.deadline) && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {item.assignee && `→ ${item.assignee}`} {item.deadline && `· ${item.deadline}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {meetResult.keyDecisions?.length > 0 && (
                      <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Decisions</p>
                        {meetResult.keyDecisions.map((d: string, i: number) => (
                          <p key={i} className="text-sm text-gray-700 dark:text-gray-300">• {d}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {meetResult?.error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                    <XCircle className="h-4 w-4" /> Failed to summarize. Please try again.
                  </div>
                )}
              </div>
            )}

            {/* ── Email Drafter ─────────────────────────────── */}
            {activeTab === 'email' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">AI Email Drafter</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Generate professional HR emails instantly.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Email Type</label>
                  <select
                    value={emailForm.type}
                    onChange={e => setEmailForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {EMAIL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <input
                  value={emailForm.recipient}
                  onChange={e => setEmailForm(f => ({ ...f, recipient: e.target.value }))}
                  placeholder="Recipient name (e.g. Emeka Obi)"
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <textarea
                  value={emailForm.notes}
                  onChange={e => setEmailForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Add context (dates, reasons, specific details)..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={runEmail}
                  disabled={emailLoading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                >
                  {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {emailLoading ? 'Drafting...' : 'Draft Email'}
                </button>
                {emailResult && !emailResult.error && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Subject: {emailResult.subject}</p>
                      <button onClick={() => copyText(`Subject: ${emailResult.subject}\n\n${emailResult.body}`)} className="flex items-center gap-1 text-xs text-indigo-600">
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {emailResult.body}
                    </div>
                  </div>
                )}
                {emailResult?.error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                    <XCircle className="h-4 w-4" /> Failed to draft email. Please try again.
                  </div>
                )}
              </div>
            )}

            {/* ── Smart Reminders ───────────────────────────── */}
            {activeTab === 'reminder' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Smart Reminder Generator</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI generates contextual reminders with urgency levels.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Reminder Type</label>
                  <select
                    value={reminderForm.type}
                    onChange={e => setReminderForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {REMINDER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <textarea
                  value={reminderForm.notes}
                  onChange={e => setReminderForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Add context (who, when, what's at stake)..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={runReminder}
                  disabled={reminderLoading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                >
                  {reminderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                  {reminderLoading ? 'Generating...' : 'Generate Reminder'}
                </button>
                {reminderResult && !reminderResult.error && (
                  <div className={cn(
                    'rounded-xl border p-4 space-y-2',
                    reminderResult.urgency === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                    reminderResult.urgency === 'high' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
                    'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800',
                  )}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{reminderResult.title}</p>
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                        reminderResult.urgency === 'critical' ? 'bg-red-200 text-red-800' :
                        reminderResult.urgency === 'high' ? 'bg-amber-200 text-amber-800' :
                        'bg-indigo-200 text-indigo-800',
                      )}>{reminderResult.urgency}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{reminderResult.message}</p>
                    {reminderResult.suggestedSendTime && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" /> Send: {reminderResult.suggestedSendTime}
                      </div>
                    )}
                  </div>
                )}
                {reminderResult?.error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                    <XCircle className="h-4 w-4" /> Failed to generate reminder. Please try again.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
