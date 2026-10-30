import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ChevronLeft, Loader2 } from 'lucide-react';
import { apiClient } from '@services/apiClient';

interface Cert {
  certificateCode: string; certificateName: string; issuedDate: string; verificationCode: string; status: string; course: string; duration: number | null;
  studentName: string; studentNumber: string; instructorName: string | null;
  brand: { name: string; logoUrl: string | null; color: string | null; tagline: string | null; address: string | null; website: string | null };
}

/** A printable certificate — "Print" lets you print it or save it as a PDF. */
export default function CertificatePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['certificate', code], queryFn: () => apiClient.get<Cert>(`/erp/school/certificate/${code}`) });
  const c = q.data;
  const color = c?.brand.color || '#4f46e5';
  if (q.isLoading) return <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-24" />;
  if (!c) return <p className="text-center text-sm text-red-600 py-24">{(q.error as any)?.message || 'Certificate not found'}</p>;
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <style>{`@media print { @page { size: A4 landscape; margin: 0; } body * { visibility: hidden !important; } #maxhub-cert, #maxhub-cert * { visibility: visible !important; } #maxhub-cert { position: fixed; inset: 0; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; } }`}</style>
      <div className="flex items-center gap-2 print:hidden">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="h-5 w-5" /></button>
        <p className="flex-1 text-sm text-gray-500">Certificate {c.certificateCode}{c.status !== 'Issued' ? ` · ${c.status}` : ''}</p>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"><Printer className="h-4 w-4" />Print or save as PDF</button>
      </div>
      <div id="maxhub-cert" className="relative bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden aspect-[1.414] w-full" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        <div className="absolute inset-3 border-[3px] rounded-xl" style={{ borderColor: color }} />
        <div className="absolute inset-5 border rounded-lg" style={{ borderColor: `${color}55` }} />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-[8%] py-[5%]">
          {c.brand.logoUrl && <img src={c.brand.logoUrl} alt="" className="h-[11%] max-h-20 object-contain mb-[2%]" crossOrigin="anonymous" />}
          <p className="text-[clamp(10px,1.4vw,16px)] tracking-[0.3em] uppercase" style={{ color }}>{c.brand.name}</p>
          <h1 className="mt-[3%] text-[clamp(22px,4.2vw,52px)] font-bold tracking-wide">Certificate of Completion</h1>
          <p className="mt-[2.5%] text-[clamp(11px,1.5vw,18px)] text-gray-600 italic">This is to certify that</p>
          <p className="mt-[1.5%] text-[clamp(22px,4vw,48px)] font-bold border-b-2 px-[4%] pb-[0.5%]" style={{ borderColor: color, color }}>{c.studentName}</p>
          <p className="mt-[2.5%] text-[clamp(11px,1.5vw,18px)] text-gray-600 italic">has successfully completed the course</p>
          <p className="mt-[1.2%] text-[clamp(16px,2.6vw,32px)] font-semibold">{c.course}</p>
          {c.duration ? <p className="mt-[0.8%] text-[clamp(10px,1.2vw,14px)] text-gray-500">{c.duration} hours of training</p> : null}
          <div className="mt-auto w-full grid grid-cols-3 items-end text-[clamp(9px,1.1vw,13px)] text-gray-600">
            <div><p className="font-semibold text-gray-900">{new Date(c.issuedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p><div className="mx-auto mt-1 w-3/4 border-t border-gray-400" /><p className="mt-1">Date</p></div>
            <div className="flex flex-col items-center"><div className="h-[clamp(40px,7vw,84px)] w-[clamp(40px,7vw,84px)] rounded-full flex items-center justify-center text-white font-bold text-[clamp(8px,1vw,12px)] leading-tight" style={{ background: color }}>CERTIFIED</div></div>
            <div><p className="font-semibold text-gray-900">{c.instructorName || ' '}</p><div className="mx-auto mt-1 w-3/4 border-t border-gray-400" /><p className="mt-1">Instructor</p></div>
          </div>
          <p className="mt-[2%] text-[clamp(8px,0.9vw,11px)] text-gray-400">Certificate {c.certificateCode} · Verification code {c.verificationCode} · Student {c.studentNumber}{c.brand.website ? ` · ${c.brand.website.replace(/^https?:\/\//, '')}` : ''}</p>
        </div>
      </div>
    </div>
  );
}
