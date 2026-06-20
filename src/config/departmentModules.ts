import {
  GraduationCap, Globe, ShoppingBag, type LucideIcon,
} from 'lucide-react';

export interface DepartmentModuleLink {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface DepartmentModuleGroup {
  label: string;
  icon: LucideIcon;
  links: DepartmentModuleLink[];
}

/**
 * Department-specific module access, keyed by Department.code. A staff
 * member (most often an HOD) linked to one of these departments — whether
 * primary or as secondary coverage via StaffDepartment — should see that
 * department's module links, since the generic role-based nav has no idea
 * which department-specific tools (LMS, VisaMax, BeadMax) are relevant.
 */
export const DEPARTMENT_MODULES: Record<string, DepartmentModuleGroup> = {
  KS: {
    label: 'Kurios SAT',
    icon: GraduationCap,
    links: [
      { label: 'Courses', path: '/lms/courses', icon: GraduationCap },
      { label: 'My Enrollments', path: '/lms/my-enrollments', icon: GraduationCap },
      { label: 'Exams', path: '/lms/exams', icon: GraduationCap },
      { label: 'Certificates', path: '/lms/certificates', icon: GraduationCap },
    ],
  },
  VM: {
    label: 'VisaMax',
    icon: Globe,
    links: [
      { label: 'VisaMax', path: '/visamax', icon: Globe },
    ],
  },
  BM: {
    label: 'BeadMax',
    icon: ShoppingBag,
    links: [
      { label: 'BeadMax', path: '/bead-max/sales', icon: ShoppingBag },
    ],
  },
};

export function getDepartmentModule(code?: string | null): DepartmentModuleGroup | null {
  if (!code) return null;
  return DEPARTMENT_MODULES[code.toUpperCase()] ?? null;
}
