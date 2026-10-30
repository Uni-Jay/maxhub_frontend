import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@services/notificationService';
import { chatSocket } from '@services/chatSocket';
import { messagingService } from '@services/messagingService';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Bell, Search, LogOut, Home, ChevronRight,
  MessageSquare, Sun, Moon,
} from 'lucide-react';
import { useAuthStore } from '@store/authStore';
import { useThemeStore } from '@store/themeStore';
import { CallProvider } from '@components/calls/CallProvider';
import { SaveToFolderHost } from '@components/files/SaveToFolder';
import { BirthdayStrip } from '@components/dashboard/BirthdayStrip';
import { TodayCard } from '@components/dashboard/TodayCard';
import { TargetsCard } from '@modules/erp/pages/TargetsPage';
import { toast } from '@components/ui/toaster';
import { pushSupported, registerServiceWorker, enablePush, chime } from '@services/pushService';
import { cn } from '@utils/cn';
import { getPrimaryRole } from '@utils/role';
import { getNavForRole, ALL_SIDEBAR_ITEMS } from '@config/sidebarConfig';
import { GlobalSearch } from '@components/GlobalSearch';

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Management', hr: 'Human Resources', hod: 'Head of Department',
  accountant: 'Accountant', staff: 'Staff', student: 'Student',
};
const BRAND_LOGO_BY_LABEL: Record<string, string> = {
  VisaMax: '/brands/visamax.jpeg', 'Kurios SAT': '/brands/kuriossat.jpeg', BeadMax: '/brands/beadmax.jpeg', 'Maxfood Farm': '/brands/maxfood.jpeg',
};

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { user, tokens, logout } = useAuthStore();

  const NAV = useMemo(() => {
    const role = getPrimaryRole(user, tokens?.accessToken);
    return getNavForRole(role, user?.position, user?.departmentCodes);
  }, [user?.roles, user?.position, user?.departmentCodes, tokens?.accessToken]);

  const here = location.pathname + location.search;
  const childActive = (path: string) => (path.includes('?') ? here === path : location.pathname === path || (path !== '/payroll' && path !== '/projects' && location.pathname.startsWith(`${path}/`)));
  const [expanded, setExpanded] = useState<string | null>(() => NAV.find((n) => n.children?.some((c) => childActive(c.path)))?.path ?? null);
  useEffect(() => {
    const m = NAV.find((n) => n.children?.some((c) => childActive(c.path)));
    if (m) setExpanded(m.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  const primaryRole = getPrimaryRole(user, tokens?.accessToken);
  const name = [(user as any)?.firstName, (user as any)?.lastName].filter(Boolean).join(' ') || user?.email || 'User';

  const itemCls = (active: boolean) => cn(
    'group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
    active ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-white',
  );
  const iconFor = (item: (typeof NAV)[number], active: boolean) => {
    const logo = item.section === 'Brands' ? BRAND_LOGO_BY_LABEL[item.label] : undefined;
    if (logo) return <img src={logo} alt="" className="h-5 w-5 rounded-md object-contain bg-white ring-1 ring-gray-200 dark:ring-gray-700 flex-shrink-0" />;
    const Icon = item.icon;
    return <Icon className={cn('h-[18px] w-[18px] flex-shrink-0', active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300')} />;
  };

  let lastSection: string | undefined = '__start';
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200/80 dark:border-gray-800">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-200/80 dark:border-gray-800 flex-shrink-0">
        <img src="/images/maxhublogo.jpeg" alt="MaxHub" className="h-9 w-9 object-contain rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 bg-white flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight tracking-tight">MaxHub</p>
          <p className="text-[11px] text-gray-400 leading-tight">Four brands · one workspace</p>
        </div>
        {onClose && <button onClick={onClose} className="ml-auto p-1 text-gray-400 hover:text-gray-600 lg:hidden"><X className="h-4 w-4" /></button>}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
        {NAV.map((item) => {
          const header = item.section !== lastSection && item.section ? (
            <p key={`h-${item.section}`} className="px-3 pt-5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">{item.section}</p>
          ) : null;
          lastSection = item.section;
          const isExpanded = expanded === item.path;

          if (!item.children) {
            const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(`${item.path}/`)) || (item.path === '/dashboard' && location.pathname.startsWith('/dashboard'));
            return (
              <div key={item.path}>
                {header}
                <NavLink to={item.path} onClick={onClose} className={itemCls(active)}>
                  {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-indigo-600 dark:bg-indigo-400" />}
                  {iconFor(item, active)}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </div>
            );
          }

          const active = item.children.some((c) => childActive(c.path));
          return (
            <div key={item.path}>
              {header}
              <button onClick={() => setExpanded(isExpanded ? null : item.path)} className={itemCls(active && !isExpanded)} aria-expanded={isExpanded}>
                {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full" style={{ background: item.color || '#4f46e5' }} />}
                {iconFor(item, active)}
                <span className="flex-1 text-left truncate">{item.label}</span>
                <ChevronRight className={cn('h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0', isExpanded && 'rotate-90')} />
              </button>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                    <div className="ml-[21px] pl-3 border-l border-gray-200 dark:border-gray-800 my-0.5 space-y-0.5">
                      {item.children.map((child) => {
                        const a = childActive(child.path);
                        return (
                          <NavLink key={child.path} to={child.path} onClick={onClose}
                            className={cn('block px-3 py-1.5 rounded-md text-[12.5px] transition-colors',
                              a ? 'text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50/70 dark:bg-indigo-500/10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-gray-800/70')}
                            style={a && item.color ? { color: item.color } : undefined}>
                            {child.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-200/80 dark:border-gray-800 p-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <NavLink to="/settings/profile" onClick={onClose} className="flex items-center gap-3 min-w-0 flex-1 group">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-900" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600">{name}</p>
              <p className="text-[11px] text-gray-400 truncate">{ROLE_LABEL[primaryRole] || primaryRole}</p>
            </div>
          </NavLink>
          <button onClick={() => logout()} title="Sign out" className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const { tokens, user } = useAuthStore();
  const qc = useQueryClient();

  const { data: unreadData } = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 60_000,
    retry: false,
    enabled: !!tokens?.accessToken,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Unread message count — the header's MessageSquare icon previously had no
  // badge at all, so there was no app-wide signal that a chat message had
  // arrived unless you happened to already be on the Messages page.
  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingService.getConversations(),
    refetchInterval: 60_000,
    retry: false,
    enabled: !!tokens?.accessToken,
  });
  const unreadMessageCount = (conversationsData ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  // New-message toast — shown for any message from someone else, on
  // whichever page you're currently on, unless you're already looking at
  // that exact conversation in the Messages page.
  const [messageToast, setMessageToast] = useState<{ id: number; conversationId: number; sender: string; preview: string } | null>(null);

  // Owns the chat socket's lifetime for the whole authenticated session —
  // previously only MessagingPage connected/disconnected it, so anything
  // relying on a live push (new-notification events) only worked while chat
  // happened to be open. Connecting here means it survives navigation across
  // every dashboard page; MessagingPage's own connect() call is idempotent
  // (returns the existing socket) and no longer disconnects on unmount.
  useEffect(() => {
    const token = tokens?.accessToken;
    if (!token) return;
    chatSocket.connect(token);

    const onNewNotification = (n: any) => {
      qc.invalidateQueries({ queryKey: ['notification-unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      // Live pop-up so nobody misses an approval, assignment or alert.
      if (n?.title && document.visibilityState === 'visible') {
        const url: string | undefined = n.actionUrl;
        chime();
        toast.info(n.title, n.message, url ? { label: 'Open', onClick: () => navigate(url) } : undefined);
      } else if (n?.title && 'Notification' in window && Notification.permission === 'granted') {
        const pop = new Notification(n.title, { body: n.message, icon: '/images/maxhublogo.jpeg', tag: `notif-${n.id}` });
        pop.onclick = () => { window.focus(); if (n.actionUrl) navigate(n.actionUrl); pop.close(); };
      }
    };
    chatSocket.on('notification:new', onNewNotification);

    // Keep the unread counts fresh on every message in rooms we're in.
    const onNewMessage = () => qc.invalidateQueries({ queryKey: ['conversations'] });
    chatSocket.on('chat:message', onNewMessage);

    // Personal alert for a message to me (sent by the server to every
    // participant, even for chats started while I was elsewhere).
    const onChatNotify = (n: { conversationId: number; messageId: number; title: string; preview: string }) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      const openConv = new URLSearchParams(window.location.search).get('c');
      if (window.location.pathname === '/messages' && document.visibilityState === 'visible' && openConv === String(n.conversationId)) return;
      if (document.visibilityState === 'visible') {
        chime();
        setMessageToast({ id: n.messageId, conversationId: n.conversationId, sender: n.title, preview: n.preview });
        window.setTimeout(() => setMessageToast((cur) => (cur?.id === n.messageId ? null : cur)), 6000);
      } else if ('Notification' in window && Notification.permission === 'granted') {
        // Same tag as the web-push one, so it never shows twice.
        const pop = new Notification(n.title, { body: n.preview, icon: '/images/maxhublogo.jpeg', tag: `chat-${n.conversationId}` });
        pop.onclick = () => { window.focus(); navigate(`/messages?c=${n.conversationId}`); pop.close(); };
      }
    };
    chatSocket.on('chat:notify', onChatNotify);

    return () => {
      chatSocket.off('notification:new', onNewNotification);
      chatSocket.off('chat:message', onNewMessage);
      chatSocket.off('chat:notify', onChatNotify);
    };
  }, [tokens?.accessToken, qc, user?.id, navigate]);

  useEffect(() => {
    if (!tokens?.accessToken) chatSocket.disconnect();
  }, [tokens?.accessToken]);

  // Pop-up notifications: register the service worker, re-subscribe silently
  // if already allowed, and let clicks on a pop-up navigate this tab.
  const [pushState, setPushState] = useState<string>(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const [pushDismissed, setPushDismissed] = useState(() => { try { return localStorage.getItem('maxhub-push-dismissed') === '1'; } catch { return false; } });
  useEffect(() => {
    if (!tokens?.accessToken || !pushSupported()) return;
    registerServiceWorker();
    if (Notification.permission === 'granted') enablePush(false).catch(() => undefined);
    const onSwMessage = (e: MessageEvent) => { if (e.data?.type === 'navigate' && e.data.url) navigate(e.data.url); };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, [tokens?.accessToken, navigate]);

  // Unread count in the browser tab title, so you can see it from another tab.
  useEffect(() => {
    const n = unreadCount + unreadMessageCount;
    document.title = n > 0 ? `(${n > 99 ? '99+' : n}) MaxHub ERP` : 'MaxHub ERP';
  }, [unreadCount, unreadMessageCount]);

  // Global search — Cmd/Ctrl+K opens it from anywhere, same as the ⌘K hint
  // already shown in the header button (which previously had no handler at all).
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const here = location.pathname + location.search;
  const pageTitle = ALL_SIDEBAR_ITEMS.flatMap(n =>
    n.children
      ? n.children.map(c => ({ path: c.path, label: `${n.label} / ${c.label}` }))
      : [{ path: n.path, label: n.label }]
  ).filter(p => (p.path.includes('?') ? here === p.path : location.pathname === p.path || location.pathname.startsWith(`${p.path}/`)))
   .sort((a, b) => b.path.length - a.path.length)[0]?.label ?? 'Dashboard';

  return (
    <CallProvider>
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-[264px] flex-shrink-0">
        <div className="w-full">
          <SidebarNav />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 lg:hidden shadow-2xl"
            >
              <SidebarNav onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-16 flex items-center gap-4 px-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 shadow-sm shadow-gray-100/50 dark:shadow-none z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo (mobile only — hidden on desktop since sidebar has it) */}
          <img
            src="/images/maxhublogo.jpeg"
            alt="MaxHub"
            className="lg:hidden h-8 w-auto object-contain flex-shrink-0"
          />

          {/* Breadcrumb / Title */}
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <ChevronRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{pageTitle}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-gray-800 transition min-w-[180px]"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search anything...</span>
              <kbd className="ml-auto text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <NavLink to="/notifications" className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>

            {/* Messages */}
            <NavLink to="/messages" className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition">
              <MessageSquare className="h-5 w-5" />
              {unreadMessageCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white leading-none">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {pushSupported() && pushState === 'default' && !pushDismissed && (
            <div className="mx-6 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-3 text-sm">
              <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="flex-1 min-w-[200px] text-gray-700 dark:text-gray-300">Turn on pop-up notifications so you see new messages, calls and approvals even when MaxHub is in the background.</span>
              <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700" onClick={async () => {
                const r = await enablePush(true).catch(() => 'denied');
                setPushState(r);
                if (r === 'granted') toast.success('Pop-up notifications are on');
                else if (r === 'denied') toast.error('Notifications are blocked', 'Allow them for this site in your browser settings.');
              }}>Turn on</button>
              <button className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => { setPushDismissed(true); try { localStorage.setItem('maxhub-push-dismissed', '1'); } catch { /* */ } }}>Not now</button>
            </div>
          )}
          <div className="p-6 max-w-7xl mx-auto">
            {location.pathname.startsWith('/dashboard') && <TodayCard />}
            {location.pathname.startsWith('/dashboard') && <BirthdayStrip />}
            {/^\/dashboard\/(superadmin|admin|accountant|hod|hr)/.test(location.pathname) && <TargetsCard />}
            <Outlet />
          </div>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <AnimatePresence>
        {messageToast && (
          <motion.button
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            onClick={() => { navigate(`/messages?c=${messageToast.conversationId}`); setMessageToast(null); }}
            className="fixed bottom-6 left-1/2 z-[110] flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl px-4 py-3 max-w-sm text-left hover:shadow-xl transition"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{messageToast.sender}</p>
              <p className="text-xs text-gray-500 truncate">{messageToast.preview}</p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
      <SaveToFolderHost />
    </CallProvider>
  );
}

export default DashboardLayout;
