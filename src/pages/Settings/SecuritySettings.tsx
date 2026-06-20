import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@services/auth.api';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SecuritySettings() {
  const { setup2FA, disable2FA } = useAuth();
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [tfaError, setTfaError] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState(false);
  const [pendingPasswords, setPendingPasswords] = useState<{ current: string; next: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onChangePassword = async (data: PasswordFormData) => {
    try {
      setPwLoading(true);
      setPwError(null);
      setPwSuccess(false);
      await authApi.requestPasswordChangeOtp(data.currentPassword);
      setPendingPasswords({ current: data.currentPassword, next: data.newPassword });
      setOtpStep(true);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to verify current password');
    } finally {
      setPwLoading(false);
    }
  };

  const onConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPasswords) return;
    try {
      setPwLoading(true);
      setPwError(null);
      await authApi.changePassword(pendingPasswords.current, pendingPasswords.next, otpCode);
      setPwSuccess(true);
      setOtpStep(false);
      setPendingPasswords(null);
      setOtpCode('');
      reset();
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Invalid or expired code');
    } finally {
      setPwLoading(false);
    }
  };

  const handle2FAToggle = async () => {
    try {
      setTfaLoading(true);
      setTfaError(null);
      if (!tfaEnabled) {
        await setup2FA('TOTP');
        setTfaEnabled(true);
      } else {
        const pw = window.prompt('Enter your password to disable 2FA:');
        if (!pw) return;
        await disable2FA(pw);
        setTfaEnabled(false);
      }
    } catch (err) {
      setTfaError(err instanceof Error ? err.message : '2FA operation failed');
    } finally {
      setTfaLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-gray-600 mt-2">Manage your security preferences</p>
      </div>

      {/* 2FA */}
      <div className="p-4 border rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-semibold">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-600">Add an extra layer of security</p>
          </div>
          <Button
            variant={tfaEnabled ? 'destructive' : 'default'}
            onClick={handle2FAToggle}
            disabled={tfaLoading}
          >
            {tfaLoading ? 'Processing…' : tfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Status:{' '}
          {tfaEnabled
            ? <span className="text-green-600 font-semibold">Enabled</span>
            : <span className="text-red-600 font-semibold">Disabled</span>
          }
        </p>
        {tfaError && <p className="text-red-500 text-sm mt-2">{tfaError}</p>}
      </div>

      {/* Change Password */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Change Password</h3>

        {pwError && (
          <Alert variant="destructive">
            <AlertDescription>{pwError}</AlertDescription>
          </Alert>
        )}
        {pwSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">Password changed successfully!</AlertDescription>
          </Alert>
        )}

        {otpStep ? (
          <form onSubmit={onConfirmOtp} className="space-y-4">
            <p className="text-sm text-gray-600">
              We sent a 6-digit confirmation code to your email. Enter it below to apply your new password.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">Confirmation Code</label>
              <Input
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                inputMode="numeric"
                disabled={pwLoading}
                className="tracking-[0.5em] text-center font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pwLoading || otpCode.length < 6}>
                {pwLoading ? 'Confirming…' : 'Confirm & Update Password'}
              </Button>
              <Button type="button" variant="outline" disabled={pwLoading}
                onClick={() => { setOtpStep(false); setPendingPasswords(null); setOtpCode(''); setPwError(null); }}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Current Password</label>
              <Input type="password" placeholder="••••••••" {...register('currentPassword')} disabled={pwLoading} />
              {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <Input type="password" placeholder="••••••••" {...register('newPassword')} disabled={pwLoading} />
              {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm New Password</label>
              <Input type="password" placeholder="••••••••" {...register('confirmPassword')} disabled={pwLoading} />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" disabled={pwLoading}>
              {pwLoading ? 'Sending code…' : 'Change Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
