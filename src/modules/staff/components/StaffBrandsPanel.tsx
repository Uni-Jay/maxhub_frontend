import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Crown, Loader2, Mail, Star } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

interface BrandRow { departmentId: number; code: string; name: string; logoUrl?: string; color?: string; isPrimary: boolean; isHead: boolean; units: string[] }

/**
 * Which brands a staff member works for: the brand that employs them
 * (primary — on their payslip), every other brand they work for, and the
 * brands they head (HOD).
 */
export function StaffBrandsPanel({ staffId, canManage }: { staffId: string | number; canManage: boolean }) {
  const qc = useQueryClient();
  const { data: mine } = useQuery({ queryKey: ['staff-brands', String(staffId)], queryFn: () => apiClient.get<{ brands: BrandRow[] }>(`/erp/staff/${staffId}/brands`) });
  const { data: allBrands = [] } = useQuery({ queryKey: ['erp-brands'], queryFn: () => apiClient.get<any[]>('/erp/brands') });

  const [primary, setPrimary] = useState<number | null>(null);
  const [member, setMember] = useState<Set<number>>(new Set());
  const [head, setHead] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!mine) return;
    setPrimary(mine.brands.find((b) => b.isPrimary)?.departmentId ?? null);
    setMember(new Set(mine.brands.map((b) => b.departmentId)));
    setHead(new Set(mine.brands.filter((b) => b.isHead).map((b) => b.departmentId)));
    setDirty(false);
  }, [mine]);

  const brands: Array<{ id: number; name: string; logoUrl?: string; color?: string }> = (allBrands.length ? allBrands : mine?.brands || []).map((b: any) => ({
    id: Number(b.departmentId ?? b.id), name: b.displayName || b.name, logoUrl: b.logoUrl, color: b.primaryColor || b.color,
  }));

  const save = useMutation({
    mutationFn: () => apiClient.put(`/erp/staff/${staffId}/brands`, { primaryDepartmentId: primary, memberOf: [...member], headOf: [...head] }),
    onSuccess: () => { toast.success('Brands updated'); qc.invalidateQueries({ queryKey: ['staff-brands', String(staffId)] }); qc.invalidateQueries({ queryKey: ['staff'] }); },
    onError: (e: any) => toast.fromError(e, 'Could not update brands'),
  });
  const resend = useMutation({
    mutationFn: (resetPassword: boolean) => apiClient.post<any>(`/erp/staff/${staffId}/resend-welcome`, { resetPassword }),
    onSuccess: (_d, reset) => toast.success('Welcome email sent', reset ? 'It includes a new temporary password.' : 'Their current password was not changed.'),
    onError: (e: any) => toast.fromError(e, 'Could not send the email'),
  });

  const toggle = (set: Set<number>, id: number) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); return n; };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 md:col-span-2">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg flex items-center justify-center"><Building2 className="h-3.5 w-3.5" /></div>
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex-1">Brands</h2>
        {canManage && (
          <div className="flex items-center gap-2">
            <button onClick={() => resend.mutate(false)} disabled={resend.isPending} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              {resend.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Resend welcome email
            </button>
            <button onClick={() => { if (confirm('Send a new temporary password? Their current password will stop working.')) resend.mutate(true); }} disabled={resend.isPending} className="text-xs px-3 py-1.5 rounded-lg text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-500/10">
              …with new password
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3">Everyone works for every brand. The <b>employer</b> brand appears on their payslip; <b>Head</b> makes them HOD of that brand.</p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {brands.map((b) => {
          const isMember = member.has(b.id) || primary === b.id;
          return (
            <div key={b.id} className={cn('rounded-xl border p-3 transition', isMember ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-200 dark:border-gray-700 opacity-60')} style={primary === b.id ? { borderColor: b.color || '#4f46e5', boxShadow: `0 0 0 1px ${b.color || '#4f46e5'}` } : undefined}>
              <div className="flex items-center gap-2.5">
                {b.logoUrl ? <img src={b.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain bg-white ring-1 ring-gray-200" /> : <div className="h-9 w-9 rounded-lg bg-gray-100" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{b.name}</p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    {primary === b.id && <><Star className="h-3 w-3 text-amber-500" />Employer · </>}
                    {head.has(b.id) ? <><Crown className="h-3 w-3 text-indigo-500" />Head (HOD)</> : isMember ? 'Staff' : 'Not a member'}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Chip on={primary === b.id} onClick={() => { setPrimary(b.id); setMember(new Set([...member, b.id])); setDirty(true); }}>Employer</Chip>
                  <Chip on={isMember} disabled={primary === b.id} onClick={() => { setMember(toggle(member, b.id)); if (member.has(b.id)) setHead(new Set([...head].filter((x) => x !== b.id))); setDirty(true); }}>Member</Chip>
                  <Chip on={head.has(b.id)} onClick={() => { setHead(toggle(head, b.id)); setMember(new Set([...member, b.id])); setDirty(true); }}>Head</Chip>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {canManage && dirty && (
        <div className="flex justify-end mt-4">
          <button onClick={() => save.mutate()} disabled={save.isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save brands
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={cn('text-[11px] px-2.5 py-1 rounded-full border font-medium transition disabled:opacity-60',
        on ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400')}>
      {children}
    </button>
  );
}
