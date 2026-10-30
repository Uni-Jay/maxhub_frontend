import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserCheck, X, Loader2 } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { clientService } from '@services/clientService';

export interface ClientLite {
  id: string | number; clientId?: string; fullName: string; email?: string; phone?: string; alternatePhone?: string;
  country?: string; nationality?: string; dateOfBirth?: string; address?: string; city?: string; state?: string; departmentId?: string | number;
}

/** Full client details (the list leaves some out). */
export async function loadClient(id: string | number): Promise<ClientLite | null> {
  try { return (await clientService.getById(id)) as any; } catch { return null; }
}

/**
 * Turns a registered client into form values for a brand record, filling only
 * the fields that form actually has — the rest is left for staff to complete.
 */
export function clientToForm(c: ClientLite, fieldNames: string[]): Record<string, any> {
  const has = (n: string) => fieldNames.includes(n);
  // onboardingCompleted: they are already a registered client (ignored by records without it).
  const out: Record<string, any> = { clientId: Number(c.id), onboardingCompleted: true };
  const put = (n: string, v: any) => { if (has(n) && v !== undefined && v !== null && String(v).trim() !== '') out[n] = v; };
  put('customerName', c.fullName);
  put('customerEmail', c.email);
  put('customerPhone', c.phone);
  put('customerWhatsapp', c.alternatePhone || c.phone);
  put('customerCountry', c.country);
  put('nationality', c.nationality);
  put('dateOfBirth', c.dateOfBirth ? String(c.dateOfBirth).slice(0, 10) : undefined);
  put('customerAddress', [c.address, c.city, c.state].filter(Boolean).join(', '));
  put('address', c.address);
  put('deliveryAddress', [c.address, c.city, c.state].filter(Boolean).join(', '));
  return out;
}

/** "Use an existing client" search shown at the top of new customer forms. */
export default function ExistingClientPicker({ linked, onPick, onClear }: { linked?: { name: string; code?: string } | null; onPick: (c: ClientLite) => void; onClear: () => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const list = useQuery({
    queryKey: ['client-picker', q.trim()],
    queryFn: () => apiClient.getRaw('/clients', { search: q.trim(), limit: '8' }) as Promise<{ data: ClientLite[] }>,
    enabled: open && q.trim().length >= 2,
  });
  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const rows: ClientLite[] = (list.data as any)?.data || [];

  if (linked) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-500/10 px-3 py-2.5">
        <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="flex-1 text-sm text-emerald-900 dark:text-emerald-200">Using client <b>{linked.name}</b>{linked.code ? ` (${linked.code})` : ''} — their details are filled in below. Complete the rest.</p>
        <button type="button" onClick={onClear} className="text-xs text-emerald-800 dark:text-emerald-300 hover:underline">Change</button>
      </div>
    );
  }

  return (
    <div ref={box} className="relative rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-3">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Already a client? Find them to fill in their details</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Search registered clients by name, email or phone…"
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {(list.isFetching || loading) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
        {q && !list.isFetching && !loading && <button type="button" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-gray-400" /></button>}
      </div>
      {open && q.trim().length >= 2 && !list.isLoading && (
        <div className="absolute left-3 right-3 mt-1 z-20 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
          {!rows.length ? <p className="px-3 py-3 text-sm text-gray-500">No client matches “{q}”. Fill in the form below — you can onboard them as a client later.</p> : rows.map((c) => (
            <button type="button" key={String(c.id)} onClick={async () => { setLoading(true); const full = await loadClient(c.id); setLoading(false); setOpen(false); setQ(''); onPick(full || c); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
              <span className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">{c.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</span>
              <span className="flex-1 min-w-0"><span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{c.fullName}</span>
                <span className="block text-[11px] text-gray-500 truncate">{[c.clientId, c.email, c.phone].filter(Boolean).join(' · ')}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
