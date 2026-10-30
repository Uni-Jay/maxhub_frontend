import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PenLine, Sparkles, Copy, Loader2, RotateCcw, Mail, MessageCircle, Check } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { Field, inp, btnPrimary, btnGhost, card } from '@components/erp/Kit';

const BRANDS = [
  { code: 'VM', name: 'VisaMax', color: '#1d3a8f', logo: '/brands/visamax.jpeg' },
  { code: 'KS', name: 'Kurios SAT', color: '#4c9a2a', logo: '/brands/kuriossat.jpeg' },
  { code: 'BM', name: 'BeadMax', color: '#7a1f33', logo: '/brands/beadmax.jpeg' },
  { code: 'MF', name: 'Maxfood Farm', color: '#1b5e20', logo: '/brands/maxfood.jpeg' },
  { code: 'HQ', name: 'MaxHub (group)', color: '#4f46e5', logo: '' },
];
const EXAMPLES: Record<string, string> = {
  'Client email': 'Tell Mrs Adeyemi her UK visitor visa documents are ready to collect from our Lekki office, Monday to Friday 9am–5pm. Remind her to bring her passport.',
  'Reply to a client': 'Answer politely, confirm we can do it, and offer a call this week.',
  'Proposal': 'Website and booking system for a Lagos hotel: 6 weeks, includes training for 3 staff and 3 months of support.',
  'Job advert': 'Front desk officer for our Abuja office. 2 years experience, good English, comfortable with computers.',
  'Social media post': 'Our December Dubai tour package — 5 nights, visa, flights and hotel included. Limited slots.',
  'WhatsApp message': 'Remind the client their balance of ₦150,000 is due on Friday.',
  'Payment reminder': 'Invoice KS-INV-2026-0012 for ₦450,000 was due on 15 October. Ask politely for payment this week.',
  'Product description': 'Coral and gold bridal necklace set with matching earrings, handmade, takes 7 days to make.',
  'Letter': 'Letter to the embassy introducing our client as a staff member travelling for a conference.',
  'Announcement to staff': 'The office closes at 1pm on 24 December for the end-of-year party at 3pm.',
};

export default function AIWriterPage() {
  const meta = useQuery({ queryKey: ['ai-write-meta'], queryFn: () => apiClient.get<{ kinds: string[]; tones: string[] }>('/erp/ai/write/meta') });
  const [f, setF] = useState({ kind: 'Client email', brand: 'VM', tone: 'Warm', length: 'Medium', brief: '', context: '', language: 'English' });
  const [out, setOut] = useState<{ subject: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const write = useMutation({
    mutationFn: () => apiClient.post<{ subject: string; text: string }>('/erp/ai/write', f),
    onSuccess: (d) => setOut(d),
    onError: (e: any) => toast.fromError(e, 'Could not write that'),
  });
  const full = out ? `${out.subject ? `Subject: ${out.subject}\n\n` : ''}${out.text}` : '';
  const copy = async () => { await navigator.clipboard.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const needsContext = f.kind === 'Reply to a client';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><PenLine className="h-6 w-6 text-indigo-600" />AI Writing Help</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Say what you need. MaxHub drafts it in the brand’s voice — you check it and send it.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className={cn(card, 'p-5 space-y-4')}>
          <Field label="For which brand">
            <div className="flex flex-wrap gap-2">
              {BRANDS.map((b) => (
                <button key={b.code} type="button" onClick={() => setF({ ...f, brand: b.code })}
                  className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm', f.brand === b.code ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 font-semibold' : 'border-gray-200 dark:border-gray-700')}>
                  {b.logo ? <img src={b.logo} alt="" className="h-5 w-5 rounded object-cover" /> : <span className="h-5 w-5 rounded" style={{ background: b.color }} />}{b.name}
                </button>
              ))}
            </div>
          </Field>
          <Field label="What are you writing?">
            <div className="flex flex-wrap gap-1.5">
              {(meta.data?.kinds || Object.keys(EXAMPLES)).map((k) => (
                <button key={k} type="button" onClick={() => setF({ ...f, kind: k })} className={cn('px-2.5 py-1 rounded-lg text-xs border', f.kind === k ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>{k}</button>
              ))}
            </div>
          </Field>
          {needsContext && <Field label="Paste the client’s message"><textarea rows={4} className={inp} value={f.context} onChange={(e) => setF({ ...f, context: e.target.value })} placeholder="Their email or WhatsApp message" /></Field>}
          <Field label={needsContext ? 'How do you want to reply?' : 'What should it say?'} hint="Give the facts — names, amounts, dates. The AI will not make them up; it leaves [blanks] instead.">
            <textarea rows={5} className={inp} value={f.brief} onChange={(e) => setF({ ...f, brief: e.target.value })} placeholder={EXAMPLES[f.kind] || ''} />
          </Field>
          {!f.brief && EXAMPLES[f.kind] && <button type="button" onClick={() => setF({ ...f, brief: EXAMPLES[f.kind] })} className="text-xs text-indigo-600 hover:underline -mt-2">Use the example</button>}
          {!needsContext && f.kind !== 'Job advert' && (
            <details className="text-sm"><summary className="cursor-pointer text-gray-600 dark:text-gray-400">Add background (optional)</summary>
              <textarea rows={3} className={cn(inp, 'mt-2')} value={f.context} onChange={(e) => setF({ ...f, context: e.target.value })} placeholder="Anything else the AI should know" /></details>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Tone"><select className={inp} value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })}>{(meta.data?.tones || ['Warm', 'Professional', 'Formal']).map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Length"><select className={inp} value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })}>{['Short', 'Medium', 'Long'].map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Language"><select className={inp} value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}>{['English', 'Nigerian Pidgin', 'Yoruba', 'Igbo', 'Hausa', 'French', 'Arabic'].map((t) => <option key={t}>{t}</option>)}</select></Field>
          </div>
          <button onClick={() => write.mutate()} disabled={write.isPending || f.brief.trim().length < 5} className={cn(btnPrimary, 'w-full py-2.5')}>
            {write.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{out ? 'Write it again' : 'Write it'}
          </button>
        </div>

        <div className={cn(card, 'p-5 min-h-[420px] flex flex-col')}>
          {!out ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-2">
              <Sparkles className="h-10 w-10 text-gray-200 dark:text-gray-700" />
              <p className="text-sm">{write.isPending ? 'Writing…' : 'Your draft appears here. You can edit it before copying.'}</p>
            </div>
          ) : (
            <>
              {out.subject !== '' && <Field label="Subject"><input className={inp} value={out.subject} onChange={(e) => setOut({ ...out, subject: e.target.value })} /></Field>}
              <textarea className={cn(inp, 'flex-1 mt-3 min-h-[320px] leading-relaxed')} value={out.text} onChange={(e) => setOut({ ...out, text: e.target.value })} />
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={copy} className={btnPrimary}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy'}</button>
                <a href={`mailto:?subject=${encodeURIComponent(out.subject)}&body=${encodeURIComponent(out.text)}`} className={btnGhost}><Mail className="h-4 w-4" />Open in email</a>
                <a href={`https://wa.me/?text=${encodeURIComponent(out.text)}`} target="_blank" rel="noreferrer" className={btnGhost}><MessageCircle className="h-4 w-4" />WhatsApp</a>
                <button onClick={() => write.mutate()} disabled={write.isPending} className={btnGhost}><RotateCcw className="h-4 w-4" />Another version</button>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">Always read it through before sending — check names, amounts and dates.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
