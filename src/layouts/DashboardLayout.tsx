import { useState, useMemo } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, Briefcase, CheckSquare, Settings,
  FileText, MessageSquare, BarChart3, Menu, X, Bell, Search,
  LogOut, HelpCircle, UserCircle, Send, Home, ChevronRight, GraduationCap,
  Video, DollarSign, Package, UserCheck, ShoppingCart, FolderOpen,
  Receipt, ScrollText, BarChart2, Sun, Moon, Bot, ShoppingBag,
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@store/authStore';
import { useThemeStore } from '@store/themeStore';
import { cn } from '@utils/cn';
import { IncomingCallNotification } from '@modules/videocall/components/IncomingCallNotification';
import type { IncomingCall } from '@services/videoCallService';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  children?: { label: string; path: string }[];
}

// ─── ALL navigation items ────────────────────────────────────────────────────
const ALL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },

  { label: 'Staff', path: '/staff', icon: Users, children: [
    { label: 'All Staff', path: '/staff' },
    { label: 'Add Staff', path: '/staff/create' },
  ]},
  { label: 'HR', path: '/hr', icon: UserCheck, children: [
    { label: 'Job Postings', path: '/hr/jobs' },
    { label: 'Appraisals', path: '/hr/appraisals' },
    { label: 'Training', path: '/hr/training' },
    { label: 'Weekly Report', path: '/hr/weekly-report' },
  ]},
  { label: 'Attendance', path: '/attendance', icon: Calendar, children: [
    { label: 'Records', path: '/attendance' },
    { label: 'Check In', path: '/attendance/check-in' },
  ]},
  { label: 'Leave', path: '/leave', icon: FileText, children: [
    { label: 'Apply Leave', path: '/leave/apply' },
    { label: 'Requests', path: '/leave/requests' },
    { label: 'Balance', path: '/leave/balance' },
  ]},
  { label: 'Payroll', path: '/payroll', icon: DollarSign, children: [
    { label: 'Dashboard', path: '/payroll' },
    { label: 'Periods', path: '/payroll/periods' },
    { label: 'Pay Slips', path: '/payroll/slips' },
    { label: 'Salary Structures', path: '/payroll/structures' },
    { label: 'My Payslip', path: '/payroll/my-slips' },
  ]},
  { label: 'Projects', path: '/projects', icon: Briefcase, children: [
    { label: 'All Projects', path: '/projects' },
    { label: 'Create Project', path: '/projects/create' },
  ]},
  { label: 'Tasks', path: '/tasks', icon: CheckSquare, children: [
    { label: 'All Tasks', path: '/tasks' },
    { label: 'Create Task', path: '/tasks/create' },
  ]},
  { label: 'Queries', path: '/queries', icon: HelpCircle },
  { label: 'CRM', path: '/crm', icon: ShoppingCart, children: [
    { label: 'Business Hub', path: '/crm/hub' },
    { label: 'Contacts', path: '/crm/contacts' },
    { label: 'Pipeline', path: '/crm/pipeline' },
    { label: 'Forecast', path: '/crm/forecast' },
  ]},
  { label: 'Clients', path: '/clients', icon: UserCircle, children: [
    { label: 'All Clients', path: '/clients' },
    { label: 'Add Client', path: '/clients/create' },
  ]},
  { label: 'Inventory', path: '/inventory', icon: Package, children: [
    { label: 'Dashboard', path: '/inventory/dashboard' },
    { label: 'Items', path: '/inventory/items' },
    { label: 'Warehouses', path: '/inventory/warehouses' },
  ]},
  { label: 'Bead Max', path: '/bead-max', icon: ShoppingBag, children: [
    { label: 'Sales & Orders', path: '/bead-max/sales' },
  ]},
  { label: 'Kurios SAT', path: '/lms', icon: GraduationCap, children: [
    { label: 'Courses', path: '/lms/courses' },
    { label: 'My Enrollments', path: '/lms/my-enrollments' },
    { label: 'Exams', path: '/lms/exams' },
    { label: 'Certificates', path: '/lms/certificates' },
  ]},
  { label: 'Messages', path: '/messages', icon: MessageSquare },
  { label: 'Video Calls', path: '/calls', icon: Video },
  { label: 'Broadcast', path: '/communication', icon: Send, children: [
    { label: 'Send Message', path: '/communication/send' },
    { label: 'Templates', path: '/communication/templates' },
    { label: 'History', path: '/communication/history' },
  ]},
  { label: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'File Manager', path: '/files', icon: FolderOpen },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Invoices', path: '/invoices', icon: Receipt },
  { label: 'Analytics', path: '/analytics', icon: BarChart2 },
  { label: 'Reports', path: '/reports', icon: BarChart3, children: [
    { label: 'Attendance', path: '/reports/attendance' },
    { label: 'Projects', path: '/reports/projects' },
  ]},
  { label: 'Audit Logs', path: '/audit-logs', icon: ScrollText },
  { label: 'Settings', path: '/settings', icon: Settings, children: [
    { label: 'System Settings', path: '/settings/system' },
    { label: 'Roles & Permissions', path: '/settings/roles' },
    { label: 'Profile', path: '/settings/profile' },
    { label: 'Security', path: '/settings/security' },
    { label: 'Notifications Prefs', path: '/settings/notifications' },
    { label: 'Login History', path: '/login-history' },
  ]},
];

