import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Printer, Eraser, FileText, Search, Package } from 'lucide-react';
import { publicApi } from '@services/erpService';
import { BRAND_LOGOS } from '@hooks/useErp';
import { printSignedDocument } from '@components/erp/print';

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  useEffect(() => {
    const c = ref.current!; const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio; c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d')!; ctx.scale(ratio, ratio); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827';
  }, []);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const down = (e: React.PointerEvent) => { drawing.current = true; ref.current!.setPointerCapture(e.pointerId); const p = pos(e); const ctx = ref.current!.getContext('2d')!; ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const p = pos(e); const ctx = ref.current!.getContext('2d')!; ctx.lineTo(p.x, p.y); ctx.stroke(); dirty.current = true; };
  const up = () => { if (!drawing.current) return; drawing.current = false; if (dirty.current) onChange(ref.current!.toDataURL('image/png')); };
  const clear = () => { const c = ref.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); dirty.current = false; onChange(null); };
  return (
    <div>
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        className="w-full h-40 rounded-xl border-2 border-dashed border-gray-300 bg-white touch-none cursor-crosshair" />
      <div className="flex justify-between mt-1 text-xs text-gray-500"><span>Draw your signature with your finger or mouse</span><button type="button" onClick={clear} className="inline-flex items-center gap-1 hover:text-gray-800"><Eraser className="h-3 w-3" /> Clear</button></div>
    </div>
  );
}

function BrandHeader({ brand }: { brand: any }) {
  const logo = brand?.logoUrl || '';
  const fallback = Object.entries(BRAND_LOGOS).find(([, v]) => v === logo)?.[1] || logo;
  return (
    <div className="flex items-center justify-between gap-4 pb-4 mb-6 border-b-4" style={{ borderColor: brand?.primaryColor || '#4f46e5' }}>
      {fallback ? <img src={fallback} alt={brand?.displayName} className="max-h-16 max-w-[220px] object-contain" /> : <p className="text-xl font-bold" style={{ color: brand?.primaryColor }}>{brand?.displayName}</p>}
      <div className="text-right text-xs text-gray-500 hidden sm:block"><p className="font-semibold text-gray-800">{brand?.displayName}</p><p>{brand?.phone} · {brand?.email}</p></div>
    </div>
  );
}

