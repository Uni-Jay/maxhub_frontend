import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Printer, Ban, Loader2, Globe, Mail, Phone, MapPin, Pencil, Copy, ExternalLink, Briefcase, Building2, Users, Search } from 'lucide-react';
import { erpService, money, API_ORIGIN, type Brand } from '@services/erpService';
import { useBrands, useLiveRefresh, useRole } from '@hooks/useErp';
import { Modal, PaymentForm, openReceipt, btnGhost, btnPrimary, card, inputCls, labelCls } from '@components/erp/RecordBoard';
import { printTable, printWithLetterhead } from '@components/erp/print';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

// ─── Receipts ───────────────────────────────────────────────────────────────
export function PaymentsReceipts() {
  const qc = useQueryClient();
  const { brands, byDepartmentId } = useBrands();
  const { isManagement } = useRole();
  const [f, setF] = useState({ brand: '', q: '', from: '', to: '', status: '' });
  const [open, setOpen] = useState(false);
  useLiveRefresh(['payment']);
  const { data, isLoading } = useQuery({ queryKey: ['erp:payment:list', f], queryFn: () => erpService.payments({ ...f, limit: 300 }) });
  const voidM = useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => erpService.voidPayment(id, reason), onSuccess: () => { toast.success('Receipt voided'); qc.invalidateQueries({ queryKey: ['erp:payment:list'] }); }, onError: (e) => toast.fromError(e) });
  const items = data?.items ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments & Receipts</h1><p className="text-sm text-gray-500">Every payment across all brands, with printable branded receipts.</p></div>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={() => printTable('Payments report', ['Receipt', 'Date', 'Customer', 'Description', 'Method', 'Amount', 'Status'], items.map((p) => [p.receiptNo, new Date(p.paidAt).toLocaleDateString(), p.customerName, p.description, p.method, money(p.amount, p.currency), p.status]), f.brand ? brands.find((b) => b.code === f.brand) : null, `<p class="muted">${f.from || '…'} to ${f.to || 'today'} · Totals: ${(data?.totals || []).map((t) => money(t.total, t.currency)).join(', ') || '—'}</p>`)}><Printer className="h-4 w-4" /> Print list</button>
          <button className={btnPrimary} onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Record payment</button>
        </div>
      </div>
      <div className={cn(card, 'p-3 grid sm:grid-cols-5 gap-2')}>
        <div className="relative sm:col-span-2"><Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className={cn(inputCls, 'pl-9')} placeholder="Receipt no, customer, reference…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
        <select className={inputCls} value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })}><option value="">All brands</option>{brands.map((b) => <option key={b.code} value={b.code}>{b.displayName}</option>)}</select>
        <input type="date" className={inputCls} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} title="From" />
        <input type="date" className={inputCls} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} title="To" />
      </div>
      <div className="flex flex-wrap gap-2">{(data?.totals || []).map((t) => <div key={t.currency} className={cn(card, 'px-4 py-2')}><p className="text-[11px] text-gray-500">Total received ({t.currency})</p><p className="font-semibold text-gray-900 dark:text-white">{money(t.total, t.currency)}</p></div>)}</div>
      <div className={cn(card, 'overflow-x-auto')}>
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-10" /> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800"><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Brand</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">For</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>{items.map((p) => (
              <tr key={p.id} className={cn('border-b border-gray-50 dark:border-gray-800/60', p.status !== 'Completed' && 'opacity-60')}>
                <td className="px-4 py-3 font-mono text-xs">{p.receiptNo}{p.status !== 'Completed' && <span className="ml-1 text-red-600">({p.status})</span>}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.paidAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">{byDepartmentId(p.departmentId)?.displayName || '—'}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{p.customerName}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.description}{p.relatedCode && <div className="text-[11px] text-gray-400">{p.relatedCode}</div>}</td>
                <td className="px-4 py-3 text-right font-medium">{money(p.amount, p.currency)}<div className="text-[11px] text-gray-400">{p.method}</div></td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button className="p-1.5 text-gray-500 hover:text-indigo-600" title="Print receipt" onClick={() => openReceipt(p.id)}><Printer className="h-4 w-4" /></button>
                  {isManagement && p.status === 'Completed' && <button className="p-1.5 text-gray-500 hover:text-red-600" title="Void" onClick={() => { const reason = prompt('Reason for voiding this receipt?'); if (reason) voidM.mutate({ id: p.id, reason }); }}><Ban className="h-4 w-4" /></button>}
                </td>
              </tr>))}</tbody>
          </table>
        )}
        {!isLoading && !items.length && <p className="p-8 text-center text-sm text-gray-500">No payments found.</p>}
      </div>
      {open && <PaymentForm defaults={{ brand: f.brand }} onClose={() => setOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ['erp:payment:list'] })} />}
    </div>
  );
}

