import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, KeyRound, Copy, Loader2, PowerOff, GraduationCap, Calculator, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';

interface Row { key: 'student' | 'accountant'; email: string; role: string; exists: boolean; active: boolean; lastLoginAt: string | null }
interface Fresh { key: string; email: string; role: string; password: string }

const ICON = { student: GraduationCap, accountant: Calculator };
const LABEL = { student: 'Test student', accountant: 'Test accountant' };

/** Super Admin: sign-ins for trying MaxHub as a student or accountant — no emailed code. */
export default function TestAccountsCard() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['test-accounts'], queryFn: () => apiClient.get<Row[]>('/erp/test-accounts') });
  const [fresh, setFresh] = useState<Fresh[]>([]);
  const [show, setShow] = useState(false);
  const reset = useMutation({
    mutationFn: (key?: string) => apiClient.post<Fresh[]>('/erp/test-accounts/reset', key ? { key } : {}),
    onSuccess: (d: any) => {
      const rows: Fresh[] = Array.isArray(d) ? d : d?.data || [];
      setFresh((prev) => [...prev.filter((p) => !rows.some((r) => r.key === p.key)), ...rows]);
      setShow(true);
      qc.invalidateQueries({ queryKey: ['test-accounts'] });
      toast.success('Test sign-ins ready', 'Copy the passwords now — they are shown only once.');
    },
    onError: (e) => toast.fromError(e),
  });
  const disable = useMutation({
    mutationFn: () => apiClient.post('/erp/test-accounts/disable', {}),
    onSuccess: () => { setFresh([]); qc.invalidateQueries({ queryKey: ['test-accounts'] }); toast.success('Test sign-ins switched off'); },
    onError: (e) => toast.fromError(e),
  });
  const rows: Row[] = (list.data as any)?.data || (list.data as any) || [];
  const copy = (t: string, what: string) => navigator.clipboard.writeText(t).then(() => toast.success(`${what} copied`));
  const anyActive = rows.some((r) => r.active);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center"><FlaskConical className="h-5 w-5 text-amber-600" /></div>
        <div className="flex-1 min-w-[220px]">
          <h2 className="font-semibold text-gray-900 dark:text-white">Test accounts</h2>
          <p className="text-sm text-gray-500 mt-0.5">Sign in as a student or an accountant to try MaxHub. These sign in <b>without the emailed code</b>, use a test email that can never receive mail, and don't affect any real staff or student.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => reset.mutate(undefined)} disabled={reset.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
            {reset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{rows.some((r) => r.exists) ? 'New passwords' : 'Create test sign-ins'}
          </button>
          {anyActive && (
            <button onClick={() => { if (confirm('Switch off both test sign-ins? You can turn them on again any time.')) disable.mutate(); }} disabled={disable.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><PowerOff className="h-4 w-4" />Switch off</button>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {(rows.length ? rows : (['student', 'accountant'] as const).map((k) => ({ key: k, email: '', role: k, exists: false, active: false, lastLoginAt: null }))).map((r) => {
          const Icon = ICON[r.key]; const f = fresh.find((x) => x.key === r.key);
          return (
            <div key={r.key} className="rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-indigo-500" />
                <p className="font-semibold text-sm text-gray-900 dark:text-white flex-1">{LABEL[r.key]}</p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{r.active ? 'On' : r.exists ? 'Off' : 'Not created'}</span>
              </div>
              {r.email && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><span className="w-20 text-xs text-gray-500">Email</span><code className="flex-1 truncate text-gray-800 dark:text-gray-200">{r.email}</code>
                    <button onClick={() => copy(r.email, 'Email')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Copy"><Copy className="h-3.5 w-3.5 text-gray-500" /></button></div>
                  <div className="flex items-center gap-2"><span className="w-20 text-xs text-gray-500">Password</span>
                    {f ? <>
                      <code className="flex-1 truncate text-gray-800 dark:text-gray-200">{show ? f.password : '••••••••••••••'}</code>
                      <button onClick={() => setShow(!show)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title={show ? 'Hide' : 'Show'}>{show ? <EyeOff className="h-3.5 w-3.5 text-gray-500" /> : <Eye className="h-3.5 w-3.5 text-gray-500" />}</button>
                      <button onClick={() => copy(f.password, 'Password')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Copy"><Copy className="h-3.5 w-3.5 text-gray-500" /></button>
                    </> : <span className="flex-1 text-xs text-gray-500">Hidden — click “New passwords” to get a fresh one</span>}
                  </div>
                  {r.lastLoginAt && <p className="text-xs text-gray-400">Last signed in {new Date(r.lastLoginAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">Tip: open a private/incognito window to sign in as the test account, so you stay signed in as yourself here. The test student is enrolled under Kurios SAT with student number TEST-STUDENT.</p>
    </div>
  );
}
