import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  BookOpen, LayoutDashboard, ClipboardList, Calendar, BarChart2,
  Award, Bell, User, LogOut, Menu, X, FileText, MessageSquare, Sun, Moon,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@store/themeStore';

const NAV = [
  { to: '/student/dashboard',    icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/student/courses',      icon: BookOpen,         label: 'My Courses'  },
  { to: '/student/assignments',  icon: ClipboardList,    label: 'Assignments' },
  { to: '/student/exams',        icon: FileText,         label: 'Exams & CBT' },
  { to: '/student/results',      icon: BarChart2,        label: 'Results'     },
  { to: '/student/attendance',   icon: Calendar,         label: 'Attendance'  },
  { to: '/student/schedule',     icon: Calendar,         label: 'Schedule'    },
  { to: '/student/certificates', icon: Award,            label: 'Certificates'},
  { to: '/student/messages',     icon: MessageSquare,    label: 'Messages'    },
  { to: '/student/profile',      icon: User,             label: 'My Profile'  },
];

export const StudentPortalLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDark, toggle: toggleTheme } = useThemeStore();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-gradient-to-b from-violet-700 via-violet-800 to-purple-900 shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <img src="/images/beadmaxlogo.jpeg" alt="Beadmax" className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shadow flex-shrink-0" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">Beadmax</p>
            <p className="text-violet-300 text-xs">Vocational School</p>
          </div>
          <button
            className="ml-auto lg:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Student info */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold text-sm">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-violet-300 text-xs truncate">Student Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                  isActive
                    ? 'bg-white/20 text-white font-semibold shadow-sm'
                    : 'text-violet-200 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-violet-200 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-4 px-6 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button className="relative p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentPortalLayout;