export function SignDocumentPage() {
  const { token } = useParams();
  const [doc, setDoc] = useState<any>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const load = () => publicApi(`/sign/${token}`).then((d) => { setDoc(d); setName((n) => n || d.recipientName || ''); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (decline = false) => {
    setBusy(true); setError('');
    try {
      await publicApi(`/sign/${token}`, { method: 'POST', body: JSON.stringify(decline ? { decline: true, reason } : { signerName: name, agree, signatureImage: sig }) });
      await load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (error && !doc) return <Shell><div className="text-center py-16"><XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" /><p className="text-gray-700">{error}</p></div></Shell>;
  if (!doc) return <Shell><Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto my-20" /></Shell>;
  const done = ['Signed', 'Acknowledged', 'Declined'].includes(doc.status);
  const color = doc.brand?.primaryColor || '#4f46e5';

  return (
    <Shell>
      <BrandHeader brand={doc.brand} />
      <div className="flex items-center gap-2 mb-1 text-xs text-gray-500"><FileText className="h-4 w-4" /> {doc.code} · {doc.category}</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{doc.title}</h1>
      {doc.body && <article className="prose prose-sm max-w-none text-gray-800 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_h3]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: doc.body }} />}
      {doc.fileUrl && <p className="mt-4"><a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium underline" style={{ color }}>Open the attached document</a></p>}

      <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
        {done ? (
          <div className="text-center space-y-3">
            {doc.status === 'Declined' ? <XCircle className="h-12 w-12 text-red-500 mx-auto" /> : <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />}
            <p className="font-semibold text-gray-900">{doc.status === 'Declined' ? 'You declined this document.' : `Thank you, ${doc.signerName}. This document was ${doc.status.toLowerCase()} on ${new Date(doc.signedAt).toLocaleString()}.`}</p>
            {doc.signatureImage && <img src={doc.signatureImage} alt="Your signature" className="mx-auto max-h-20" />}
            {doc.status !== 'Declined' && <button onClick={() => printSignedDocument({ ...doc, renderedBody: doc.body }, doc.brand)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: color }}><Printer className="h-4 w-4" /> Print / save a copy</button>}
          </div>
        ) : doc.status === 'Expired' ? (
          <p className="text-center text-gray-700">This link has expired. Please contact {doc.brand?.displayName} ({doc.brand?.phone}) for a new one.</p>
        ) : declining ? (
          <div className="space-y-3">
            <p className="font-medium text-gray-900">Decline this document</p>
            <textarea className="w-full border border-gray-300 rounded-xl p-3 text-sm" rows={3} placeholder="Tell us why (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex gap-2 justify-end"><button className="px-4 py-2 text-sm rounded-xl border" onClick={() => setDeclining(false)}>Back</button><button disabled={busy} className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white" onClick={() => submit(true)}>Decline</button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Your full name</label><input className="w-full border border-gray-300 rounded-xl px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} /></div>
            {doc.requiresSignature && <SignaturePad onChange={setSig} />}
            <label className="flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I have read and agree to this document, and I accept that my electronic signature is legally binding.</label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-wrap gap-2 justify-between">
              <button className="text-sm text-gray-500 hover:text-red-600" onClick={() => setDeclining(true)}>I don't agree</button>
              <button disabled={busy || !agree || !name.trim() || (doc.requiresSignature && !sig)} onClick={() => submit(false)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium disabled:opacity-40" style={{ background: color }}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}{doc.requiresSignature ? 'Sign document' : 'I acknowledge'}
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-6 text-center">Secured by MaxHub. Your name, signature, time and IP address are recorded with a fingerprint of this document.</p>
    </Shell>
  );
}

export function TrackPage() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [contact, setContact] = useState('');
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(''); setRes(null);
    try { setRes(await publicApi(`/track/${encodeURIComponent(code.trim())}?contact=${encodeURIComponent(contact.trim())}`)); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Shell>
      <div className="text-center mb-6"><Package className="h-10 w-10 text-indigo-600 mx-auto mb-2" /><h1 className="text-2xl font-bold text-gray-900">Track your order or application</h1><p className="text-sm text-gray-500">VisaMax · Kurios SAT · BeadMax · Maxfood Farm</p></div>
      <form onSubmit={go} className="space-y-3 max-w-md mx-auto">
        <input className="w-full border border-gray-300 rounded-xl px-3 py-2.5 uppercase" placeholder="Reference code, e.g. MFF-EXP-2026-0001" value={code} onChange={(e) => setCode(e.target.value)} required />
        <input className="w-full border border-gray-300 rounded-xl px-3 py-2.5" placeholder="Your email, or last 4 digits of your phone" value={contact} onChange={(e) => setContact(e.target.value)} required />
        <button disabled={busy} className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Track</button>
        {err && <p className="text-sm text-red-600 text-center">{err}</p>}
      </form>
      {res && (
        <div className="mt-8 rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex justify-between flex-wrap gap-2"><div><p className="text-xs text-gray-500">{res.code} · {res.brand?.displayName}</p><p className="text-lg font-semibold text-gray-900">{res.customerName}</p></div><span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium h-fit">{res.status}</span></div>
          {(res.trackingNo || res.carrier) && <p className="text-sm text-gray-700">Shipment: {res.carrier} {res.trackingNo}</p>}
          {res.expectedDelivery && <p className="text-sm text-gray-700">Expected: {new Date(res.expectedDelivery).toDateString()}</p>}
          <ol className="border-l-2 border-indigo-200 ml-2 space-y-2">{res.history.map((h: any, i: number) => <li key={i} className="ml-4 text-sm"><span className="font-medium text-gray-900">{h.to}</span> <span className="text-gray-500 text-xs">· {new Date(h.at).toLocaleString()}</span></li>)}</ol>
          <p className="text-xs text-gray-500">Questions? Call {res.brand?.phone} or email {res.brand?.email}.</p>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  // Customer pages are always light, regardless of the staff dark-mode setting.
  useEffect(() => { const had = document.documentElement.classList.contains('dark'); document.documentElement.classList.remove('dark'); return () => { if (had) document.documentElement.classList.add('dark'); }; }, []);
  return <div className="min-h-screen bg-gray-100 py-6 px-3"><div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm p-5 sm:p-10">{children}</div></div>;
}
