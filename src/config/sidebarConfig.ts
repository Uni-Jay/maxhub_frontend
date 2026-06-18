import {
  LayoutDashboard, Users, Calendar, Briefcase, CheckSquare, Settings,
  FileText, MessageSquare, BarChart3, HelpCircle, UserCircle, Send,
  GraduationCap, Video, DollarSign, Package, UserCheck, ShoppingCart,
  FolderOpen, Receipt, BarChart2, Bot, ShoppingBag, Building2, Globe,
  Award, ArrowUpCircle,
} from 'lucide-react';
import type { CanonicalRole } from '@utils/role';

export interface SidebarChild {
  label: string;
  path: string;
}

export interface SidebarItem {
  label: string;
  path: string;
  icon: React.ElementType;
  children?: SidebarChild[];
}

// ─── SUPER ADMIN — full company control ──────────────────────────────────────
const SUPER_ADMIN_NAV: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Organization', path: '/organization', icon: Building2, children: [
    { label: 'Branches', path: '/organization/branches' },
    { label: 'Units', path: '/organization/units' },
    { label: 'Departments', path: '/organization/departments' },
    { label: 'Designations', path: '/organization/designations' },
  ]},
  { label: 'People', path: '/people', icon: Users, children: [
    { label: 'Staff Directory', path: '/staff' },
    { label: 'Roles & Permissions', path: '/settings/roles' },
  ]},
  { label: 'HR', path: '/hr', icon: UserCheck, children: [
    { label: 'Recruitment', path: '/hr/jobs' },
    { label: 'Attendance', path: '/attendance' },
    { label: 'Leave', path: '/leave/requests' },
    { label: 'Appraisals', path: '/hr/appraisals' },
    { label: 'Promotions', path: '/hr/promotions' },
    { label: 'Training', path: '/hr/training' },
    { label: 'Weekly Reports', path: '/hr/weekly-report' },
  ]},
  { label: 'Payroll', path: '/payroll', icon: DollarSign, children: [
    { label: 'Dashboard', path: '/payroll' },
    { label: 'Periods', path: '/payroll/periods' },
    { label: 'Pay Slips', path: '/payroll/slips' },
    { label: 'Salary Structures', path: '/payroll/structures' },
  ]},
  { label: 'Projects', path: '/projects', icon: Briefcase, children: [
    { label: 'Projects', path: '/projects' },
    { label: 'Tasks', path: '/tasks' },
    { label: 'Reports', path: '/reports/projects' },
  ]},
  { label: 'Staff Queries', path: '/queries', icon: HelpCircle },
  { label: 'CRM', path: '/crm', icon: ShoppingCart, children: [
    { label: 'Business Hub', path: '/crm/hub' },
    { label: 'Contacts', path: '/crm/contacts' },
    { label: 'Pipeline', path: '/crm/pipeline' },
    { label: 'Forecast', path: '/crm/forecast' },
  ]},
  { label: 'Clients', path: '/clients', icon: UserCircle },
  { label: 'Inventory', path: '/inventory', icon: Package, children: [
    { label: 'Dashboard', path: '/inventory/dashboard' },
    { label: 'Items', path: '/inventory/items' },
    { label: 'Warehouses', path: '/inventory/warehouses' },
  ]},
  { label: 'Kurios SAT', path: '/lms', icon: GraduationCap, children: [
    { label: 'Courses', path: '/lms/courses' },
    { label: 'My Enrollments', path: '/lms/my-enrollments' },
    { label: 'Exams', path: '/lms/exams' },
    { label: 'Certificates', path: '/lms/certificates' },
  ]},
  { label: 'VisaMax', path: '/visamax', icon: Globe },
  { label: 'BeadMax', path: '/bead-max/sales', icon: ShoppingBag },
  { label: 'Finance', path: '/finance', icon: Receipt, children: [
    { label: 'Invoices', path: '/invoices' },
    { label: 'Audit Logs', path: '/audit-logs' },
  ]},
  { label: 'Analytics', path: '/analytics', icon: BarChart2 },
  { label: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Files', path: '/files', icon: FolderOpen },
  { label: 'Communication', path: '/communication', icon: Send, children: [
    { label: 'Send Message', path: '/communication/send' },
    { label: 'Templates', path: '/communication/templates' },
    { label: 'History', path: '/communication/history' },
    { label: 'Broadcasts', path: '/communication/broadcasts' },
  ]},
  { label: 'Meetings', path: '/calls', icon: Video },
  { label: 'System Settings', path: '/settings', icon: Settings, children: [
    { label: 'System Settings', path: '/settings/system' },
    { label: 'Profile', path: '/settings/profile' },
    { label: 'Security', path: '/settings/security' },
    { label: 'Notification Prefs', path: '/settings/notifications' },
    { label: 'Login History', path: '/login-history' },
  ]},
];