// ─── Paths visible per role ──────────────────────────────────────────────────
// Each array lists the top-level `path` values from ALL_NAV that the role may see.
const ROLE_PATHS: Record<string, string[]> = {
  superadmin: ['*'], // full access
  admin: [
    '/dashboard','/staff','/hr','/attendance','/leave','/payroll',
    '/projects','/tasks','/queries','/clients','/inventory',
    '/messages','/calls','/communication','/calendar','/files',
    '/notifications','/invoices','/analytics','/reports','/settings',
  ],
  hr: [
    '/dashboard','/staff','/hr','/attendance','/leave','/payroll',
    '/projects','/messages','/calendar','/notifications','/settings',
  ],
  hod: [
    '/dashboard','/staff','/hr','/attendance','/leave',
    '/projects','/tasks','/messages','/calendar','/notifications','/settings',
  ],
  staff: [
    '/dashboard','/attendance','/leave','/tasks',
    '/messages','/calendar','/notifications','/settings',
  ],
};

// Normalise legacy display names and old uppercase codes → new lowercase codes.
const NORMALISE_ROLE: Record<string, string> = {
  'SUPER_ADMIN': 'superadmin', 'HEAD_OF_ADMIN': 'admin',
  'HR': 'hr', 'HOD': 'hod', 'STAFF': 'staff',
  'ACCOUNTANT': 'staff', 'RECEPTIONIST': 'staff',
  'INSTRUCTOR': 'staff', 'INTERN': 'staff', 'STUDENT': 'student',
  'Super Administrator': 'superadmin', 'Head of Administration': 'admin',
  'Human Resources': 'hr', 'Head of Department': 'hod', 'Staff': 'staff',
  'Instructor': 'staff', 'Accountant': 'staff', 'Receptionist': 'staff',
  'Intern': 'staff', 'Student': 'student',
};

function getPrimaryRole(user: { roles?: string[] } | null, accessToken?: string): string {
  let roles: string[] = [];
  if (accessToken) {
    try {
      const d = jwtDecode<{ roles: string[] }>(accessToken);
      if (Array.isArray(d.roles) && d.roles.length > 0) roles = d.roles;
    } catch { /* fall through */ }
  }
  if (!roles.length) roles = user?.roles ?? [];
  return NORMALISE_ROLE[roles[0]] ?? roles[0]?.toLowerCase() ?? 'staff';
}

function getNavForRole(role: string): NavItem[] {
  const allowed = ROLE_PATHS[role];
  if (!allowed) return ALL_NAV.filter(n => n.path === '/dashboard' || n.path === '/settings');
  if (allowed[0] === '*') return ALL_NAV; // superadmin sees everything
  return ALL_NAV.filter(n => allowed.includes(n.path));
}

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { user, tokens, logout } = useAuthStore();

  const NAV = useMemo(() => {
    const role = getPrimaryRole(user, tokens?.accessToken);
    return getNavForRole(role);
  }, [user?.roles, tokens?.accessToken]);

  const [expanded, setExpanded] = useState<string | null>(() => {
    const match = NAV.find(n => n.children && location.pathname.startsWith(n.path));
    return match?.path ?? null;
  });

  const primaryRole = getPrimaryRole(user, tokens?.accessToken);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <img
          src="/images/maxhublogo.jpeg"
          alt="MaxHub"
          className="h-8 w-auto object-contain flex-shrink-0"
        />
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">MaxHub ERP</p>
          <p className="text-xs text-gray-400">Three Brands. One Vision.</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto p-1 text-gray-400 hover:text-gray-600 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isExpanded = expanded === item.path;
          const isActive = location.pathname === item.path ||
            (item.children && item.children.some(c => location.pathname.startsWith(c.path)));

          if (!item.children) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive: a }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    a
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  )
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </NavLink>
            );
          }

          return (
            <div key={item.path}>
              <button
                onClick={() => setExpanded(isExpanded ? null : item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronRight
                  className={cn('h-3.5 w-3.5 transition-transform flex-shrink-0', isExpanded && 'rotate-90')}
                />
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 pl-3 border-l border-gray-100 dark:border-gray-800 mt-0.5 space-y-0.5 py-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end
                          onClick={onClose}
                          className={({ isActive: a }) =>
                            cn(
                              'flex items-center px-3 py-2 rounded-md text-xs font-medium transition-all',
                              a
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                : 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                            )
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3">
        <NavLink
          to="/settings/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition group mb-1"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.email ?? 'User'}
            </p>
            <p className="text-xs text-gray-400 capitalize">{primaryRole}</p>
          </div>
          <Settings className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
        </NavLink>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggle: toggleTheme } = useThemeStore();

  const handleAnswerCall = (call: IncomingCall) => {
    navigate('/calls', { state: { incomingCall: call } });
  };

  const pageTitle = ALL_NAV.flatMap(n =>
    n.children
      ? n.children.map(c => ({ path: c.path, label: `${n.label} / ${c.label}` }))
      : [{ path: n.path, label: n.label }]
  ).find(p => location.pathname.startsWith(p.path))?.label ?? 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 flex-shrink-0">
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
        <header className="h-16 flex items-center gap-4 px-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-2 min-w-0">
            <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <ChevronRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{pageTitle}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <button className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition min-w-[180px]">
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </NavLink>

            {/* Messages */}
            <NavLink to="/messages" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition">
              <MessageSquare className="h-5 w-5" />
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global incoming call notification — visible on every page */}
      <IncomingCallNotification onAnswer={handleAnswerCall} />
    </div>
  );
}

export default DashboardLayout;
