import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSignature, Plus, X, Send, Eye, Trash2, Printer, Loader2, Plus as PlusIcon,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useAuth } from '@/contexts/AuthContext';

type ProposalStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';

const STATUS_STYLES: Record<ProposalStatus, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Sent: 'bg-blue-100 text-blue-700',
  Accepted: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-rose-100 text-rose-700',
  Expired: 'bg-amber-100 text-amber-700',
};

interface LineItem { description: string; qty: number; unitPrice: number; }
interface ClientOption { id: number; fullName: string; email: string; clientId: string; }
interface Proposal {
  id: number; quoteCode: string; title: string; status: ProposalStatus;
  client?: { fullName: string; email?: string }; department?: { name: string; code: string };
  scopeOfWork?: string; termsAndConditions?: string; items?: LineItem[];
  subtotal: number; discount: number; tax: number; total: number; currency: string;
  validUntil: string; quoteDate: string;
}

const INIT_FORM = {
  clientId: '', title: '', scopeOfWork: '', termsAndConditions: '',
  validUntil: '', discountRate: 0, taxRate: 0,
  items: [{ description: '', qty: 1, unitPrice: 0 }] as LineItem[],
};

function calcLine(item: LineItem) { return item.qty * item.unitPrice; }

function printProposal(p: Proposal) {
  const fmt = (n: number) => `${p.currency} ${Number(n).toLocaleString()}`;
  const itemRows = (p.items ?? []).map(it => `
    <tr>
      <td style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;">${it.description}</td>
      <td style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;text-align:center;">${it.qty}</td>
      <td style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;text-align:right;">${fmt(it.unitPrice)}</td>
      <td style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;font-weight:600;text-align:right;">${fmt(it.qty * it.unitPrice)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>${p.title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; background:#f4f6fb; padding:20px; }
    .page { max-width:700px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.1); }
    .print-btn { display:block; text-align:center; margin:24px auto 0; padding:10px 28px; background:#4f46e5; color:white; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; }
    @media print { .print-btn { display:none; } body { background:white; padding:0; } .page { box-shadow:none; border-radius:0; } }
  </style></head>
  <body>
    <div class="page">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;color:white;">
        <p style="opacity:0.75;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Proposal ${p.quoteCode}</p>
        <h1 style="font-size:22px;font-weight:700;">${p.title}</h1>
        <p style="opacity:0.85;font-size:12px;margin-top:6px;">Prepared for ${p.client?.fullName ?? ''}</p>
      </div>
      <div style="padding:32px 40px;">
        ${p.scopeOfWork ? `<p style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;margin-bottom:6px;">Scope of Work</p><p style="font-size:13px;line-height:1.7;white-space:pre-line;margin-bottom:22px;">${p.scopeOfWork}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:18px;">
          <thead style="background:#f3f4f6;"><tr>
            <th style="padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7280;">Description</th>
            <th style="padding:10px 14px;text-align:center;font-size:10px;text-transform:uppercase;color:#6b7280;">Qty</th>
            <th style="padding:10px 14px;text-align:right;font-size:10px;text-transform:uppercase;color:#6b7280;">Unit Price</th>
            <th style="padding:10px 14px;text-align:right;font-size:10px;text-transform:uppercase;color:#6b7280;">Amount</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr><td colspan="3" style="padding:8px 14px;text-align:right;font-size:12px;color:#6b7280;">Subtotal</td><td style="padding:8px 14px;text-align:right;font-size:12px;">${fmt(p.subtotal)}</td></tr>
            ${Number(p.discount) > 0 ? `<tr><td colspan="3" style="padding:8px 14px;text-align:right;font-size:12px;color:#6b7280;">Discount</td><td style="padding:8px 14px;text-align:right;font-size:12px;">-${fmt(p.discount)}</td></tr>` : ''}
            ${Number(p.tax) > 0 ? `<tr><td colspan="3" style="padding:8px 14px;text-align:right;font-size:12px;color:#6b7280;">Tax</td><td style="padding:8px 14px;text-align:right;font-size:12px;">${fmt(p.tax)}</td></tr>` : ''}
            <tr style="background:#f0f4ff;"><td colspan="3" style="padding:12px 14px;text-align:right;font-size:14px;font-weight:700;color:#4f46e5;">Total</td><td style="padding:12px 14px;text-align:right;font-size:15px;font-weight:700;color:#4f46e5;">${fmt(p.total)}</td></tr>
          </tfoot>
        </table>
        <p style="font-size:11px;color:#9ca3af;margin-bottom:18px;">Valid until ${new Date(p.validUntil).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        ${p.termsAndConditions ? `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:18px 22px;"><p style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;margin-bottom:6px;">Terms &amp; Conditions</p><p style="font-size:13px;line-height:1.7;white-space:pre-line;">${p.termsAndConditions}</p></div>` : ''}
      </div>
    </div>
    <button class="print-btn" onclick="window.print()">Print Proposal</button>
  </body></html>`;

  window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
}

export function ProposalList() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<Proposal | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [formError, setFormError] = useState('');

  const canCreate = hasPermission('crm.quote.create.all') || hasPermission('crm.quote.create.own_department');
  const canSend = hasPermission('crm.quote.send.all') || hasPermission('crm.quote.send.own_department');
  const canDelete = hasPermission('crm.quote.delete.all') || hasPermission('crm.quote.delete.own_department');

  const { data, isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => apiClient.getRaw('/quotes', { page: 1, limit: 50 }),
  });
  const proposals: Proposal[] = (data as any)?.data ?? [];

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'for-proposal-pick'],
    queryFn: () => apiClient.getRaw('/clients', { page: 1, limit: 200 }),
    enabled: showCreate,
  });
  const clientOptions: ClientOption[] = (clientsData as any)?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      const subtotal = form.items.reduce((s, it) => s + calcLine(it), 0);
      const discount = subtotal * form.discountRate / 100;
      const tax = (subtotal - discount) * form.taxRate / 100;
      return apiClient.post('/quotes', {
        clientId: Number(form.clientId), title: form.title, scopeOfWork: form.scopeOfWork || undefined,
        termsAndConditions: form.termsAndConditions || undefined, items: form.items,
        validUntil: form.validUntil, subtotal, discount, tax, total: subtotal - discount + tax, currency: 'NGN',
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); setShowCreate(false); setForm(INIT_FORM); setFormError(''); },
    onError: (err: any) => setFormError(err?.response?.data?.message || err?.message || 'Failed to create proposal'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/quotes/${id}/send`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/quotes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals'] }),
  });

  const setItem = (idx: number, key: keyof LineItem, val: string | number) => {
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [key]: val } : item) }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proposals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Draft and send client proposals with your terms &amp; conditions</p>
        </div>
        {canCreate && (
          <button onClick={() => { setFormError(''); setShowCreate(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
            <Plus className="w-4 h-4" /> New Proposal
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {proposals.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <FileSignature className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.quoteCode} • {p.client?.fullName} • {p.department?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{p.currency} {Number(p.total).toLocaleString()}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                  <button onClick={() => setViewing(p)} className="p-1.5 text-gray-400 hover:text-indigo-600" title="View"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => printProposal(p)} className="p-1.5 text-gray-400 hover:text-indigo-600" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                  {canSend && p.status === 'Draft' && (
                    <button onClick={() => sendMutation.mutate(p.id)} disabled={sendMutation.isPending} className="p-1.5 text-gray-400 hover:text-blue-600" title="Send to Client"><Send className="w-3.5 h-3.5" /></button>
                  )}
                  {canDelete && p.status === 'Draft' && (
                    <button onClick={() => { if (confirm(`Delete proposal ${p.quoteCode}?`)) deleteMutation.mutate(p.id); }} className="p-1.5 text-gray-400 hover:text-rose-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
            {proposals.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileSignature className="w-10 h-10 mb-3" />
                <p className="font-medium">No proposals yet</p>
                <p className="text-sm mt-1">Create one to send to a client</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Proposal</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-3 py-2 text-xs">{formError}</div>}

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. SAT Bootcamp Partnership Proposal"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                  <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900">
                    <option value="">Select a client</option>
                    {clientOptions.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.clientId})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valid Until *</label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Scope of Work</label>
                <textarea value={form.scopeOfWork} onChange={e => setForm(f => ({ ...f, scopeOfWork: e.target.value }))} rows={3}
                  placeholder="What will we deliver?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Terms &amp; Conditions</label>
                <textarea value={form.termsAndConditions} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} rows={3}
                  placeholder="Payment terms, deposit requirements, validity, etc."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Line Items</label>
                  <button onClick={() => setForm(f => ({ ...f, items: [...f.items, { description: '', qty: 1, unitPrice: 0 }] }))}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"><PlusIcon className="w-3 h-3" /> Add Item</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input value={item.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Description"
                        className="col-span-6 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900" />
                      <input type="number" min={1} value={item.qty} onChange={e => setItem(i, 'qty', Number(e.target.value))}
                        className="col-span-2 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-center" />
                      <input type="number" min={0} value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', Number(e.target.value))}
                        className="col-span-3 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-right" />
                      {form.items.length > 1 && (
                        <button onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))} className="col-span-1 text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                  <input type="number" value={form.discountRate} onChange={e => setForm(f => ({ ...f, discountRate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tax %</label>
                  <input type="number" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900" />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300">Cancel</button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!form.clientId || !form.title || !form.validUntil || createMutation.isPending}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create Proposal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{viewing.title}</h2>
              <button onClick={() => setViewing(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p><span className="text-gray-500">Client:</span> {viewing.client?.fullName}</p>
              <p><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[viewing.status]}`}>{viewing.status}</span></p>
              {viewing.scopeOfWork && <div><p className="text-gray-500 mb-1">Scope of Work</p><p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{viewing.scopeOfWork}</p></div>}
              {viewing.termsAndConditions && <div><p className="text-gray-500 mb-1">Terms &amp; Conditions</p><p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{viewing.termsAndConditions}</p></div>}
              <p className="text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-700">{viewing.currency} {Number(viewing.total).toLocaleString()}</p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => printProposal(viewing)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"><Printer className="w-3.5 h-3.5" /> Print</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProposalList;