// ─── Brands hub ─────────────────────────────────────────────────────────────
const BRAND_LINKS: Record<string, { to: string; label: string }[]> = {
  VM: [{ to: '/visamax/cases', label: 'Customers & applications' }, { to: '/visamax/bookings', label: 'Bookings' }, { to: '/visamax', label: 'Service catalogue' }],
  KS: [{ to: '/kurios/solutions', label: 'ICT Solutions' }, { to: '/kurios/training', label: 'ICT Training Center' }, { to: '/kurios/solutions?tab=tickets', label: 'Support tickets' }],
  BM: [{ to: '/beadmax/custom-orders', label: 'Custom orders' }, { to: '/bead-max/sales', label: 'Shop sales & stock' }, { to: '/beadmax/school', label: 'Vocational School' }],
  MF: [{ to: '/maxfood', label: 'Export orders' }, { to: '/maxfood?tab=products', label: 'Products & stock' }],
};

function BrandEdit({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<any>({ ...brand });
  const save = useMutation({ mutationFn: () => erpService.updateBrand(brand.code, f), onSuccess: () => { toast.success('Brand updated'); qc.invalidateQueries({ queryKey: ['erp-brands'] }); onClose(); }, onError: (e) => toast.fromError(e) });
  const fields: [string, string][] = [['displayName', 'Display name'], ['tagline', 'Tagline'], ['website', 'Website'], ['email', 'Email'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['logoUrl', 'Logo URL'], ['primaryColor', 'Primary colour'], ['secondaryColor', 'Secondary colour'], ['receiptPrefix', 'Receipt prefix']];
  return (
    <Modal title={`Brand settings — ${brand.displayName}`} onClose={onClose} wide>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid sm:grid-cols-2 gap-3">
          {fields.map(([k, l]) => <div key={k}><label className={labelCls}>{l}</label><input className={inputCls} type={k.endsWith('Color') ? 'color' : 'text'} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
          <div className="sm:col-span-2"><label className={labelCls}>Address</label><textarea className={inputCls} rows={2} value={f.address || ''} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Bank details (printed on receipts)</label><textarea className={inputCls} rows={3} value={f.bankDetails || ''} onChange={(e) => setF({ ...f, bankDetails: e.target.value })} placeholder="Bank: …&#10;Account name: …&#10;Account number: …" /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Receipt / letter footer</label><input className={inputCls} value={f.footerNote || ''} onChange={(e) => setF({ ...f, footerNote: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={save.isPending}>Save</button></div>
      </form>
    </Modal>
  );
}

export function BrandsHub() {
  const { brands, logo, headOffice, isLoading } = useBrands();
  const { isManagement } = useRole();
  const [edit, setEdit] = useState<Brand | null>(null);
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">MaxHub Brands</h1>
        <p className="text-sm text-gray-500">Each brand is a department; brands with several lines of business have divisions. {headOffice ? `Branch: ${headOffice.branchName}.` : ''}</p></div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-10" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {brands.map((b) => (
            <div key={b.code} className={cn(card, 'overflow-hidden flex flex-col')}>
              <div className="h-1.5" style={{ background: b.primaryColor || '#4f46e5' }} />
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-28 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">{logo(b) ? <img src={logo(b)} alt={b.displayName} className="max-h-14 max-w-[104px] object-contain" /> : <Building2 className="h-6 w-6 text-gray-300" />}</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{b.displayName}</h2>
                    <p className="text-xs text-gray-500">{b.tagline}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Users className="h-3 w-3" /> {b.department?.staffCount ?? 0} staff{b.department?.headName?.trim() ? ` · Head: ${b.department.headName}` : ''}</p>
                  </div>
                  {isManagement && <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setEdit(b)} title="Edit brand"><Pencil className="h-4 w-4" /></button>}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{b.description}</p>
                {!!b.divisions?.length && <div className="flex flex-wrap gap-1.5">{b.divisions.map((d: any) => <span key={d.id} className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{d.name.replace(/^.*— /, '')}{d.headName?.trim() ? ` · ${d.headName}` : ''}</span>)}</div>}
                <div className="text-xs text-gray-500 space-y-1">
                  {b.website && <p className="flex items-center gap-1.5"><Globe className="h-3 w-3" /><a href={b.website} target="_blank" rel="noreferrer" className="hover:underline">{b.website.replace(/^https?:\/\//, '')}</a></p>}
                  {b.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{b.email}</p>}
                  {b.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{b.phone}</p>}
                  {b.address && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{b.address}</p>}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2">
                {(BRAND_LINKS[b.code] || []).map((l) => <NavLink key={l.to} to={l.to} className={btnGhost}>{l.label}</NavLink>)}
                <NavLink to={`/documents?brand=${b.code}`} className={btnGhost}>Documents</NavLink>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <BrandEdit brand={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

// ─── Monday weekly summary ──────────────────────────────────────────────────
export function WeeklySummary() {
  const [week, setWeek] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['erp:summary', week], queryFn: () => erpService.weeklySummary(week || undefined) });
  const print = () => {
    if (!data) return;
    const rows = data.brands.map((b: any) => `<tr><td><strong>${b.name}</strong></td><td>${Object.entries(b.newRecords).filter(([, n]) => Number(n) > 0).map(([k, n]) => `${k.replace(/([A-Z])/g, ' $1')}: ${n}`).join(', ') || '—'}</td><td>${b.payments.map((p: any) => money(p.total, p.currency)).join(', ') || '—'}</td><td>${b.openTickets}${b.overdueTickets ? ` (${b.overdueTickets} overdue)` : ''}</td><td>${b.renewalsNext30}</td><td>${b.documentsSigned} / ${b.documentsPending}</td></tr>`).join('');
    printWithLetterhead('Weekly business summary', `<h1>Weekly business summary</h1><p class="muted">${new Date(data.period.start).toDateString()} – ${new Date(data.period.end).toDateString()}</p>
<table><tr><th>Brand</th><th>New records</th><th>Payments</th><th>Open tickets</th><th>Renewals (30d)</th><th>Docs signed / pending</th></tr>${rows}</table>
<h3>People</h3><table><tr><th>Weekly reports submitted</th><td>${data.hr.weeklyReportsSubmitted}</td></tr><tr><th>Missing (week ending ${data.hr.weekEnding})</th><td>${data.hr.weeklyReportsMissing.join(', ') || 'None 🎉'}</td></tr><tr><th>Pending leave requests</th><td>${data.hr.pendingLeave}</td></tr><tr><th>New job applicants</th><td>${data.hr.newApplicants}</td></tr></table>`);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monday Weekly Report</h1><p className="text-sm text-gray-500">Sent to Super Admin & Admin every Monday at 8:00 AM. Staff weekly reports are due Monday morning (reminder 7:30, escalation at noon).</p></div>
        <div className="flex gap-2 items-end">
          <div><label className={labelCls}>Week starting</label><input type="date" className={inputCls} value={week} onChange={(e) => setWeek(e.target.value)} /></div>
          <button className={btnGhost} onClick={print} disabled={!data}><Printer className="h-4 w-4" /> Print</button>
          <NavLink to="/hr/weekly-report" className={btnPrimary}>Staff weekly reports</NavLink>
        </div>
      </div>
      {isLoading || !data ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-10" /> : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {data.brands.map((b: any) => (
              <div key={b.code} className={cn(card, 'p-4 space-y-2')}>
                <p className="font-semibold text-gray-900 dark:text-white">{b.name}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.values(b.newRecords).reduce((a: number, n: any) => a + Number(n), 0)}<span className="text-xs font-normal text-gray-500"> new records</span></p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{b.payments.length ? b.payments.map((p: any) => money(p.total, p.currency)).join(' · ') : 'No payments'}</p>
                <div className="text-xs text-gray-500 space-y-0.5"><p>Open tickets: {b.openTickets}{b.overdueTickets ? <span className="text-red-600"> ({b.overdueTickets} overdue)</span> : ''}</p><p>Renewals in 30 days: {b.renewalsNext30}</p><p>Documents signed: {b.documentsSigned} · awaiting: {b.documentsPending}</p></div>
              </div>
            ))}
          </div>
          <div className={cn(card, 'p-4 grid sm:grid-cols-4 gap-4')}>
            <div><p className="text-xs text-gray-500">Weekly reports submitted</p><p className="text-xl font-semibold text-gray-900 dark:text-white">{data.hr.weeklyReportsSubmitted}</p></div>
            <div className="sm:col-span-3"><p className="text-xs text-gray-500">Missing for week ending {data.hr.weekEnding}</p><p className="text-sm text-gray-800 dark:text-gray-200">{data.hr.weeklyReportsMissing.join(', ') || 'Everyone has submitted 🎉'}</p></div>
            <div><p className="text-xs text-gray-500">Pending leave</p><p className="text-xl font-semibold text-gray-900 dark:text-white">{data.hr.pendingLeave}</p></div>
            <div><p className="text-xs text-gray-500">New job applicants</p><p className="text-xl font-semibold text-gray-900 dark:text-white">{data.hr.newApplicants}</p></div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Careers feed / website widget ──────────────────────────────────────────
export function CareersWidget() {
  const { brands } = useBrands();
  const [brand, setBrand] = useState('VM');
  const b = brands.find((x) => x.code === brand);
  const snippet = `<div id="maxhub-careers"></div>\n<script src="${API_ORIGIN}/api/public/jobs/widget.js?brand=${brand}&color=${encodeURIComponent(b?.primaryColor || '#1d3a8f')}" async></script>`;
  const { data: jobs = [] } = useQuery({ queryKey: ['public-jobs', brand], queryFn: () => fetch(`${API_ORIGIN}/api/public/jobs?brand=${brand}`).then((r) => r.json()).then((r) => r.data || []) });
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Careers on our websites</h1>
        <p className="text-sm text-gray-500">When a job in Recruitment is set to <strong>Open</strong>, it appears automatically on the brand website's careers section, and applications come straight back into Recruitment.</p></div>
      <div className={cn(card, 'p-4 space-y-3')}>
        <div className="flex flex-wrap gap-2">{brands.map((x) => <button key={x.code} onClick={() => setBrand(x.code)} className={cn('px-3 py-1.5 rounded-lg text-sm border', brand === x.code ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>{x.displayName}</button>)}</div>
        <p className="text-sm text-gray-600 dark:text-gray-300">Paste this once into the careers page of {b?.website ? <a href={b.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{b.website.replace(/^https?:\/\//, '')}</a> : 'the website'}:</p>
        <pre className="text-xs bg-gray-900 text-emerald-300 rounded-xl p-3 overflow-x-auto">{snippet}</pre>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={() => { navigator.clipboard.writeText(snippet); toast.success('Embed code copied'); }}><Copy className="h-4 w-4" /> Copy code</button>
          <a className={btnGhost} href={`${API_ORIGIN}/api/public/jobs?brand=${brand}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> JSON feed</a>
          <NavLink to="/hr/jobs" className={btnPrimary}><Briefcase className="h-4 w-4" /> Manage jobs</NavLink>
        </div>
      </div>
      <div className={cn(card, 'p-4')}>
        <p className="font-medium text-gray-900 dark:text-white mb-2">Live now on {b?.displayName}: {jobs.length} open position(s)</p>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">{jobs.map((j: any) => <li key={j.code} className="py-2 text-sm"><span className="font-medium text-gray-900 dark:text-white">{j.title}</span> <span className="text-gray-500">· {j.jobType} · closes {new Date(j.closingDate).toLocaleDateString()}</span></li>)}</ul>
        {!jobs.length && <p className="text-sm text-gray-500">No open jobs for this brand. Set a job's business unit to this brand and its status to Open.</p>}
      </div>
    </div>
  );
}
