import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, Loader2, Mail, MessageCircle, Phone } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

const ngn = (n: number) => `₦${Math.round(n || 0).toLocaleString('en-NG')}`;
const wa = (phone?: string) => {
  let p = String(phone || '').replace(/[^\d]/g, '');
  if (p.startsWith('0') && p.length === 11) p = `234${p.slice(1)}`;
  return p;
};

/** Students in this school who still owe fees, with one-click reminders. */
export function OutstandingFees({ school }: { school: string }) {
  const [open, setOpen] = useState(true);
  const { data, isLoading } = useQuery({ queryKey: ['fee-balances', school], queryFn: () => apiClient.get<any>('/erp/school/balances', { school }) });
  const remind = useMutation({
    mutationFn: (id: number) => apiClient.post<any>(`/erp/school/balances/${id}/remind`, {}),
    onSuccess: (_d, _id) => toast.success('Reminder sent'),
    onError: (e: any) => toast.fromError(e, 'Could not send the reminder'),
  });
  if (isLoading || !data?.students?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-amber-200 dark:border-amber-900/50 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-5 py-3.5 text-left bg-amber-50/60 dark:bg-amber-500/5">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <span className="font-semibold text-gray-900 dark:text-white text-sm">Outstanding fees</span>
        <span className="text-xs text-gray-600 dark:text-gray-300">{data.students.length} student{data.students.length > 1 ? 's' : ''} owe <b>{ngn(data.total)}</b></span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 ml-auto transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50 dark:bg-gray-900/50">
              <tr><th className="text-left px-5 py-2">Student</th><th className="text-left px-5 py-2">Course</th><th className="text-right px-5 py-2">Fee</th><th className="text-right px-5 py-2">Paid</th><th className="text-right px-5 py-2">Balance</th><th className="text-left px-5 py-2">Last payment</th><th className="px-5 py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.students.map((s: any) => {
                const phone = s.phone || s.guardianPhone;
                return (
                  <tr key={s.enrollmentId}>
                    <td className="px-5 py-2.5"><p className="font-medium text-gray-900 dark:text-white">{s.name || '—'}</p><p className="text-[11px] text-gray-500">{s.studentNumber || ''}{s.guardianName ? ` · guardian ${s.guardianName}` : ''}</p></td>
                    <td className="px-5 py-2.5 text-gray-700 dark:text-gray-300">{s.course}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{ngn(s.fee)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">{ngn(s.paid)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">{ngn(s.balance)}</td>
                    <td className="px-5 py-2.5 text-xs text-gray-500">{s.lastPayment ? new Date(s.lastPayment).toLocaleDateString('en-GB') : 'No payment yet'}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {(s.email || s.guardianEmail) && <button title="Email a reminder" disabled={remind.isPending} onClick={() => remind.mutate(s.enrollmentId)} className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">{remind.isPending && remind.variables === s.enrollmentId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}</button>}
                        {phone && <a title="WhatsApp" target="_blank" rel="noreferrer" href={`https://wa.me/${wa(phone)}?text=${encodeURIComponent(`Hello ${s.name || ''}, this is a friendly reminder that your balance for ${s.course} is ${ngn(s.balance)}. Thank you.`)}`} className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"><MessageCircle className="h-4 w-4" /></a>}
                        {phone && <a title="Call" href={`tel:${phone}`} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"><Phone className="h-4 w-4" /></a>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
