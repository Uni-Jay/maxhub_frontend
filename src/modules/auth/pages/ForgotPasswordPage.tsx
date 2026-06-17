import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/services/auth.api';
import {
  Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, KeyRound,
  Eye, EyeOff, RefreshCw, ShieldCheck,
} from 'lucide-react';

// ── Step 1: email ──────────────────────────────────────────────────────────────
const emailSchema = z.object({ email: z.string().email('Invalid email address') });
type EmailForm = z.infer<typeof emailSchema>;

// ── Step 2: OTP + new password ─────────────────────────────────────────────────
const resetSchema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type ResetForm = z.infer<typeof resetSchema>;

const OTP_LENGTH = 6;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Shared state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // OTP input state (6 boxes)
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown
  const [resendCountdown, setResendCountdown] = useState(0);
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // Password visibility
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step-1 form
  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });

  // Step-2 form
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  // ── Step 1: send OTP ─────────────────────────────────────────────────────────
  const handleSendOTP = async (data: EmailForm) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(data.email);
      setEmail(data.email);
      setDigits(Array(OTP_LENGTH).fill(''));
      setResendCountdown(60);
      setStep(2);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setDigits(Array(OTP_LENGTH).fill(''));
      setResendCountdown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP box handlers ─────────────────────────────────────────────────────────
  const handleDigitChange = useCallback((index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    setDigits(prev => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleDigitKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        setDigits(prev => { const n = [...prev]; n[index] = ''; return n; });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits]);

  const handleDigitPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    setTimeout(() => inputRefs.current[focusIdx]?.focus(), 10);
  }, []);

  // ── Step 2: verify OTP + reset password ──────────────────────────────────────
  const handleReset = async (data: ResetForm) => {
    const otpCode = digits.join('');
    if (otpCode.length < OTP_LENGTH) {
      setError('Please enter the full 6-digit code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(email, otpCode, data.newPassword);
      setStep(3);
      setTimeout(() => navigate('/auth/login'), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const otpComplete = digits.every(d => d !== '');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <img src="/images/maxhublogo.jpeg" alt="MaxHub" className="h-9 w-auto object-contain" />
        </div>

        {/* ── STEP 3: Success ─────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Password reset!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              Your password has been updated successfully. You can now sign in with your new password.
            </p>
            <p className="text-xs text-gray-400 mt-4">Redirecting to login...</p>
            <Link
              to="/auth/login"
              className="inline-block mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Go to login
            </Link>
          </div>
        )}

        {/* ── STEP 1: Email ──────────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="mb-7">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4">
                <KeyRound className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot password?</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                Enter your email and we'll send you a 6-digit reset code.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={emailForm.handleSubmit(handleSendOTP)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    {...emailForm.register('email')}
                    disabled={loading}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      emailForm.formState.errors.email
                        ? 'border-red-400'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="text-red-500 text-xs mt-1">{emailForm.formState.errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition text-sm shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {loading ? 'Sending code...' : 'Send Reset Code'}
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

        {/* ── STEP 2: OTP + New Password ─────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="mb-7">
              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enter reset code</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-gray-900 dark:text-white">{email}</span>.
                Enter it below along with your new password.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-5">
              {/* OTP boxes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Verification code
                </label>
                <div className="flex gap-2 justify-between" onPaste={handleDigitPaste}>
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleDigitKeyDown(i, e)}
                      disabled={loading}
                      className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        digit
                          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Resend */}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">Code expires in 10 min</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCountdown > 0 || loading}
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 disabled:text-gray-400 disabled:cursor-not-allowed transition font-medium"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    {...resetForm.register('newPassword')}
                    disabled={loading}
                    className={`w-full px-4 py-3 pr-11 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      resetForm.formState.errors.newPassword
                        ? 'border-red-400'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {resetForm.formState.errors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">{resetForm.formState.errors.newPassword.message}</p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    {...resetForm.register('confirmPassword')}
                    disabled={loading}
                    className={`w-full px-4 py-3 pr-11 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      resetForm.formState.errors.confirmPassword
                        ? 'border-red-400'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{resetForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !otpComplete}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition text-sm shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setStep(1); setError(null); }}
              className="flex items-center justify-center gap-2 w-full mt-5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
