import { jwtDecode } from 'jwt-decode';
import { useMemo } from 'react';
import { useAuthStore } from '@store/authStore';

export type CanonicalRole = 'superadmin' | 'admin' | 'hr' | 'hod' | 'staff' | 'student';

interface JwtPayload {
  roles: string[];
  permissions?: string[];
  businessUnit?: string;
}

// Normalise legacy display names and old role-code variants → canonical lowercase codes.
// Single source of truth — Dashboard.tsx (redirect) and DashboardLayout.tsx (sidebar) must
// agree on this mapping, or a user could see a sidebar for one role while being redirected
// to a dashboard for another.
const NORMALISE_ROLE: Record<string, CanonicalRole> = {
  SUPER_ADMIN: 'superadmin', HEAD_OF_ADMIN: 'admin',
  HR: 'hr', HOD: 'hod', STAFF: 'staff',
  ACCOUNTANT: 'staff', RECEPTIONIST: 'staff',
  INSTRUCTOR: 'staff', INTERN: 'staff', STUDENT: 'student',
  super_admin: 'superadmin', head_of_admin: 'admin',
  accountant: 'staff', receptionist: 'staff', instructor: 'staff', intern: 'staff',
  'Super Administrator': 'superadmin', 'Head of Administration': 'admin',
  'Human Resources': 'hr', 'Head of Department': 'hod', Staff: 'staff',
  Instructor: 'staff', Accountant: 'staff', Receptionist: 'staff',
  Intern: 'staff', Student: 'student',
};

// Fallback for any remaining variant: strip non-alpha characters and lowercase, then map.
const CANONICAL_ROLE: Record<string, CanonicalRole> = {
  superadmin: 'superadmin', headofadmin: 'admin', admin: 'admin',
  hr: 'hr', hod: 'hod', staff: 'staff',
  accountant: 'staff', receptionist: 'staff', instructor: 'staff', intern: 'staff',
  student: 'student',
};

export function normaliseRole(role: string): CanonicalRole {
  if (NORMALISE_ROLE[role]) return NORMALISE_ROLE[role];
  const stripped = role?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
  return CANONICAL_ROLE[stripped] ?? (stripped as CanonicalRole) ?? 'staff';
}

export function normaliseRoles(roles: string[]): Set<CanonicalRole> {
  return new Set(roles.map(normaliseRole));
}

/** Reads the primary (first) role from the JWT (live, bypasses stale store cache), falling back to the stored user object. */
export function getPrimaryRole(user: { roles?: string[] } | null, accessToken?: string): CanonicalRole {
  let roles: string[] = [];
  if (accessToken) {
    try {
      const d = jwtDecode<JwtPayload>(accessToken);
      if (Array.isArray(d.roles) && d.roles.length > 0) roles = d.roles;
    } catch { /* fall through to stored user */ }
  }
  if (!roles.length) roles = user?.roles ?? [];
  return normaliseRole(roles[0] ?? 'staff');
}

/** Reads the full set of normalised roles from the JWT (live) falling back to the stored user object. */
export function useCurrentRoles(): { roles: Set<CanonicalRole>; businessUnit?: string } {
  const { user, tokens } = useAuthStore();

  return useMemo(() => {
    const accessToken = tokens?.accessToken;
    if (accessToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(accessToken);
        if (Array.isArray(decoded.roles) && decoded.roles.length > 0 && decoded.roles[0] !== null) {
          return {
            roles: normaliseRoles(decoded.roles),
            businessUnit: decoded.businessUnit ?? user?.businessUnit,
          };
        }
      } catch { /* fall through */ }
    }
    return { roles: normaliseRoles(user?.roles ?? []), businessUnit: user?.businessUnit };
  }, [tokens?.accessToken, user?.roles, user?.businessUnit]);
}

/** Reads the live JWT's granted permission codes (lowercased), falling back to the stored user object. */
export function useCurrentPermissions(): Set<string> {
  const { user, tokens } = useAuthStore();

  return useMemo(() => {
    const accessToken = tokens?.accessToken;
    if (accessToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(accessToken);
        if (Array.isArray(decoded.permissions)) {
          return new Set(decoded.permissions.map((p) => p.toLowerCase()));
        }
      } catch { /* fall through */ }
    }
    return new Set((user?.permissions ?? []).map((p) => p.toLowerCase()));
  }, [tokens?.accessToken, user]);
}

/** Mirrors AuthMiddleware.requirePermission's bypass + check logic, for hiding/disabling UI rather than enforcing access. */
export function hasPermission(roles: Set<CanonicalRole>, permissions: Set<string>, code: string): boolean {
  if (roles.has('superadmin') || roles.has('admin')) return true;
  return permissions.has(code.toLowerCase());
}

/**
 * Job position (e.g. "Accountant", "Receptionist") — not an RBAC role, just a Staff field.
 * Only reaches the client via the login response's stored user object today (not the JWT —
 * same as businessUnit), so this reads the auth store directly rather than decoding the JWT.
 */
export function useCurrentPosition(): string | undefined {
  const { user } = useAuthStore();
  return user?.position ?? undefined;
}

/** Map a normalised-role set → its dedicated dashboard URL. */
export function resolveRolePath(roles: Set<CanonicalRole>): string {
  if (roles.has('superadmin')) return '/dashboard/superadmin';
  if (roles.has('admin')) return '/dashboard/admin';
  if (roles.has('hr')) return '/dashboard/hr';
  if (roles.has('hod')) return '/dashboard/hod';
  if (roles.has('student')) return '/student/dashboard';
  return '/dashboard/staff';
}

/** Same as resolveRolePath, but a plain-staff user with a recognised position gets routed to their position-specific dashboard instead. */
export function resolveDashboardPath(roles: Set<CanonicalRole>, position?: string | null): string {
  const base = resolveRolePath(roles);
  if (base !== '/dashboard/staff') return base;
  const pos = position?.toLowerCase();
  if (pos === 'accountant') return '/dashboard/accountant';
  if (pos === 'receptionist') return '/dashboard/receptionist';
  return base;
}
