import {
  LayoutDashboard, Users, Calendar, Briefcase, CheckSquare, Settings,
  FileText, MessageSquare, BarChart2, HelpCircle, Send,
  GraduationCap, DollarSign, Package, UserCheck, ShoppingCart,
  FolderOpen, Receipt, Bot, Building2, Award, Wallet, Route, ShieldCheck,
  FileSignature, ClipboardList, Network, Target, ShoppingBag, ScrollText,
  PenLine, Trophy, Lightbulb, BookOpenCheck, CalendarCheck,
} from 'lucide-react';
import type { CanonicalRole } from '@utils/role';
import { DEPARTMENT_MODULES, BRAND_CODES } from './departmentModules';

export interface SidebarChild {
  label: string;
  path: string;
}

export interface SidebarItem {
  label: string;
  path: string;
  icon: React.ElementType;
  children?: SidebarChild[];
  /** Optional accent colour for the icon (brand menus). */
  color?: string;
  /** Heading the item is grouped under in the sidebar. */
  section?: string;
}

/**
 * The sidebar is grouped into the same sections, in the same order, for
 * every role — only what is inside each section changes. Every page appears
 * once; Settings is always last.
 */
export const SECTION_ORDER = ['', 'Brands', 'Work', 'People', 'Finance', 'Sales', 'Communication', 'Administration'] as const;

const s = (section: string, items: SidebarItem[]): SidebarItem[] => items.map((i) => ({ ...i, section }));

// ── Building blocks ──────────────────────────────────────────────────────────
const DASHBOARD: SidebarItem = { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard };
const BRANDS_HUB: SidebarItem = { label: 'Brands Overview', path: '/brands', icon: Building2 };
const TRACKING: SidebarItem = { label: 'Tracking', path: '/tracking', icon: Route };
const TARGETS: SidebarItem = { label: 'Targets', path: '/targets', icon: Target };
const PURCHASES: SidebarItem = { label: 'Purchase Requests', path: '/purchases', icon: ShoppingBag };
const POLICIES: SidebarItem = { label: 'Company Policies', path: '/policies', icon: ScrollText };
const AI_WRITER: SidebarItem = { label: 'AI Writing Help', path: '/ai-writer', icon: PenLine };
const STAFF_OF_MONTH: SidebarItem = { label: 'Staff of the Month', path: '/staff-of-the-month', icon: Trophy };
const SUGGESTIONS: SidebarItem = { label: 'Suggestion Box', path: '/suggestions', icon: Lightbulb };
const MINUTES: SidebarItem = { label: 'Meeting Minutes', path: '/minutes', icon: BookOpenCheck };
const BOOKINGS: SidebarItem = { label: 'Consultation Bookings', path: '/bookings', icon: CalendarCheck };
const MY_GROWTH: SidebarItem = { label: 'My Growth', path: '/hr/reviews', icon: Award, children: [
  { label: 'My Reviews', path: '/hr/reviews' },
  { label: 'My Onboarding', path: '/hr/onboarding?mine=1' },
  { label: 'My Training & Certificates', path: '/training-records?mine=1' },
]};
const ANALYTICS: SidebarItem = { label: 'Analytics', path: '/analytics', icon: BarChart2 };

const PROJECTS_FULL: SidebarItem = { label: 'Projects & Tasks', path: '/projects', icon: Briefcase, children: [
  { label: 'Projects', path: '/projects' },
  { label: 'Tasks', path: '/tasks' },
  { label: 'Project Reports', path: '/reports/projects' },
]};
const MY_WORK: SidebarItem = { label: 'My Tasks', path: '/tasks', icon: CheckSquare };
const MY_PROJECTS: SidebarItem = { label: 'My Projects', path: '/projects', icon: Briefcase };
const CALENDAR: SidebarItem = { label: 'Calendar', path: '/calendar', icon: Calendar };
const FILES: SidebarItem = { label: 'Files', path: '/files', icon: FolderOpen };
const DOCUMENTS: SidebarItem = { label: 'Documents & Agreements', path: '/documents', icon: FileSignature };
const WEEKLY: SidebarItem = { label: 'Weekly Reports', path: '/hr/weekly-report', icon: ClipboardList };

