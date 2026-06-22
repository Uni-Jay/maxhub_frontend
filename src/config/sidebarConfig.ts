import {
  LayoutDashboard, Users, Calendar, Briefcase, CheckSquare, Settings,
  FileText, MessageSquare, BarChart3, HelpCircle, UserCircle, Send,
  GraduationCap, Video, DollarSign, Package, UserCheck, ShoppingCart,
  FolderOpen, Receipt, BarChart2, Bot, ShoppingBag, Building2, Globe,
  Award, ArrowUpCircle, Wallet, ClipboardList,
} from 'lucide-react';
import type { CanonicalRole } from '@utils/role';
import { DEPARTMENT_MODULES } from './departmentModules';

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
    { label: 'My Payslip', path: '/payroll/my-slips' },
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
    { label: 'Proposals', path: '/crm/proposals' },
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
    { label: 'Fee Receipts', path: '/lms/fee-receipts' },
    { label: 'Students', path: '/lms/students' },
  ]},
  { label: 'VisaMax', path: '/visamax', icon: Globe },
  { label: 'BeadMax', path: '/bead-max/sales', icon: ShoppingBag },
  { label: 'Finance', path: '/finance', icon: Receipt, children: [
    { label: 'Invoices', path: '/invoices' },
    { label: 'Audit Logs', path: '/audit-logs' },
  ]},
  { label: 'Customer Reports', path: '/customer-reports', icon: BarChart2 },
  { label: 'Analytics', path: '/analytics', icon: BarChart2 },
  { label: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Files', path: '/files', icon: FolderOpen },
  { label: 'Messages', path: '/messages', icon: MessageSquare },
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

// ─── Common items available on every dashboard, regardless of role ───────────
// (Messages/Calendar/Files/AI Assistant/Meetings/My Payslip/Customer Reports +
// a personal Settings group with Profile/Security/Notification Prefs. Super
// Admin keeps its own richer System Settings group instead of this one.)
const COMMON_TAIL: SidebarItem[] = [
  { label: 'Messages', path: '/messages', icon: MessageSquare },
  { label: 'Meetings', path: '/calls', icon: Video },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Files', path: '/files', icon: FolderOpen },
  { label: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  { label: 'My Payslip', path: '/payroll/my-slips', icon: DollarSign },
  { label: 'Customer Reports', path: '/customer-reports', icon: BarChart2 },
  { label: 'Settings', path: '/settings', icon: Settings, children: [
    { label: 'Profile', path: '/settings/profile' },
    { label: 'Security', path: '/settings/security' },
    { label: 'Notification Prefs', path: '/settings/notifications' },
  ]},
];

// ─── Full CRM group — available to every role (Business Hub/Contacts/Pipeline/Forecast) ───
const CRM_NAV: SidebarItem[] = [
  { label: 'CRM', path: '/crm', icon: ShoppingCart, children: [
    { label: 'Business Hub', path: '/crm/hub' },
    { label: 'Contacts', path: '/crm/contacts' },
    { label: 'Pipeline', path: '/crm/pipeline' },
    { label: 'Forecast', path: '/crm/forecast' },
    { label: 'Proposals', path: '/crm/proposals' },
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
  { label: 'Weekly Reports', path: '/hr/weekly-report', icon: FileText },
  { label: 'Communication', path: '/communication', icon: Send, children: [
    { label: 'Send Message', path: '/communication/send' },
    { label: 'Templates', path: '/communication/templates' },
    { label: 'History', path: '/communication/history' },
    { label: 'Broadcasts', path: '/communication/broadcasts' },
  ]},
  { label: 'Staff Queries', path: '/queries', icon: HelpCircle },
  { label: 'Inventory', path: '/inventory', icon: Package, children: [
    { label: 'Dashboard', path: '/inventory/dashboard' },
    { label: 'Items', path: '/inventory/items' },
    { label: 'Warehouses', path: '/inventory/warehouses' },
  ]},
  { label: 'Kurios SAT', path: '/lms', icon: GraduationCap, children: [
    { label: 'Courses', path: '/lms/courses' },
    { label: 'Exams', path: '/lms/exams' },
    { label: 'Certificates', path: '/lms/certificates' },
    { label: 'Fee Receipts', path: '/lms/fee-receipts' },
    { label: 'Students', path: '/lms/students' },
  ]},
  { label: 'Finance', path: '/finance', icon: Receipt, children: [
    { label: 'Invoices', path: '/invoices' },
  ]},
  ...CRM_NAV,
  ...COMMON_TAIL,
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
  ...CRM_NAV,
  ...COMMON_TAIL,
];

// ─── HOD — department only ────────────────────────────────────────────────
const HOD_NAV: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Team', path: '/my-team', icon: Users },
  { label: 'Projects', path: '/projects', icon: Briefcase },
  { label: 'Tasks', path: '/tasks', icon: CheckSquare },
  { label: 'Weekly Reports', path: '/hr/weekly-report', icon: FileText },
  { label: 'Attendance', path: '/attendance', icon: Calendar },
  // HOD already holds LEAVE_REQUEST_CREATE_OWN/READ_OWN/APPROVE_OWN_DEPARTMENT
  // in RolesConfig.ts, but had no sidebar path into Leave at all.
  { label: 'Leave', path: '/leave', icon: FileText, children: [
    { label: 'Apply Leave', path: '/leave/apply' },
    { label: 'Leave Requests', path: '/leave/requests' },
    { label: 'Balance', path: '/leave/balance' },
  ]},
  { label: 'Performance', path: '/hr/appraisals', icon: Award },
  ...CRM_NAV,
  ...COMMON_TAIL,
];

// ─── STAFF — self-service only ────────────────────────────────────────────
const STAFF_NAV: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Attendance', path: '/attendance/check-in', icon: Calendar },
  { label: 'Leave', path: '/leave', icon: FileText, children: [
    { label: 'Apply Leave', path: '/leave/apply' },
    { label: 'Balance', path: '/leave/balance' },
  ]},
  { label: 'My Tasks', path: '/tasks', icon: CheckSquare },
  { label: 'My Projects', path: '/projects', icon: Briefcase },
  { label: 'My Reports', path: '/hr/weekly-report', icon: FileText },
  { label: 'Training', path: '/hr/training', icon: GraduationCap },
  ...CRM_NAV,
  ...COMMON_TAIL,
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

// ─── Position-specific extras (Staff.position, not an RBAC role) — spliced
// into STAFF_NAV since the generic staff sidebar has no path to these pages today.
const ACCOUNTANT_EXTRA_NAV: SidebarItem[] = [
  { label: 'Finance', path: '/payroll', icon: Wallet, children: [
    { label: 'Payroll Dashboard', path: '/payroll' },
    { label: 'Pay Periods', path: '/payroll/periods' },
    { label: 'Salary Structures', path: '/payroll/structures' },
    { label: 'Invoices', path: '/invoices' },
    { label: 'All Payslips', path: '/payroll/slips' },
  ]},
];

const RECEPTIONIST_EXTRA_NAV: SidebarItem[] = [
  { label: 'Clients', path: '/clients', icon: Users },
  { label: 'Staff Queries', path: '/queries', icon: ClipboardList },
];

/**
 * Department-specific module nav (LMS for Kurios Sat, VisaMax, BeadMax) —
 * spliced in for anyone linked to that department (primary or secondary
 * coverage), regardless of role. Most relevant to HOD, since the generic
 * role-based nav has no way to know which department she heads.
 */
function getDepartmentExtraNav(departmentCodes?: string[] | null): SidebarItem[] {
  if (!departmentCodes?.length) return [];
  const seen = new Set<string>();
  const extra: SidebarItem[] = [];
  for (const code of departmentCodes) {
    const mod = DEPARTMENT_MODULES[code.toUpperCase()];
    if (!mod || seen.has(mod.label)) continue;
    seen.add(mod.label);
    extra.push(
      mod.links.length > 1
        ? { label: mod.label, path: mod.links[0].path, icon: mod.icon, children: mod.links.map(l => ({ label: l.label, path: l.path })) }
        : { label: mod.label, path: mod.links[0].path, icon: mod.icon }
    );
  }
  return extra;
}

export function getNavForRole(role: CanonicalRole, position?: string | null, departmentCodes?: string[] | null): SidebarItem[] {
  const base = SIDEBAR_CONFIG[role] ?? STAFF_NAV;
  const deptExtra = getDepartmentExtraNav(departmentCodes);

  if (role !== 'staff' || !position) return [...base, ...deptExtra];
  const pos = position.toLowerCase();
  if (pos === 'accountant') return [...base, ...ACCOUNTANT_EXTRA_NAV, ...deptExtra];
  if (pos === 'receptionist') return [...base, ...RECEPTIONIST_EXTRA_NAV, ...deptExtra];
  return [...base, ...deptExtra];
}

/** Every item across every role's config, deduped by path — used only for page-title/breadcrumb lookups. */
export const ALL_SIDEBAR_ITEMS: SidebarItem[] = (() => {
  const seen = new Map<string, SidebarItem>();
  for (const nav of Object.values(SIDEBAR_CONFIG)) {
    for (const item of nav) if (!seen.has(item.path)) seen.set(item.path, item);
  }
  return [...seen.values()];
})();
