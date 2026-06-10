export const moduleSections = [
  {
    title: "Operations",
    items: [
      "attendance-time-tracking",
      "internal-messaging-collaboration",
      "task-project-management",
      "calendar-event-management",
      "file-document-management",
      "notification-system",
    ],
  },
  {
    title: "Business",
    items: [
      "payroll-finance",
      "crm",
      "sales-ecommerce",
      "inventory-management",
      "analytics-reports",
    ],
  },
  {
    title: "People & Learning",
    items: [
      "user-staff-management",
      "department-management",
      "hr-management",
      "lms",
      "cbt-exam-system",
    ],
  },
  {
    title: "Platform",
    items: [
      "authentication-security",
      "dashboard-system",
      "ai-automation",
      "settings-system-management",
      "audit-logs",
      "mobile-pwa",
      "advanced-professional-features",
    ],
  },
] as const;

export const roleDashboardMap: Record<string, string> = {
  "Super Admin": "Company-wide control center with full analytics",
  HR: "Recruitment, payroll preview, and staff lifecycle",
  "Head of Admin": "Administration operations and approvals",
  HOD: "Team productivity, projects, and performance",
  Staff: "Personal tasks, attendance, and payslips",
  Instructor: "Courses, attendance, and grading workflow",
  Accountant: "Payroll runs, revenue and expense control",
  Receptionist: "Front desk operations and booking management",
  Intern: "Learning tasks and guided workflows",
};
