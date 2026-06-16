import { Navigate, Outlet } from 'react-router-dom';
import { Loader } from '@components/ui/loader';
import { useAuth } from '@/contexts/AuthContext';

const STUDENT_ROLE = 'STUDENT';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader />
    </div>
  );
}

/**
 * PrivateRoute — staff/admin routes only.
 * Students (STUDENT role) are redirected to the student portal.
 */
export function PrivateRoute() {
  const { isAuthenticated, isInitialized, isLoading, hasRole } = useAuth();

  if (!isInitialized || isLoading) return <LoadingScreen />;

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;

  if (hasRole(STUDENT_ROLE)) return <Navigate to="/student/dashboard" replace />;

  return <Outlet />;
}

/**
 * StudentRoute — student portal routes only.
 * Non-students are redirected to the staff dashboard.
 */
export function StudentRoute() {
  const { isAuthenticated, isInitialized, isLoading, hasRole } = useAuth();

  if (!isInitialized || isLoading) return <LoadingScreen />;

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;

  if (!hasRole(STUDENT_ROLE)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

/**
 * PublicRoute — unauthenticated users only.
 * Redirects authenticated users to their appropriate home based on role.
 */
export function PublicRoute() {
  const { isAuthenticated, isInitialized, isLoading, hasRole } = useAuth();

  if (!isInitialized || isLoading) return <LoadingScreen />;

  if (isAuthenticated) {
    return hasRole(STUDENT_ROLE)
      ? <Navigate to="/student/dashboard" replace />
      : <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
