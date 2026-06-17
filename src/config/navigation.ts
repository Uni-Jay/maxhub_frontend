/**
 * Role-based Navigation Configuration
 * Maps roles to their accessible menu items based on permissions
 */

import {
  Home,
  Users,
  Calendar,
  Briefcase,
  CheckSquare,
  BarChart3,
  Settings,
  FileText,
  CreditCard,
  MessageSquare,
  BookOpen,
  Zap,
  TrendingUp,
  AlertCircle,
  Shield,
  GraduationCap,
  DollarSign,
  Phone,
  UserCircle,
  Send,
  HelpCircle,
  RefreshCw,
  LucideIcon,
} from 'lucide-react';
import { PermissionCode } from '@constants/permissions';

export interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
  requiredPermission?: string;
  children?: MenuItem[];
  badge?: { label: string; color: string };
}

/**
 * Master menu structure - All available menu items
 */
const masterMenu: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    requiredPermission: PermissionCode.ORG_DASHBOARD_VIEW,
  },
  {
    name: 'Organization',
    path: '/organization',
    icon: Shield,
    requiredPermission: PermissionCode.ORG_STAFF_READ,
    children: [
      {
        name: 'Staff',
        path: '/organization/staff',
        icon: Users,
        requiredPermission: PermissionCode.ORG_STAFF_READ,
      },
      {
        name: 'Departments',
        path: '/organization/departments',
        icon: Briefcase,
        requiredPermission: PermissionCode.ORG_DEPARTMENT_READ,
      },
      {
        name: 'Designations',
        path: '/organization/designations',
        icon: Zap,
        requiredPermission: PermissionCode.ORG_DESIGNATION_READ,
      },
      {
        name: 'Locations',
        path: '/organization/locations',
        icon: AlertCircle,
        requiredPermission: PermissionCode.ORG_LOCATION_READ,
      },
    ],
  },
  {
    name: 'HR & Attendance',
    path: '/hr',
    icon: Calendar,
    requiredPermission: PermissionCode.ORG_ATTENDANCE_READ,
    children: [
      {
        name: 'Attendance',
        path: '/hr/attendance',
        icon: Calendar,
        requiredPermission: PermissionCode.ORG_ATTENDANCE_READ,
      },
      {
        name: 'Leave Management',
        path: '/hr/leave',
        icon: FileText,
        requiredPermission: PermissionCode.ORG_LEAVE_REQUEST_READ,
      },
      {
        name: 'Leave Types',
        path: '/hr/leave-types',
        icon: FileText,
        requiredPermission: PermissionCode.ORG_LEAVE_TYPE_READ,
      },
      {
        name: 'Holidays',
        path: '/hr/holidays',
        icon: Calendar,
        requiredPermission: PermissionCode.ORG_HOLIDAY_READ,
      },
    ],
  },
  {
    name: 'Projects & Tasks',
    path: '/projects',
    icon: Briefcase,
    requiredPermission: PermissionCode.ORG_PROJECT_READ,
    children: [
      {
        name: 'Projects',
        path: '/projects/list',
        icon: Briefcase,
        requiredPermission: PermissionCode.ORG_PROJECT_READ,
      },
      {
        name: 'Tasks',
        path: '/projects/tasks',
        icon: CheckSquare,
        requiredPermission: PermissionCode.ORG_TASK_READ,
      },
      {
        name: 'Milestones',
        path: '/projects/milestones',
        icon: TrendingUp,
        requiredPermission: PermissionCode.ORG_MILESTONE_READ,
      },
    ],
  },
  {
    name: 'Finance & Payroll',
    path: '/finance',
    icon: CreditCard,
    requiredPermission: PermissionCode.ORG_PAYROLL_READ,
    children: [
      {
        name: 'Payroll',
        path: '/finance/payroll',
        icon: CreditCard,
        requiredPermission: PermissionCode.ORG_PAYROLL_READ,
      },
      {
        name: 'Salary Structure',
        path: '/finance/salary-structure',
        icon: DollarSign,
        requiredPermission: PermissionCode.ORG_SALARY_STRUCTURE_READ,
      },
      {
        name: 'Invoices',
        path: '/finance/invoices',
        icon: FileText,
        requiredPermission: PermissionCode.ORG_INVOICE_READ,
      },
      {
        name: 'Expenses',
        path: '/finance/expenses',
        icon: DollarSign,
        requiredPermission: PermissionCode.ORG_EXPENSE_READ,
      },
      {
        name: 'Accounts',
        path: '/finance/accounts',
        icon: BarChart3,
        requiredPermission: PermissionCode.ORG_ACCOUNT_READ,
      },
    ],
  },
  {
    name: 'Learning Management',
    path: '/learning',
    icon: BookOpen,
    requiredPermission: PermissionCode.ORG_COURSE_READ,
    children: [
      {
        name: 'Courses',
        path: '/learning/courses',
        icon: BookOpen,
        requiredPermission: PermissionCode.ORG_COURSE_READ,
      },
      {
        name: 'Enrollments',
        path: '/learning/enrollments',
        icon: GraduationCap,
        requiredPermission: PermissionCode.ORG_ENROLLMENT_READ,
      },
      {
        name: 'Exams',
        path: '/learning/exams',
        icon: FileText,
        requiredPermission: PermissionCode.ORG_EXAM_READ,
      },
    ],
  },
  {
    name: 'CRM & Sales',
    path: '/crm',
    icon: TrendingUp,
    requiredPermission: PermissionCode.ORG_OPPORTUNITY_READ,
    children: [
      {
        name: 'Contacts',
        path: '/crm/contacts',
        icon: Phone,
        requiredPermission: PermissionCode.ORG_CONTACT_READ,
      },
      {
        name: 'Opportunities',
        path: '/crm/opportunities',
        icon: TrendingUp,
        requiredPermission: PermissionCode.ORG_OPPORTUNITY_READ,
      },
      {
        name: 'Job Postings',
        path: '/hr/jobs',
        icon: Briefcase,
        requiredPermission: PermissionCode.ORG_JOB_POSTING_READ,
      },
      {
        name: 'Job Sync Dashboard',
        path: '/hr/job-sync',
        icon: RefreshCw,
        requiredPermission: PermissionCode.ORG_JOB_POSTING_READ,
      },
    ],
  },
  {
    name: 'Inventory & Assets',
    path: '/inventory',
    icon: Zap,
    requiredPermission: PermissionCode.ORG_INVENTORY_READ,
    children: [
      {
        name: 'Inventory',
        path: '/inventory/items',
        icon: Zap,
        requiredPermission: PermissionCode.ORG_INVENTORY_READ,
      },
      {
        name: 'Warehouses',
        path: '/inventory/warehouses',
        icon: AlertCircle,
        requiredPermission: PermissionCode.ORG_WAREHOUSE_READ,
      },
      {
        name: 'Assets',
        path: '/inventory/assets',
        icon: Zap,
        requiredPermission: PermissionCode.ORG_ASSET_READ,
      },
    ],
  },
  {
    name: 'Communications',
    path: '/communications',
    icon: MessageSquare,
    requiredPermission: PermissionCode.ORG_MESSAGE_READ,
    children: [
      {
        name: 'Messages',
        path: '/communications/messages',
        icon: MessageSquare,
        requiredPermission: PermissionCode.ORG_MESSAGE_READ,
      },
      {
        name: 'Notifications',
        path: '/communications/notifications',
        icon: AlertCircle,
        requiredPermission: PermissionCode.ORG_NOTIFICATION_READ,
      },
    ],
  },
  {
    name: 'Reports & Analytics',
    path: '/reports',
    icon: BarChart3,
    requiredPermission: PermissionCode.ORG_REPORT_READ,
    children: [
      {
        name: 'Attendance Reports',
        path: '/reports/attendance',
        icon: BarChart3,
        requiredPermission: PermissionCode.ORG_REPORT_READ,
      },
      {
        name: 'Payroll Reports',
        path: '/reports/payroll',
        icon: BarChart3,
        requiredPermission: PermissionCode.ORG_REPORT_READ,
      },
      {
        name: 'Project Reports',
        path: '/reports/projects',
        icon: BarChart3,
        requiredPermission: PermissionCode.ORG_REPORT_READ,
      },
    ],
  },
  {
    name: 'Queries',
    path: '/queries',
    icon: HelpCircle,
  },
  {
    name: 'Client Management',
    path: '/clients',
    icon: UserCircle,
    children: [
      { name: 'All Clients', path: '/clients', icon: UserCircle },
      { name: 'Add Client', path: '/clients/create', icon: UserCircle },
    ],
  },
  {
    name: 'Communication',
    path: '/communication',
    icon: Send,
    children: [
      { name: 'Send Message', path: '/communication/send', icon: Send },
      { name: 'Templates', path: '/communication/templates', icon: FileText },
      { name: 'History', path: '/communication/history', icon: MessageSquare },
    ],
  },
  {
    name: 'Administration',
    path: '/admin',
    icon: Settings,
    requiredPermission: PermissionCode.ADMIN_SYSTEM_SETTINGS,
    children: [
      {
        name: 'Users',
        path: '/admin/users',
        icon: Users,
        requiredPermission: PermissionCode.ADMIN_USER_READ,
      },
      {
        name: 'Roles & Permissions',
        path: '/admin/roles',
        icon: Shield,
        requiredPermission: PermissionCode.ADMIN_ROLE_MANAGE,
      },
      {
        name: 'System Settings',
        path: '/admin/settings',
        icon: Settings,
        requiredPermission: PermissionCode.ADMIN_SYSTEM_SETTINGS,
      },
      {
        name: 'Audit Logs',
        path: '/admin/audit',
        icon: FileText,
        requiredPermission: PermissionCode.ADMIN_AUDIT_LOG_READ,
      },
    ],
  },
];