const HR_FULL: SidebarItem = { label: 'HR', path: '/hr', icon: UserCheck, children: [
  { label: 'Recruitment', path: '/hr/recruitment' },
  { label: 'Job Adverts', path: '/hr/jobs' },
  { label: 'Careers on Websites', path: '/hr/careers' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Leave', path: '/leave/requests' },
  { label: 'Onboarding', path: '/hr/onboarding' },
  { label: 'Performance Reviews', path: '/hr/reviews' },
  { label: 'Promotions', path: '/hr/promotions' },
  { label: 'Training Programmes', path: '/hr/training' },
  { label: 'Training Records', path: '/training-records' },
  { label: 'Company Policies', path: '/policies' },
]};
const STAFF_DIR: SidebarItem = { label: 'Staff', path: '/staff', icon: Users };
const QUERIES: SidebarItem = { label: 'Staff Queries', path: '/queries', icon: HelpCircle };
const MY_ATTENDANCE: SidebarItem = { label: 'Attendance', path: '/attendance/check-in', icon: Calendar };
const MY_LEAVE: SidebarItem = { label: 'Leave', path: '/leave', icon: FileText, children: [
  { label: 'Apply for Leave', path: '/leave/apply' },
  { label: 'My Requests', path: '/leave/requests' },
  { label: 'Balance', path: '/leave/balance' },
]};
const TRAINING: SidebarItem = { label: 'Training', path: '/hr/training', icon: GraduationCap };

const PAYROLL_FULL: SidebarItem = { label: 'Payroll', path: '/payroll', icon: DollarSign, children: [
  { label: 'Overview', path: '/payroll' },
  { label: 'Staff Pay', path: '/payroll/staff-pay' },
  { label: 'Pay Periods', path: '/payroll/periods' },
  { label: 'Payslips', path: '/payroll/slips' },
  { label: 'My Payslip', path: '/payroll/my-slips' },
]};
const MY_PAYSLIP: SidebarItem = { label: 'My Payslip', path: '/payroll/my-slips', icon: Wallet };
const FINANCE_FULL: SidebarItem = { label: 'Accounts', path: '/finance', icon: Receipt, children: [
  { label: 'Profit & Loss', path: '/finance/profit' },
  { label: 'Business Expenses', path: '/finance/expenses' },
  { label: 'Payments & Receipts', path: '/receipts' },
  { label: 'Invoices', path: '/invoices' },
  { label: 'School Fee Receipts', path: '/lms/fee-receipts' },
  { label: 'Currencies & Rates', path: '/finance/currency' },
]};
const RECEIPTS: SidebarItem = { label: 'Payments & Receipts', path: '/receipts', icon: Receipt };
const INVENTORY: SidebarItem = { label: 'Inventory', path: '/inventory', icon: Package, children: [
  { label: 'Overview', path: '/inventory/dashboard' },
  { label: 'Items', path: '/inventory/items' },
  { label: 'Warehouses', path: '/inventory/warehouses' },
]};

const CRM: SidebarItem = { label: 'CRM', path: '/crm', icon: ShoppingCart, children: [
  { label: 'Clients', path: '/clients' },
  { label: 'Contacts & Leads', path: '/crm/contacts' },
  { label: 'Pipeline', path: '/crm/pipeline' },
  { label: 'Forecast', path: '/crm/forecast' },
  { label: 'Proposals', path: '/crm/proposals' },
  { label: 'Customer Reports', path: '/customer-reports' },
]};

const MESSAGES: SidebarItem = { label: 'Messages & Meetings', path: '/messages', icon: MessageSquare };
const BROADCAST_FULL: SidebarItem = { label: 'Bulk Messaging', path: '/communication', icon: Send, children: [
  { label: 'Send Message', path: '/communication/send' },
  { label: 'Broadcasts', path: '/communication/broadcasts' },
  { label: 'Templates', path: '/communication/templates' },
  { label: 'History', path: '/communication/history' },
]};
const BROADCASTS: SidebarItem = { label: 'Broadcasts', path: '/communication/broadcasts', icon: Send };
const AI: SidebarItem = { label: 'AI Assistant', path: '/ai-assistant', icon: Bot };

const ORGANIZATION: SidebarItem = { label: 'Organization', path: '/organization', icon: Network, children: [
  { label: 'Branches', path: '/organization/branches' },
  { label: 'Units', path: '/organization/units' },
  { label: 'Departments', path: '/organization/departments' },
  { label: 'Designations', path: '/organization/designations' },
  { label: 'Roles & Permissions', path: '/settings/roles' },
]};
const AUDIT: SidebarItem = { label: 'Audit Logs', path: '/audit-logs', icon: ShieldCheck };
const SYSTEM_SETTINGS: SidebarItem = { label: 'Settings', path: '/settings', icon: Settings, children: [
  { label: 'System Settings', path: '/settings/system' },
  { label: 'My Profile', path: '/settings/profile' },
  { label: 'Security', path: '/settings/security' },
  { label: 'Notifications', path: '/settings/notifications' },
]};
const MY_SETTINGS: SidebarItem = { label: 'Settings', path: '/settings', icon: Settings, children: [
  { label: 'My Profile', path: '/settings/profile' },
  { label: 'Security', path: '/settings/security' },
  { label: 'Notifications', path: '/settings/notifications' },
]};

// ── Per role ─────────────────────────────────────────────────────────────────
const SUPER_ADMIN_NAV: SidebarItem[] = [
  ...s('', [DASHBOARD, BRANDS_HUB, TARGETS, TRACKING, ANALYTICS]),
  ...s('Work', [PROJECTS_FULL, CALENDAR, FILES, DOCUMENTS, WEEKLY, MINUTES]),
  ...s('People', [STAFF_DIR, HR_FULL, QUERIES, STAFF_OF_MONTH, SUGGESTIONS]),
  ...s('Finance', [FINANCE_FULL, PURCHASES, PAYROLL_FULL, INVENTORY]),
  ...s('Sales', [CRM, BOOKINGS]),
  ...s('Communication', [MESSAGES, BROADCAST_FULL, AI, AI_WRITER]),
  ...s('Administration', [ORGANIZATION, AUDIT, SYSTEM_SETTINGS]),
];

const ADMIN_NAV: SidebarItem[] = [
  ...s('', [DASHBOARD, BRANDS_HUB, TARGETS, TRACKING, ANALYTICS]),
  ...s('Work', [PROJECTS_FULL, CALENDAR, FILES, DOCUMENTS, WEEKLY, MINUTES]),
  ...s('People', [STAFF_DIR, HR_FULL, QUERIES, STAFF_OF_MONTH, SUGGESTIONS]),
  ...s('Finance', [FINANCE_FULL, PURCHASES, PAYROLL_FULL, INVENTORY]),
  ...s('Sales', [CRM, BOOKINGS]),
  ...s('Communication', [MESSAGES, BROADCAST_FULL, AI, AI_WRITER]),
  ...s('Administration', [AUDIT, MY_SETTINGS]),
];

const HR_NAV: SidebarItem[] = [
  ...s('', [DASHBOARD, BRANDS_HUB, TARGETS, TRACKING]),
  ...s('Work', [PROJECTS_FULL, CALENDAR, FILES, DOCUMENTS, WEEKLY, MINUTES]),
  ...s('People', [STAFF_DIR, HR_FULL, QUERIES, STAFF_OF_MONTH, SUGGESTIONS]),
  ...s('Finance', [PAYROLL_FULL, RECEIPTS, PURCHASES]),
  ...s('Sales', [CRM, BOOKINGS]),
  ...s('Communication', [MESSAGES, BROADCAST_FULL, AI, AI_WRITER]),
  ...s('Administration', [AUDIT, MY_SETTINGS]),
];

const HOD_NAV: SidebarItem[] = [
  ...s('', [DASHBOARD, BRANDS_HUB, TARGETS, TRACKING]),
  ...s('Work', [PROJECTS_FULL, CALENDAR, FILES, DOCUMENTS, WEEKLY, MINUTES]),
  ...s('People', [
    { label: 'My Team', path: '/my-team', icon: Users },
    { label: 'Students', path: '/lms/students', icon: GraduationCap },
    MY_ATTENDANCE, MY_LEAVE,
    { label: 'Onboarding', path: '/hr/onboarding', icon: ClipboardList },
    { label: 'Performance Reviews', path: '/hr/reviews', icon: Award },
    { label: 'Recruitment', path: '/hr/recruitment', icon: UserCheck },
    { label: 'Training Records', path: '/training-records', icon: GraduationCap },
    POLICIES, STAFF_OF_MONTH, SUGGESTIONS,
  ]),
  ...s('Finance', [RECEIPTS, { label: 'Business Expenses', path: '/finance/expenses', icon: Wallet }, PURCHASES, MY_PAYSLIP]),
  ...s('Sales', [CRM, BOOKINGS]),
  ...s('Communication', [MESSAGES, BROADCASTS, AI, AI_WRITER]),
  ...s('Administration', [MY_SETTINGS]),
];

const ACCOUNTANT_NAV: SidebarItem[] = [
  ...s('', [DASHBOARD, BRANDS_HUB, TARGETS, TRACKING]),
  ...s('Work', [MY_WORK, MY_PROJECTS, CALENDAR, FILES, DOCUMENTS, WEEKLY, MINUTES]),
  ...s('People', [MY_ATTENDANCE, MY_LEAVE, TRAINING, MY_GROWTH, POLICIES, STAFF_OF_MONTH, SUGGESTIONS]),
  ...s('Finance', [FINANCE_FULL, PURCHASES, PAYROLL_FULL, INVENTORY]),
  ...s('Sales', [CRM, BOOKINGS]),
  ...s('Communication', [MESSAGES, AI, AI_WRITER]),
  ...s('Administration', [MY_SETTINGS]),
];

const STAFF_NAV: SidebarItem[] = [
  ...s('', [DASHBOARD, BRANDS_HUB, { ...TRACKING, label: 'My Tracking' }]),
  ...s('Work', [MY_WORK, MY_PROJECTS, CALENDAR, FILES, DOCUMENTS, WEEKLY, MINUTES]),
  ...s('People', [MY_ATTENDANCE, MY_LEAVE, TRAINING, MY_GROWTH, POLICIES, STAFF_OF_MONTH, SUGGESTIONS]),
  ...s('Finance', [RECEIPTS, PURCHASES, MY_PAYSLIP]),
  ...s('Sales', [CRM, BOOKINGS]),
  ...s('Communication', [MESSAGES, AI, AI_WRITER]),
  ...s('Administration', [MY_SETTINGS]),
];

export const SIDEBAR_CONFIG: Record<CanonicalRole, SidebarItem[]> = {
  superadmin: SUPER_ADMIN_NAV,
  admin: ADMIN_NAV,
  hr: HR_NAV,
  hod: HOD_NAV,
  accountant: ACCOUNTANT_NAV,
  staff: STAFF_NAV,
  // Student uses its own dedicated StudentPortalLayout, not this sidebar at all.
  student: [],
};

/** Receptionists (a position, not a role) also handle staff queries. */
const RECEPTIONIST_EXTRA_NAV: SidebarItem[] = s('People', [QUERIES]);

/** Brand menus (VisaMax, Kurios SAT, BeadMax, Maxfood Farm). */
function brandMenus(): SidebarItem[] {
  const seen = new Set<string>();
  const out: SidebarItem[] = [];
  for (const code of BRAND_CODES) {
    const mod = DEPARTMENT_MODULES[code];
    if (!mod || seen.has(mod.label)) continue;
    seen.add(mod.label);
    out.push(mod.links.length > 1
      ? { label: mod.label, path: mod.links[0].path, icon: mod.icon, color: mod.color, section: 'Brands', children: mod.links.map((l) => ({ label: l.label, path: l.path })) }
      : { label: mod.label, path: mod.links[0].path, icon: mod.icon, color: mod.color, section: 'Brands' });
  }
  return out;
}

export function getNavForRole(role: CanonicalRole, position?: string | null, departmentCodes?: string[] | null): SidebarItem[] {
  void departmentCodes; // every staff member works across all brands
  const base = SIDEBAR_CONFIG[role] ?? STAFF_NAV;
  const extra = role === 'staff' && (position || '').toLowerCase() === 'receptionist' ? RECEPTIONIST_EXTRA_NAV : [];
  const all = [...base, ...brandMenus(), ...extra];
  const order = (sec?: string) => SECTION_ORDER.indexOf((sec || '') as any);
  const seen = new Set<string>();
  return all
    .map((item, i) => ({ item, i }))
    .sort((a, b) => order(a.item.section) - order(b.item.section) || a.i - b.i)
    .map(({ item }) => item)
    .filter((i) => (seen.has(i.path) ? false : (seen.add(i.path), true)));
}

/** Every item across every role's config, deduped by path — used only for page-title/breadcrumb lookups. */
export const ALL_SIDEBAR_ITEMS: SidebarItem[] = (() => {
  const seen = new Map<string, SidebarItem>();
  for (const item of brandMenus()) if (!seen.has(item.path)) seen.set(item.path, item);
  for (const nav of Object.values(SIDEBAR_CONFIG)) {
    for (const item of nav) if (!seen.has(item.path)) seen.set(item.path, item);
  }
  return [...seen.values()];
})();
