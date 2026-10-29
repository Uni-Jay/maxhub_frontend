import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Search, X, LayoutGrid, List, Loader2, Pencil, Trash2, Printer, MessageCircle, Mail, Send,
  StickyNote, Phone, Receipt, FileSignature, ChevronRight, RefreshCw, ExternalLink, ClipboardList,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { erpService, money, type Payment } from '@services/erpService';
import { apiClient } from '@services/apiClient';
import { useBrands, useLiveRefresh, useRole } from '@hooks/useErp';
import { toast } from '@components/ui/toaster';
import { printReceipt, printRecord, printSignedDocument } from './print';
import { cn } from '@utils/cn';
import { useBrandStyle } from './BrandTheme';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'money' | 'date' | 'datetime' | 'textarea' | 'select' | 'checkbox' | 'user' | 'currency';
  options?: string[];
  required?: boolean;
  span?: 1 | 2;
  placeholder?: string;
  default?: any;
  hideInForm?: boolean;
  /** Only shown when creating (e.g. opening stock — later changes go through stock movements). */
  createOnly?: boolean;
  /** Field holding the currency for a money value (defaults to `currency`). */
  currencyField?: string;
}

export interface ColumnDef { key: string; label: string; render?: (r: any) => ReactNode; className?: string }

export interface RecordBoardConfig {
  base: string;
  entity: string;
  title: string;
  subtitle?: string;
  singular: string;
  brandCode: string;
  brandChoices?: { code: string; label: string }[];
  fields: FieldDef[];
  columns: ColumnDef[];
  stageField?: 'stage' | 'status';
  titleOf: (r: any) => string;
  subtitleOf?: (r: any) => string;
  amountOf?: (r: any) => number;
  currencyOf?: (r: any) => string;
  allowPayments?: boolean;
  allowDocuments?: boolean;
  allowMessage?: boolean;
  allowBoard?: boolean;
  detailExtras?: (r: any, refresh: () => void) => ReactNode;
  formExtras?: (form: any, set: (patch: any) => void) => ReactNode;
  headerExtras?: ReactNode;
  /** Full-width block under the title (e.g. stock summary tiles). */
  summary?: ReactNode;
  emptyHint?: string;
}

export const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none brand-ring placeholder-gray-400';
export const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';
export const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl brand-bg text-sm font-medium disabled:opacity-50 transition';
export const btnGhost = 'inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition';
export const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl';

