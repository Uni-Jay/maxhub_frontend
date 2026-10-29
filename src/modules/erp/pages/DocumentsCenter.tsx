import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Send, Printer, Pencil, Archive, Bold, Italic, Heading2, List, ListOrdered, Loader2, Copy, RotateCcw, XCircle, Upload, Download, Eye } from 'lucide-react';
import { erpService } from '@services/erpService';
import { useBrands, useLiveRefresh, useRole } from '@hooks/useErp';
import { Modal, SendDocumentForm, btnGhost, btnPrimary, card, inputCls, labelCls } from '@components/erp/RecordBoard';
import { printSignedDocument, printWithLetterhead } from '@components/erp/print';
import { cloudinaryService } from '@services/cloudinaryService';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { useBrandStyle } from '@components/erp/BrandTheme';

const CATEGORIES = ['Terms & Conditions', 'Policy', 'Agreement', 'Consent Form', 'Contract', 'Refund Policy', 'Privacy Policy', 'Other'];
const STATUS_TONE: Record<string, string> = {
  Sent: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', Viewed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Signed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', Acknowledged: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Declined: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', Expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', Cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
const PLACEHOLDERS = ['customerName', 'customerEmail', 'customerPhone', 'date', 'brandName', 'brandAddress', 'brandEmail', 'brandPhone', 'brandWebsite', 'reference', 'service', 'amount', 'staffName'];

function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || ''; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cmd = (c: string, arg?: string) => { document.execCommand(c, false, arg); ref.current?.focus(); onChange(ref.current?.innerHTML || ''); };
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="flex flex-wrap gap-1 p-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {[[Bold, 'bold'], [Italic, 'italic'], [Heading2, 'formatBlock', 'h3'], [List, 'insertUnorderedList'], [ListOrdered, 'insertOrderedList']].map(([I, c, a]: any) => (
          <button type="button" key={c + (a || '')} onMouseDown={(e) => { e.preventDefault(); cmd(c, a); }} className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><I className="h-4 w-4" /></button>
        ))}
        <select className="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded px-1 text-gray-600 dark:text-gray-300" value="" onChange={(e) => { if (e.target.value) cmd('insertText', `{{${e.target.value}}}`); }}>
          <option value="">Insert field…</option>{PLACEHOLDERS.map((p) => <option key={p} value={p}>{`{{${p}}}`}</option>)}
        </select>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={() => onChange(ref.current?.innerHTML || '')}
        className="min-h-[260px] max-h-[50vh] overflow-y-auto p-4 text-sm text-gray-800 dark:text-gray-100 prose dark:prose-invert max-w-none focus:outline-none [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" />
    </div>
  );
}

function TemplateForm({ initial, defaultBrand, onClose }: { initial?: any; defaultBrand: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { departments } = useBrands();
  const [f, setF] = useState<any>(initial ? { ...initial, brand: initial.departmentId } : { brand: defaultBrand, category: 'Terms & Conditions', requiresSignature: true, isPublic: false, body: '' });
  const [uploading, setUploading] = useState(false);
  const save = useMutation({
    mutationFn: () => (initial ? erpService.updateTemplate(initial.id, f) : erpService.createTemplate(f)),
    onSuccess: () => { toast.success('Document saved'); qc.invalidateQueries({ queryKey: ['erp:document_template'] }); onClose(); },
    onError: (e) => toast.fromError(e),
  });
  return (
    <Modal title={initial ? `Edit — ${initial.title}` : 'New document'} onClose={onClose} wide>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2"><label className={labelCls}>Title *</label><input className={inputCls} value={f.title || ''} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
          <div><label className={labelCls}>Category</label><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          {!initial && <div className="sm:col-span-2"><label className={labelCls}>Department</label>
            <select className={inputCls} value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })}>
              {departments.filter((d) => d.status === 'Active').map((d) => <option key={d.id} value={d.code}>{d.name}</option>)}
            </select></div>}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={!!f.requiresSignature} onChange={(e) => setF({ ...f, requiresSignature: e.target.checked })} /> Customer must sign</label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={!!f.isPublic} onChange={(e) => setF({ ...f, isPublic: e.target.checked })} /> Publish on website (policies)</label>
        </div>
        <div><label className={labelCls}>Document text (use “Insert field” for customer name, date, amount…)</label><RichEditor value={f.body || ''} onChange={(body) => setF((x: any) => ({ ...x, body }))} /></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className={cn(btnGhost, 'cursor-pointer')}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {f.fileUrl ? 'Replace PDF/Word file' : 'Attach PDF/Word file (optional)'}
            <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return; setUploading(true);
              try { const r = await cloudinaryService.upload(file, 'documents'); setF((x: any) => ({ ...x, fileUrl: r.url, fileName: file.name })); } catch (err) { toast.fromError(err, 'Upload failed'); } finally { setUploading(false); }
            }} /></label>
          {f.fileUrl && <a href={f.fileUrl} target="_blank" rel="noreferrer" className="text-sm brand-text hover:underline">{f.fileName || 'Attached file'}</a>}
        </div>
        <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</button></div>
      </form>
    </Modal>
  );
}

