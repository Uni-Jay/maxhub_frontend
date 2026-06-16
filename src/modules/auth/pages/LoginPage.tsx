import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@store/authStore';
import { resolveRolePath } from '@pages/Dashboard';
import { Eye, EyeOff, Loader2, AlertCircle, BarChart3, Users, Briefcase, TrendingUp, ChevronDown } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin',      email: 'superadmin@maxhub.com', password: 'MaxHub@Admin2024!' },
  { label: 'Admin',            email: 'admin@maxhub.com',      password: 'Demo@12345!' },
  { label: 'Dept Head',        email: 'depthead@maxhub.com',   password: 'Demo@12345!' },
  { label: 'Manager',          email: 'manager@maxhub.com',    password: 'Demo@12345!' },
  { label: 'Supervisor',       email: 'supervisor@maxhub.com', password: 'Demo@12345!' },
  { label: 'Team Lead',        email: 'teamlead@maxhub.com',   password: 'Demo@12345!' },
  { label: 'Staff',            email: 'staff@maxhub.com',      password: 'Demo@12345!' },
  { label: 'Consultant',       email: 'consultant@maxhub.com', password: 'Demo@12345!' },
  { label: 'Intern',           email: 'intern@maxhub.com',     password: 'Demo@12345!' },
];

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LocationState {
  from?: { pathname: string };
}

const features = [
  { icon: Users, label: 'Staff Management', desc: 'Manage your entire workforce' },
  { icon: Briefcase, label: 'Project Tracking', desc: 'Track projects and deliverables' },
  { icon: BarChart3, label: 'Analytics', desc: 'Data-driven business insights' },
  { icon: TrendingUp, label: 'Growth Tools', desc: 'Scale your operations' },
];

const NORMALISE_ROLE: Record<string, string> = {
  'SUPER_ADMIN': 'superadmin', 'HEAD_OF_ADMIN': 'admin',
  'HR': 'hr', 'HOD': 'hod', 'STAFF': 'staff',
  'ACCOUNTANT': 'staff', 'RECEPTIONIST': 'staff',
  'INSTRUCTOR': 'staff', 'INTERN': 'staff', 'STUDENT': 'student',
  'Super Administrator': 'superadmin', 'Head of Administration': 'admin',
  'Human Resources': 'hr', 'Head of Department': 'hod', 'Staff': 'staff',
  'Instructor': 'staff', 'Accountant': 'staff', 'Receptionist': 'staff',
  'Intern': 'staff', 'Student': 'student',
};

/** Decode the fresh token right after login to get the role-based dashboard URL. */
function getRoleDashboardPath(accessToken: string): string {
  try {
    const decoded = jwtDecode<{ roles: string[] }>(accessToken);
    const roles = new Set((decoded.roles ?? []).map((r) => NORMALISE_ROLE[r] ?? r.toLowerCase()));
    return resolveRolePath(roles);
  } catch {
    return '/dashboard';
  }
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const from = (location.state as LocationState)?.from?.pathname;

  const [showDemo, setShowDemo] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const fillDemo = (account: typeof DEMO_ACCOUNTS[0]) => {
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
  };

  const emailValue = watch('email');
  const passwordValue = watch('password');

  useEffect(() => {
    if (apiError) {
      setApiError(null);
      clearError();
    }
  }, [emailValue, passwordValue]);

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      // Prefer the page the user was trying to reach; otherwise resolve from role.
      // We read tokens from the store AFTER login() has updated it.
      const destination = from && from !== '/auth/login'
        ? from
        : getRoleDashboardPath(useAuthStore.getState().tokens?.accessToken ?? '');
      navigate(destination, { replace: true });
    } catch (error: any) {
      setApiError(
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        'Login failed. Please check your credentials.'
      );
    }
  };

  const loading = isLoading || isSubmitting;

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute top-1/3 left-1/2 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <img src="/images/maxhublogo.jpeg" alt="MaxHub" className="h-12 w-auto object-contain" />
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Everything your business<br />
            needs, in one place.
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed max-w-sm">
            Streamline operations, empower your team, and grow smarter with our all-in-one platform.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-white font-semibold text-sm">{label}</p>
              <p className="text-indigo-200 text-xs mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <img src="/images/maxhublogo.jpeg" alt="MaxHub" className="h-8 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to your account to continue</p>
          </div>

          {/* Error banner */}
          {apiError && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-6 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...register('email')}
                className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.email
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full px-4 py-3 pr-11 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    errors.password
                      ? 'border-red-400 dark:border-red-600'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition">
                Remember me for 30 days
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition text-sm shadow-sm shadow-indigo-200 dark:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in to MaxHub'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/auth/register" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold">
              Sign up
            </Link>
          </p>

          {/* Demo Credentials */}
          <div className="mt-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDemo(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <span>Demo accounts (dev only)</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDemo ? 'rotate-180' : ''}`} />
            </button>
            {showDemo && (
              <div className="border-t border-dashed border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition text-left"
                  >
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-24 shrink-0">{acc.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{acc.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
