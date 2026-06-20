import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  Trash2,
  CheckCheck,
  RefreshCw,
  BellOff,
  X,
  MessageSquare,
  AtSign,
  ClipboardList,
  CalendarDays,
  Wallet,
  Settings as SettingsIcon,
} from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { apiClient } from '@services/apiClient';
import { chatSocket } from '@services/chatSocket';

// ─── Types ────────────────────────────────────────────────────────────────────
// Matches backend/src/models/Notification.model.ts exactly — this used to be
// a fictional 'Info'|'Warning'|'Success'|'Error' + `read` shape that the real
// API never returned, so every notification rendered with the wrong icon/
// styling and `read`/`type` were always undefined.
type NotifType = 'Message' | 'Mention' | 'Assignment' | 'Leave' | 'Payroll' | 'System' | 'Alert' | 'Other';
type FilterTab = 'All' | 'Unread' | 'Read' | NotifType;

interface Notification {
  id: string;
  title: string;
  message: string;
  notificationType: NotifType;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<NotifType, { icon: React.ComponentType<any>; iconCls: string; bgCls: string }> = {
  Message:    { icon: MessageSquare,  iconCls: 'text-blue-500',   bgCls: 'bg-blue-50 dark:bg-blue-900/20' },
  Mention:    { icon: AtSign,         iconCls: 'text-violet-500', bgCls: 'bg-violet-50 dark:bg-violet-900/20' },
  Assignment: { icon: ClipboardList,  iconCls: 'text-indigo-500', bgCls: 'bg-indigo-50 dark:bg-indigo-900/20' },
  Leave:      { icon: CalendarDays,   iconCls: 'text-amber-500',  bgCls: 'bg-amber-50 dark:bg-amber-900/20' },
  Payroll:    { icon: Wallet,         iconCls: 'text-emerald-500', bgCls: 'bg-emerald-50 dark:bg-emerald-900/20' },
  System:     { icon: SettingsIcon,   iconCls: 'text-gray-500',   bgCls: 'bg-gray-50 dark:bg-gray-900/20' },
  Alert:      { icon: AlertTriangle,  iconCls: 'text-red-500',    bgCls: 'bg-red-50 dark:bg-red-900/20' },
  Other:      { icon: Bell,           iconCls: 'text-gray-400',   bgCls: 'bg-gray-50 dark:bg-gray-900/20' },
};

const FILTER_TABS: FilterTab[] = ['All', 'Unread', 'Read', 'Message', 'Mention', 'Assignment', 'Leave', 'Payroll', 'System', 'Alert'];


function timeAgo(dateStr: string) {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return '';
  }
}

function formatFullDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "EEEE, d MMMM yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function NotifDetailModal({
  notif,
  onClose,
  onMarkRead,
  onDelete,
}: {
  notif: Notification;
  onClose: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const cfg = TYPE_CONFIG[notif.notificationType] ?? TYPE_CONFIG.Other;
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className={`p-3 rounded-xl ${cfg.bgCls}`}>
            <Icon className={`h-6 w-6 ${cfg.iconCls}`} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-4 space-y-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">{notif.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{notif.message}</p>

          <div className="flex items-center gap-3 pt-1">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bgCls} ${cfg.iconCls}`}>
              {notif.notificationType}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatFullDate(notif.createdAt)}</span>
          </div>

          {notif.isRead && (
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> Read
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          {!notif.isRead && (
            <button
              onClick={onMarkRead}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
            >
              <CheckCheck className="h-4 w-4" />
              Mark as Read
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [page] = useState(1);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  // Local state used for optimistic updates when API fails
  const [localNotifs, setLocalNotifs] = useState<Notification[] | null>(null);

  // Fetch
  const { data: apiData, isLoading, refetch } = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => {
      try {
        return await apiClient.getRaw('/notifications', { page, limit: 20 });
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const rawNotifs: Notification[] = localNotifs
    ?? ((apiData?.data ?? apiData ?? []) as Notification[]);

  // Mark read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => { setLocalNotifs(null); qc.invalidateQueries({ queryKey: ['notifications'] }); },
    onError: (_err, id) => {
      setLocalNotifs((prev) => (prev ?? rawNotifs).map((n) => (n.id === id ? { ...n, read: true } : n)));
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.post('/notifications/mark-all-read', {}),
    onSuccess: () => { setLocalNotifs(null); qc.invalidateQueries({ queryKey: ['notifications'] }); },
    onError: () => {
      setLocalNotifs((prev) => (prev ?? rawNotifs).map((n) => ({ ...n, read: true })));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/notifications/${id}`),
    onSuccess: () => { setLocalNotifs(null); qc.invalidateQueries({ queryKey: ['notifications'] }); },
    onError: (_err, id) => {
      setLocalNotifs((prev) => (prev ?? rawNotifs).filter((n) => n.id !== id));
    },
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const readIds = rawNotifs.filter((n) => n.isRead).map((n) => n.id);
      await Promise.allSettled(readIds.map((id) => apiClient.delete(`/notifications/${id}`)));
    },
    onSuccess: () => { setLocalNotifs(null); qc.invalidateQueries({ queryKey: ['notifications'] }); },
    onError: () => {
      setLocalNotifs((prev) => (prev ?? rawNotifs).filter((n) => !n.isRead));
    },
  });

  // Live push — backend emits this right after creating a Notification row
  // so the list (and the bell badge, separately, in DashboardLayout) update
  // immediately instead of waiting for the 30s poll.
  useEffect(() => {
    const handler = () => { setLocalNotifs(null); qc.invalidateQueries({ queryKey: ['notifications'] }); };
    chatSocket.on('notification:new', handler);
    return () => chatSocket.off('notification:new', handler);
  }, [qc]);

  // Filter
  const filteredNotifs = rawNotifs.filter((n) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Unread') return !n.isRead;
    if (activeTab === 'Read') return n.isRead;
    return n.notificationType === activeTab;
  });

  const unreadCount = rawNotifs.filter((n) => !n.isRead).length;

  const handleMarkRead = (n: Notification) => {
    if (n.isRead) return;
    markReadMutation.mutate(n.id);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    deleteMutation.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const handleDeleteAllRead = () => {
    deleteAllReadMutation.mutate();
  };

  const handleCardClick = (notif: Notification) => {
    setSelectedNotif(notif);
    handleMarkRead(notif);
  };

  const handleModalMarkRead = () => {
    if (selectedNotif) {
      handleMarkRead(selectedNotif);
      setSelectedNotif((prev) => prev ? { ...prev, read: true } : null);
    }
  };

  const handleModalDelete = () => {
    if (selectedNotif) {
      handleDelete(selectedNotif.id);
      setSelectedNotif(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {`${rawNotifs.length} notification${rawNotifs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition disabled:opacity-40"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
          <button
            onClick={handleDeleteAllRead}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <Trash2 className="h-4 w-4" />
            Delete read
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-1 flex gap-1 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-sm font-medium rounded-xl transition ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab}
            {tab === 'Unread' && unreadCount > 0 && (
              <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'}`}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <BellOff className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-900 dark:text-white">No notifications</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeTab === 'All' ? "You're all caught up!" : `No ${activeTab.toLowerCase()} notifications`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filteredNotifs.map((notif) => {
              const cfg = TYPE_CONFIG[notif.notificationType] ?? TYPE_CONFIG.Other;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleCardClick(notif)}
                  className={`relative flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all
                    ${notif.isRead
                      ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-70'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md'
                    }`}
                >
                  {/* Unread dot */}
                  {!notif.isRead && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  )}

                  {/* Icon */}
                  <div className={`p-2 rounded-xl flex-shrink-0 ${cfg.bgCls}`}>
                    <Icon className={`h-5 w-5 ${cfg.iconCls}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${notif.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {notif.title}
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">{timeAgo(notif.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.bgCls} ${cfg.iconCls}`}>
                        {notif.notificationType}
                      </span>
                      {notif.isRead && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">Read</span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(notif.id, e); }}
                    className="absolute bottom-3 right-3 p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedNotif && (
          <NotifDetailModal
            notif={selectedNotif}
            onClose={() => setSelectedNotif(null)}
            onMarkRead={handleModalMarkRead}
            onDelete={handleModalDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
