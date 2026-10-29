import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, ShoppingBag, ChevronRight } from 'lucide-react';
import { apiClient } from '@services/apiClient';

/** Small reminders on the dashboard: policies to accept and purchase requests to approve. */
export function ActionNudges() {
  const pol = useQuery({ queryKey: ['policies'], queryFn: () => apiClient.get<any>('/erp/policies'), staleTime: 60_000 });
  const pur = useQuery({ queryKey: ['purchases'], queryFn: () => apiClient.get<any[]>('/erp/purchases'), staleTime: 60_000 });
  const toAccept = (pol.data?.policies || []).filter((p: any) => p.forMe && p.status === 'Published' && !p.myAcceptedAt);
  const toApprove = (pur.data || []).filter((r: any) => r.canApprove || r.canBuy);
  if (!toAccept.length && !toApprove.length) return null;
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2">
      {toAccept.length > 0 && (
        <Link to={`/policies?open=${toAccept[0].id}`} className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 hover:shadow-sm">
          <ScrollText className="h-5 w-5 text-amber-600" />
          <span className="flex-1 text-sm text-amber-900 dark:text-amber-200"><b>{toAccept.length} polic{toAccept.length === 1 ? 'y' : 'ies'}</b> to read and accept</span>
          <ChevronRight className="h-4 w-4 text-amber-600" />
        </Link>
      )}
      {toApprove.length > 0 && (
        <Link to="/purchases" className="flex items-center gap-3 rounded-2xl border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-500/10 px-4 py-3 hover:shadow-sm">
          <ShoppingBag className="h-5 w-5 text-violet-600" />
          <span className="flex-1 text-sm text-violet-900 dark:text-violet-200"><b>{toApprove.length} purchase request{toApprove.length === 1 ? '' : 's'}</b> waiting for you</span>
          <ChevronRight className="h-4 w-4 text-violet-600" />
        </Link>
      )}
    </div>
  );
}
