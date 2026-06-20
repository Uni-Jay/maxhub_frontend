import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert, Eye, EyeOff, Loader2, LogOut, MailCheck } from 'lucide-react';
import { authApi } from '@services/auth.api';
import { useAuthStore } from '@store/authStore';

/**
 * Forced first-login password change. Reached only via PrivateRoute/
 * StudentRoute's redirect when user.mustChangePassword is true (accounts
 * created with a temp password by Add Staff). There's no way to navigate
 * away from here except completing the change or logging out — every other
 * private route redirects back here as long as the flag is set.
 *
 * Two steps: (1) verify the temp password + pick a new one, which emails a
 * confirmation code; (2) enter that code to actually apply the change.
 */
export default function ForcePasswordChangePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Choose a password different from your temporary one.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.requestPasswordChangeOtp(currentPassword);
      setStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Could not verify your temporary password. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword, otpCode);
      if (user) setUser({ ...user, mustChangePassword: false });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired code. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!user?.mustChangePassword) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
        {step === 'form' ? (
          <>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Set a New Password</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 mb-6">
              You're signing in with a temporary password{user?.firstName ? `, ${user.firstName}` : ''}. Choose a new one before continuing.
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={onSubmitForm} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Temporary Password</label>
                <div className="relative mt-1">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">New Password</label>
                <div className="relative mt-1">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">At least 8 characters.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Sending code…' : 'Continue'}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1"
              >
                <LogOut className="h-3.5 w-3.5" /> Log out instead
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4">
              <MailCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Enter Confirmation Code</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 mb-6">
              We sent a 6-digit code to your email. Enter it to confirm your new password.
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={onSubmitOtp} className="space-y-4">
              <input
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                inputMode="numeric"
                autoFocus
                placeholder="••••••"
                className="w-full text-center tracking-[0.5em] text-lg font-mono border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                type="submit"
                disabled={isSubmitting || otpCode.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Confirming…' : 'Confirm & Update Password'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('form'); setOtpCode(''); setError(''); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1"
              >
                ← Back
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
