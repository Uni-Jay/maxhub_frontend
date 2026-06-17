import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Send, Paperclip, Mic, MicOff, Smile, Video,
  Phone, MoreVertical, ArrowLeft, CheckCheck, Check, Pin,
  Edit2, Trash2, Reply, X, Users, Archive,
  VideoOff, Minimize2, Maximize2, PhoneOff,
  Forward, Copy, Filter, Bell, BellOff, LogOut,
  PhoneIncoming, PhoneMissed, PhoneCall, Clock, Settings,
  FileText, MoreHorizontal,
} from 'lucide-react';
import {
  messagingService,
  type Conversation,
  type ChatMessage,
  type ChatUser,
  type CallRecord,
} from '@services/messagingService';
import { chatSocket } from '@services/chatSocket';
import { useAuthStore } from '@store/authStore';
import { cn } from '@utils/cn';

// ─── Constants ───────────────────────────────────────────────────────────────
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const FULL_EMOJIS = [
  '😀','😂','😍','🥰','😎','🤩','😜','🤔','😴','🥳','😱','🤦',
  '👍','❤️','🙏','💪','👀','🔥','✅','💯','🎉','🚀','⭐','💡',
  '😢','😮','😅','😊','😋','🤝','👏','🤣','💪','✨','🎯','📌',
];
const AVATAR_COLORS = [
  'bg-indigo-500','bg-violet-500','bg-blue-500','bg-emerald-500',
  'bg-amber-500','bg-rose-500','bg-cyan-500','bg-fuchsia-500','bg-orange-500',
];

