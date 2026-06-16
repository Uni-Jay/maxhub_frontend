import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/auth.api';
import { Loader2, AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof registerSchema>;

const inputClass = (err?: boolean) =>
  `w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
    err ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
  }`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      const response = await authApi.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      setUser(response.user);
      setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <img src="/images/maxhublogo.jpeg" alt="MaxHub" className="h-9 w-auto object-contain" />
        </div>

        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create an account</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Join your team on MaxHub today</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">First name</label>
              <input {...register('firstName')} placeholder="John" className={inputClass(!!errors.firstName)} />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last name</label>
              <input {...register('lastName')} placeholder="Doe" className={inputClass(!!errors.lastName)} />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
            <input type="email" {...register('email')} placeholder="john@company.com" className={inputClass(!!errors.email)} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} {...register('password')} placeholder="Min. 8 characters" className={inputClass(!!errors.password) + ' pr-11'} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm password</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} {...register('confirmPassword')} placeholder="Repeat password" className={inputClass(!!errors.confirmPassword) + ' pr-11'} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition text-sm shadow-sm shadow-indigo-200 dark:shadow-none mt-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