export default function DocumentsCenter() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const { brands, byDepartmentId, departments } = useBrands();
  const { canManageContent } = useRole();
  const [brand, setBrand] = useState(params.get('brand') || '');
  const [tab, setTab] = useState<'library' | 'sent'>(params.get('request') ? 'sent' : 'library');
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const [sendFor, setSendFor] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  useLiveRefresh(['document_template', 'signature_request']);

  const tq = useQuery({ queryKey: ['erp:document_template', 'all', brand], queryFn: () => erpService.templates(brand ? { brand } : undefined) });
  const rq = useQuery({ queryKey: ['erp:signature_request', 'all', brand, status], queryFn: () => erpService.requests({ brand: brand || undefined, status: status || undefined }), enabled: tab === 'sent' });
  const archive = useMutation({ mutationFn: (id: number) => erpService.archiveTemplate(id), onSuccess: () => { toast.success('Archived'); qc.invalidateQueries({ queryKey: ['erp:document_template'] }); }, onError: (e) => toast.fromError(e) });
  const resend = useMutation({ mutationFn: (id: number) => erpService.resendDocument(id), onSuccess: (r: any) => { if (r.whatsapp?.mode === 'link') window.open(r.whatsapp.link, '_blank'); toast.success('Reminder sent'); }, onError: (e) => toast.fromError(e) });
  const cancel = useMutation({ mutationFn: (id: number) => erpService.cancelDocument(id), onSuccess: () => { toast.success('Cancelled'); rq.refetch(); }, onError: (e) => toast.fromError(e) });

  const deptName = (id: any) => departments.find((d) => String(d.id) === String(id))?.name || 'All brands';
  const brandStyle = useBrandStyle(brand || null);
  const preview = (t: any) => printWithLetterhead(t.title, t.body || `<p>See file: <a href="${t.fileUrl}">${t.fileName || t.fileUrl}</a></p>`, byDepartmentId(t.departmentId));

  return (
    <div className="space-y-4" style={brandStyle}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents & Agreements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Terms & conditions, policies and agreements for each brand — send them to customers by email or WhatsApp, collect e-signatures, print or download.</p>
        </div>
        <div className="flex gap-2">
          <select className={cn(inputCls, 'w-auto')} value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">All brands</option>{brands.map((b) => <option key={b.code} value={b.code}>{b.displayName}</option>)}
          </select>
          {canManageContent && <button className={btnPrimary} onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> New document</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {(['library', 'sent'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px', tab === t ? 'brand-border brand-text' : 'border-transparent text-gray-500')}>{t === 'library' ? 'Document library' : 'Sent & signatures'}</button>)}
      </div>

      {tab === 'library' ? (
        tq.isLoading ? <Loader2 className="h-6 w-6 animate-spin brand-text mx-auto my-10" /> : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {(tq.data || []).map((t: any) => (
              <div key={t.id} className={cn(card, 'p-4 flex flex-col')}>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl brand-soft flex items-center justify-center flex-shrink-0"><FileText className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{t.title}</p>
                    <p className="text-xs text-gray-500">{deptName(t.departmentId)} · {t.category} · v{t.version}</p>
                    <div className="flex gap-1 mt-1">{t.requiresSignature && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">Signature</span>}{t.isPublic && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">On website</span>}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button className={btnPrimary} onClick={() => setSendFor(byDepartmentId(t.departmentId)?.code || '')}><Send className="h-4 w-4" /> Send</button>
                  <button className={btnGhost} onClick={() => preview(t)} title="Preview / print"><Printer className="h-4 w-4" /></button>
                  {t.fileUrl && <a className={btnGhost} href={t.fileUrl} target="_blank" rel="noreferrer" title="Download file"><Download className="h-4 w-4" /></a>}
                  {canManageContent && <button className={btnGhost} onClick={() => setEditing(t)} title="Edit"><Pencil className="h-4 w-4" /></button>}
                  {canManageContent && <button className={btnGhost} onClick={() => confirm(`Archive "${t.title}"? Documents already sent stay valid.`) && archive.mutate(t.id)} title="Archive"><Archive className="h-4 w-4" /></button>}
                </div>
              </div>
            ))}
            {!tq.data?.length && <p className="text-gray-500 text-sm">No documents yet{canManageContent ? ' — click “New document”.' : '.'}</p>}
          </div>
        )
      ) : (
        <div className={cn(card, 'overflow-x-auto')}>
          <div className="p-3 flex gap-2 border-b border-gray-100 dark:border-gray-800">
            <select className={cn(inputCls, 'w-auto')} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>{Object.keys(STATUS_TONE).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800"><th className="px-4 py-3">Code</th><th className="px-4 py-3">Document</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>
              {(rq.data || []).map((d: any) => (
                <tr key={d.id} className={cn('border-b border-gray-50 dark:border-gray-800/60', String(d.id) === params.get('request') && 'brand-soft')}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.code}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{d.title}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{d.recipientName}<div className="text-xs text-gray-400">{d.recipientEmail || d.recipientPhone}</div></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{d.sentAt ? new Date(d.sentAt).toLocaleString() : '—'}<div>via {d.channel}</div></td>
                  <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', STATUS_TONE[d.status])}>{d.status}</span>{d.signedAt && <div className="text-[11px] text-gray-400 mt-0.5">{new Date(d.signedAt).toLocaleString()}</div>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button className="p-1.5 text-gray-500 hover:brand-text" title="View / print" onClick={async () => { try { const full = await erpService.request(d.id); printSignedDocument(full, full.brand); } catch (e) { toast.fromError(e); } }}><Eye className="h-4 w-4" /></button>
                    <button className="p-1.5 text-gray-500 hover:brand-text" title="Copy signing link" onClick={async () => { const full = await erpService.request(d.id); await navigator.clipboard.writeText(full.signLink); toast.success('Link copied'); }}><Copy className="h-4 w-4" /></button>
                    {['Sent', 'Viewed', 'Expired'].includes(d.status) && <button className="p-1.5 text-gray-500 hover:brand-text" title="Send reminder" onClick={() => resend.mutate(d.id)}><RotateCcw className="h-4 w-4" /></button>}
                    {['Sent', 'Viewed'].includes(d.status) && <button className="p-1.5 text-gray-500 hover:text-red-600" title="Cancel" onClick={() => confirm('Cancel this request? The link will stop working.') && cancel.mutate(d.id)}><XCircle className="h-4 w-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rq.isLoading && !rq.data?.length && <p className="p-6 text-center text-sm text-gray-500">Nothing sent yet.</p>}
        </div>
      )}

      {editing !== undefined && <TemplateForm initial={editing || undefined} defaultBrand={brand || 'VM'} onClose={() => setEditing(undefined)} />}
      {sendFor !== null && <SendDocumentForm brandCode={sendFor || undefined} onClose={() => setSendFor(null)} onSent={() => qc.invalidateQueries({ queryKey: ['erp:signature_request'] })} />}
    </div>
  );
}
