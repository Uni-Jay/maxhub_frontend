import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Send, Paperclip, Mic, Smile,
  MoreVertical, ArrowLeft, CheckCheck, Check, Pin,
  Edit2, Trash2, Reply, X, Users, Archive,
  Forward, Copy, Filter, Bell, BellOff, LogOut,
  Settings, Clock, Star, Pause, Play,
  FileText, MoreHorizontal, Info, ZoomIn, ZoomOut, RotateCw, Share2, Download,
} from 'lucide-react';
import {
  messagingService,
  type Conversation,
  type ChatMessage,
  type ChatUser,
} from '@services/messagingService';
import { chatSocket } from '@services/chatSocket';
import { useAuthStore } from '@store/authStore';
import { uploadToCloudinaryWithProgress, withForcedDownload } from '@services/cloudinaryService';
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
// Previously always rendered "delivered" regardless of anything — the
// MessageRead/lastSeenAt data needed to tell sent/delivered/seen apart
// existed on the backend but nothing on the frontend ever read it.
function DeliveryTick({ status }: { status?: 'sending' | 'sent' | 'delivered' | 'seen' }) {
  if (status === 'sending') return <Clock className="h-3 w-3 text-indigo-300 animate-pulse" />;
  if (status === 'seen') return <CheckCheck className="h-3 w-3 text-sky-300" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-indigo-200" />;
  return <Check className="h-3 w-3 text-indigo-200" />;
}

/** Direct-conversation-only for now — group read receipts (seen by N of M)
 * are a meaningfully different UI and out of scope here. */
function computeDeliveryStatus(
  msg: ChatMessage, conv: Conversation | null, onlineUserIds: Set<number>, currentUserId: number
): 'sending' | 'sent' | 'delivered' | 'seen' {
  if (msg.status === 'sending') return 'sending';
  if (!conv || conv.conversationType !== 'Direct') return 'sent';
  const other = conv.participants?.find(p => String(p.userId) !== String(currentUserId));
  if (!other) return 'sent';
  if (other.lastSeenAt && new Date(other.lastSeenAt).getTime() >= new Date(msg.createdAt).getTime()) return 'seen';
  if (onlineUserIds.has(Number(other.userId))) return 'delivered';
  return 'sent';
}

