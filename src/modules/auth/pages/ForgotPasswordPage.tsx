import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/services/auth.api';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError(null);
      await authApi.forgotPassword(data.email);
      setSuccess(true);
      setTimeout(() => navigate('/auth/login'), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <img src="/images/maxhublogo.jpeg" alt="MaxHub" className="h-9 w-auto object-contain" />
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              We sent a password reset link to your email address. Check your inbox and follow the instructions.
            </p>
            <p className="text-xs text-gray-400 mt-4">Redirecting to login...</p>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4">
                <KeyRound className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot password?</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    {...register('email')}
                    disabled={loading}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.email ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition text-sm shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <Link
              to="/auth/login"
              className="flex items-center justify-center gap-2 mt-5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
