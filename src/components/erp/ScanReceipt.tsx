import { useRef, useState } from 'react';
import { ScanLine, Loader2, Sparkles } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { uploadToCloudinary } from '@services/cloudinaryService';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

export interface ScannedReceipt {
  vendor: string | null; date: string | null; total: number | null; currency: string; reference: string | null;
  category: string; method: string | null; items: Array<{ name: string; qty?: number; amount?: number }>; title: string; confidence: string;
  receiptUrl?: string | null;
}

/** Shrinks big phone photos so they upload fast and stay under the size limit. */
async function toBase64(file: File): Promise<{ data: string; mime: string }> {
  if (file.type === 'application/pdf' || !file.type.startsWith('image/')) {
    const buf = await file.arrayBuffer();
    let bin = ''; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { data: btoa(bin), mime: file.type || 'application/pdf' };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return { data: c.toDataURL('image/jpeg', 0.85).split(',')[1], mime: 'image/jpeg' };
  } finally { URL.revokeObjectURL(url); }
}

/** "Scan a receipt": photo or PDF → the AI reads vendor, date, total and category. */
export default function ScanReceipt({ onScanned, className, compact }: { onScanned: (r: ScannedReceipt) => void; className?: string; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File) => {
    setBusy(true);
    try {
      const [{ data, mime }, uploaded] = await Promise.all([
        toBase64(file),
        uploadToCloudinary(file, 'maxhub-receipts').catch(() => null),
      ]);
      const r = await apiClient.post<ScannedReceipt>('/erp/ai/scan-receipt', { imageBase64: data, mimeType: mime });
      onScanned({ ...r, receiptUrl: uploaded?.url || null });
      toast.success('Receipt read', r.confidence === 'low' ? 'The photo was hard to read — please check the figures' : 'Check the details, then save');
    } catch (e: any) {
      toast.fromError(e, 'Could not read the receipt');
    } finally { setBusy(false); }
  };
  return (
    <div className={cn('rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-500/5 p-3 flex items-center gap-3', className)}>
      <input ref={ref} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
      <Sparkles className="h-5 w-5 text-indigo-600 shrink-0" />
      {!compact && <p className="text-sm text-indigo-900 dark:text-indigo-200 flex-1">Have the receipt? Take a photo and MaxHub fills this in for you.</p>}
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 shrink-0">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}{busy ? 'Reading…' : 'Scan a receipt'}
      </button>
    </div>
  );
}