// ─── Message bubble ──────────────────────────────────────────────────────────
function MessageBubble({
  msg, isOwn, showSender, isGroup, currentUserId, deliveryStatus, uploadPct,
  onReply, onReact, onEdit, onDelete, onDeleteForEveryone, onPin, onStar, onForward, onCopy, onCancelUpload, onOpenViewer,
}: {
  msg: ChatMessage; isOwn: boolean; showSender: boolean; isGroup: boolean;
  currentUserId: number;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'seen';
  uploadPct?: number;
  onReply: (m: ChatMessage) => void;
  onReact: (msgId: number, emoji: string) => void;
  onEdit: (m: ChatMessage) => void;
  onDelete: (id: number) => void;
  onDeleteForEveryone: (id: number) => void;
  onPin: (id: number) => void;
  onStar: (id: number) => void;
  onForward: (m: ChatMessage) => void;
  onCopy: (text: string) => void;
  onCancelUpload?: (tempId: string) => void;
  onOpenViewer: (msg: ChatMessage) => void;
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
  const isStarred = (msg.starredByUserIds || []).includes(currentUserId);

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
              onClick={() => onOpenViewer(msg)} />
          )}

          {/* Audio / Voice */}
          {isAudio && msg.attachmentUrl && !isDeleted && (
            <VoiceNotePlayer url={msg.attachmentUrl} duration={msg.attachmentDuration} isOwn={isOwn} />
          )}

          {/* Video */}
          {isVideo && msg.attachmentUrl && !isDeleted && (
            <div className="relative group/video">
              <video controls className="max-w-[220px] rounded-xl mb-1" src={msg.attachmentUrl} />
              <button onClick={() => onOpenViewer(msg)} title="Details"
                className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover/video:opacity-100 transition">
                <Info className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* File */}
          {isFile && !isDeleted && (
            <a href={msg.attachmentUrl ? withForcedDownload(msg.attachmentUrl) : '#'} download target="_blank" rel="noopener noreferrer"
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

          {/* Upload progress (attachment mid-send) */}
          {deliveryStatus === 'sending' && typeof uploadPct === 'number' && uploadPct < 100 && (
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-current opacity-60 transition-all" style={{ width: `${uploadPct}%` }} />
              </div>
              <span className="text-[10px] opacity-70 flex-shrink-0">{uploadPct}%</span>
              {onCancelUpload && msg.tempId && (
                <button onClick={() => onCancelUpload(msg.tempId!)} className="flex-shrink-0 opacity-70 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Time + status */}
          <div className={cn('flex items-center justify-end gap-1 mt-0.5',
            isOwn ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500')}>
            {isStarred && <Star className="h-2.5 w-2.5 fill-current" />}
            {msg.isEdited && !isDeleted && <span className="text-[10px] italic opacity-70">edited</span>}
            <span className="text-[10px]">{fmtMsgTime(msg.createdAt)}</span>
            {isOwn && <DeliveryTick status={deliveryStatus} />}
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
                  <MenuBtn icon={Star} label={isStarred ? 'Unstar' : 'Star'} onClick={() => { onStar(msg.id); setShowMenu(false); }} />
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

const PLAYBACK_RATES = [1, 1.5, 2];

/** Native <audio controls> has no playback-speed control at all, and no
 * built-in way to show duration before the browser's own UI loads it — so
 * this wraps it with a speed-cycle button and a duration readout. */
function VoiceNotePlayer({ url, duration, isOwn }: { url: string; duration?: number; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [rateIdx, setRateIdx] = useState(0);

  const cycleRate = () => {
    const next = (rateIdx + 1) % PLAYBACK_RATES.length;
    setRateIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = PLAYBACK_RATES[next];
  };

  return (
    <div className="flex items-center gap-2 mb-1">
      <audio ref={audioRef} controls className="max-w-[200px] h-8" src={url} />
      <button onClick={cycleRate} title="Playback speed"
        className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0',
          isOwn ? 'border-indigo-300 text-indigo-100' : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400')}>
        {PLAYBACK_RATES[rateIdx]}x
      </button>
      {typeof duration === 'number' && (
        <span className={cn('text-[10px] flex-shrink-0', isOwn ? 'text-indigo-200' : 'text-gray-400')}>
          {String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}
        </span>
      )}
    </div>
  );
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Full-screen media viewer ────────────────────────────────────────────────
// Images get zoom + rotate; video relies on its own native player (which
// already has play/pause/seek/fullscreen) and just shares the info/
// download/share/delete chrome around it.
function MediaViewer({ msg, onClose, onDeleteForEveryone }: {
  msg: ChatMessage; onClose: () => void; onDeleteForEveryone: (id: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const isImage = msg.messageType === 'Image';
  const isVideo = msg.messageType === 'Video';

  const handleShare = async () => {
    if (!msg.attachmentUrl) return;
    if (navigator.share) {
      try { await navigator.share({ url: msg.attachmentUrl, title: msg.attachmentName || 'Shared file' }); }
      catch { /* user cancelled — not an error */ }
    } else {
      await navigator.clipboard.writeText(msg.attachmentUrl);
      alert('Link copied to clipboard');
    }
  };

  const handleDownload = () => {
    if (!msg.attachmentUrl) return;
    const a = document.createElement('a');
    a.href = withForcedDownload(msg.attachmentUrl);
    a.download = msg.attachmentName || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col" onClick={onClose}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"><X className="h-5 w-5" /></button>
        <div className="flex items-center gap-1">
          {isImage && (
            <>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"><ZoomOut className="h-5 w-5" /></button>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"><ZoomIn className="h-5 w-5" /></button>
              <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"><RotateCw className="h-5 w-5" /></button>
            </>
          )}
          <button onClick={handleShare} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"><Share2 className="h-5 w-5" /></button>
          <button onClick={handleDownload} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"><Download className="h-5 w-5" /></button>
          <button onClick={() => setShowInfo(s => !s)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"><Info className="h-5 w-5" /></button>
          <button onClick={() => { onDeleteForEveryone(msg.id); onClose(); }} className="p-2 text-white/80 hover:text-red-400 hover:bg-white/10 rounded-full transition"><Trash2 className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4" onClick={e => e.stopPropagation()}>
        {isImage && msg.attachmentUrl && (
          <img src={msg.attachmentUrl} alt={msg.attachmentName || 'shared'}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }} />
        )}
        {isVideo && msg.attachmentUrl && (
          <video src={msg.attachmentUrl} controls autoPlay className="max-w-full max-h-full" />
        )}
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="bg-black/70 text-white px-5 py-4 flex-shrink-0 text-sm space-y-1" onClick={e => e.stopPropagation()}>
          {msg.attachmentName && <p><span className="text-white/50">Name:</span> {msg.attachmentName}</p>}
          {typeof msg.attachmentSize === 'number' && msg.attachmentSize > 0 && <p><span className="text-white/50">Size:</span> {formatBytes(msg.attachmentSize)}</p>}
          <p><span className="text-white/50">Sent by:</span> {msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Unknown'}</p>
          <p><span className="text-white/50">Date:</span> {new Date(msg.createdAt).toLocaleString()}</p>
        </div>
      )}
    </div>,
    document.body
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

// ─── Group info panel ─────────────────────────────────────────────────────────
function GroupInfoPanel({ conv, onClose, onAddMembers, onRemoveMember, onRename, currentUserId }: {
  conv: Conversation;
  onClose: () => void;
  onAddMembers: (ids: number[]) => void;
  onRemoveMember: (uid: number) => void;
  onRename: (title: string) => void;
  currentUserId: number;
}) {
  const [search, setSearch] = useState('');
  const [showAddSearch, setShowAddSearch] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(conv.title);
  const { data: searchUsers } = useQuery({
    queryKey: ['group-add-search', search],
    queryFn: () => messagingService.searchUsers(search, 15),
    enabled: showAddSearch && search.length > 0,
  });
  const myRole = conv.myRole ?? 'Member';
  const isAdmin = myRole === 'Admin';

  const saveRename = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== conv.title) onRename(trimmed);
    setEditingName(false);
  };

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
        {editingName ? (
          <div className="flex items-center gap-1.5 px-4 w-full">
            <input
              value={nameDraft} onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditingName(false); }}
              autoFocus
              className="flex-1 text-sm text-center border border-indigo-300 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
            />
            <button onClick={saveRename} className="text-indigo-600 hover:text-indigo-700"><Check className="h-4 w-4" /></button>
            <button onClick={() => setEditingName(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (!isAdmin) return;
              setNameDraft(conv.title);
              setEditingName(true);
            }}
            className={cn('flex items-center gap-1.5 font-bold text-gray-900 dark:text-white', isAdmin && 'hover:text-indigo-600 cursor-pointer')}>
            {conv.title}
            {isAdmin && <Edit2 className="h-3 w-3 opacity-50" />}
          </button>
        )}
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
          const isMe = String(p.userId) === String(currentUserId);
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
  // 'idle' → 'recording' → ('paused' ⇄ 'recording') → 'preview' (stopped,
  // listen-before-sending) → back to 'idle' on send/discard.
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'preview'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [viewerTarget, setViewerTarget] = useState<ChatMessage | null>(null);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');

  // ── Real-time state ────────────────────────────────────────────────────────
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [typingInConv, setTypingInConv] = useState<Record<number, Set<number>>>({}); // convId → Set<userId>
  const [localMessages, setLocalMessages] = useState<Record<number, ChatMessage[]>>({});
  // Messages still in flight (text send, or an attachment mid-upload) — kept
  // separate from localMessages so a "Sending..." bubble can show
  // immediately instead of only appearing once the server round-trip
  // finishes. Keyed by tempId; removed once the real message is confirmed.
  const [pendingMessages, setPendingMessages] = useState<Record<number, ChatMessage[]>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({}); // tempId → 0-100

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval>>();
  const recordingCancelledRef = useRef(false);
  const uploadCancelRef = useRef<Record<string, () => void>>({}); // tempId → abort fn, for in-progress attachment uploads
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Discard an in-progress recording if the page unmounts mid-recording
  // (navigating away) — otherwise the interval keeps ticking and the mic
  // stream stays open with nothing left to stop it from the UI.
  useEffect(() => {
    return () => {
      clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current?.state === 'recording' || mediaRecorderRef.current?.state === 'paused') {
        recordingCancelledRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // ── Socket.IO setup ────────────────────────────────────────────────────────
  // The socket itself is now a session-lifetime connection owned by
  // DashboardLayout (so notifications keep arriving while chat isn't open),
  // not something this page connects/disconnects. connect() here is
  // idempotent — it just returns the already-open socket. What this effect
  // actually owns is these specific listeners, so cleanup removes exactly
  // those (via named handlers) instead of tearing down the whole socket,
  // which would have killed it for the rest of the app too and, before this
  // fix, would have stacked duplicate handlers on every remount once
  // disconnect() was removed.
  useEffect(() => {
    if (!token) return;
    const socket = chatSocket.connect(token);

    const onOnlineList = (ids: number[]) => setOnlineUserIds(new Set(ids));
    const onPresence = ({ userId, isOnline }: { userId: number; isOnline: boolean }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        if (isOnline) next.add(userId); else next.delete(userId);
        return next;
      });
    };

    const onMessage = (msg: ChatMessage) => {
      const convId = msg.conversationId;
      setLocalMessages(prev => {
        const existing = prev[convId] ?? [];
        if (existing.find(m => m.id === msg.id)) return prev;
        return { ...prev, [convId]: [...existing, msg] };
      });
      // The sender's own socket is in the room too, so this same broadcast
      // is how their own "Sending..." optimistic bubble gets confirmed —
      // tempId is echoed straight back from what they sent.
      if (msg.tempId) {
        setPendingMessages(prev => ({ ...prev, [convId]: (prev[convId] ?? []).filter(m => m.tempId !== msg.tempId) }));
      }
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['messages', convId] });
    };

    const onEdited = ({ messageId, messageText, editedAt }: any) => {
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
    };

    const onDeleted = ({ messageId, deleteForEveryone }: any) => {
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
    };

    const onReaction = ({ messageId, reactions }: any) => {
      setLocalMessages(prev => {
        const updated: Record<number, ChatMessage[]> = {};
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[Number(cid)] = msgs.map(m => m.id === messageId ? { ...m, reactions } : m);
        }
        return updated;
      });
      qc.invalidateQueries({ queryKey: ['messages'] });
    };

    const onPinned = ({ messageId, isPinned }: any) => {
      setLocalMessages(prev => {
        const updated: Record<number, ChatMessage[]> = {};
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[Number(cid)] = msgs.map(m => m.id === messageId ? { ...m, isPinned } : m);
        }
        return updated;
      });
      qc.invalidateQueries({ queryKey: ['messages'] });
    };

    const onGroupUpdated = () => qc.invalidateQueries({ queryKey: ['conversations'] });

    const onTyping = ({ conversationId, userId }: any) => {
      setTypingInConv(prev => {
        const set = new Set(prev[conversationId] ?? []);
        set.add(userId);
        return { ...prev, [conversationId]: set };
      });
    };
    const onStopTyping = ({ conversationId, userId }: any) => {
      setTypingInConv(prev => {
        const set = new Set(prev[conversationId] ?? []);
        set.delete(userId);
        return { ...prev, [conversationId]: set };
      });
    };

    const onReadReceipt = () => qc.invalidateQueries({ queryKey: ['conversations'] });

    const onJoin = ({ conversationId }: { conversationId: number }) => {
      socket.emit('chat:join', { conversationId });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on('user:online_list', onOnlineList);
    socket.on('user:presence', onPresence);
    socket.on('chat:message', onMessage);
    socket.on('chat:edited', onEdited);
    socket.on('chat:deleted', onDeleted);
    socket.on('chat:reaction', onReaction);
    socket.on('chat:pinned', onPinned);
    socket.on('chat:group_updated', onGroupUpdated);
    socket.on('chat:typing', onTyping);
    socket.on('chat:stop_typing', onStopTyping);
    socket.on('chat:read_receipt', onReadReceipt);
    socket.on('chat:join', onJoin);

    return () => {
      socket.off('user:online_list', onOnlineList);
      socket.off('user:presence', onPresence);
      socket.off('chat:message', onMessage);
      socket.off('chat:edited', onEdited);
      socket.off('chat:deleted', onDeleted);
      socket.off('chat:reaction', onReaction);
      socket.off('chat:pinned', onPinned);
      socket.off('chat:group_updated', onGroupUpdated);
      socket.off('chat:typing', onTyping);
      socket.off('chat:stop_typing', onStopTyping);
      socket.off('chat:read_receipt', onReadReceipt);
      socket.off('chat:join', onJoin);
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
  const pendingForConv: ChatMessage[] = selectedId ? (pendingMessages[selectedId] ?? []) : [];

  // Merge server + socket + pending (in-flight) messages, dedup by id
  const messages: ChatMessage[] = useMemo(() => {
    const merged = [...serverMessages];
    for (const m of socketMessages) {
      if (!merged.find(x => x.id === m.id)) merged.push(m);
    }
    for (const m of pendingForConv) {
      if (!merged.find(x => x.tempId === m.tempId)) merged.push(m);
    }
    return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [serverMessages, socketMessages, pendingForConv]);

  // Optimistic "Sending..." bubble — added the instant the user hits send
  // (or starts an attachment upload), removed once the real message is
  // confirmed (matched by tempId, since the real DB id isn't known yet).
  const addPendingMessage = useCallback((convId: number, payload: Partial<ChatMessage>): string => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: ChatMessage = {
      id: -Date.now(),
      uuid: tempId,
      conversationId: convId,
      senderUserId: currentUserId,
      messageText: '',
      messageType: 'Text',
      isEdited: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: currentUser ? { id: currentUserId, firstName: (currentUser as any).firstName, lastName: (currentUser as any).lastName, avatar: (currentUser as any).avatar } : undefined,
      ...payload,
      tempId,
      status: 'sending',
    };
    setPendingMessages(prev => ({ ...prev, [convId]: [...(prev[convId] ?? []), optimistic] }));
    return tempId;
  }, [currentUserId, currentUser]);

  const removePendingMessage = useCallback((convId: number, tempId: string) => {
    setPendingMessages(prev => ({ ...prev, [convId]: (prev[convId] ?? []).filter(m => m.tempId !== tempId) }));
    setUploadProgress(prev => { const next = { ...prev }; delete next[tempId]; return next; });
  }, []);

  const selectedConv = conversations.find(c => c.id === selectedId) ??
    allConversations.find(c => c.id === selectedId) ?? null;

  const isGroup = selectedConv?.conversationType === 'Group' || selectedConv?.conversationType === 'Team';

  const typingUserIds = selectedId ? Array.from(typingInConv[selectedId] ?? []) : [];
  const typingNames = typingUserIds
    .filter(uid => String(uid) !== String(currentUserId))
    .map(uid => {
      const p = selectedConv?.participants?.find(p => String(p.userId) === String(uid));
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

  // ── Message search (across all my conversations) ───────────────────────────
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(messageSearchQuery), 350);
    return () => clearTimeout(t);
  }, [messageSearchQuery]);

  const { data: messageSearchResults, isFetching: isSearchingMessages } = useQuery({
    queryKey: ['message-search', debouncedSearchQuery],
    queryFn: () => messagingService.searchMessages(debouncedSearchQuery),
    enabled: showMessageSearch && debouncedSearchQuery.trim().length > 1,
  });

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

  // Star is a personal bookmark — unlike pin, nobody else needs to know, so
  // this is REST-only with no socket broadcast.
  const starMutation = useMutation({
    mutationFn: (msgId: number) => messagingService.starMessage(selectedId!, msgId),
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

  const renameMutation = useMutation({
    mutationFn: ({ convId, title }: { convId: number; title: string }) => messagingService.renameGroup(convId, title),
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
      const tempId = addPendingMessage(selectedId, { messageText: text, replyTo: replyTo ?? undefined });
      if (chatSocket.isConnected) {
        chatSocket.sendMessage({ conversationId: selectedId, ...payload, tempId })
          .catch(() => removePendingMessage(selectedId, tempId));
        // onMessage's own-broadcast handles the success case — the socket
        // ack and the room broadcast can arrive in either order.
      } else {
        sendMutation.mutate(payload, { onSettled: () => removePendingMessage(selectedId, tempId) });
      }
      setReplyTo(null);
    }
    setMessageText('');
    setShowEmojiPicker(false);
    chatSocket.typingStop(selectedId);
    clearTimeout(typingTimeoutRef.current);
  }, [messageText, selectedId, editTarget, replyTo, addPendingMessage, removePendingMessage]);

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

  // Each selected file becomes its own pending bubble (object-URL preview,
  // visible immediately) that uploads independently — so "send multiple
  // images" doesn't mean waiting for #1 to finish before #2 even starts,
  // and one slow/failed upload doesn't block the others.
  const sendFileMessage = useCallback((file: File, convId: number) => {
    const localPreviewUrl = URL.createObjectURL(file);
    const msgType = file.type.startsWith('image/') ? 'Image' : file.type.startsWith('video/') ? 'Video' : 'File';
    const msgText = msgType === 'Image' ? '📷 Image' : msgType === 'Video' ? '🎬 Video' : `📎 ${file.name}`;

    const tempId = addPendingMessage(convId, {
      messageText: msgText, messageType: msgType,
      attachmentUrl: localPreviewUrl, attachmentType: file.type,
      attachmentName: file.name, attachmentSize: file.size,
    });

    // Was POSTing to a hardcoded relative '/api/messages/upload' — only
    // ever worked in local dev where Vite's proxy forwards /api to the
    // backend; in production (frontend and backend on separate origins)
    // that path doesn't exist on the frontend's own domain, so every
    // attachment failed outright. Cloudinary is already the established
    // upload path elsewhere in the app (staff documents, profile photos)
    // and also avoids writing to the backend's ephemeral local disk.
    const { promise, cancel } = uploadToCloudinaryWithProgress(file, 'maxhub-chat', (pct) => {
      setUploadProgress(prev => ({ ...prev, [tempId]: pct }));
    });
    uploadCancelRef.current[tempId] = cancel;

    promise
      .then(async (uploaded) => {
        const payload = {
          messageText: msgText, messageType: msgType,
          attachmentUrl: uploaded.url, attachmentType: file.type,
          attachmentName: file.name, attachmentSize: file.size,
        };
        if (chatSocket.isConnected) {
          await chatSocket.sendMessage({ conversationId: convId, ...payload, tempId });
        } else {
          await messagingService.sendMessage(convId, payload);
          qc.invalidateQueries({ queryKey: ['messages', convId] });
          qc.invalidateQueries({ queryKey: ['conversations'] });
        }
      })
      .catch((err) => {
        if (err?.message !== 'Upload cancelled') alert(`Failed to send ${file.name}.`);
      })
      .finally(() => {
        URL.revokeObjectURL(localPreviewUrl);
        delete uploadCancelRef.current[tempId];
        removePendingMessage(convId, tempId);
      });
  }, [addPendingMessage, removePendingMessage, qc]);

  const cancelUpload = (tempId: string, convId: number) => {
    uploadCancelRef.current[tempId]?.();
    removePendingMessage(convId, tempId);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !selectedId) return;
    e.target.value = '';
    for (const file of files) sendFileMessage(file, selectedId);
  };

  // Click-to-toggle rather than press-and-hold: getUserMedia's permission
  // prompt is async and, on first use, the browser's own "Allow microphone?"
  // dialog can easily outlast a quick mouse press — by the time permission
  // resolves the mouseup has already fired on a button that, a moment
  // earlier, had no stop handler attached yet (it was still showing the
  // "start" icon). Recording would then start with nothing left listening
  // for the release, so it never stopped. A plain click avoids that
  // entirely — the only thing time-sensitive is the user's intent, not a
  // continuously-held input.
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingCancelledRef.current = false;
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      // Stop no longer sends immediately — it hands off to a listen-before-
      // sending preview step instead, same as WhatsApp's recorder.
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recordingTimerRef.current);
        if (recordingCancelledRef.current) { setRecordingState('idle'); return; }
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size === 0) { setRecordingState('idle'); return; }
        setRecordedAudio({ blob, url: URL.createObjectURL(blob) });
        setRecordingState('preview');
      };
      recorder.start();
      setRecordingState('recording');
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch { alert('Microphone access denied. Allow microphone access in your browser to record a voice note.'); }
  };

  const pauseRecording = () => {
    mediaRecorderRef.current?.pause();
    clearInterval(recordingTimerRef.current);
    setRecordingState('paused');
  };

  const resumeRecording = () => {
    mediaRecorderRef.current?.resume();
    recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    setRecordingState('recording');
  };

  const stopRecording = () => {
    recordingCancelledRef.current = false;
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    recordingCancelledRef.current = true;
    mediaRecorderRef.current?.stop();
    setRecordingState('idle');
  };

  const discardRecordedAudio = () => {
    if (recordedAudio) URL.revokeObjectURL(recordedAudio.url);
    setRecordedAudio(null);
    setRecordingState('idle');
    setRecordingSeconds(0);
  };

  const sendRecordedAudio = () => {
    if (!recordedAudio || !selectedId) return;
    const convId = selectedId;
    const voiceFile = new File([recordedAudio.blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    const duration = recordingSeconds;
    const localPreviewUrl = recordedAudio.url; // reuse — already a valid object URL for this exact blob
    setRecordedAudio(null);
    setRecordingState('idle');
    setRecordingSeconds(0);

    const tempId = addPendingMessage(convId, {
      messageText: '🎤 Voice note', messageType: 'Voice',
      attachmentUrl: localPreviewUrl, attachmentType: 'audio/webm', attachmentDuration: duration,
    });
    const { promise, cancel } = uploadToCloudinaryWithProgress(voiceFile, 'maxhub-chat', (pct) => {
      setUploadProgress(prev => ({ ...prev, [tempId]: pct }));
    });
    uploadCancelRef.current[tempId] = cancel;

    promise
      .then(async (uploaded) => {
        const payload = { messageText: '🎤 Voice note', messageType: 'Voice', attachmentUrl: uploaded.url, attachmentType: 'audio/webm', attachmentDuration: duration };
        if (chatSocket.isConnected) {
          await chatSocket.sendMessage({ conversationId: convId, ...payload, tempId });
        } else {
          await messagingService.sendMessage(convId, payload);
          qc.invalidateQueries({ queryKey: ['messages', convId] });
          qc.invalidateQueries({ queryKey: ['conversations'] });
        }
      })
      .catch((err) => {
        if (err?.message !== 'Upload cancelled') alert('Voice note upload failed.');
      })
      .finally(() => {
        URL.revokeObjectURL(localPreviewUrl);
        delete uploadCancelRef.current[tempId];
        removePendingMessage(convId, tempId);
      });
  };

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

  const handleStar = (msgId: number) => starMutation.mutate(msgId);

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
            <button onClick={() => setShowMessageSearch(true)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition" title="Search messages">
              <Search className="h-4.5 w-4.5" />
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
            <input
              value={showMessageSearch ? messageSearchQuery : search}
              onChange={e => showMessageSearch ? setMessageSearchQuery(e.target.value) : setSearch(e.target.value)}
              placeholder={showMessageSearch ? 'Search messages, images, files...' : 'Search conversations'}
              autoFocus={showMessageSearch}
              className="bg-transparent text-sm flex-1 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none" />
            {showMessageSearch ? (
              <button onClick={() => { setShowMessageSearch(false); setMessageSearchQuery(''); }}><X className="h-3.5 w-3.5 text-gray-400" /></button>
            ) : (
              search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5 text-gray-400" /></button>
            )}
          </div>
        </div>

        {showMessageSearch ? (
          <div className="flex-1 overflow-y-auto">
            {!messageSearchQuery.trim() ? (
              <p className="text-center text-sm text-gray-400 py-12">Search messages, images, videos, voice notes, and documents across all your chats.</p>
            ) : isSearchingMessages ? (
              <p className="text-center text-sm text-gray-400 py-12">Searching...</p>
            ) : !messageSearchResults || messageSearchResults.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-12">No messages found for "{messageSearchQuery}"</p>
            ) : (
              messageSearchResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedId(m.conversationId);
                    setMobileShowChat(true);
                    setShowMessageSearch(false);
                    setMessageSearchQuery('');
                  }}
                  className="w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-indigo-600 truncate">{m.conversation?.title ?? 'Conversation'}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{fmtMsgTime(m.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {m.messageType !== 'Text' ? `${m.messageType === 'Image' ? '📷' : m.messageType === 'Video' ? '🎬' : m.messageType === 'Voice' || m.messageType === 'Audio' ? '🎤' : '📎'} ${m.messageType}` : m.messageText}
                  </p>
                </button>
              ))
            )}
          </div>
        ) : (
        <>
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
        </>
        )}
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
                  online={selectedConv.participants?.some(p => String(p.userId) !== String(currentUserId) && onlineUserIds.has(Number(p.userId)))} />
              )}

              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => isGroup && setShowGroupInfo(g => !g)}>
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{selectedConv.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isGroup
                    ? `${selectedConv.participants?.length ?? 0} members`
                    : selectedConv.participants?.some(p => String(p.userId) !== String(currentUserId) && onlineUserIds.has(Number(p.userId)))
                      ? <span className="text-emerald-500">Online</span>
                      : 'Offline'
                  }
                </p>
              </div>

              <div className="flex items-center gap-0.5">
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition" title="Search messages">
                  <Search className="h-4 w-4" />
                </button>
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
                  // senderUserId comes back from the API as a string (BIGINT
                  // serialization) while currentUserId is a number from the
                  // auth store — a strict === here was always false, so
                  // every message rendered as "received" and there was no
                  // visual way to tell your own messages apart.
                  const isOwn = String(msg.senderUserId) === String(currentUserId);
                  const idx = messages.findIndex(m => m.id === msg.id);
                  const prev = idx > 0 ? messages[idx - 1] : null;
                  const showSender = !isOwn && (!prev || String(prev.senderUserId) !== String(msg.senderUserId));
                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg} isOwn={isOwn}
                      showSender={showSender}
                      isGroup={isGroup}
                      currentUserId={currentUserId}
                      deliveryStatus={isOwn ? computeDeliveryStatus(msg, selectedConv, onlineUserIds, currentUserId) : undefined}
                      uploadPct={msg.tempId ? uploadProgress[msg.tempId] : undefined}
                      onReply={setReplyTo}
                      onReact={handleReact}
                      onEdit={handleEditClick}
                      onDelete={handleDelete}
                      onDeleteForEveryone={handleDeleteForEveryone}
                      onPin={handlePin}
                      onStar={handleStar}
                      onForward={setForwardTarget}
                      onCopy={handleCopy}
                      onCancelUpload={selectedId ? (tempId) => cancelUpload(tempId, selectedId) : undefined}
                      onOpenViewer={setViewerTarget}
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
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect}
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
              {recordingState === 'recording' || recordingState === 'paused' ? (
                <>
                  <button onClick={cancelRecording} title="Delete recording"
                    className="w-9 h-9 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1.5 text-sm text-red-500 font-medium flex-shrink-0 px-1">
                    <span className={cn('w-2 h-2 rounded-full bg-red-500', recordingState === 'recording' && 'animate-pulse')} />
                    {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                  </div>
                  <button onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
                    title={recordingState === 'recording' ? 'Pause' : 'Resume'}
                    className="w-9 h-9 text-gray-400 hover:text-indigo-600 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition flex-shrink-0">
                    {recordingState === 'recording' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button onClick={stopRecording} title="Stop"
                    className="w-11 h-11 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0">
                    <Check className="h-4 w-4" />
                  </button>
                </>
              ) : recordingState === 'preview' && recordedAudio ? (
                <>
                  <button onClick={discardRecordedAudio} title="Delete recording"
                    className="w-9 h-9 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <audio controls src={recordedAudio.url} className="h-9 flex-1 max-w-[220px]" />
                  <button onClick={sendRecordedAudio} title="Send voice note"
                    className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center text-white shadow-md transition flex-shrink-0">
                    <Send className="h-4 w-4" />
                  </button>
                </>
              ) : messageText.trim() ? (
                <button onClick={handleSend}
                  disabled={sendMutation.isPending || editMutation.isPending}
                  className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center text-white shadow-md transition disabled:opacity-50 flex-shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={startRecording}
                  className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center text-white shadow-md transition flex-shrink-0"
                  title="Record a voice note">
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
                onRename={(title) => renameMutation.mutate({ convId: selectedConv.id, title })}
              />
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ═══════════════ MODALS ═══════════════ */}

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

      {/* Full-screen media viewer */}
      {viewerTarget && (
        <MediaViewer
          msg={viewerTarget}
          onClose={() => setViewerTarget(null)}
          onDeleteForEveryone={handleDeleteForEveryone}
        />
      )}
    </div>
  );
}