/**
 * Role-based menu configuration
 * Maps each role to their permitted menu items
 */
export const roleMenuConfig: Record<string, MenuItem[]> = {
  superadmin: masterMenu, // Full access

  admin: [
    masterMenu[0], // Dashboard
    masterMenu[1], // Organization
    masterMenu[2], // HR & Attendance
    masterMenu[3], // Projects & Tasks
    masterMenu[4], // Finance & Payroll
    masterMenu[8], // Reports & Analytics
    masterMenu[9], // Queries
    masterMenu[10], // Client Management
    masterMenu[11], // Communication
  ],

  hr: [
    masterMenu[0], // Dashboard
    masterMenu[1], // Organization
    masterMenu[2], // HR & Attendance
    masterMenu[3], // Projects & Tasks
    masterMenu[4], // Finance & Payroll (limited)
  ],

  hod: [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: Home,
      requiredPermission: PermissionCode.ORG_DASHBOARD_VIEW,
    },
    {
      name: 'Department',
      path: '/department',
      icon: Briefcase,
      requiredPermission: PermissionCode.ORG_STAFF_READ,
      children: [
        {
          name: 'Staff',
          path: '/department/staff',
          icon: Users,
          requiredPermission: PermissionCode.ORG_STAFF_READ,
        },
        {
          name: 'Attendance',
          path: '/department/attendance',
          icon: Calendar,
          requiredPermission: PermissionCode.ORG_ATTENDANCE_READ,
        },
      ],
    },
    masterMenu[3], // Projects & Tasks
  ],

  staff: [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: Home,
      requiredPermission: PermissionCode.ORG_DASHBOARD_VIEW,
    },
    {
      name: 'My Profile',
      path: '/profile',
      icon: Users,
      requiredPermission: PermissionCode.ORG_STAFF_READ,
    },
    {
      name: 'My Tasks',
      path: '/my-tasks',
      icon: CheckSquare,
      requiredPermission: PermissionCode.ORG_TASK_READ,
    },
    {
      name: 'Leave',
      path: '/leave/my-requests',
      icon: Calendar,
      requiredPermission: PermissionCode.ORG_LEAVE_REQUEST_READ,
    },
    {
      name: 'Attendance',
      path: '/attendance/my-records',
      icon: Calendar,
      requiredPermission: PermissionCode.ORG_ATTENDANCE_READ,
    },
    {
      name: 'My Queries',
      path: '/queries',
      icon: HelpCircle,
    },
  ],
};

/**
 * Get menu items for a user's primary role
 * @param role User's primary role (e.g., 'superadmin', 'staff')
 * @returns Array of menu items for that role
 */
export function getMenuForRole(role: string): MenuItem[] {
  return roleMenuConfig[role] || roleMenuConfig.staff;
}

/**
 * Filter menu items based on user permissions
 * @param items Menu items to filter
 * @param userPermissions User's granted permissions
 * @returns Filtered menu items with access
 */
export function filterMenuByPermissions(items: MenuItem[], userPermissions: string[]): MenuItem[] {
  return items
    .filter((item) => !item.requiredPermission || userPermissions.includes(item.requiredPermission))
    .map((item) => ({
      ...item,
      children: item.children
        ? filterMenuByPermissions(item.children, userPermissions)
        : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}

export default roleMenuConfig;