// ─── Utility helpers ─────────────────────────────────────────────────────────
function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
function fmtTime(date?: string | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function fmtMsgTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDateSep(date: string) {
  const d = new Date(date);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ name, size = 10, src, online }: { name: string; size?: number; src?: string; online?: boolean }) {
  const color = avatarColor(name);
  const sz = `w-${size} h-${size}`;
  return (
    <div className="relative flex-shrink-0">
      {src
        ? <img src={src} className={`${sz} rounded-full object-cover`} alt={name} />
        : <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold text-xs`}>{initials(name)}</div>
      }
      {online !== undefined && (
        <span className={cn(
          'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
          online ? 'bg-emerald-500' : 'bg-gray-400'
        )} />
      )}
    </div>
  );
}

// ─── Date separator ──────────────────────────────────────────────────────────
function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-4">
      <span className="bg-white/80 dark:bg-gray-800/90 text-gray-500 dark:text-gray-400 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
        {label}
      </span>
    </div>
  );
}

// ─── Delivery ticks ──────────────────────────────────────────────────────────
function DeliveryTick({ status }: { status?: 'sent' | 'delivered' | 'read' }) {
  if (!status || status === 'sent') return <Check className="h-3 w-3 text-indigo-200" />;
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-sky-300" />;
  return <CheckCheck className="h-3 w-3 text-indigo-200" />;
}

// ─── Message bubble ──────────────────────────────────────────────────────────
function MessageBubble({
  msg, isOwn, showSender, isGroup, currentUserId,
  onReply, onReact, onEdit, onDelete, onDeleteForEveryone, onPin, onForward, onCopy,
}: {
  msg: ChatMessage; isOwn: boolean; showSender: boolean; isGroup: boolean;
  currentUserId: number;
  onReply: (m: ChatMessage) => void;
  onReact: (msgId: number, emoji: string) => void;
  onEdit: (m: ChatMessage) => void;
  onDelete: (id: number) => void;
  onDeleteForEveryone: (id: number) => void;
  onPin: (id: number) => void;
  onForward: (m: ChatMessage) => void;
  onCopy: (text: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactions = (msg.reactions || {}) as Record<string, number[]>;

  const isImage = msg.messageType === 'Image';
  const isAudio = msg.messageType === 'Voice' || msg.messageType === 'Audio' ||
    (msg.messageType === 'File' && (msg.attachmentUrl?.includes('audio') || msg.messageText?.includes('🎤')));
  const isVideo = msg.messageType === 'Video' || (msg.messageType === 'File' && msg.attachmentUrl?.includes('video'));
  const isFile = msg.messageType === 'File' && !isAudio && !isVideo;
  const isDeleted = msg.messageText === '🚫 This message was deleted';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <div className={cn('flex items-end gap-1.5 group mb-0.5', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar (group received only) */}
      {!isOwn && isGroup && showSender
        ? <Avatar name={msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'U'} size={7} src={msg.sender?.avatar} />
        : !isOwn && isGroup ? <div className="w-7 flex-shrink-0" />
        : null
      }

      <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name in group */}
        {showSender && !isOwn && isGroup && msg.sender && (
          <span className={cn('text-[11px] font-semibold mb-1 px-1', avatarColor(`${msg.sender.firstName}`).replace('bg-', 'text-'))}>
            {msg.sender.firstName} {msg.sender.lastName}
          </span>
        )}

        {/* Reply preview */}
        {msg.replyTo && !isDeleted && (
          <div className={cn('text-xs rounded-xl px-3 py-1.5 mb-0.5 border-l-4 border-indigo-400 max-w-full truncate',
            isOwn
              ? 'bg-indigo-700/60 text-indigo-100 border-indigo-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>
            <p className="font-semibold text-indigo-400 text-[10px]">{msg.replyTo.sender?.firstName}</p>
            <p className="truncate opacity-80">{msg.replyTo.messageText}</p>
          </div>
        )}

        {/* Bubble */}
        <div className={cn(
          'relative px-3 py-2 shadow-sm rounded-2xl',
          isOwn
            ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-br-sm'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-sm',
          isDeleted && 'opacity-60 italic',
        )}>
          {/* Pinned indicator */}
          {msg.isPinned && !isDeleted && (
            <div className={cn('flex items-center gap-1 text-[10px] mb-1 pb-1 border-b',
              isOwn ? 'text-indigo-200 border-indigo-500' : 'text-indigo-500 border-gray-100 dark:border-gray-700')}>
              <Pin className="h-2.5 w-2.5" /> Pinned
            </div>
          )}

          {/* Image */}
          {isImage && msg.attachmentUrl && !isDeleted && (
            <img src={msg.attachmentUrl} alt="shared"
              className="max-w-[220px] rounded-xl mb-1 cursor-pointer hover:opacity-90 transition"
              onClick={() => window.open(msg.attachmentUrl, '_blank')} />
          )}

          {/* Audio / Voice */}
          {isAudio && msg.attachmentUrl && !isDeleted && (
            <audio controls className="max-w-[220px] h-8 mb-1" src={msg.attachmentUrl} />
          )}

          {/* Video */}
          {isVideo && msg.attachmentUrl && !isDeleted && (
            <video controls className="max-w-[220px] rounded-xl mb-1" src={msg.attachmentUrl} />
          )}

          {/* File */}
          {isFile && !isDeleted && (
            <a href={msg.attachmentUrl || '#'} target="_blank" rel="noopener noreferrer"
              className={cn('flex items-center gap-2 text-sm mb-1 underline', isOwn ? 'text-indigo-100' : 'text-indigo-600')}>
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate max-w-[160px]">{msg.messageText}</span>
            </a>
          )}

          {/* Text */}
          {(!isImage || isDeleted) && (!isAudio || isDeleted) && (!isVideo || isDeleted) && (!isFile || isDeleted) && (
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.messageText}</p>
          )}
          {isImage && msg.messageText && msg.messageText !== '📷 Image' && !isDeleted && (
            <p className="text-xs mt-1 opacity-80 break-words">{msg.messageText}</p>
          )}

          {/* Time + status */}
          <div className={cn('flex items-center justify-end gap-1 mt-0.5',
            isOwn ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500')}>
            {msg.isEdited && !isDeleted && <span className="text-[10px] italic opacity-70">edited</span>}
            <span className="text-[10px]">{fmtMsgTime(msg.createdAt)}</span>
            {isOwn && <DeliveryTick status="delivered" />}
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
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                {emoji} {users.length}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action menu trigger */}
      <div ref={menuRef} className="relative flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setShowMenu(m => !m)}
          className="p-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-indigo-600 shadow-sm">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>

        {/* Quick emoji bar */}
        <div className="flex gap-0.5">
          {QUICK_EMOJIS.map(e => (
            <button key={e} onClick={() => { onReact(msg.id, e); setShowMenu(false); }}
              className="text-base hover:scale-125 transition-transform opacity-0 group-hover:opacity-100">
              {e}
            </button>
          ))}
        </div>

        {/* Context menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.1 }}
              className={cn(
                'absolute top-8 z-30 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl py-1 min-w-[160px]',
                isOwn ? 'right-0' : 'left-0',
              )}>
              {!isDeleted && (
                <>
                  <MenuBtn icon={Reply} label="Reply" onClick={() => { onReply(msg); setShowMenu(false); }} />
                  <MenuBtn icon={Forward} label="Forward" onClick={() => { onForward(msg); setShowMenu(false); }} />
                  <MenuBtn icon={Copy} label="Copy" onClick={() => { onCopy(msg.messageText); setShowMenu(false); }} />
                  <MenuBtn icon={Pin} label={msg.isPinned ? 'Unpin' : 'Pin'} onClick={() => { onPin(msg.id); setShowMenu(false); }} />
                  {isOwn && (
                    <>
                      <MenuBtn icon={Edit2} label="Edit" onClick={() => { onEdit(msg); setShowMenu(false); }} />
                      <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                      <MenuBtn icon={Trash2} label="Delete for me" danger onClick={() => { onDelete(msg.id); setShowMenu(false); }} />
                      <MenuBtn icon={Trash2} label="Delete for everyone" danger onClick={() => { onDeleteForEveryone(msg.id); setShowMenu(false); }} />
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MenuBtn({ icon: Icon, label, onClick, danger }: {
  icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={cn('flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition',
        danger ? 'text-red-500' : 'text-gray-700 dark:text-gray-300')}>
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {label}
    </button>
  );
}

// ─── Conversation item ────────────────────────────────────────────────────────
function ConversationItem({ conv, isSelected, onClick, onlineUserIds }: {
  conv: Conversation; isSelected: boolean; onClick: () => void; onlineUserIds: Set<number>;
}) {
  const isGroup = conv.conversationType === 'Group' || conv.conversationType === 'Team';
  const firstParticipantId = conv.participants?.find(p => p.userId)?.userId;
  const isOnline = firstParticipantId ? onlineUserIds.has(firstParticipantId) : false;

  const lastMsgPreview = conv.lastMessage
    ? conv.lastMessage.messageType !== 'Text'
      ? `📎 ${conv.lastMessage.messageType}`
      : conv.lastMessage.messageText
    : null;

  return (
    <button onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 dark:border-gray-800/60',
        isSelected
          ? 'bg-indigo-50 dark:bg-indigo-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
      )}>
      {isGroup ? (
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white flex-shrink-0 bg-gradient-to-br from-indigo-400 to-violet-600">
          <Users className="h-5 w-5" />
        </div>
      ) : (
        <Avatar name={conv.title} size={11} online={isOnline} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{conv.title}</span>
            {conv.isMuted && <BellOff className="h-3 w-3 text-gray-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            <span className="text-[11px] text-gray-400">{fmtTime(conv.lastMessageAt)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 pr-2">
            {lastMsgPreview || <span className="italic text-gray-400">No messages yet</span>}
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

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label = names.length === 1 ? `${names[0]} is typing...` : `${names.join(', ')} are typing...`;
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 italic">{label}</span>
    </div>
  );
}

// ─── Incoming call modal ──────────────────────────────────────────────────────
function IncomingCallModal({ callInfo, onAccept, onReject }: {
  callInfo: { callId: number; callType: 'Voice' | 'Video'; caller: ChatUser; conversationId?: number };
  onAccept: () => void;
  onReject: () => void;
}) {
  const name = `${callInfo.caller.firstName} ${callInfo.caller.lastName}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      className="fixed top-6 right-6 z-[100] bg-gray-900 rounded-3xl shadow-2xl p-5 flex flex-col items-center gap-4 border border-gray-700 w-72">
      <div className="relative">
        <Avatar name={name} size={16} src={callInfo.caller.avatar} />
        <span className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
          {callInfo.callType === 'Video' ? <Video className="h-3.5 w-3.5 text-white" /> : <Phone className="h-3.5 w-3.5 text-white" />}
        </span>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-base">{name}</p>
        <p className="text-gray-400 text-xs mt-0.5">Incoming {callInfo.callType} call...</p>
      </div>
      <div className="flex gap-4">
        <button onClick={onReject}
          className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition">
          <PhoneOff className="h-6 w-6" />
        </button>
        <button onClick={onAccept}
          className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg transition">
          {callInfo.callType === 'Video' ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Active call screen ───────────────────────────────────────────────────────
function ActiveCallScreen({ callInfo, onEnd }: {
  callInfo: {
    callId: number; callType: 'Voice' | 'Video'; remoteUser: ChatUser;
    localStream: MediaStream | null; remoteStream: MediaStream | null;
  };
  onEnd: () => void;
}) {
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (localVideoRef.current && callInfo.localStream) {
      localVideoRef.current.srcObject = callInfo.localStream;
    }
  }, [callInfo.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && callInfo.remoteStream) {
      remoteVideoRef.current.srcObject = callInfo.remoteStream;
    }
  }, [callInfo.remoteStream]);

  const toggleMute = () => {
    callInfo.localStream?.getAudioTracks().forEach(t => (t.enabled = muted));
    setMuted(m => !m);
  };

  const toggleCamera = () => {
    callInfo.localStream?.getVideoTracks().forEach(t => (t.enabled = cameraOff));
    setCameraOff(c => !c);
  };

  const name = `${callInfo.remoteUser.firstName} ${callInfo.remoteUser.lastName}`;

  if (minimized) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl p-3 flex items-center gap-3 cursor-pointer border border-gray-700"
        onClick={() => setMinimized(false)}>
        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
          {callInfo.callType === 'Video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-emerald-400">{fmtDuration(duration)}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); setMinimized(false); }}>
          <Maximize2 className="h-4 w-4 text-gray-400" />
        </button>
        <button onClick={e => { e.stopPropagation(); onEnd(); }}
          className="p-1.5 bg-red-600 rounded-lg hover:bg-red-700">
          <PhoneOff className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center">
      {/* Remote video */}
      {callInfo.callType === 'Video' && callInfo.remoteStream ? (
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover absolute inset-0" />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Avatar name={name} size={24} src={callInfo.remoteUser.avatar} />
          <p className="text-white text-2xl font-bold">{name}</p>
          <p className="text-emerald-400 text-sm">Connected · {fmtDuration(duration)}</p>
        </div>
      )}

      {/* Local video PiP */}
      {callInfo.callType === 'Video' && callInfo.localStream && (
        <video ref={localVideoRef} autoPlay playsInline muted
          className="absolute bottom-24 right-6 w-28 h-20 object-cover rounded-xl border-2 border-white/20 shadow-2xl" />
      )}

      {/* Duration overlay for video */}
      {callInfo.callType === 'Video' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1.5 rounded-full">
          {fmtDuration(duration)}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <button onClick={toggleMute}
          className={cn('w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition',
            muted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 text-white')}>
          {muted ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
        </button>

        <button onClick={onEnd}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl transition">
          <PhoneOff className="h-7 w-7" />
        </button>

        {callInfo.callType === 'Video' && (
          <button onClick={toggleCamera}
            className={cn('w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition',
              cameraOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30')}>
            {cameraOff ? <VideoOff className="h-6 w-6 text-white" /> : <Video className="h-6 w-6 text-white" />}
          </button>
        )}

        <button onClick={() => setMinimized(true)}
          className="w-14 h-14 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white shadow-xl transition">
          <Minimize2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ─── New Chat Modal ───────────────────────────────────────────────────────────
function NewChatModal({ onClose, onStartDM, onCreateGroup }: {
  onClose: () => void;
  onStartDM: (user: ChatUser) => void;
  onCreateGroup: (title: string, userIds: number[]) => void;
}) {
  const [tab, setTab] = useState<'dm' | 'group'>('dm');
  const [search, setSearch] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['chat-user-search', search],
    queryFn: () => messagingService.searchUsers(search, 20),
    staleTime: 10000,
  });

  const userList = (users as ChatUser[]) ?? [];

  const toggleUser = (u: ChatUser) => {
    setSelectedUsers(prev =>
      prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-indigo-600">
          <div className="flex gap-3">
            <button onClick={() => setTab('dm')}
              className={cn('text-sm font-semibold px-3 py-1 rounded-full transition',
                tab === 'dm' ? 'bg-white text-indigo-600' : 'text-white/80 hover:text-white')}>
              New Chat
            </button>
            <button onClick={() => setTab('group')}
              className={cn('text-sm font-semibold px-3 py-1 rounded-full transition',
                tab === 'group' ? 'bg-white text-indigo-600' : 'text-white/80 hover:text-white')}>
              New Group
            </button>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Group title */}
        {tab === 'group' && (
          <div className="px-5 pt-4">
            <input value={groupTitle} onChange={e => setGroupTitle(e.target.value)}
              placeholder="Group name..."
              className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
          </div>
        )}

        {/* Search */}
        <div className="px-5 pt-3 pb-2">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="bg-transparent text-sm flex-1 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none" />
          </div>
        </div>

        {/* Selected in group mode */}
        {tab === 'group' && selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pb-2">
            {selectedUsers.map(u => (
              <span key={u.id} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-1 rounded-full">
                {u.firstName}
                <button onClick={() => toggleUser(u)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}

        {/* User list */}
        <div className="overflow-y-auto max-h-64">
          {isLoading ? (
            <div className="flex justify-center py-8"><span className="text-gray-400 text-sm">Searching...</span></div>
          ) : userList.length === 0 ? (
            <div className="flex justify-center py-8"><span className="text-gray-400 text-sm">No users found</span></div>
          ) : (
            userList.map(u => {
              const isSelected = selectedUsers.some(x => x.id === u.id);
              return (
                <button key={u.id}
                  onClick={() => tab === 'dm' ? onStartDM(u) : toggleUser(u)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left">
                  <Avatar name={`${u.firstName} ${u.lastName}`} size={9} src={u.avatar} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  {tab === 'group' && (
                    <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-gray-600')}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Create group button */}
        {tab === 'group' && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 font-medium">Cancel</button>
            <button
              onClick={() => onCreateGroup(groupTitle, selectedUsers.map(u => u.id))}
              disabled={!groupTitle.trim() || selectedUsers.length === 0}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition">
              Create Group
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Forward modal ────────────────────────────────────────────────────────────
function ForwardModal({ msg, conversations, onForward, onClose }: {
  msg: ChatMessage;
  conversations: Conversation[];
  onForward: (targetIds: number[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">Forward Message</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 mx-5 my-3 rounded-xl text-sm text-gray-600 dark:text-gray-400 truncate">
          {msg.messageText}
        </div>
        <div className="overflow-y-auto max-h-52 px-2">
          {conversations.map(c => (
            <button key={c.id} onClick={() => toggle(c.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{c.title}</p>
                <p className="text-xs text-gray-400">{c.conversationType}</p>
              </div>
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center',
                selected.has(c.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300')}>
                {selected.has(c.id) && <Check className="h-3 w-3 text-white" />}
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
          <button onClick={() => { onForward(Array.from(selected)); onClose(); }}
            disabled={selected.size === 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2 transition">
            <Forward className="h-4 w-4" /> Forward
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Call history modal ───────────────────────────────────────────────────────
function CallHistoryModal({ onClose }: { onClose: () => void }) {
  const currentUser = useAuthStore(s => s.user);
  const currentUserId = (currentUser as any)?.id ?? 0;

  const { data: callsRaw } = useQuery({
    queryKey: ['call-history'],
    queryFn: () => messagingService.getCallHistory(30),
    staleTime: 15000,
  });
  const calls = (callsRaw as CallRecord[]) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Clock className="h-4 w-4" /> Call History</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto max-h-96 divide-y divide-gray-50 dark:divide-gray-800">
          {calls.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
              <PhoneCall className="h-8 w-8 opacity-40" />
              <p className="text-sm">No call history</p>
            </div>
          ) : (
            calls.map(call => {
              const isIncoming = call.calleeUserId === currentUserId;
              const other = isIncoming ? call.caller : call.callee;
              const otherName = other ? `${other.firstName} ${other.lastName}` : 'Unknown';
              const isMissed = call.status === 'Missed';
              const isDeclined = call.status === 'Declined';
              return (
                <div key={call.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <Avatar name={otherName} size={9} src={other?.avatar} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{otherName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isMissed || isDeclined
                        ? <PhoneMissed className="h-3 w-3 text-red-500" />
                        : isIncoming
                          ? <PhoneIncoming className="h-3 w-3 text-emerald-500" />
                          : <PhoneCall className="h-3 w-3 text-indigo-500" />
                      }
                      <span className={cn('text-xs', isMissed || isDeclined ? 'text-red-500' : 'text-gray-400')}>
                        {isMissed ? 'Missed' : isDeclined ? 'Declined' : isIncoming ? 'Incoming' : 'Outgoing'}
                        {call.durationSeconds ? ` · ${fmtDuration(call.durationSeconds)}` : ''}
                      </span>
                      <span className="text-xs text-gray-300 dark:text-gray-600">· {fmtTime(call.createdAt)}</span>
                    </div>
                  </div>
                  <div className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    call.callType === 'Video'
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                      : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400')}>
                    {call.callType}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Group info panel ─────────────────────────────────────────────────────────
function GroupInfoPanel({ conv, onClose, onAddMembers, onRemoveMember, currentUserId }: {
  conv: Conversation;
  onClose: () => void;
  onAddMembers: (ids: number[]) => void;
  onRemoveMember: (uid: number) => void;
  currentUserId: number;
}) {
  const [search, setSearch] = useState('');
  const [showAddSearch, setShowAddSearch] = useState(false);
  const { data: searchUsers } = useQuery({
    queryKey: ['group-add-search', search],
    queryFn: () => messagingService.searchUsers(search, 15),
    enabled: showAddSearch && search.length > 0,
  });
  const myRole = conv.myRole ?? 'Member';
  const isAdmin = myRole === 'Admin';

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-20 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Group Info</h2>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex flex-col items-center gap-2 py-6 border-b border-gray-100 dark:border-gray-800">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-violet-600 rounded-full flex items-center justify-center text-white">
          <Users className="h-8 w-8" />
        </div>
        <p className="font-bold text-gray-900 dark:text-white">{conv.title}</p>
        <p className="text-xs text-gray-500">{conv.participants?.length ?? 0} members</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</p>
          {isAdmin && (
            <button onClick={() => setShowAddSearch(!showAddSearch)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-500">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {showAddSearch && (
          <div className="px-3 pb-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Add member..."
              className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            {(searchUsers as ChatUser[])?.map(u => (
              <button key={u.id}
                onClick={() => { onAddMembers([u.id]); setShowAddSearch(false); setSearch(''); }}
                className="w-full flex items-center gap-2 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition">
                <Avatar name={`${u.firstName} ${u.lastName}`} size={6} />
                <span className="text-xs text-gray-700 dark:text-gray-300">{u.firstName} {u.lastName}</span>
              </button>
            ))}
          </div>
        )}

        {conv.participants?.map((p) => {
          const name = p.user ? `${p.user.firstName} ${p.user.lastName}` : `User #${p.userId}`;
          const isMe = p.userId === currentUserId;
          return (
            <div key={p.userId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <Avatar name={name} size={8} src={p.user?.avatar} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}{isMe && ' (you)'}</p>
                <p className="text-xs text-gray-400">{p.role}</p>
              </div>
              {isAdmin && !isMe && (
                <button onClick={() => onRemoveMember(p.userId)}
                  className="p-1 text-gray-400 hover:text-red-500 transition">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 p-3">
        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition">
          <LogOut className="h-4 w-4" /> Leave Group
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main MessagingPage ───────────────────────────────────────────────────────
export default function MessagingPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const currentUserId = (currentUser as any)?.id ?? 0;
  const token = useAuthStore(s => s.tokens?.accessToken);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editTarget, setEditTarget] = useState<ChatMessage | null>(null);
  const [forwardTarget, setForwardTarget] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // ── Real-time state ────────────────────────────────────────────────────────
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [typingInConv, setTypingInConv] = useState<Record<number, Set<number>>>({}); // convId → Set<userId>
  const [localMessages, setLocalMessages] = useState<Record<number, ChatMessage[]>>({});

  // ── Call state ─────────────────────────────────────────────────────────────
  const [incomingCall, setIncomingCall] = useState<{
    callId: number; callType: 'Voice' | 'Video'; caller: ChatUser; conversationId?: number; offer?: RTCSessionDescriptionInit;
  } | null>(null);
  const [activeCall, setActiveCall] = useState<{
    callId: number; callType: 'Voice' | 'Video'; remoteUser: ChatUser;
    localStream: MediaStream | null; remoteStream: MediaStream | null;
  } | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Socket.IO setup ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = chatSocket.connect(token);

    // Presence
    socket.on('user:online_list', (ids: number[]) => {
      setOnlineUserIds(new Set(ids));
    });
    socket.on('user:presence', ({ userId, isOnline }: { userId: number; isOnline: boolean }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        if (isOnline) next.add(userId); else next.delete(userId);
        return next;
      });
    });

    // New message
    socket.on('chat:message', (msg: ChatMessage) => {
      const convId = msg.conversationId;
      // Optimistically add to local messages
      setLocalMessages(prev => {
        const existing = prev[convId] ?? [];
        if (existing.find(m => m.id === msg.id)) return prev;
        return { ...prev, [convId]: [...existing, msg] };
      });
      // Invalidate conversations list for unread badge
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['messages', convId] });
    });

    // Edit
    socket.on('chat:edited', ({ messageId, messageText, editedAt }: any) => {
      setLocalMessages(prev => {
        const updated: Record<number, ChatMessage[]> = {};
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[Number(cid)] = msgs.map(m => m.id === messageId
            ? { ...m, messageText, isEdited: true, editedAt }
            : m
          );
        }
        return updated;
      });
      qc.invalidateQueries({ queryKey: ['messages'] });
    });

    // Delete
    socket.on('chat:deleted', ({ messageId, deleteForEveryone }: any) => {
      setLocalMessages(prev => {
        const updated: Record<number, ChatMessage[]> = {};
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[Number(cid)] = msgs.map(m => m.id === messageId
            ? deleteForEveryone
              ? { ...m, messageText: '🚫 This message was deleted' }
              : m
            : m
          ).filter(m => deleteForEveryone || m.id !== messageId);
        }
        return updated;
      });
      qc.invalidateQueries({ queryKey: ['messages'] });
    });

    // Reaction
    socket.on('chat:reaction', ({ messageId, reactions }: any) => {
      setLocalMessages(prev => {
        const updated: Record<number, ChatMessage[]> = {};
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[Number(cid)] = msgs.map(m => m.id === messageId ? { ...m, reactions } : m);
        }
        return updated;
      });
      qc.invalidateQueries({ queryKey: ['messages'] });
    });

    // Pin
    socket.on('chat:pinned', ({ messageId, isPinned }: any) => {
      setLocalMessages(prev => {
        const updated: Record<number, ChatMessage[]> = {};
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[Number(cid)] = msgs.map(m => m.id === messageId ? { ...m, isPinned } : m);
        }
        return updated;
      });
      qc.invalidateQueries({ queryKey: ['messages'] });
    });

    // Typing
    socket.on('chat:typing', ({ conversationId, userId }: any) => {
      setTypingInConv(prev => {
        const set = new Set(prev[conversationId] ?? []);
        set.add(userId);
        return { ...prev, [conversationId]: set };
      });
    });
    socket.on('chat:stop_typing', ({ conversationId, userId }: any) => {
      setTypingInConv(prev => {
        const set = new Set(prev[conversationId] ?? []);
        set.delete(userId);
        return { ...prev, [conversationId]: set };
      });
    });

    // Read receipt
    socket.on('chat:read_receipt', () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
    });

    // Join new conversations
    socket.on('chat:join', ({ conversationId }: { conversationId: number }) => {
      socket.emit('chat:join', { conversationId });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    });

    // ── Calls ──────────────────────────────────────────────────────────────
    socket.on('call:incoming', (data: any) => {
      setIncomingCall({
        callId: data.callId,
        callType: data.callType,
        caller: data.caller,
        conversationId: data.conversationId,
        offer: data.offer,
      });
    });

    socket.on('call:accepted', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('call:rejected', () => {
      cleanupCall();
    });

    socket.on('call:ended', () => {
      cleanupCall();
    });

    socket.on('call:ice_candidate', ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      chatSocket.disconnect();
    };
  }, [token]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: convsRaw } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingService.getConversations(),
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: messagesRaw } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => messagingService.getMessages(selectedId!, { limit: 80 }),
    enabled: !!selectedId,
    staleTime: 5000,
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const conversations: Conversation[] = useMemo(() =>
    ((convsRaw as Conversation[]) ?? []).filter(c => showArchived ? c.isArchived : !c.isArchived),
    [convsRaw, showArchived]
  );

  const allConversations: Conversation[] = (convsRaw as Conversation[]) ?? [];

  const serverMessages: ChatMessage[] = (messagesRaw as any)?.data ?? [];
  const socketMessages: ChatMessage[] = selectedId ? (localMessages[selectedId] ?? []) : [];

  // Merge server + socket messages, dedup by id
  const messages: ChatMessage[] = useMemo(() => {
    const merged = [...serverMessages];
    for (const m of socketMessages) {
      if (!merged.find(x => x.id === m.id)) merged.push(m);
    }
    return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [serverMessages, socketMessages]);

  const selectedConv = conversations.find(c => c.id === selectedId) ??
    allConversations.find(c => c.id === selectedId) ?? null;

  const isGroup = selectedConv?.conversationType === 'Group' || selectedConv?.conversationType === 'Team';

  const typingUserIds = selectedId ? Array.from(typingInConv[selectedId] ?? []) : [];
  const typingNames = typingUserIds
    .filter(uid => uid !== currentUserId)
    .map(uid => {
      const p = selectedConv?.participants?.find(p => p.userId === uid);
      return p?.user ? p.user.firstName : `User #${uid}`;
    });

  const filtered = useMemo(() =>
    conversations.filter(c => {
      if (typeFilter && c.conversationType !== typeFilter) return false;
      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [conversations, typeFilter, search]
  );

  // ── Auto scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Mark read on select ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    messagingService.markAsRead(selectedId).catch(() => {});
    if (chatSocket.isConnected) chatSocket.markRead(selectedId).catch(() => {});
  }, [selectedId, messages.length]);

  // Load messages into local state on fetch
  useEffect(() => {
    if (selectedId && serverMessages.length > 0) {
      setLocalMessages(prev => ({
        ...prev,
        [selectedId]: serverMessages,
      }));
    }
  }, [selectedId, serverMessages.length]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (p: { messageText: string; messageType?: string; replyToMessageId?: number; attachmentUrl?: string; attachmentType?: string }) =>
      messagingService.sendMessage(selectedId!, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', selectedId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => messagingService.editMessage(selectedId!, id, text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages', selectedId] }); setEditTarget(null); setMessageText(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, everyone }: { id: number; everyone?: boolean }) => messagingService.deleteMessage(selectedId!, id, everyone),
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

  const forwardMutation = useMutation({
    mutationFn: ({ msgId, targetIds }: { msgId: number; targetIds: number[] }) =>
      messagingService.forwardMessage(selectedId!, msgId, targetIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => messagingService.archiveConversation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const muteMutation = useMutation({
    mutationFn: (id: number) => messagingService.muteConversation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const addMembersMutation = useMutation({
    mutationFn: ({ convId, userIds }: { convId: number; userIds: number[] }) => messagingService.addParticipants(convId, userIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ convId, userId }: { convId: number; userId: number }) => messagingService.removeParticipant(convId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const createConvMutation = useMutation({
    mutationFn: (p: { title: string; conversationType: string; participantUserIds: number[] }) => messagingService.createConversation(p),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setShowNewChat(false);
      setSelectedId(data?.id ?? null);
      setMobileShowChat(true);
    },
  });

  const findOrCreateDMMutation = useMutation({
    mutationFn: (userId: number) => messagingService.findOrCreateDM(userId),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setShowNewChat(false);
      setSelectedId(data?.id ?? null);
      setMobileShowChat(true);
    },
  });

  // ── Message sending ────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = messageText.trim();
    if (!text || !selectedId) return;

    if (editTarget) {
      editMutation.mutate({ id: editTarget.id, text });
    } else {
      const payload = { messageText: text, replyToMessageId: replyTo?.id };
      if (chatSocket.isConnected) {
        chatSocket.sendMessage({ conversationId: selectedId, ...payload });
      } else {
        sendMutation.mutate(payload);
      }
      setReplyTo(null);
    }
    setMessageText('');
    setShowEmojiPicker(false);
    chatSocket.typingStop(selectedId);
    clearTimeout(typingTimeoutRef.current);
  }, [messageText, selectedId, editTarget, replyTo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    if (selectedId) {
      chatSocket.typingStart(selectedId);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => chatSocket.typingStop(selectedId!), 2000);
    }
  };

  const getAuthToken = (): string => {
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) { const parsed = JSON.parse(stored); return parsed?.state?.tokens?.accessToken || ''; }
    } catch { /* */ }
    return '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    e.target.value = '';
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      const { url, type, name } = json.data;
      const msgType = type === 'Image' ? 'Image' : type === 'Video' ? 'Video' : 'File';
      const msgText = type === 'Image' ? '📷 Image' : type === 'Video' ? '🎬 Video' : `📎 ${name}`;
      sendMutation.mutate({ messageText: msgText, messageType: msgType, attachmentUrl: url, attachmentType: file.type });
    } catch {
      alert('File upload failed. Please try again.');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const voiceFile = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        try {
          const token = getAuthToken();
          const formData = new FormData();
          formData.append('file', voiceFile);
          const res = await fetch('/api/messages/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (!res.ok) throw new Error('Upload failed');
          const json = await res.json();
          sendMutation.mutate({ messageText: '🎤 Voice note', messageType: 'Voice', attachmentUrl: json.data.url, attachmentType: 'audio/webm' });
        } catch {
          alert('Voice note upload failed.');
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch { alert('Microphone access denied'); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  // ── Reactions & actions ───────────────────────────────────────────────────
  const handleReact = (msgId: number, emoji: string) => {
    if (chatSocket.isConnected) {
      chatSocket.reactToMessage(msgId, emoji).catch(() => reactMutation.mutate({ msgId, emoji }));
    } else {
      reactMutation.mutate({ msgId, emoji });
    }
  };

  const handlePin = (msgId: number) => {
    if (chatSocket.isConnected) {
      chatSocket.pinMessage(msgId).catch(() => pinMutation.mutate(msgId));
    } else {
      pinMutation.mutate(msgId);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this message for you?')) deleteMutation.mutate({ id, everyone: false });
  };

  const handleDeleteForEveryone = (id: number) => {
    if (confirm('Delete this message for everyone?')) deleteMutation.mutate({ id, everyone: true });
  };

  const handleEditClick = (msg: ChatMessage) => {
    setEditTarget(msg);
    setMessageText(msg.messageText);
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const selectConv = (id: number) => {
    setSelectedId(id);
    setMobileShowChat(true);
    setShowGroupInfo(false);
    chatSocket.joinConversation(id);
  };

  // ── WebRTC Call helpers ───────────────────────────────────────────────────
  const createPeerConnection = (callId: number, targetUserId: number, _callType: 'Voice' | 'Video') => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnection.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) chatSocket.sendIceCandidate(targetUserId, callId, candidate.toJSON());
    };

    pc.ontrack = ({ streams }) => {
      const remote = streams[0];
      setActiveCall(prev => prev ? { ...prev, remoteStream: remote } : null);
    };

    return pc;
  };

  const cleanupCall = () => {
    peerConnection.current?.close();
    peerConnection.current = null;
    activeCall?.localStream?.getTracks().forEach(t => t.stop());
    setActiveCall(null);
    setIncomingCall(null);
  };

  const startCall = async (calleeId: number, callType: 'Voice' | 'Video') => {
    try {
      const constraints = { audio: true, video: callType === 'Video' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const pc = createPeerConnection(0, calleeId, callType);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const { callId } = await chatSocket.initiateCall({
        calleeUserId: calleeId,
        callType,
        conversationId: selectedId ?? undefined,
        offer,
      });

      peerConnection.current = pc;

      const callee = selectedConv?.participants?.find(p => p.userId === calleeId);
      const calleeUser: ChatUser = callee?.user
        ? { id: calleeId, firstName: callee.user.firstName, lastName: callee.user.lastName, avatar: callee.user.avatar, email: '' }
        : { id: calleeId, firstName: 'User', lastName: `#${calleeId}`, email: '' };

      setActiveCall({ callId, callType, remoteUser: calleeUser, localStream: stream, remoteStream: null });

      // Update ICE candidates after callId is known
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) chatSocket.sendIceCandidate(calleeId, callId, candidate.toJSON());
      };
    } catch (err: any) {
      alert(`Call failed: ${err.message}`);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      const constraints = { audio: true, video: incomingCall.callType === 'Video' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const pc = createPeerConnection(incomingCall.callId, incomingCall.caller.id, incomingCall.callType);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      if (incomingCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await chatSocket.answerCall(incomingCall.callId, answer);
      }

      setActiveCall({
        callId: incomingCall.callId,
        callType: incomingCall.callType,
        remoteUser: incomingCall.caller,
        localStream: stream,
        remoteStream: null,
      });
      setIncomingCall(null);
    } catch (err: any) {
      alert(`Could not accept call: ${err.message}`);
    }
  };

  const endActiveCall = async () => {
    if (activeCall) {
      await chatSocket.endCall(activeCall.callId).catch(() => {});
    }
    cleanupCall();
  };

  // ── Date separator builder ────────────────────────────────────────────────
  function buildMessageList() {
    const result: (ChatMessage | { type: 'date'; label: string; key: string })[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const d = new Date(msg.createdAt).toDateString();
      if (d !== lastDate) {
        result.push({ type: 'date', label: fmtDateSep(msg.createdAt), key: `date-${d}` });
        lastDate = d;
      }
      result.push(msg);
    }
    return result;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">

      {/* ═══════════════ LEFT SIDEBAR ═══════════════ */}
      <div className={cn(
        'flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
        'w-full md:w-[340px] md:flex-shrink-0',
        mobileShowChat ? 'hidden md:flex' : 'flex',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 dark:bg-gray-800 border-b border-indigo-700 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-black text-sm">M</span>
            </div>
            <span className="text-white font-bold text-base">Messages</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setShowCallHistory(true)}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition" title="Call history">
              <PhoneCall className="h-4.5 w-4.5" />
            </button>
            <button onClick={() => setShowArchived(!showArchived)}
              className={cn('p-2 rounded-full transition', showArchived ? 'text-amber-300 hover:bg-white/10' : 'text-white/80 hover:text-white hover:bg-white/10')}
              title={showArchived ? 'Show active' : 'Show archived'}>
              <Archive className="h-4.5 w-4.5" />
            </button>
            <button onClick={() => setShowNewChat(true)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition" title="New chat">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 border border-gray-200 dark:border-gray-700">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="bg-transparent text-sm flex-1 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none" />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5 text-gray-400" /></button>}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto">
          {['All', 'Direct', 'Group', 'Team'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t === 'All' ? '' : t)}
              className={cn('flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                (t === 'All' ? !typeFilter : typeFilter === t)
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
              {t}
            </button>
          ))}
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600 gap-3">
              <Filter className="h-8 w-8 opacity-50" />
              <p className="text-sm font-medium">{showArchived ? 'No archived chats' : 'No conversations'}</p>
              {!showArchived && (
                <button onClick={() => setShowNewChat(true)} className="text-indigo-500 text-xs hover:underline">Start one</button>
              )}
            </div>
          ) : (
            filtered.map(conv => (
              <ConversationItem
                key={conv.id} conv={conv}
                isSelected={conv.id === selectedId}
                onClick={() => selectConv(conv.id)}
                onlineUserIds={onlineUserIds}
              />
            ))
          )}
        </div>
      </div>

      {/* ═══════════════ MAIN CHAT AREA ═══════════════ */}
      <div className={cn('flex-1 flex flex-col overflow-hidden relative',
        !mobileShowChat ? 'hidden md:flex' : 'flex')}>

        {!selectedConv ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#111b21]">
            <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-5">
              <svg className="w-12 h-12 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">MaxHub Messages</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-6">
              Select a conversation or start a new one.
            </p>
            <button onClick={() => setShowNewChat(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow transition">
              <Plus className="h-4 w-4" /> New Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button onClick={() => setMobileShowChat(false)} className="md:hidden p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <ArrowLeft className="h-5 w-5" />
              </button>

              {isGroup ? (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 bg-gradient-to-br from-indigo-400 to-violet-600">
                  <Users className="h-4 w-4" />
                </div>
              ) : (
                <Avatar name={selectedConv.title} size={10}
                  online={selectedConv.participants?.some(p => p.userId !== currentUserId && onlineUserIds.has(p.userId))} />
              )}

              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => isGroup && setShowGroupInfo(g => !g)}>
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{selectedConv.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isGroup
                    ? `${selectedConv.participants?.length ?? 0} members`
                    : selectedConv.participants?.some(p => p.userId !== currentUserId && onlineUserIds.has(p.userId))
                      ? <span className="text-emerald-500">Online</span>
                      : 'Offline'
                  }
                </p>
              </div>

              <div className="flex items-center gap-0.5">
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition" title="Search messages">
                  <Search className="h-4 w-4" />
                </button>
                {/* Voice call */}
                {!isGroup && selectedConv.conversationType === 'Direct' && (
                  <button
                    onClick={() => {
                      const other = selectedConv.participants?.find(p => p.userId !== currentUserId);
                      if (other) startCall(other.userId, 'Voice');
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition" title="Voice call">
                    <Phone className="h-4 w-4" />
                  </button>
                )}
                {/* Video call */}
                {!isGroup && selectedConv.conversationType === 'Direct' && (
                  <button
                    onClick={() => {
                      const other = selectedConv.participants?.find(p => p.userId !== currentUserId);
                      if (other) startCall(other.userId, 'Video');
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition" title="Video call">
                    <Video className="h-4 w-4" />
                  </button>
                )}
                {/* Mute */}
                <button onClick={() => muteMutation.mutate(selectedConv.id)}
                  className={cn('p-2 rounded-full transition', selectedConv.isMuted
                    ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700')}
                  title={selectedConv.isMuted ? 'Unmute' : 'Mute'}>
                  {selectedConv.isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </button>
                {/* More */}
                <div className="relative group/more">
                  <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 top-9 z-20 hidden group-hover/more:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl py-1 min-w-[160px]">
                    {isGroup && (
                      <button onClick={() => setShowGroupInfo(g => !g)}
                        className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Settings className="h-3.5 w-3.5" /> Group Info
                      </button>
                    )}
                    <button onClick={() => archiveMutation.mutate(selectedConv.id)}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Archive className="h-3.5 w-3.5" /> {selectedConv.isArchived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button onClick={() => setShowCallHistory(true)}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Clock className="h-3.5 w-3.5" /> Call History
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-100 dark:bg-[#111b21]"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 gap-3">
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                    <svg className="w-8 h-8 text-indigo-300" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                buildMessageList().map(item => {
                  if ('type' in item) return <DateSep key={item.key} label={item.label} />;
                  const msg = item as ChatMessage;
                  const isOwn = msg.senderUserId === currentUserId;
                  const idx = messages.findIndex(m => m.id === msg.id);
                  const prev = idx > 0 ? messages[idx - 1] : null;
                  const showSender = !isOwn && (!prev || prev.senderUserId !== msg.senderUserId);
                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg} isOwn={isOwn}
                      showSender={showSender}
                      isGroup={isGroup}
                      currentUserId={currentUserId}
                      onReply={setReplyTo}
                      onReact={handleReact}
                      onEdit={handleEditClick}
                      onDelete={handleDelete}
                      onDeleteForEveryone={handleDeleteForEveryone}
                      onPin={handlePin}
                      onForward={setForwardTarget}
                      onCopy={handleCopy}
                    />
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {typingNames.length > 0 && (
              <div className="bg-slate-100 dark:bg-[#111b21] pb-1">
                <TypingIndicator names={typingNames} />
              </div>
            )}

            {/* Reply / Edit bar */}
            <AnimatePresence>
              {(replyTo || editTarget) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-800 border-t border-indigo-100 dark:border-indigo-900/40 border-l-4 border-l-indigo-500">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {editTarget ? '✏️ Editing' : `↩ Replying to ${replyTo?.sender?.firstName || 'message'}`}
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
            <div className="flex items-end gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              {/* Emoji picker */}
              <div className="relative">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <Smile className="h-5 w-5" />
                </button>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-14 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-3 flex flex-wrap gap-1.5 w-64 z-20">
                      {FULL_EMOJIS.map(e => (
                        <button key={e} onClick={() => { setMessageText(t => t + e); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                          className="text-xl hover:scale-125 transition-transform p-0.5">{e}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Attach file */}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" />
              <button onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <Paperclip className="h-5 w-5" />
              </button>

              {/* Message textarea */}
              <div className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl flex items-end px-4 py-1 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent transition">
                <textarea
                  ref={inputRef}
                  value={messageText}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder={editTarget ? 'Edit message...' : 'Type a message'}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none py-2 max-h-32 overflow-y-auto leading-relaxed"
                  style={{ height: Math.min(Math.max(messageText.split('\n').length, 1) * 22 + 20, 128) + 'px' }}
                />
              </div>

              {/* Voice / Send button */}
              {isRecording ? (
                <button onMouseUp={stopRecording} onTouchEnd={stopRecording}
                  className="w-11 h-11 bg-red-500 rounded-full flex items-center justify-center text-white animate-pulse shadow-lg flex-shrink-0">
                  <MicOff className="h-5 w-5" />
                </button>
              ) : messageText.trim() ? (
                <button onClick={handleSend}
                  disabled={sendMutation.isPending || editMutation.isPending}
                  className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center text-white shadow-md transition disabled:opacity-50 flex-shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              ) : (
                <button onMouseDown={startRecording} onTouchStart={startRecording}
                  className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center text-white shadow-md transition flex-shrink-0"
                  title="Hold to record voice note">
                  <Mic className="h-5 w-5" />
                </button>
              )}
            </div>
          </>
        )}

        {/* Group info side panel */}
        {selectedConv && isGroup && (
          <AnimatePresence>
            {showGroupInfo && (
              <GroupInfoPanel
                conv={selectedConv}
                currentUserId={currentUserId}
                onClose={() => setShowGroupInfo(false)}
                onAddMembers={(ids) => addMembersMutation.mutate({ convId: selectedConv.id, userIds: ids })}
                onRemoveMember={(uid) => removeMemberMutation.mutate({ convId: selectedConv.id, userId: uid })}
              />
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Incoming call */}
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallModal
            callInfo={incomingCall}
            onAccept={acceptCall}
            onReject={async () => {
              await chatSocket.rejectCall(incomingCall.callId).catch(() => {});
              setIncomingCall(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Active call */}
      {activeCall && (
        <ActiveCallScreen
          callInfo={activeCall}
          onEnd={endActiveCall}
        />
      )}

      {/* New chat modal */}
      <AnimatePresence>
        {showNewChat && (
          <NewChatModal
            onClose={() => setShowNewChat(false)}
            onStartDM={(user) => findOrCreateDMMutation.mutate(user.id)}
            onCreateGroup={(title, userIds) => createConvMutation.mutate({ title, conversationType: 'Group', participantUserIds: userIds })}
          />
        )}
      </AnimatePresence>

      {/* Forward modal */}
      <AnimatePresence>
        {forwardTarget && (
          <ForwardModal
            msg={forwardTarget}
            conversations={allConversations}
            onForward={(targetIds) => forwardMutation.mutate({ msgId: forwardTarget.id, targetIds })}
            onClose={() => setForwardTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Call history modal */}
      <AnimatePresence>
        {showCallHistory && <CallHistoryModal onClose={() => setShowCallHistory(false)} />}
      </AnimatePresence>
    </div>
  );
}
