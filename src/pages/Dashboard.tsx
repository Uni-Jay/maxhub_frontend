import { Navigate } from 'react-router-dom';
import { useCurrentRoles, useCurrentPosition, resolveDashboardPath } from '@utils/role';

/**
 * /dashboard — smart redirect to the role-specific dashboard URL.
 * Staff with a recognised position (Accountant, Receptionist) land on their
 * position-specific dashboard; every other position still lands on /dashboard/staff.
 */
export function Dashboard() {
  const { roles } = useCurrentRoles();
  const position = useCurrentPosition();
  const path = resolveDashboardPath(roles, position);
  return <Navigate to={path} replace />;
}

export default Dashboard;
