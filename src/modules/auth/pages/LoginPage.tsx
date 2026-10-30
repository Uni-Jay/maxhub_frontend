import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@store/authStore';
import { authApi } from '@/services/auth.api';
import { normaliseRoles, resolveRolePath } from '@utils/role';
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, RefreshCw, Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LocationState {
  from?: { pathname: string };
  reason?: 'idle';
}

const BRANDS = [
  { name: 'VisaMax Travels', line: 'Visas, flights & tours', logo: '/brands/visamax.jpeg' },
  { name: 'Kurios SAT', line: 'ICT solutions & training', logo: '/brands/kuriossat.jpeg' },
  { name: 'BeadMax Design', line: 'Jewellery & vocational school', logo: '/brands/beadmax.jpeg' },
  { name: 'Maxfood Farm', line: 'Nigerian food, worldwide', logo: '/brands/maxfood.jpeg' },
];

/** Decode the fresh token right after login to get the role-based dashboard URL. */
function getRoleDashboardPath(accessToken: string): string {
  try {
    const decoded = jwtDecode<{ roles: string[] }>(accessToken);
    return resolveRolePath(normaliseRoles(decoded.roles ?? []));
  } catch {
    return '/dashboard';
  }
}

const OTP_LENGTH = 6;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, clearError } = useAuth();
  const store = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // MFA state
  const [mfaState, setMfaState] = useState<{ sessionId: string; user: any } | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const from = (location.state as LocationState)?.from?.pathname;
  const loggedOutIdle = (location.state as LocationState)?.reason === 'idle';

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const emailValue = watch('email');
  const passwordValue = watch('password');

  useEffect(() => {
    if (apiError) {
      setApiError(null);
      clearError();
    }
  }, [emailValue, passwordValue]);

  const getDestination = (accessToken: string) =>
    from && from !== '/auth/login'
      ? from
      : getRoleDashboardPath(accessToken);

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      const response = await authApi.login({ email: data.email, password: data.password });

      if (response.requiresMFA) {
        setMfaState({ sessionId: response.sessionId, user: response.user });
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setResendCountdown(60);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
        return;
      }

      store.setUser(response.user);
      store.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
      try { sessionStorage.setItem('maxhub-ask-notifications', '1'); } catch { /* ignore */ }
      navigate(getDestination(response.accessToken), { replace: true });
    } catch (error: any) {
      setApiError(
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        'Login failed. Please check your credentials.'
      );
    }
  };

  // OTP digit handlers
  const handleDigitChange = useCallback((index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    setOtpDigits(prev => { const n = [...prev]; n[index] = cleaned; return n; });
    if (cleaned && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  }, []);

  const handleDigitKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
      else setOtpDigits(prev => { const n = [...prev]; n[index] = ''; return n; });
    } else if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  }, [otpDigits]);

  const handleDigitPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    setTimeout(() => otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus(), 10);
  }, []);

  const handleOTPSubmit = async () => {
    if (!mfaState) return;
    const otpCode = otpDigits.join('');
    if (otpCode.length < OTP_LENGTH) { setOtpError('Please enter the full 6-digit code'); return; }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const result = await authApi.verifyOTPLogin(mfaState.sessionId, otpCode);
      store.setUser(result.user);
      store.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      try { sessionStorage.setItem('maxhub-ask-notifications', '1'); } catch { /* ignore */ }
      navigate(getDestination(result.accessToken), { replace: true });
    } catch (err: any) {
      setOtpError(
        err?.response?.data?.error?.message || err?.message || 'Invalid code. Please try again.'
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const loading = isLoading || isSubmitting;

  const input = (hasError?: boolean) => `w-full pl-11 pr-4 py-3 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-[15px] transition focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 ${hasError ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}`;

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* ── Brand panel ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[46%] xl:w-[44%] relative overflow-hidden bg-[#0b1430] text-white flex-col justify-between p-12 xl:p-14">
        <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div aria-hidden className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-indigo-500/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 -left-20 w-[380px] h-[380px] rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <img src="/images/maxhublogo.jpeg" alt="MaxHub" className="h-11 w-11 rounded-xl object-contain bg-white p-1" />
          <div>
            <p className="font-semibold tracking-tight text-lg leading-none">MaxHub</p>
            <p className="text-[12px] text-white/50 mt-1">Company workspace</p>
          </div>
        </div>

        <div className="relative">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-indigo-300 mb-4">Four brands · one team</p>
          <h1 className="text-[40px] xl:text-[46px] font-semibold leading-[1.08] tracking-tight max-w-md">
            Run every brand from a single place.
          </h1>
          <p className="mt-5 text-white/60 text-[15px] leading-relaxed max-w-md">
            Customers, orders, students, staff, pay and documents for VisaMax, Kurios SAT, BeadMax and Maxfood Farm — with the whole team on the same page.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 max-w-lg">
            {BRANDS.map((b) => (
              <div key={b.name} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-3 backdrop-blur-sm">
                <img src={b.logo} alt="" className="h-10 w-10 rounded-lg object-contain bg-white p-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  <p className="text-[11px] text-white/50 truncate">{b.line}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between text-[12px] text-white/40">
          <span>© {new Date().getFullYear()} MaxHub · Ikorodu, Lagos</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Protected with two-step sign-in</span>
        </div>
      </aside>

      {/* ── Form ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <img src="/images/maxhublogo.jpeg" alt="MaxHub" className="h-10 w-10 rounded-xl object-contain ring-1 ring-gray-200" />
            <p className="font-semibold text-gray-900 dark:text-white text-lg">MaxHub</p>
          </div>

          {mfaState ? (
            <div>
              <button type="button" onClick={() => { setMfaState(null); setOtpError(null); setOtpDigits(Array(OTP_LENGTH).fill('')); }}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-8">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-5">
                <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-[28px] font-semibold tracking-tight text-gray-900 dark:text-white">Check your email</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-[15px]">
                We sent a 6-digit code to <span className="font-medium text-gray-800 dark:text-gray-200">{mfaState.user?.email}</span>.
              </p>

              {otpError && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 mt-6 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{otpError}</span>
                </div>
              )}

              <div className="flex gap-2 sm:gap-3 justify-between mt-8" onPaste={handleDigitPaste}>
                {otpDigits.map((digit, i) => (
                  <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} aria-label={`Digit ${i + 1}`}
                    onChange={e => handleDigitChange(i, e.target.value)} onKeyDown={e => handleDigitKeyDown(i, e)} disabled={otpLoading}
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-semibold rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 ${digit ? 'border-indigo-400' : 'border-gray-300 dark:border-gray-700'}`} />
                ))}
              </div>

              <button type="button" onClick={handleOTPSubmit} disabled={otpLoading || otpDigits.some(d => !d)}
                className="mt-8 w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition text-[15px]">
                {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {otpLoading ? 'Verifying…' : 'Verify and sign in'}
              </button>

              <div className="mt-5 text-center text-sm text-gray-500">
                Didn't get it?{' '}
                <button type="button" disabled={resendCountdown > 0 || otpLoading}
                  onClick={async () => {
                    if (!mfaState) return;
                    try { await authApi.sendLoginOTP(mfaState.sessionId); setResendCountdown(60); setOtpError(null); }
                    catch { setOtpError('Could not resend the code. Please try again.'); }
                  }}
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400 disabled:text-gray-400 disabled:cursor-not-allowed">
                  <RefreshCw className="h-3.5 w-3.5" />{resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-[28px] font-semibold tracking-tight text-gray-900 dark:text-white">Sign in</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-[15px]">Use your MaxHub work email and password.</p>

              {loggedOutIdle && !apiError && (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 mt-6 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>You were signed out after 30 minutes without activity. Sign in again to continue.</span>
                </div>
              )}
              {apiError && (
                <div role="alert" className="flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 mt-6 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{apiError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-8" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Work email</label>
                  <div className="relative">
                    <Mail className="h-[18px] w-[18px] text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input id="email" type="email" autoComplete="email" placeholder="name@company.com" {...register('email')} className={input(!!errors.email)} />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    <Link to="/auth/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="h-[18px] w-[18px] text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" {...register('password')} className={`${input(!!errors.password)} pr-11`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" {...register('rememberMe')} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Keep me signed in on this device</span>
                </label>

                <button type="submit" disabled={loading}
                  className="group w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-60 text-white font-medium py-3.5 rounded-xl transition text-[15px]">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : <>Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
                </button>
              </form>

              <p className="mt-10 text-xs text-gray-400 leading-relaxed">
                New staff receive their sign-in details from HR by email. Having trouble? Contact HR or your head of department.
              </p>
              <p className="mt-3 text-xs text-gray-500">
                New to MaxHub? Download the <a href="/manuals/MaxHub-Staff-Manual.pdf" download className="text-indigo-600 hover:underline font-medium">Staff User Manual</a> or the <a href="/manuals/MaxHub-Student-Guide.pdf" download className="text-indigo-600 hover:underline font-medium">Student Guide</a> (PDF).
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
