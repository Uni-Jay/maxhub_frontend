import {
  GraduationCap, Globe, ShoppingBag, Wheat, type LucideIcon,
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
 * Brand (department) module navigation, keyed by Department.code. Brands are
 * the top-level departments; divisions (KS-ICT, KS-TRN, BM-DSN, BM-VOC) map
 * to their brand's menu. All staff currently work across all brands, so the
 * sidebar shows every brand to everyone (see getNavForRole).
 */
const VISAMAX: DepartmentModuleGroup = {
  label: 'VisaMax',
  icon: Globe,
  links: [
    { label: 'Customers & Applications', path: '/visamax/cases', icon: Globe },
    { label: 'Bookings', path: '/visamax/bookings', icon: Globe },
    { label: 'Service Catalogue', path: '/visamax', icon: Globe },
  ],
};

const KURIOS: DepartmentModuleGroup = {
  label: 'Kurios SAT',
  icon: GraduationCap,
  links: [
    { label: 'ICT Solutions', path: '/kurios/solutions', icon: GraduationCap },
    { label: 'Support Tickets', path: '/kurios/solutions?tab=tickets', icon: GraduationCap },
    { label: 'ICT Training Center', path: '/kurios/training', icon: GraduationCap },
    { label: 'Courses', path: '/lms/courses', icon: GraduationCap },
    { label: 'Students', path: '/lms/students', icon: GraduationCap },
    { label: 'Exams', path: '/lms/exams', icon: GraduationCap },
    { label: 'Certificates', path: '/lms/certificates', icon: GraduationCap },
    { label: 'Fee Receipts', path: '/lms/fee-receipts', icon: GraduationCap },
  ],
};

const BEADMAX: DepartmentModuleGroup = {
  label: 'BeadMax',
  icon: ShoppingBag,
  links: [
    { label: 'Custom Orders', path: '/beadmax/custom-orders', icon: ShoppingBag },
    { label: 'Shop Sales & Stock', path: '/bead-max/sales', icon: ShoppingBag },
    { label: 'Vocational School', path: '/beadmax/school', icon: ShoppingBag },
  ],
};

const MAXFOOD: DepartmentModuleGroup = {
  label: 'Maxfood Farm',
  icon: Wheat,
  links: [
    { label: 'Export Orders', path: '/maxfood', icon: Wheat },
    { label: 'Products & Stock', path: '/maxfood?tab=products', icon: Wheat },
    { label: 'Customer Issues', path: '/maxfood?tab=tickets', icon: Wheat },
  ],
};

export const DEPARTMENT_MODULES: Record<string, DepartmentModuleGroup> = {
  VM: VISAMAX,
  KS: KURIOS, 'KS-ICT': KURIOS, 'KS-TRN': KURIOS,
  BM: BEADMAX, 'BM-DSN': BEADMAX, 'BM-VOC': BEADMAX,
  MF: MAXFOOD,
};

/** One entry per brand, in display order. */
export const BRAND_CODES = ['VM', 'KS', 'BM', 'MF'];

export function getDepartmentModule(code?: string | null): DepartmentModuleGroup | null {
  if (!code) return null;
  return DEPARTMENT_MODULES[code.toUpperCase()] ?? null;
}