// ─── ADMIN — daily operations management (branch/business scoped) ────────────
const ADMIN_NAV: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Staff', path: '/staff', icon: Users },
  { label: 'Attendance', path: '/attendance', icon: Calendar, children: [
    { label: 'Attendance Records', path: '/attendance' },
    { label: 'GPS Attendance', path: '/attendance/check-in' },
  ]},
  { label: 'Leave', path: '/leave', icon: FileText, children: [
    { label: 'Leave Requests', path: '/leave/requests' },
    { label: 'Leave Balance', path: '/leave/balance' },
  ]},
  { label: 'Projects', path: '/projects', icon: Briefcase, children: [
    { label: 'Projects', path: '/projects' },
    { label: 'Tasks', path: '/tasks' },
  ]},
  { label: 'Reports', path: '/reports', icon: BarChart3, children: [
    { label: 'Attendance', path: '/reports/attendance' },
    { label: 'Projects', path: '/reports/projects' },
  ]},
  { label: 'Communication', path: '/communication', icon: Send, children: [
    { label: 'Send Message', path: '/communication/send' },
    { label: 'Templates', path: '/communication/templates' },
    { label: 'History', path: '/communication/history' },
    { label: 'Broadcasts', path: '/communication/broadcasts' },
  ]},
  { label: 'Meetings', path: '/calls', icon: Video },
  { label: 'Staff Queries', path: '/queries', icon: HelpCircle },
  { label: 'Inventory', path: '/inventory', icon: Package, children: [
    { label: 'Dashboard', path: '/inventory/dashboard' },
    { label: 'Items', path: '/inventory/items' },
    { label: 'Warehouses', path: '/inventory/warehouses' },
  ]},
  { label: 'CRM', path: '/crm', icon: ShoppingCart, children: [
    { label: 'Business Hub', path: '/crm/hub' },
    { label: 'Contacts', path: '/crm/contacts' },
    { label: 'Pipeline', path: '/crm/pipeline' },
  ]},
];

// ─── HR ────────────────────────────────────────────────────────────────────
const HR_NAV: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Employees', path: '/staff', icon: Users },
  { label: 'Recruitment', path: '/hr/jobs', icon: Briefcase },
  { label: 'Attendance', path: '/attendance', icon: Calendar },
  { label: 'Leave', path: '/leave/requests', icon: FileText },
  { label: 'Appraisals', path: '/hr/appraisals', icon: Award },
  { label: 'Promotions', path: '/hr/promotions', icon: ArrowUpCircle },
  { label: 'Training', path: '/hr/training', icon: GraduationCap },
  { label: 'Weekly Reports', path: '/hr/weekly-report', icon: FileText },
  { label: 'Reports', path: '/reports', icon: BarChart3, children: [
    { label: 'Attendance', path: '/reports/attendance' },
    { label: 'Projects', path: '/reports/projects' },
  ]},
  { label: 'Communication', path: '/communication', icon: Send, children: [
    { label: 'Send Message', path: '/communication/send' },
    { label: 'Templates', path: '/communication/templates' },
    { label: 'History', path: '/communication/history' },
    { label: 'Broadcasts', path: '/communication/broadcasts' },
  ]},
];

// ─── HOD — department only ────────────────────────────────────────────────
const HOD_NAV: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Team', path: '/staff', icon: Users },
  { label: 'Projects', path: '/projects', icon: Briefcase },
  { label: 'Tasks', path: '/tasks', icon: CheckSquare },
  { label: 'Weekly Reports', path: '/hr/weekly-report', icon: FileText },
  { label: 'Attendance', path: '/attendance', icon: Calendar },
  { label: 'Performance', path: '/hr/appraisals', icon: Award },
  { label: 'Communication', path: '/communication', icon: Send, children: [
    { label: 'Send Message', path: '/communication/send' },
    { label: 'History', path: '/communication/history' },
  ]},
];

// ─── STAFF — self-service only ────────────────────────────────────────────
const STAFF_NAV: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', path: '/settings/profile', icon: UserCircle },
  { label: 'Attendance', path: '/attendance/check-in', icon: Calendar },
  { label: 'Leave', path: '/leave', icon: FileText, children: [
    { label: 'Apply Leave', path: '/leave/apply' },
    { label: 'Balance', path: '/leave/balance' },
  ]},
  { label: 'My Tasks', path: '/tasks', icon: CheckSquare },
  { label: 'My Projects', path: '/projects', icon: Briefcase },
  { label: 'My Reports', path: '/hr/weekly-report', icon: FileText },
  { label: 'My Payslip', path: '/payroll/my-slips', icon: DollarSign },
  { label: 'Training', path: '/hr/training', icon: GraduationCap },
  { label: 'Messages', path: '/messages', icon: MessageSquare },
  { label: 'Meetings', path: '/calls', icon: Video },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
];

export const SIDEBAR_CONFIG: Record<CanonicalRole, SidebarItem[]> = {
  superadmin: SUPER_ADMIN_NAV,
  admin: ADMIN_NAV,
  hr: HR_NAV,
  hod: HOD_NAV,
  staff: STAFF_NAV,
  // Student uses its own dedicated StudentPortalLayout, not this sidebar at all.
  student: [],
};

export function getNavForRole(role: CanonicalRole): SidebarItem[] {
  return SIDEBAR_CONFIG[role] ?? STAFF_NAV;
}

/** Every item across every role's config, deduped by path — used only for page-title/breadcrumb lookups. */
export const ALL_SIDEBAR_ITEMS: SidebarItem[] = (() => {
  const seen = new Map<string, SidebarItem>();
  for (const nav of Object.values(SIDEBAR_CONFIG)) {
    for (const item of nav) if (!seen.has(item.path)) seen.set(item.path, item);
  }
  return [...seen.values()];
})();
