import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/app/dashboard", label: "Dashboard" },
  { to: "/app/departments", label: "Departments" },
  { to: "/app/chat", label: "Team Chat" },
  { to: "/app/attendance", label: "Attendance" },
  { to: "/app/modules", label: "Feature Modules" },
  { to: "/app/profile", label: "Profile" },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-app-surface text-slate-100">
      <header className="border-b border-slate-200/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/brand/kurios-sat_logo.jpeg" alt="Kurios SAT" className="h-10 w-16 rounded-md bg-white object-cover p-1" />
            <div>
              <p className="font-display text-lg">Max Hub ERP</p>
              <p className="text-xs text-slate-300/70">{user?.role} workspace</p>
            </div>
          </div>

          <nav className="ml-auto flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-[#1f73bf] text-white" : "text-slate-300 hover:bg-white/10"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
              type="button"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <Outlet />
      </div>
    </div>
  );
}
