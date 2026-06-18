import { Navigate } from 'react-router-dom';
import { useCurrentRoles, resolveRolePath } from '@utils/role';

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