const STAGE_TONES = ['bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'];
const BAD = /cancel|reject|expired|declined|lost/i;
const GOOD = /deliver|complet|approved|travelled|closed|resolved|signed|active|ticketed|confirmed/i;
export function stageTone(stage: string, stages: string[]) {
  if (BAD.test(stage)) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (GOOD.test(stage)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  const i = Math.max(stages.indexOf(stage), 0);
  return STAGE_TONES[i % STAGE_TONES.length];
}

export function StageBadge({ stage, stages }: { stage: string; stages: string[] }) {
  return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap', stageTone(stage, stages))}>{stage}</span>;
}

export function usePeople() {
  return useQuery({ queryKey: ['erp-people'], queryFn: () => apiClient.get<{ id: number; name: string; email: string; position?: string }[]>('/erp/people'), staleTime: 5 * 60_000 });
}

function fmt(v: any, f: FieldDef, row: any, people: any[]) {
  if (v === null || v === undefined || v === '') return '—';
  if (f.type === 'money') return money(v, (f.currencyField && row[f.currencyField]) || row.currency || 'NGN');
  if (f.type === 'date') return new Date(v).toLocaleDateString();
  if (f.type === 'datetime') return new Date(v).toLocaleString();
  if (f.type === 'checkbox') return v ? 'Yes' : 'No';
  if (f.type === 'user') return people.find((p) => String(p.id) === String(v))?.name || `User #${v}`;
  return String(v);
}

function toInput(v: any, type?: string) {
  if (v === null || v === undefined) return '';
  if (type === 'date') return String(v).slice(0, 10);
  if (type === 'datetime') { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  return v;
}

export const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'CAD', 'AED', 'QAR', 'SAR', 'GHS', 'ZAR', 'CNY', 'KES'];

// ─── Form modal ─────────────────────────────────────────────────────────────
function RecordForm({ cfg, initial, onClose, onSaved }: { cfg: RecordBoardConfig; initial: any | null; onClose: () => void; onSaved: (r: any) => void }) {
  const { data: people = [] } = usePeople();
  const { departments } = useBrands();
  const [form, setForm] = useState<any>(() => {
    // Show the record's own brand/division in the brand picker when editing.
    const deptCode = initial ? departments.find((d: any) => String(d.id) === String(initial.departmentId))?.code : undefined;
    const initialBrand = initial
      ? (cfg.brandChoices?.some((c) => c.code === deptCode) ? deptCode : initial.departmentId ?? '')
      : cfg.brandCode;
    const f: any = { brand: initialBrand };
    for (const d of cfg.fields) f[d.name] = initial ? toInput(initial[d.name], d.type) : (d.default ?? (d.type === 'checkbox' ? false : ''));
    if (initial && initial.items !== undefined) f.items = initial.items; // line items are edited inside the form (formExtras)
    return f;
  });
  const set = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));
  const save = useMutation({
    mutationFn: () => {
      const payload: any = { ...form };
      for (const d of cfg.fields) if (d.type === 'datetime' && payload[d.name]) payload[d.name] = new Date(payload[d.name]).toISOString();
      return initial ? erpService.update(cfg.base, initial.id, payload) : erpService.create(cfg.base, payload);
    },
    onSuccess: (r: any) => { toast.success(initial ? `${cfg.singular} updated` : `${cfg.singular} created`, r?.code); onSaved(r); },
    onError: (e) => toast.fromError(e),
  });
  const missing = cfg.fields.filter((f) => f.required && !String(form[f.name] ?? '').trim()).map((f) => f.label);

  return (
    <Modal title={initial ? `Edit ${cfg.singular} ${initial.code}` : `New ${cfg.singular}`} onClose={onClose} wide>
      <form onSubmit={(e) => { e.preventDefault(); if (missing.length) { toast.error('Please fill in the required fields', missing.join(', ')); return; } save.mutate(); }} className="space-y-4">
        {cfg.brandChoices && cfg.brandChoices.length > 1 && (
          <div>
            <label className={labelCls}>Brand / department</label>
            <select className={inputCls} value={String(form.brand)} onChange={(e) => set({ brand: e.target.value })}>
              {cfg.brandChoices.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cfg.fields.filter((f) => !f.hideInForm && !(f.createOnly && initial)).map((f) => (
            <div key={f.name} className={cn(f.span === 2 || f.type === 'textarea' ? 'sm:col-span-2' : '')}>
              <label className={labelCls}>{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
              {f.type === 'textarea' ? (
                <textarea rows={3} className={inputCls} value={form[f.name] ?? ''} placeholder={f.placeholder} onChange={(e) => set({ [f.name]: e.target.value })} />
              ) : f.type === 'select' ? (
                <select className={inputCls} value={form[f.name] ?? ''} onChange={(e) => set({ [f.name]: e.target.value })}>
                  <option value="">Select…</option>
                  {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'currency' ? (
                <select className={inputCls} value={form[f.name] || 'NGN'} onChange={(e) => set({ [f.name]: e.target.value })}>
                  {CURRENCIES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'user' ? (
                <select className={inputCls} value={form[f.name] ?? ''} onChange={(e) => set({ [f.name]: e.target.value })}>
                  <option value="">Unassigned</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.position ? ` — ${p.position}` : ''}</option>)}
                </select>
              ) : f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 py-2">
                  <input type="checkbox" checked={!!form[f.name]} onChange={(e) => set({ [f.name]: e.target.checked })} /> {f.placeholder || 'Yes'}
                </label>
              ) : (
                <input className={inputCls} type={f.type === 'money' ? 'number' : f.type === 'datetime' ? 'datetime-local' : f.type || 'text'} step={f.type === 'money' ? '0.01' : undefined}
                  value={form[f.name] ?? ''} placeholder={f.placeholder} onChange={(e) => set({ [f.name]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
        {cfg.formExtras?.(form, set)}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
        </div>
      </form>
    </Modal>
  );
}

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center bg-black/50 p-3 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn(card, 'w-full shadow-2xl my-6', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );
}

/** For foreign-currency payments: shows the naira value at today's rate and lets Accounts use the rate actually received. */
function FxHint({ f, setF }: { f: any; setF: (v: any) => void }) {
  const { data } = useQuery({ queryKey: ['fx'], queryFn: () => apiClient.get<any>('/erp/fx'), staleTime: 10 * 60_000 });
  const rate = Number(data?.rates?.find((r: any) => r.currency === f.currency)?.rate || 0);
  const used = Number(f.fxRate) > 0 ? Number(f.fxRate) : rate;
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 grid grid-cols-2 gap-3 items-end">
      <div><label className={labelCls}>Naira per 1 {f.currency}</label><input type="number" step="0.0001" className={inputCls} placeholder={rate ? String(rate) : 'Set in Currencies & Rates'} value={f.fxRate || ''} onChange={(e) => setF({ ...f, fxRate: e.target.value })} /></div>
      <p className="text-sm text-gray-700 dark:text-gray-300 pb-2">{used && Number(f.amount) ? <>= <b>{money(Number(f.amount) * used, 'NGN')}</b> in our books</> : <span className="text-amber-600 text-xs">No rate yet — leave blank to use the rate saved later</span>}</p>
    </div>
  );
}

// ─── Payment form (shared with Receipts page) ───────────────────────────────
export function PaymentForm({ defaults, onClose, onSaved }: { defaults: any; onClose: () => void; onSaved?: (p: Payment) => void }) {
  const { brands } = useBrands();
  const [f, setF] = useState<any>({ method: 'Transfer', currency: 'NGN', ...defaults });
  const save = useMutation({
    mutationFn: () => erpService.recordPayment(f),
    onSuccess: async (p) => {
      toast.success('Payment recorded', p.receiptNo, { label: 'Print receipt', onClick: () => openReceipt(p.id) });
      onSaved?.(p); onClose();
    },
    onError: (e) => toast.fromError(e),
  });
  return (
    <Modal title="Record payment" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {!defaults?.relatedId && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Brand</label>
              <select className={inputCls} value={f.brand || ''} onChange={(e) => setF({ ...f, brand: e.target.value })} required>
                <option value="">Select…</option>{brands.map((b) => <option key={b.code} value={b.code}>{b.displayName}</option>)}
              </select></div>
            <div><label className={labelCls}>Customer name *</label><input className={inputCls} value={f.customerName || ''} onChange={(e) => setF({ ...f, customerName: e.target.value })} required /></div>
            <div><label className={labelCls}>Phone</label><input className={inputCls} value={f.customerPhone || ''} onChange={(e) => setF({ ...f, customerPhone: e.target.value })} /></div>
            <div><label className={labelCls}>Email</label><input type="email" className={inputCls} value={f.customerEmail || ''} onChange={(e) => setF({ ...f, customerEmail: e.target.value })} /></div>
          </div>
        )}
        <div><label className={labelCls}>Description *</label><input className={inputCls} value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="e.g. Visa processing fee (first installment)" required /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><label className={labelCls}>Amount *</label><input type="number" step="0.01" min="0" className={inputCls} value={f.amount || ''} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></div>
          <div><label className={labelCls}>Currency</label><select className={inputCls} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        {f.currency !== 'NGN' && <FxHint f={f} setF={setF} />}
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Method</label><select className={inputCls} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{['Transfer', 'Cash', 'POS', 'Card', 'Online (Paystack/Flutterwave)', 'Cheque', 'Wire Transfer'].map((m) => <option key={m}>{m}</option>)}</select></div>
          <div><label className={labelCls}>Reference</label><input className={inputCls} value={f.reference || ''} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="Bank / POS ref" /></div>
        </div>
        <div><label className={labelCls}>Date paid</label><input type="datetime-local" className={inputCls} value={f.paidAt || ''} onChange={(e) => setF({ ...f, paidAt: e.target.value })} /></div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}<Receipt className="h-4 w-4" /> Save & issue receipt</button>
        </div>
      </form>
    </Modal>
  );
}

export async function openReceipt(paymentId: number) {
  try {
    const r = await erpService.receipt(paymentId);
    printReceipt(r.payment, r.brand, r.balance);
  } catch (e) { toast.fromError(e, 'Could not load receipt'); }
}

// ─── Send document (agreement / T&C / policy) ───────────────────────────────
export function SendDocumentForm({ brandCode, related, onClose, onSent }: { brandCode?: string; related?: { type: string; id: number; name?: string; email?: string; phone?: string }; onClose: () => void; onSent?: () => void }) {
  const { data: templates = [], isLoading } = useQuery({ queryKey: ['erp:document_template', brandCode], queryFn: () => erpService.templates(brandCode ? { brand: brandCode.split('-')[0] } : undefined) });
  const [f, setF] = useState<any>({ channel: related?.email ? 'Email' : 'WhatsApp', recipientName: related?.name || '', recipientEmail: related?.email || '', recipientPhone: related?.phone || '', expiresInDays: 30 });
  const [result, setResult] = useState<any>(null);
  const send = useMutation({
    mutationFn: () => erpService.sendDocument({ ...f, relatedType: related?.type, relatedId: related?.id }),
    onSuccess: (r) => {
      setResult(r); onSent?.();
      if (r.whatsapp?.mode === 'link') window.open(r.whatsapp.link, '_blank', 'noopener');
      toast.success('Document sent', r.email && !r.email.ok ? `Email failed: ${r.email.error}` : r.code);
    },
    onError: (e) => toast.fromError(e),
  });
  return (
    <Modal title="Send terms / policy / agreement" onClose={onClose}>
      {result ? (
        <div className="space-y-3 text-sm">
          <p className="text-gray-700 dark:text-gray-300">Sent as <strong>{result.code}</strong>. The customer can open, read and sign it here:</p>
          <div className="flex gap-2"><input readOnly className={inputCls} value={result.link} onFocus={(e) => e.currentTarget.select()} />
            <button className={btnGhost} onClick={() => { navigator.clipboard.writeText(result.link); toast.success('Link copied'); }}>Copy</button></div>
          {result.whatsapp?.mode === 'link' && <a className={btnGhost} href={result.whatsapp.link} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Open WhatsApp again</a>}
          <div className="flex justify-end"><button className={btnPrimary} onClick={onClose}>Done</button></div>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <div><label className={labelCls}>Document *</label>
            <select className={inputCls} value={f.templateId || ''} onChange={(e) => setF({ ...f, templateId: e.target.value })} required>
              <option value="">{isLoading ? 'Loading…' : 'Choose a document'}</option>
              {templates.map((t: any) => <option key={t.id} value={t.id}>{t.title} ({t.category}{t.requiresSignature ? ', signature' : ''})</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={labelCls}>Customer name *</label><input className={inputCls} value={f.recipientName} onChange={(e) => setF({ ...f, recipientName: e.target.value })} required /></div>
            <div><label className={labelCls}>Email</label><input type="email" className={inputCls} value={f.recipientEmail} onChange={(e) => setF({ ...f, recipientEmail: e.target.value })} /></div>
            <div><label className={labelCls}>WhatsApp / phone</label><input className={inputCls} value={f.recipientPhone} onChange={(e) => setF({ ...f, recipientPhone: e.target.value })} /></div>
            <div><label className={labelCls}>Send via</label><select className={inputCls} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}>{['Email', 'WhatsApp', 'Both', 'Link'].map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={labelCls}>Link valid for (days)</label><input type="number" min={1} max={180} className={inputCls} value={f.expiresInDays} onChange={(e) => setF({ ...f, expiresInDays: e.target.value })} /></div>
            <div><label className={labelCls}>Service (optional)</label><input className={inputCls} value={f.service || ''} onChange={(e) => setF({ ...f, service: e.target.value })} placeholder="Filled into {{service}}" /></div>
            <div><label className={labelCls}>Amount (optional)</label><input className={inputCls} value={f.amount || ''} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="e.g. NGN 850,000" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
            <button className={btnPrimary} disabled={send.isPending}>{send.isPending && <Loader2 className="h-4 w-4 animate-spin" />}<Send className="h-4 w-4" /> Send</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Detail drawer ───────────────────────────────────────────────────────────
function Detail({ cfg, id, stages, onClose, onEdit }: { cfg: RecordBoardConfig; id: number; stages: string[]; onClose: () => void; onEdit: (r: any) => void }) {
  const qc = useQueryClient();
  const { byDepartmentId } = useBrands();
  const { isManagement, role } = useRole();
  const { data: people = [] } = usePeople();
  const key = [`erp:${cfg.entity}:detail`, id];
  const { data: r, isLoading, refetch } = useQuery({ queryKey: key, queryFn: () => erpService.get(cfg.base, id) });
  const docsQ = useQuery({ queryKey: ['erp:signature_request', cfg.entity, id], queryFn: () => erpService.requests({ relatedType: cfg.entity, relatedId: id }), enabled: !!cfg.allowDocuments });
  const [tab, setTab] = useState<'overview' | 'timeline' | 'payments' | 'documents' | 'message'>('overview');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState({ channel: 'WhatsApp' as 'WhatsApp' | 'Email' | 'Both', subject: '', message: '' });
  const [payOpen, setPayOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const refresh = () => { refetch(); qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith(`erp:${cfg.entity}`) }); };
  const stageField = cfg.stageField || 'stage';
  const brand = r ? byDepartmentId(r.departmentId) : undefined;

  const stageM = useMutation({ mutationFn: ({ s, n }: { s: string; n?: string }) => erpService.setStage(cfg.base, id, s, n), onSuccess: () => { toast.success('Updated'); refresh(); }, onError: (e) => toast.fromError(e) });
  const noteM = useMutation({ mutationFn: (kind: 'Note' | 'Call') => erpService.addNote(cfg.base, id, note, kind), onSuccess: () => { setNote(''); refresh(); }, onError: (e) => toast.fromError(e) });
  const msgM = useMutation({
    mutationFn: () => erpService.message(cfg.base, id, msg),
    onSuccess: (res) => {
      if (res.whatsapp?.mode === 'link') window.open(res.whatsapp.link, '_blank', 'noopener');
      if (res.email && !res.email.ok) toast.error('Email not sent', res.email.error); else toast.success(res.whatsapp?.mode === 'link' ? 'WhatsApp opened with your message' : 'Message sent');
      setMsg({ ...msg, message: '' }); refresh();
    },
    onError: (e) => toast.fromError(e),
  });
  const delM = useMutation({ mutationFn: () => erpService.remove(cfg.base, id), onSuccess: () => { toast.success('Deleted'); refresh(); onClose(); }, onError: (e) => toast.fromError(e) });
  const navigate = useNavigate();
  // One customer status report per record, pre-filled from the pipeline (Customer Reports keeps its own approval flow).
  const reportM = useMutation({
    mutationFn: () => {
      const total = cfg.amountOf ? cfg.amountOf(r) : 0;
      const missing = Array.isArray(r.checklist) ? r.checklist.filter((c: any) => !c.received).map((c: any) => c.item) : [];
      const done = (r.activities || []).filter((a: any) => a.kind === 'StageChange').map((a: any) => a.content).reverse();
      return apiClient.post('/customer-reports', {
        clientName: r.customerName || cfg.titleOf(r), clientPhone: r.customerPhone || r.customerWhatsapp, clientEmail: r.customerEmail,
        servicePurchased: `${cfg.titleOf(r)}${cfg.subtitleOf ? ` — ${cfg.subtitleOf(r)}` : ''} (${r.code})`,
        businessUnit: brand?.displayName || cfg.brandCode, department: brand?.displayName,
        assignedStaff: people.find((p) => String(p.id) === String(r.assignedToUserId))?.name,
        currentStatus: r[stageField] || '', pendingActions: missing.join('\n'), completedActions: done.join('\n'),
        totalAmount: total, amountPaid: r.amountPaid || 0, outstandingBalance: Math.max(total - (r.amountPaid || 0), 0),
        noteText: `Created from ${r.code}`,
      });
    },
    onSuccess: () => { toast.success('Customer report created as a draft', undefined, { label: 'Open', onClick: () => navigate('/customer-reports') }); },
    onError: (e) => toast.fromError(e),
  });

  const due = r && cfg.amountOf ? cfg.amountOf(r) : 0;
  const currency = r ? (cfg.currencyOf?.(r) || r.currency || 'NGN') : 'NGN';

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.aside initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: 'tween', duration: 0.2 }}
        className="w-full max-w-2xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {isLoading || !r ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin brand-text" /></div>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-mono">{r.code}{brand ? ` · ${brand.displayName}` : ''}</p>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{cfg.titleOf(r)}</h2>
                  {cfg.subtitleOf && <p className="text-sm text-gray-500">{cfg.subtitleOf(r)}</p>}
                </div>
                <button title="Print" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => printRecord(`${cfg.singular} ${r.code}`, [['Stage / status', r[stageField]], ...cfg.fields.map((f) => [f.label, fmt(r[f.name], f, r, people)] as [string, any]), ...(due ? [['Amount due', money(due, currency)], ['Paid', money(r.amountPaid, currency)], ['Balance', money(due - r.amountPaid, currency)]] as [string, any][] : [])], brand, r.activities)}><Printer className="h-4 w-4" /></button>
                {r.customerName && <button title="Create customer report" disabled={reportM.isPending} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => reportM.mutate()}><ClipboardList className="h-4 w-4" /></button>}
                <button title="Edit" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /></button>
                {(isManagement || role === 'hod') && <button title="Delete" className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => confirm(`Delete ${r.code}? This cannot be undone.`) && delM.mutate()}><Trash2 className="h-4 w-4" /></button>}
                <button className="p-2 rounded-lg text-gray-400 hover:text-gray-700" onClick={onClose}><X className="h-5 w-5" /></button>
              </div>
              {stages.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <StageBadge stage={r[stageField]} stages={stages} />
                  <select className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 dark:text-gray-200" value="" onChange={(e) => {
                    const s = e.target.value; if (!s) return;
                    const n = window.prompt(`Move to "${s}". Add a note (optional):`) ?? undefined;
                    stageM.mutate({ s, n: n || undefined });
                  }}>
                    <option value="">Move to…</option>
                    {stages.filter((s) => s !== r[stageField]).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {(() => { const i = stages.indexOf(r[stageField]); const next = stages[i + 1]; return next && !BAD.test(next) ? (
                    <button className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg brand-soft" onClick={() => stageM.mutate({ s: next })}>Next: {next} <ChevronRight className="h-3 w-3" /></button>) : null; })()}
                </div>
              )}
              <div className="mt-3 flex gap-1 overflow-x-auto text-sm">
                {(['overview', 'timeline', ...(cfg.allowMessage !== false ? ['message'] : []), ...(cfg.allowPayments ? ['payments'] : []), ...(cfg.allowDocuments ? ['documents'] : [])] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t as any)} className={cn('px-3 py-1.5 rounded-lg capitalize whitespace-nowrap', tab === t ? 'brand-bg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800')}>{t}{t === 'timeline' ? ` (${r.activities?.length || 0})` : ''}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {tab === 'overview' && (
                <>
                  {due > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {[['Amount due', due], ['Paid', r.amountPaid], ['Balance', due - r.amountPaid]].map(([l, v]) => (
                        <div key={l as string} className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3"><p className="text-[11px] text-gray-500">{l}</p><p className={cn('font-semibold', l === 'Balance' && Number(v) > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white')}>{money(v, currency)}</p></div>
                      ))}
                    </div>
                  )}
                  {cfg.detailExtras?.(r, refresh)}
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {cfg.fields.map((f) => (
                      <div key={f.name} className={cn(f.type === 'textarea' || f.span === 2 ? 'sm:col-span-2' : '')}>
                        <dt className="text-[11px] uppercase tracking-wide text-gray-400">{f.label}</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line break-words">{
                          f.type === 'email' && r[f.name] ? <a className="brand-text hover:underline" href={`mailto:${r[f.name]}`}>{r[f.name]}</a>
                            : (f.type === 'tel') && r[f.name] ? <a className="brand-text hover:underline" href={`tel:${r[f.name]}`}>{r[f.name]}</a>
                              : /url$/i.test(f.name) && r[f.name] ? <a className="brand-text hover:underline inline-flex items-center gap-1" href={r[f.name]} target="_blank" rel="noreferrer">{r[f.name]} <ExternalLink className="h-3 w-3" /></a>
                                : fmt(r[f.name], f, r, people)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

              {tab === 'timeline' && (
                <>
                  <div className="space-y-2">
                    <textarea className={inputCls} rows={2} placeholder="Add a note, or log a call with the customer…" value={note} onChange={(e) => setNote(e.target.value)} />
                    <div className="flex gap-2 justify-end">
                      <button className={btnGhost} disabled={!note.trim() || noteM.isPending} onClick={() => noteM.mutate('Call')}><Phone className="h-4 w-4" /> Log call</button>
                      <button className={btnPrimary} disabled={!note.trim() || noteM.isPending} onClick={() => noteM.mutate('Note')}><StickyNote className="h-4 w-4" /> Add note</button>
                    </div>
                  </div>
                  <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2 space-y-4">
                    {(r.activities || []).map((a: any) => (
                      <li key={a.id} className="ml-4">
                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full brand-bg ring-4 ring-white dark:ring-gray-900" />
                        <p className="text-[11px] text-gray-400">{new Date(a.createdAt).toLocaleString()} · {a.kind}{a.channel ? ` (${a.channel})` : ''} · {a.createdByName}</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{a.content}</p>
                      </li>
                    ))}
                    {!r.activities?.length && <p className="ml-4 text-sm text-gray-400">No activity yet.</p>}
                  </ol>
                </>
              )}

              {tab === 'message' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Send {r.customerName || 'the customer'} a message. WhatsApp opens on your device with the text ready to send (or sends automatically if the WhatsApp Business API is connected). Every message is saved to the timeline.</p>
                  <div className="flex gap-2">
                    {(['WhatsApp', 'Email', 'Both'] as const).map((c) => (
                      <button key={c} onClick={() => setMsg({ ...msg, channel: c })} className={cn('px-3 py-1.5 rounded-lg text-sm border', msg.channel === c ? 'brand-bg brand-border' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>
                        {c === 'WhatsApp' ? <MessageCircle className="h-4 w-4 inline mr-1" /> : c === 'Email' ? <Mail className="h-4 w-4 inline mr-1" /> : null}{c}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">To: {[r.customerWhatsapp || r.customerPhone, r.customerEmail].filter(Boolean).join(' · ') || 'no contact details on this record'}</p>
                  {msg.channel !== 'WhatsApp' && <input className={inputCls} placeholder="Email subject" value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} />}
                  <textarea className={inputCls} rows={5} placeholder="Type your message…" value={msg.message} onChange={(e) => setMsg({ ...msg, message: e.target.value })} />
                  <div className="flex justify-end"><button className={btnPrimary} disabled={!msg.message.trim() || msgM.isPending} onClick={() => msgM.mutate()}>{msgM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send</button></div>
                </div>
              )}

              {tab === 'payments' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">{r.payments?.length || 0} payment(s) · Paid {money(r.amountPaid, currency)}</p>
                    <button className={btnPrimary} onClick={() => setPayOpen(true)}><Plus className="h-4 w-4" /> Record payment</button>
                  </div>
                  {(r.payments || []).map((p: Payment) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                      <Receipt className="h-5 w-5 brand-text" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{money(p.amount, p.currency)} <span className="text-xs text-gray-400">· {p.method}</span></p>
                        <p className="text-xs text-gray-500">{p.receiptNo} · {new Date(p.paidAt).toLocaleString()}{p.status !== 'Completed' ? ` · ${p.status}` : ''}</p>
                      </div>
                      <button className={btnGhost} onClick={() => openReceipt(p.id)}><Printer className="h-4 w-4" /> Receipt</button>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'documents' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Terms, policies and agreements sent to this customer.</p>
                    <button className={btnPrimary} onClick={() => setDocOpen(true)}><FileSignature className="h-4 w-4" /> Send document</button>
                  </div>
                  {(docsQ.data || []).map((d: any) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                      <FileSignature className="h-5 w-5 brand-text" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.title}</p>
                        <p className="text-xs text-gray-500">{d.code} · {d.status}{d.signedAt ? ` · ${new Date(d.signedAt).toLocaleString()}` : ''}</p>
                      </div>
                      <button className={btnGhost} onClick={async () => { try { const full = await erpService.request(d.id); printSignedDocument(full, full.brand); } catch (e) { toast.fromError(e); } }}><Printer className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {!docsQ.data?.length && <p className="text-sm text-gray-400">Nothing sent yet.</p>}
                </div>
              )}
            </div>
            {payOpen && <PaymentForm defaults={{ relatedType: cfg.entity, relatedId: r.id, currency, description: `Payment for ${r.code} — ${cfg.titleOf(r)}` }} onClose={() => setPayOpen(false)} onSaved={() => refresh()} />}
            {docOpen && <SendDocumentForm brandCode={brand?.code} related={{ type: cfg.entity, id: r.id, name: r.customerName, email: r.customerEmail, phone: r.customerWhatsapp || r.customerPhone }} onClose={() => setDocOpen(false)} onSent={() => docsQ.refetch()} />}
          </>
        )}
      </motion.aside>
    </div>
  );
}

// ─── Board ───────────────────────────────────────────────────────────────────
export default function RecordBoard({ cfg }: { cfg: RecordBoardConfig }) {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [view, setView] = useState<'board' | 'list'>(cfg.allowBoard === false ? 'list' : 'board');
  const [mine, setMine] = useState(false);
  const [brandFilter, setBrandFilter] = useState(cfg.brandCode);
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const openId = params.get('open') ? Number(params.get('open')) : null;
  const stageField = cfg.stageField || 'stage';
  useLiveRefresh([cfg.entity, 'payment', 'signature_request']);

  const listKey = [`erp:${cfg.entity}:list`, brandFilter, search, stage, mine];
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: listKey,
    queryFn: () => erpService.list(cfg.base, { brand: brandFilter, q: search || undefined, [stageField]: stage || undefined, assignedToMe: mine || undefined, limit: 300 }),
    placeholderData: (prev) => prev,
  });
  const items = data?.items ?? [];
  const stages = data?.stages ?? [];
  const counts = data?.stageCounts ?? {};

  const moveM = useMutation({
    mutationFn: ({ id, s }: { id: number; s: string }) => erpService.setStage(cfg.base, id, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`erp:${cfg.entity}:list`] }),
    onError: (e) => toast.fromError(e),
  });

  const open = (id: number | null) => { const p = new URLSearchParams(params); if (id) p.set('open', String(id)); else p.delete('open'); setParams(p, { replace: true }); };
  const boardStages = useMemo(() => (stage ? [stage] : stages), [stage, stages]);
  const brandStyle = useBrandStyle(brandFilter);

  return (
    <div className="space-y-4" style={brandStyle}>
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cfg.title}</h1>
          {cfg.subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{cfg.subtitle}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {cfg.headerExtras}
          <button className={btnPrimary} onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> New {cfg.singular.toLowerCase()}</button>
        </div>
      </div>
      {cfg.summary}

      <div className={cn(card, 'p-3 flex flex-wrap gap-2 items-center')}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={cn(inputCls, 'pl-9')} placeholder="Search by name, code, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {cfg.brandChoices && cfg.brandChoices.length > 1 && (
          <select className={cn(inputCls, 'w-auto')} value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            {cfg.brandChoices.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 px-2"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Assigned to me</label>
        {stages.length > 0 && cfg.allowBoard !== false && (
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button className={cn('px-3 py-2', view === 'board' ? 'brand-bg' : 'text-gray-500')} onClick={() => setView('board')} title="Board"><LayoutGrid className="h-4 w-4" /></button>
            <button className={cn('px-3 py-2', view === 'list' ? 'brand-bg' : 'text-gray-500')} onClick={() => setView('list')} title="List"><List className="h-4 w-4" /></button>
          </div>
        )}
        <button className={btnGhost} onClick={() => refetch()} title="Refresh"><RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} /></button>
      </div>

      {stages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setStage('')} className={cn('px-3 py-1.5 rounded-full text-xs whitespace-nowrap border', !stage ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>All ({Object.values(counts).reduce((a, b) => a + b, 0)})</button>
          {stages.map((s) => (
            <button key={s} onClick={() => setStage(stage === s ? '' : s)} className={cn('px-3 py-1.5 rounded-full text-xs whitespace-nowrap border', stage === s ? 'brand-bg border-transparent' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>{s} ({counts[s] || 0})</button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin brand-text" /></div>
      ) : !items.length ? (
        <div className={cn(card, 'p-10 text-center')}>
          <p className="text-gray-500">{search || stage ? 'Nothing matches your filters.' : cfg.emptyHint || `No ${cfg.title.toLowerCase()} yet.`}</p>
          <button className={cn(btnPrimary, 'mt-4')} onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Create the first one</button>
        </div>
      ) : view === 'board' && stages.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {boardStages.map((s) => {
            const col = items.filter((i: any) => i[stageField] === s);
            return (
              <div key={s} className="w-72 flex-shrink-0 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex flex-col max-h-[70vh]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { const id = Number(e.dataTransfer.getData('text/plain')); if (id) moveM.mutate({ id, s }); }}>
                <div className="px-3 py-2.5 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                  <StageBadge stage={s} stages={stages} /><span className="text-xs text-gray-400">{col.length}</span>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto">
                  {col.map((r: any) => (
                    <button key={r.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(r.id))} onClick={() => open(r.id)}
                      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 brand-hover-border transition">
                      <p className="text-[11px] font-mono text-gray-400">{r.code}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{cfg.titleOf(r)}</p>
                      {cfg.subtitleOf && <p className="text-xs text-gray-500 truncate">{cfg.subtitleOf(r)}</p>}
                      {cfg.amountOf && cfg.amountOf(r) > 0 && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{money(cfg.amountOf(r), cfg.currencyOf?.(r) || r.currency)}</p>}
                    </button>
                  ))}
                  {!col.length && <p className="text-xs text-gray-400 text-center py-4">Drop here</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={cn(card, 'overflow-x-auto')}>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3">Code</th>{cfg.columns.map((c) => <th key={c.key} className={cn('px-4 py-3', c.className)}>{c.label}</th>)}{stages.length > 0 && <th className="px-4 py-3">{stageField === 'status' ? 'Status' : 'Stage'}</th>}
            </tr></thead>
            <tbody>
              {items.map((r: any) => (
                <tr key={r.id} onClick={() => open(r.id)} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.code}</td>
                  {cfg.columns.map((c) => <td key={c.key} className={cn('px-4 py-3 text-gray-800 dark:text-gray-200', c.className)}>{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>)}
                  {stages.length > 0 && <td className="px-4 py-3"><StageBadge stage={r[stageField]} stages={stages} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.total > items.length && <p className="text-xs text-gray-400 p-3">Showing {items.length} of {data.total}. Use search to narrow down.</p>}
        </div>
      )}

      <AnimatePresence>
        {openId && <Detail key={openId} cfg={cfg} id={openId} stages={stages} onClose={() => open(null)} onEdit={(r) => setEditing(r)} />}
      </AnimatePresence>
      {editing !== undefined && (
        <RecordForm cfg={cfg} initial={editing} onClose={() => setEditing(undefined)} onSaved={(r) => {
          setEditing(undefined);
          qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith(`erp:${cfg.entity}`) });
          if (r?.id) open(Number(r.id));
        }} />
      )}
    </div>
  );
}
