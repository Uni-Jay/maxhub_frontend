import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import type { ReactElement } from "react";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { ModulesPage } from "../pages/modules/ModulesPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "../pages/auth/VerifyEmailPage";

function Protected({ children }: { children: ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        Loading workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
}

function PublicOnly({ children }: { children: ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: "/auth/login",
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: "/auth/register",
    element: (
      <PublicOnly>
        <RegisterPage />
      </PublicOnly>
    ),
  },
  {
    path: "/auth/verify-email",
    element: (
      <PublicOnly>
        <VerifyEmailPage />
      </PublicOnly>
    ),
  },
  {
    path: "/auth/forgot-password",
    element: (
      <PublicOnly>
        <ForgotPasswordPage />
      </PublicOnly>
    ),
  },
  {
    path: "/auth/reset-password",
    element: (
      <PublicOnly>
        <ResetPasswordPage />
      </PublicOnly>
    ),
  },
  {
    path: "/app",
    element: (
      <Protected>
        <AppShell />
      </Protected>
    ),
    children: [
      { path: "", element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "modules", element: <ModulesPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/auth/login" replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
