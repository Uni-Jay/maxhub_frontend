import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Send, Paperclip, Mic, MicOff, Smile, Video,
  Phone, MoreVertical, ArrowLeft, CheckCheck, Pin,
  Edit2, Trash2, Reply, X, Users, User, Megaphone,
  VideoOff, ExternalLink, Minimize2, Maximize2, Check,
  Filter, Dot,
} from 'lucide-react';
import { messagingService, type Conversation, type ChatMessage } from '@services/messagingService';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';
import { cn } from '@utils/cn';

// ─── Staff & Department fallback data ─────────────────────
interface StaffMember {
  id: number;
  name: string;
  role: string;
  department: string;
  online: boolean;
}

interface Department {
  id: number;
  name: string;
  memberCount: number;
}

const FALLBACK_STAFF: StaffMember[] = [
  { id: 101, name: 'Amaka Okonkwo', role: 'HR Manager', department: 'HR', online: true },
  { id: 102, name: 'Tunde Fashola', role: 'Software Engineer', department: 'Engineering', online: true },
  { id: 103, name: 'Chioma Eze', role: 'Visa Consultant', department: 'Visa Max', online: false },
  { id: 104, name: 'Emeka Nwosu', role: 'Finance Officer', department: 'Finance', online: true },
  { id: 105, name: 'Fatima Bello', role: 'SAT Instructor', department: 'Kurios SAT', online: false },
  { id: 106, name: 'Segun Adeyemi', role: 'Bead Artisan Lead', department: 'Bead Max', online: true },
  { id: 107, name: 'Ngozi Ike', role: 'Frontend Developer', department: 'Engineering', online: true },
  { id: 108, name: 'Kelechi Obi', role: 'Accountant', department: 'Finance', online: false },
  { id: 109, name: 'Blessing Uche', role: 'Marketing Officer', department: 'HR', online: true },
  { id: 110, name: 'Chidi Okoro', role: 'Backend Engineer', department: 'Engineering', online: false },
];

const FALLBACK_DEPARTMENTS: Department[] = [
  { id: 201, name: 'Engineering', memberCount: 8 },
  { id: 202, name: 'HR', memberCount: 5 },
  { id: 203, name: 'Finance', memberCount: 6 },
  { id: 204, name: 'Kurios SAT', memberCount: 12 },
  { id: 205, name: 'Bead Max', memberCount: 10 },
  { id: 206, name: 'Visa Max', memberCount: 7 },
];

// ─── Build synthetic Conversation objects from staff/depts ─
function buildStaffConversation(staff: StaffMember): Conversation {
  return {
    id: -(staff.id), // negative IDs to avoid clash with real conversations
    conversationCode: `DM-STAFF-${staff.id}`,
    title: staff.name,
    conversationType: 'Direct',
    createdById: 0,
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    participants: [],
    isPinned: false,
    _synthetic: true,
    _subtitle: `${staff.role} · ${staff.department}`,
    _online: staff.online,
  } as unknown as Conversation;
}

function buildDeptConversation(dept: Department): Conversation {
  return {
    id: -(dept.id + 10000),
    conversationCode: `GROUP-DEPT-${dept.id}`,
    title: dept.name,
    conversationType: 'Group',
    createdById: 0,
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    participants: Array.from({ length: dept.memberCount }, (_, i) => ({ id: i })),
    isPinned: false,
    _synthetic: true,
    _subtitle: `Group · ${dept.memberCount} members`,
    _online: false,
  } as unknown as Conversation;
}

function buildAllStaffConversation(totalCount: number): Conversation {
  return {
    id: -99999,
    conversationCode: 'GROUP-ALL-STAFF',
    title: 'All Staff',
    conversationType: 'Group',
    createdById: 0,
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    participants: Array.from({ length: totalCount }, (_, i) => ({ id: i })),
    isPinned: true,
    _synthetic: true,
    _subtitle: `Group · ${totalCount} members`,
    _online: false,
  } as unknown as Conversation;
}

