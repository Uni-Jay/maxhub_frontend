import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@store/authStore';

interface JwtPayload {
  roles: string[];
  businessUnit?: string;
}

// Normalise legacy display names and old uppercase codes → new lowercase codes.
const NORMALISE_ROLE: Record<string, string> = {
  // Old uppercase codes
  'SUPER_ADMIN':    'superadmin',
  'HEAD_OF_ADMIN':  'admin',
  'HR':             'hr',
  'HOD':            'hod',
  'STAFF':          'staff',
  'ACCOUNTANT':     'staff',
  'RECEPTIONIST':   'staff',
  'INSTRUCTOR':     'staff',
  'INTERN':         'staff',
  'STUDENT':        'student',
  // Display names (tokens issued before code fix)
  'Super Administrator':  'superadmin',
  'Head of Administration': 'admin',
  'Human Resources':      'hr',
  'Head of Department':   'hod',
  'Staff':                'staff',
  'Instructor':           'staff',
  'Accountant':           'staff',
  'Receptionist':         'staff',
  'Intern':               'staff',
  'Student':              'student',
};

function normaliseRoles(roles: string[]): Set<string> {
  return new Set(roles.map((r) => NORMALISE_ROLE[r] ?? r.toLowerCase()));
}

/** Read roles from the live JWT first (bypasses stale Zustand-persist cache). */
function useCurrentRoles(): { roles: Set<string>; businessUnit?: string } {
  const { user, tokens } = useAuthStore();

  return useMemo(() => {
    const accessToken = tokens?.accessToken;
    if (accessToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(accessToken);
        if (Array.isArray(decoded.roles) && decoded.roles.length > 0 && decoded.roles[0] !== null) {
          console.log('[Dashboard] JWT roles:', decoded.roles);
          return {
            roles: normaliseRoles(decoded.roles),
            businessUnit: decoded.businessUnit ?? user?.businessUnit,
          };
        }
      } catch {
        // fall through
      }
    }
    const fallbackRoles = user?.roles ?? [];
    console.log('[Dashboard] Fallback stored roles:', fallbackRoles);
    return { roles: normaliseRoles(fallbackRoles), businessUnit: user?.businessUnit };
  }, [tokens?.accessToken, user?.roles, user?.businessUnit]);
}

/** Map normalised role codes → their dedicated dashboard URL. */
export function resolveRolePath(roles: Set<string>): string {
  console.log('[Dashboard] Resolving path for roles:', [...roles]);
  if (roles.has('superadmin')) return '/dashboard/superadmin';
  if (roles.has('admin'))      return '/dashboard/admin';
  if (roles.has('hr'))         return '/dashboard/hr';
  if (roles.has('hod'))        return '/dashboard/hod';
  if (roles.has('student'))    return '/student/dashboard';
  return '/dashboard/staff';
}

/**
 * /dashboard — smart redirect to the role-specific dashboard URL.
 * All non-admin positions (Accountant, Receptionist, Instructor, etc.)
 * are role=staff and land on /dashboard/staff.
 */
export function Dashboard() {
  const { roles } = useCurrentRoles();
  const path = resolveRolePath(roles);
  return <Navigate to={path} replace />;
}

export default Dashboard;
