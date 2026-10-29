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
  /** Brand colour for the sidebar icon (from the brand logo). */
  color?: string;
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
  color: '#1d3a8f',
  label: 'VisaMax',
  icon: Globe,
  links: [
    { label: 'Customers & Applications', path: '/visamax/cases', icon: Globe },
    { label: 'Bookings', path: '/visamax/bookings', icon: Globe },
  ],
};

const KURIOS: DepartmentModuleGroup = {
  color: '#4c9a2a',
  label: 'Kurios SAT',
  icon: GraduationCap,
  links: [
    { label: 'ICT Solutions', path: '/kurios/solutions', icon: GraduationCap },
    { label: 'Support Tickets', path: '/kurios/solutions?tab=tickets', icon: GraduationCap },
    { label: 'ICT Training Center', path: '/kurios/training', icon: GraduationCap },
  ],
};

const BEADMAX: DepartmentModuleGroup = {
  color: '#7a1f33',
  label: 'BeadMax',
  icon: ShoppingBag,
  links: [
    { label: 'Custom Orders', path: '/beadmax/custom-orders', icon: ShoppingBag },
    { label: 'Online Shop Orders', path: '/beadmax/shop', icon: ShoppingBag },
    { label: 'Inventory & Products', path: '/beadmax/inventory', icon: ShoppingBag },
    { label: 'Vocational School', path: '/beadmax/school', icon: ShoppingBag },
  ],
};

const MAXFOOD: DepartmentModuleGroup = {
  color: '#1b5e20',
  label: 'Maxfood Farm',
  icon: Wheat,
  links: [
    { label: 'Export Orders', path: '/maxfood', icon: Wheat },
    { label: 'Inventory & Products', path: '/maxfood?tab=products', icon: Wheat },
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
