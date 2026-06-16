import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  CheckCheck,
  RefreshCw,
  BellOff,
  X,
} from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { apiClient } from '@services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────
type NotifType = 'Info' | 'Warning' | 'Success' | 'Error';
type FilterTab = 'All' | 'Unread' | 'Read' | NotifType;

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  read: boolean;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<NotifType, { icon: React.ComponentType<any>; iconCls: string; bgCls: string }> = {
  Info:    { icon: Bell,          iconCls: 'text-blue-500',   bgCls: 'bg-blue-50 dark:bg-blue-900/20' },
  Warning: { icon: AlertTriangle, iconCls: 'text-amber-500',  bgCls: 'bg-amber-50 dark:bg-amber-900/20' },
  Success: { icon: CheckCircle,   iconCls: 'text-green-500',  bgCls: 'bg-green-50 dark:bg-green-900/20' },
  Error:   { icon: XCircle,       iconCls: 'text-red-500',    bgCls: 'bg-red-50 dark:bg-red-900/20' },
};

const FILTER_TABS: FilterTab[] = ['All', 'Unread', 'Read', 'Info', 'Warning', 'Success', 'Error'];

// ─── Sample data (shown when API fails) ──────────────────────────────────────
const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: 's1', title: 'Payroll Approved',        message: 'June payroll has been approved and will be processed on Monday.',        type: 'Success', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 's2', title: 'Leave Request Pending',   message: 'You have 3 pending leave requests awaiting your approval.',              type: 'Warning', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: 's3', title: 'New Team Member',         message: 'Adaeze Okonkwo has joined the Engineering team.',                       type: 'Info',    read: true,  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: 's4', title: 'Server Alert',            message: 'High CPU usage detected on the production server. Please investigate.',  type: 'Error',   read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: 's5', title: 'Project Milestone',       message: 'MaxHub ERP has reached 80% completion. Great work team!',               type: 'Success', read: true,  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() },
  { id: 's6', title: 'System Maintenance',      message: 'Scheduled maintenance window: Sunday 2 AM – 4 AM WAT.',                 type: 'Info',    read: true,  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: 's7', title: 'Attendance Alert',        message: '5 employees have not checked in today.',                                 type: 'Warning', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: 's8', title: 'Training Reminder',       message: 'Mandatory compliance training is due in 3 days.',                       type: 'Warning', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString() },
];

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
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.Info;
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
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full
              ${notif.type === 'Info' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                notif.type === 'Warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                notif.type === 'Success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
            >
              {notif.type}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatFullDate(notif.createdAt)}</span>
          </div>

          {notif.read && (
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> Read
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          {!notif.read && (
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

  // Local state used when API fails (sample mode)
  const [localNotifs, setLocalNotifs] = useState<Notification[] | null>(null);
  const [isSampleMode, setIsSampleMode] = useState(false);

  // Fetch
  const { data: apiData, isLoading, refetch } = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => {
      try {
        const res = await apiClient.getRaw('/notifications', { page, limit: 20 });
        setIsSampleMode(false);
        return res;
      } catch {
        setIsSampleMode(true);
        setLocalNotifs(SAMPLE_NOTIFICATIONS);
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const rawNotifs: Notification[] = isSampleMode
    ? (localNotifs ?? SAMPLE_NOTIFICATIONS)
    : ((apiData?.data ?? apiData ?? []) as Notification[]);

  // Mark read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => {
      if (isSampleMode) {
        setLocalNotifs((prev) => prev?.map((n) => (n.id === markReadMutation.variables ? { ...n, read: true } : n)) ?? null);
      }
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.post('/notifications/mark-all-read', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => {
      if (isSampleMode) setLocalNotifs((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => {
      if (isSampleMode) setLocalNotifs((prev) => prev?.filter((n) => n.id !== deleteMutation.variables) ?? null);
    },
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const readIds = rawNotifs.filter((n) => n.read).map((n) => n.id);
      await Promise.allSettled(readIds.map((id) => apiClient.delete(`/notifications/${id}`)));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => {
      if (isSampleMode) setLocalNotifs((prev) => prev?.filter((n) => !n.read) ?? null);
    },
  });

  // Filter
  const filteredNotifs = rawNotifs.filter((n) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Unread') return !n.read;
    if (activeTab === 'Read') return n.read;
    return n.type === activeTab;
  });

  const unreadCount = rawNotifs.filter((n) => !n.read).length;

  const handleMarkRead = (n: Notification) => {
    if (n.read) return;
    if (isSampleMode) {
      setLocalNotifs((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
    } else {
      markReadMutation.mutate(n.id);
    }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSampleMode) {
      setLocalNotifs((prev) => prev?.filter((n) => n.id !== id) ?? null);
    } else {
      deleteMutation.mutate(id);
    }
  };

  const handleMarkAllRead = () => {
    if (isSampleMode) {
      setLocalNotifs((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
    } else {
      markAllReadMutation.mutate();
    }
  };

  const handleDeleteAllRead = () => {
    if (isSampleMode) {
      setLocalNotifs((prev) => prev?.filter((n) => !n.read) ?? null);
    } else {
      deleteAllReadMutation.mutate();
    }
  };

  const handleCardClick = (notif: Notification) => {
    setSelectedNotif(notif);
    handleMarkRead(notif);
  };

  const handleModalMarkRead = () => {
    if (selectedNotif) {
      handleMarkRead(selectedNotif);
      setSelectedNotif((prev) => prev ? { ...prev, read: true } : null);
      if (isSampleMode) {
        setSelectedNotif((prev) => prev ? { ...prev, read: true } : null);
      }
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
            {isSampleMode ? 'Showing sample data — API unavailable' : `${rawNotifs.length} notification${rawNotifs.length !== 1 ? 's' : ''}`}
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
              const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.Info;
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
                    ${notif.read
                      ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-70'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md'
                    }`}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  )}

                  {/* Icon */}
                  <div className={`p-2 rounded-xl flex-shrink-0 ${cfg.bgCls}`}>
                    <Icon className={`h-5 w-5 ${cfg.iconCls}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${notif.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {notif.title}
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">{timeAgo(notif.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full
                        ${notif.type === 'Info' ? 'bg-blue-100 text-blue-700' :
                          notif.type === 'Warning' ? 'bg-amber-100 text-amber-700' :
                          notif.type === 'Success' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'}`}
                      >
                        {notif.type}
                      </span>
                      {notif.read && (
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