/* ─── Helpers ───────────────────────────────────────────── */
const EMOJIS = ['👍','❤️','😂','😮','😢','🙏','🔥','✅','👏','🎉','🤔','💯','🎊','😍','🤝','😊','😎','🤩','😴','🥳','😱','🤦','👀','💪','🚀','⭐','📌','✨','💡','🎯'];

const AVATAR_COLORS = [
  'bg-indigo-500','bg-violet-500','bg-blue-500','bg-emerald-500',
  'bg-amber-500','bg-rose-500','bg-cyan-500','bg-fuchsia-500',
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function fmtTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fmtMsgTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDateSep(date: string) {
  const d = new Date(date);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

/* ─── Avatar ─────────────────────────────────────────────── */
function Avatar({ name, size = 10, src, online }: { name: string; size?: number; src?: string; online?: boolean }) {
  const color = avatarColor(name);
  const sz = `w-${size} h-${size}`;
  return (
    <div className="relative flex-shrink-0">
      {src
        ? <img src={src} className={`${sz} rounded-full object-cover`} alt={name} />
        : <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>{initials(name)}</div>
      }
      {online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900" />}
    </div>
  );
}

/* ─── Conversation Item ──────────────────────────────────── */
function ConversationItem({ conv, isSelected, onClick }: {
  conv: Conversation; isSelected: boolean; onClick: () => void;
}) {
  const synth = (conv as any)._synthetic;
  const subtitle = (conv as any)._subtitle as string | undefined;
  const onlineOverride = (conv as any)._online as boolean | undefined;

  const typeIcon = conv.conversationType === 'Group' || conv.conversationType === 'Team'
    ? <Users className="h-4 w-4" />
    : conv.conversationType === 'Channel'
      ? <Megaphone className="h-4 w-4" />
      : <User className="h-4 w-4" />;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 dark:border-gray-800/60',
        isSelected
          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-b-indigo-100 dark:border-b-indigo-900/30'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      )}
    >
      {conv.conversationType === 'Direct' ? (
        <Avatar name={conv.title} size={11} online={synth ? onlineOverride : true} />
      ) : (
        <div className={cn('w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white',
          conv.conversationType === 'Channel' ? 'bg-gradient-to-br from-orange-400 to-rose-500' : 'bg-gradient-to-br from-indigo-400 to-violet-600')}>
          {typeIcon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate pr-2">{conv.title}</span>
          <span className="text-[11px] text-gray-400 flex-shrink-0">{conv.lastMessageAt ? fmtTime(conv.lastMessageAt) : ''}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 pr-2">
            {synth && subtitle ? subtitle : (conv.lastMessage?.messageText || 'No messages yet')}
          </p>
          {(conv.unreadCount || 0) > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
              {conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Bubble Tail ────────────────────────────────────────── */
function SentTail() {
  return (
    <div className="absolute -bottom-[1px] -right-[6px]">
      <svg width="8" height="13" viewBox="0 0 8 13" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.264 1.533 3.568z" fill="currentColor" className="text-indigo-600 dark:text-indigo-500" />
      </svg>
    </div>
  );
}

function ReceivedTail({ dark }: { dark?: boolean }) {
  return (
    <div className="absolute -bottom-[1px] -left-[6px]">
      <svg width="8" height="13" viewBox="0 0 8 13" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.467 3.568L0 12.193V1H5.188C6.958 1 7.526 2.264 6.467 3.568z" fill={dark ? '#1f2937' : 'white'} />
      </svg>
    </div>
  );
}

/* ─── Date Separator ─────────────────────────────────────── */
function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-4">
      <span className="bg-white/80 dark:bg-gray-800/90 text-gray-500 dark:text-gray-400 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
        {label}
      </span>
    </div>
  );
}

/* ─── Message Bubble ─────────────────────────────────────── */
function MessageBubble({
  msg, isOwn, showSender, onReply, onReact, onEdit, onDelete, onPin, currentUserId,
}: {
  msg: ChatMessage; isOwn: boolean; showSender: boolean;
  onReply: (m: ChatMessage) => void;
  onReact: (msgId: number, emoji: string) => void;
  onEdit: (m: ChatMessage) => void;
  onDelete: (id: number) => void;
  onPin: (id: number) => void;
  currentUserId: number;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const reactions = (msg.reactions || {}) as Record<string, number[]>;

  const isImage = msg.messageType === 'Image';
  const isAudio = msg.messageType === 'File' && msg.attachmentUrl?.startsWith('data:audio');

  return (
    <div
      className={cn('flex items-end gap-1.5 group mb-1', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseLeave={() => { setShowMenu(false); setShowEmojiBar(false); }}
    >
      {/* Avatar (received only) */}
      {!isOwn && showSender && <Avatar name={msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'U'} size={7} src={msg.sender?.avatar} />}
      {!isOwn && !showSender && <div className="w-7 flex-shrink-0" />}

      <div className={cn('flex flex-col max-w-[65%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name (group) */}
        {showSender && !isOwn && msg.sender && (
          <span className={cn('text-[11px] font-semibold mb-1 px-2', avatarColor(msg.sender.firstName).replace('bg-', 'text-'))}>
            {msg.sender.firstName} {msg.sender.lastName}
          </span>
        )}

        {/* Reply preview */}
        {msg.replyTo && (
          <div className={cn('text-xs rounded-xl px-3 py-1.5 mb-0.5 border-l-4 border-indigo-400 max-w-full',
            isOwn ? 'bg-indigo-700/60 text-indigo-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>
            <p className="font-semibold text-indigo-400 truncate">{msg.replyTo.sender?.firstName}</p>
            <p className="truncate opacity-80">{msg.replyTo.messageText}</p>
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          {isOwn && !msg.replyTo && <SentTail />}
          {!isOwn && !msg.replyTo && <ReceivedTail />}

          <div className={cn(
            'relative px-3 py-2 shadow-sm',
            isOwn
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl rounded-br-sm'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm border border-gray-100 dark:border-gray-700',
            msg.replyTo && (isOwn ? 'rounded-2xl' : 'rounded-2xl'),
          )}>
            {msg.isPinned && (
              <div className={cn('flex items-center gap-1 text-xs mb-1 pb-1 border-b',
                isOwn ? 'text-indigo-200 border-indigo-500' : 'text-indigo-500 border-gray-100 dark:border-gray-700')}>
                <Pin className="h-2.5 w-2.5" /> Pinned
              </div>
            )}

            {isImage && msg.attachmentUrl && (
              <img
                src={msg.attachmentUrl}
                alt="shared"
                className="max-w-[240px] rounded-xl mb-1 cursor-pointer"
                onClick={() => window.open(msg.attachmentUrl, '_blank')}
              />
            )}

            {isAudio && msg.attachmentUrl && (
              <audio controls className="max-w-[220px] h-8 mb-1" src={msg.attachmentUrl} />
            )}

            {(!isImage && !isAudio && msg.messageText) && (
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.messageText}</p>
            )}

            {/* Timestamp + status */}
            <div className={cn('flex items-center justify-end gap-1 mt-0.5', isOwn ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500')}>
              {msg.isEdited && <span className="text-[10px] italic opacity-70">edited</span>}
              <span className="text-[10px]">{fmtMsgTime(msg.createdAt)}</span>
              {isOwn && <CheckCheck className="h-3 w-3 text-indigo-200" />}
            </div>
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {Object.entries(reactions).map(([emoji, users]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                className={cn('text-xs rounded-full px-2 py-0.5 border transition-colors shadow-sm',
                  users.includes(currentUserId)
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                {emoji} {users.length}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover action toolbar */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.1 }}
            className={cn('flex items-center gap-0.5 mb-2 opacity-0 group-hover:opacity-100',
              isOwn ? 'flex-row-reverse' : 'flex-row')}
          >
            <div className="relative">
              <button onClick={() => setShowEmojiBar(!showEmojiBar)}
                className="p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-indigo-600 shadow-sm">
                <Smile className="h-3.5 w-3.5" />
              </button>
              {showEmojiBar && (
                <div className={cn('absolute bottom-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-2.5 flex flex-wrap gap-1 z-20 w-52',
                  isOwn ? 'right-0' : 'left-0')}>
                  {EMOJIS.slice(0, 15).map(e => (
                    <button key={e} onClick={() => { onReact(msg.id, e); setShowEmojiBar(false); }}
                      className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => onReply(msg)} className="p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-indigo-600 shadow-sm">
              <Reply className="h-3.5 w-3.5" />
            </button>
            {isOwn && <>
              <button onClick={() => onEdit(msg)} className="p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-indigo-600 shadow-sm">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(msg.id)} className="p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 shadow-sm">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>}
            <button onClick={() => onPin(msg.id)}
              className={cn('p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm',
                msg.isPinned ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600')}>
              <Pin className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invisible overlay to trigger menu */}
      <div className="w-8 h-8 flex-shrink-0 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
        onClick={() => setShowMenu(m => !m)}>
        <MoreVertical className="h-4 w-4 text-gray-400 dark:text-gray-600" />
      </div>
    </div>
  );
}

/* ─── Video Call Modal ───────────────────────────────────── */
function VideoCallModal({ conv, onClose, onSendNotification }: {
  conv: Conversation; onClose: () => void; onSendNotification: () => void;
}) {
  const [minimized, setMinimized] = useState(false);
  const room = encodeURIComponent(`MaxHub-${conv.conversationCode}`);
  const jitsiUrl = `https://meet.jit.si/${room}`;
  useEffect(() => { onSendNotification(); }, []);

  if (minimized) return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl p-3 flex items-center gap-3 cursor-pointer border border-gray-700"
      onClick={() => setMinimized(false)}>
      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
        <Video className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold">Call in progress</p>
        <p className="text-xs text-gray-400">{conv.title}</p>
      </div>
      <button className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20"><Maximize2 className="h-3.5 w-3.5" /></button>
      <button onClick={e => { e.stopPropagation(); onClose(); }} className="p-1.5 bg-red-600 rounded-lg hover:bg-red-700">
        <VideoOff className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-gray-700"
        style={{ width: '90vw', maxWidth: 1100, height: '85vh' }}>
        <div className="flex items-center justify-between px-5 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <div>
              <p className="text-white font-semibold text-sm">{conv.title}</p>
              <p className="text-gray-400 text-xs">Room: MaxHub-{conv.conversationCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={jitsiUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-xs font-medium">
              <ExternalLink className="h-3.5 w-3.5" /> Pop out
            </a>
            <button onClick={() => setMinimized(true)} className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600">
              <Minimize2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium">
              <VideoOff className="h-4 w-4" /> End Call
            </button>
          </div>
        </div>
        <iframe src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-read; clipboard-write"
          className="flex-1 w-full border-0" title={`Video call — ${conv.title}`} />
        <div className="bg-gray-800 border-t border-gray-700 px-5 py-2 text-center">
          <p className="text-xs text-gray-500">Powered by Jitsi Meet · All participants need the same room link</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────── */
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#111b21]">
      <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-5">
        <MessageIcon />
      </div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">MaxHub Messages</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-6">
        Select a conversation to start chatting, or create a new one.
      </p>
      <button onClick={onNew}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow transition">
        <Plus className="h-4 w-4" /> New Conversation
      </button>
    </div>
  );
}

function MessageIcon() {
  return (
    <svg className="w-12 h-12 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

/* ─── New Conversation Modal ─────────────────────────────── */
function NewChatModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (payload: { title: string; conversationType: string; participantUserIds: number[] }) => void;
}) {
  const [form, setForm] = useState({ title: '', conversationType: 'Direct', participantUserIds: '' });

  const TYPE_OPTIONS = [
    { value: 'Direct', icon: User, label: 'Direct', desc: '1-to-1 private chat' },
    { value: 'Group', icon: Users, label: 'Group', desc: 'Small team group' },
    { value: 'Team', icon: Users, label: 'Team', desc: 'Department-wide' },
    { value: 'Channel', icon: Megaphone, label: 'Channel', desc: 'Broadcast announcements' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-600">
          <h2 className="text-base font-bold text-white">New Conversation</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Conversation name..."
              className="w-full mt-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {TYPE_OPTIONS.map(({ value, icon: Icon, label, desc }) => (
                <button key={value} onClick={() => setForm(f => ({ ...f, conversationType: value }))}
                  className={cn('flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all',
                    form.conversationType === value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600')}>
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    form.conversationType === value ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400')}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', form.conversationType === value ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-white')}>{label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Participants (IDs)</label>
            <input value={form.participantUserIds} onChange={e => setForm(f => ({ ...f, participantUserIds: e.target.value }))}
              placeholder="e.g. 2, 5, 8"
              className="w-full mt-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
            <p className="text-[11px] text-gray-400 mt-1">You are added automatically</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium">Cancel</button>
          <button
            onClick={() => {
              const ids = form.participantUserIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
              onCreate({ title: form.title, conversationType: form.conversationType, participantUserIds: ids });
            }}
            disabled={!form.title}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition">
            <Check className="h-4 w-4" /> Create
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function MessagingPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const currentUserId = (currentUser as any)?.id || 0;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editTarget, setEditTarget] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [adminOnlyGroups, setAdminOnlyGroups] = useState<Set<number>>(new Set());
  const [syntheticMessages, setSyntheticMessages] = useState<Record<number, ChatMessage[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  /* ─── Queries ─────────────────────────────────────── */
  const { data: convsRaw } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingService.getConversations(),
    refetchInterval: 5000,
  });

  const { data: staffRaw } = useQuery({
    queryKey: ['staff-for-messaging'],
    queryFn: async () => {
      try { return await apiClient.get<StaffMember[]>('/staff'); }
      catch { return FALLBACK_STAFF; }
    },
    staleTime: 60000,
  });

  const { data: deptsRaw } = useQuery({
    queryKey: ['departments-for-messaging'],
    queryFn: async () => {
      try { return await apiClient.get<Department[]>('/departments'); }
      catch { return FALLBACK_DEPARTMENTS; }
    },
    staleTime: 60000,
  });

  const isSyntheticSelected = selectedId !== null && selectedId < 0;

  const { data: messagesRaw } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => messagingService.getMessages(selectedId!, { limit: 100 }),
    enabled: !!selectedId && !isSyntheticSelected,
    refetchInterval: 3000,
  });

  const staffList: StaffMember[] = (staffRaw as StaffMember[]) ?? FALLBACK_STAFF;
  const deptList: Department[] = (deptsRaw as Department[]) ?? FALLBACK_DEPARTMENTS;

  // Build synthetic conversations from staff + departments
  const syntheticConvs = useMemo(() => {
    const allStaff = buildAllStaffConversation(staffList.length);
    const deptConvs = deptList.map(buildDeptConversation);
    const staffConvs = staffList.map(buildStaffConversation);
    return [allStaff, ...deptConvs, ...staffConvs];
  }, [staffList, deptList]);

  const realConversations: Conversation[] = (convsRaw as any) || [];

  // Merge: real conversations first, then synthetic ones (no duplicates by title for Direct)
  const conversations: Conversation[] = useMemo(() => {
    const realTitles = new Set(realConversations.filter(c => c.conversationType === 'Direct').map(c => c.title.toLowerCase()));
    const filteredSynth = syntheticConvs.filter(s => {
      if (s.conversationType === 'Direct') return !realTitles.has(s.title.toLowerCase());
      return true;
    });
    return [...realConversations, ...filteredSynth];
  }, [realConversations, syntheticConvs]);

  const realMessages: ChatMessage[] = (messagesRaw as any)?.data || [];
  const messages: ChatMessage[] = isSyntheticSelected
    ? (syntheticMessages[selectedId!] || [])
    : realMessages;
  const selectedConv = conversations.find(c => c.id === selectedId) || null;
  const isChannel = selectedConv?.conversationType === 'Channel';
  const isGroup = selectedConv?.conversationType === 'Group';
  const isGroupAdmin = isGroup && selectedConv?.createdById === currentUserId;
  const isGroupAdminOnly = isGroup && selectedId !== null && adminOnlyGroups.has(selectedId);
  // Everyone can send by default; only blocked when group admin has enabled admin-only mode
  const canSend = !(isGroupAdminOnly && !isGroupAdmin);

  const toggleGroupAdminOnly = () => {
    if (!selectedId || !isGroupAdmin) return;
    setAdminOnlyGroups(prev => {
      const next = new Set(prev);
      if (next.has(selectedId)) next.delete(selectedId);
      else next.add(selectedId);
      return next;
    });
  };

  const filtered = conversations.filter(c => {
    if (typeFilter && c.conversationType !== typeFilter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  /* ─── Auto scroll ─────────────────────────────────── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (selectedId && !isSyntheticSelected) messagingService.markAsRead(selectedId).catch(() => {});
  }, [selectedId, isSyntheticSelected, messages.length]);

  /* ─── Mutations ───────────────────────────────────── */
  const sendMutation = useMutation({
    mutationFn: (p: { messageText: string; messageType?: string; replyToMessageId?: number; attachmentUrl?: string }) =>
      messagingService.sendMessage(selectedId!, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages', selectedId] }); qc.invalidateQueries({ queryKey: ['conversations'] }); },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => messagingService.editMessage(selectedId!, id, text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages', selectedId] }); setEditTarget(null); setMessageText(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => messagingService.deleteMessage(selectedId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', selectedId] }),
  });

  const reactMutation = useMutation({
    mutationFn: ({ msgId, emoji }: { msgId: number; emoji: string }) => messagingService.reactToMessage(selectedId!, msgId, emoji),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', selectedId] }),
  });

  const pinMutation = useMutation({
    mutationFn: (msgId: number) => messagingService.pinMessage(selectedId!, msgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', selectedId] }),
  });

  const createConvMutation = useMutation({
    mutationFn: (p: { title: string; conversationType: string; participantUserIds: number[] }) => messagingService.createConversation(p),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setShowNewChat(false);
      setSelectedId(data?.id || null);
      setMobileShowChat(true);
    },
  });

  /* ─── Handlers ────────────────────────────────────── */
  const handleSend = useCallback(() => {
    const text = messageText.trim();
    if (!text || !selectedId) return;
    if (isSyntheticSelected) {
      // Local message storage for demo/synthetic conversations
      const newMsg: ChatMessage = {
        id: Date.now(),
        conversationId: selectedId,
        senderUserId: currentUserId,
        messageText: text,
        messageType: 'Text',
        attachmentUrl: null,
        reactions: {},
        replyTo: replyTo ?? undefined,
        replyToMessageId: replyTo?.id ?? null,
        isPinned: false,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: currentUser ? {
          id: currentUserId,
          firstName: (currentUser as any).firstName || 'You',
          lastName: (currentUser as any).lastName || '',
          avatar: (currentUser as any).avatar,
        } : undefined,
      } as any;
      setSyntheticMessages(prev => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] || []), newMsg],
      }));
      setReplyTo(null);
    } else if (editTarget) {
      editMutation.mutate({ id: editTarget.id, text });
    } else {
      sendMutation.mutate({ messageText: text, replyToMessageId: replyTo?.id });
      setReplyTo(null);
    }
    setMessageText('');
    setShowEmojiPicker(false);
  }, [messageText, selectedId, editTarget, replyTo, isSyntheticSelected, currentUserId, currentUser]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const img = file.type.startsWith('image/');
      sendMutation.mutate({ messageText: img ? '📷 Image' : `📎 ${file.name}`, messageType: img ? 'Image' : 'File', attachmentUrl: dataUrl });
    };
    if (file.size <= 5 * 1024 * 1024) reader.readAsDataURL(file);
    else sendMutation.mutate({ messageText: `📎 ${file.name} (${(file.size / 1048576).toFixed(1)} MB)`, messageType: 'File' });
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => sendMutation.mutate({ messageText: '🎤 Voice note', messageType: 'File', attachmentUrl: reader.result as string });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch { alert('Microphone access denied'); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const handleEditClick = (msg: ChatMessage) => {
    setEditTarget(msg);
    setMessageText(msg.messageText);
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const selectConv = (id: number) => { setSelectedId(id); setMobileShowChat(true); };

  /* ─── Date separator logic ────────────────────────── */
  function buildMessageList() {
    const result: (ChatMessage | { type: 'date'; label: string; key: string })[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const d = new Date(msg.createdAt).toDateString();
      if (d !== lastDate) { result.push({ type: 'date', label: fmtDateSep(msg.createdAt), key: `date-${d}` }); lastDate = d; }
      result.push(msg);
    }
    return result;
  }

  /* ─── Render ──────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">

      {/* ══════════════ LEFT PANEL ══════════════ */}
      <div className={cn('flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
        'w-full md:w-[360px] md:flex-shrink-0',
        mobileShowChat ? 'hidden md:flex' : 'flex')}>

        {/* Brand header */}
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 dark:bg-gray-800 border-b border-indigo-700 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-black text-sm">M</span>
            </div>
            <span className="text-white font-bold text-base">Messages</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setShowNewChat(true)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition">
              <Plus className="h-5 w-5" />
            </button>
            <button className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-2 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 border border-gray-200 dark:border-gray-700">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search or start new chat"
              className="bg-transparent text-sm flex-1 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none" />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5 text-gray-400" /></button>}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto">
          {['All', 'Direct', 'Group', 'Channel'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t === 'All' ? '' : t)}
              className={cn('flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                (t === 'All' ? !typeFilter : typeFilter === t)
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700')}>
              {t}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
              <Filter className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">No conversations</p>
              <button onClick={() => setShowNewChat(true)} className="text-indigo-500 text-xs mt-1 hover:underline">Start one</button>
            </div>
          ) : (
            filtered.map(conv => (
              <ConversationItem key={conv.id} conv={conv} isSelected={conv.id === selectedId} onClick={() => selectConv(conv.id)} />
            ))
          )}
        </div>
      </div>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      <div className={cn('flex-1 flex flex-col overflow-hidden',
        !mobileShowChat ? 'hidden md:flex' : 'flex')}>

        {!selectedConv ? (
          <EmptyState onNew={() => setShowNewChat(true)} />
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button onClick={() => setMobileShowChat(false)} className="md:hidden p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                <ArrowLeft className="h-5 w-5" />
              </button>
              {selectedConv.conversationType === 'Direct' ? (
                <Avatar name={selectedConv.title} size={10} online />
              ) : (
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0',
                  selectedConv.conversationType === 'Channel' ? 'bg-gradient-to-br from-orange-400 to-rose-500' : 'bg-gradient-to-br from-indigo-400 to-violet-600')}>
                  {selectedConv.conversationType === 'Channel' ? <Megaphone className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{selectedConv.title}</p>
                <div className="flex items-center gap-1">
                  <Dot className="h-4 w-4 text-emerald-500 -ml-1" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">online</span>
                  {selectedConv.participants?.length && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">· {selectedConv.participants.length} members</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition">
                  <Search className="h-4.5 w-4.5" />
                </button>
                <button onClick={() => setShowVideoCall(true)}
                  className={cn('p-2 rounded-full transition', showVideoCall
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400')}>
                  <Video className="h-4.5 w-4.5" />
                </button>
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition">
                  <Phone className="h-4.5 w-4.5" />
                </button>
                {isGroupAdmin && (
                  <button onClick={toggleGroupAdminOnly} title={isGroupAdminOnly ? 'Allow everyone to send' : 'Restrict to admin only'}
                    className={`p-2 rounded-full transition text-xs font-medium ${isGroupAdminOnly ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'}`}>
                    🔒
                  </button>
                )}
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition">
                  <MoreVertical className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Channel banner */}
            {isChannel && (
              <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/40">
                <Megaphone className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-400">Announcement channel — all members can send messages</span>
              </div>
            )}
            {/* Group admin-only banner */}
            {isGroupAdminOnly && (
              <div className="flex items-center gap-2 px-5 py-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800/40">
                <span className="text-xs text-orange-700 dark:text-orange-400">Admin-only mode — only the group admin can send messages</span>
                {isGroupAdmin && (
                  <button onClick={toggleGroupAdminOnly} className="ml-auto text-xs text-orange-600 underline dark:text-orange-400">Disable</button>
                )}
              </div>
            )}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-100 dark:bg-[#111b21]"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 gap-3">
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                    <MessageIcon />
                  </div>
                  <p className="text-sm">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                buildMessageList().map((item) => {
                  if ('type' in item) return <DateSep key={item.key} label={item.label} />;
                  const msg = item;
                  const isOwn = msg.senderUserId === currentUserId;
                  const prev = messages[messages.findIndex(m => m.id === msg.id) - 1];
                  const showSender = !isOwn && (!prev || prev.senderUserId !== msg.senderUserId);
                  return (
                    <MessageBubble key={msg.id}
                      msg={msg} isOwn={isOwn}
                      showSender={selectedConv.conversationType !== 'Direct' && showSender}
                      currentUserId={currentUserId}
                      onReply={setReplyTo}
                      onReact={(msgId, emoji) => reactMutation.mutate({ msgId, emoji })}
                      onEdit={handleEditClick}
                      onDelete={id => { if (confirm('Delete this message?')) deleteMutation.mutate(id); }}
                      onPin={id => pinMutation.mutate(id)}
                    />
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply / Edit bar */}
            <AnimatePresence>
              {(replyTo || editTarget) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-800 border-t border-indigo-100 dark:border-indigo-900/40 border-l-4 border-l-indigo-500">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {editTarget ? '✏️ Editing message' : `↩ Replying to ${replyTo?.sender?.firstName || 'message'}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {editTarget?.messageText || replyTo?.messageText}
                    </p>
                  </div>
                  <button onClick={() => { setEditTarget(null); setReplyTo(null); setMessageText(editTarget ? '' : messageText); }}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input bar */}
            {canSend ? (
              <div className="flex items-end gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                {/* Emoji */}
                <div className="relative">
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <Smile className="h-5 w-5" />
                  </button>
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-14 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-3 flex flex-wrap gap-1.5 w-64 z-20">
                        {EMOJIS.map(e => (
                          <button key={e} onClick={() => { setMessageText(t => t + e); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                            className="text-xl hover:scale-125 transition-transform p-0.5">{e}</button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Attach */}
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
                <button onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <Paperclip className="h-5 w-5" />
                </button>

                {/* Text area — pill shape */}
                <div className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl flex items-end px-4 py-1 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent transition">
                  <textarea
                    ref={inputRef}
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={editTarget ? 'Edit message...' : 'Type a message'}
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none py-2 max-h-32 overflow-y-auto leading-relaxed"
                    style={{ height: Math.min(Math.max(messageText.split('\n').length, 1) * 22 + 20, 128) + 'px' }}
                  />
                </div>

                {/* Voice / Send */}
                {isRecording ? (
                  <button onMouseUp={stopRecording} onTouchEnd={stopRecording}
                    className="w-11 h-11 bg-red-500 rounded-full flex items-center justify-center text-white animate-pulse shadow-lg flex-shrink-0">
                    <MicOff className="h-5 w-5" />
                  </button>
                ) : messageText.trim() ? (
                  <button onClick={handleSend} disabled={sendMutation.isPending || editMutation.isPending}
                    className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center text-white shadow-md transition disabled:opacity-50 flex-shrink-0">
                    <Send className="h-4.5 w-4.5" />
                  </button>
                ) : (
                  <button onMouseDown={startRecording} onTouchStart={startRecording}
                    className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center text-white shadow-md transition flex-shrink-0"
                    title="Hold to record voice note">
                    <Mic className="h-5 w-5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-orange-600 dark:text-orange-400">
                Admin-only mode is on — only the group admin can send messages
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════ MODALS ══════════════ */}
      {showVideoCall && selectedConv && (
        <VideoCallModal conv={selectedConv} onClose={() => setShowVideoCall(false)}
          onSendNotification={() => {
            if (selectedId)
              sendMutation.mutate({
                messageText: `📞 Video call started — join at meet.jit.si/${encodeURIComponent('MaxHub-' + selectedConv.conversationCode)}`,
                messageType: 'Text',
              });
          }} />
      )}

      <AnimatePresence>
        {showNewChat && (
          <NewChatModal
            onClose={() => setShowNewChat(false)}
            onCreate={p => createConvMutation.mutate(p)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
