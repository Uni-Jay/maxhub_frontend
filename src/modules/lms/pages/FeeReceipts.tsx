import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Plus, Download, Eye, Loader2, X, Trash2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useSchool, SchoolBar } from '@components/erp/School';
import { apiClient } from '@services/apiClient';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700',
  PartPayment: 'bg-amber-100 text-amber-700',
  Pending: 'bg-rose-100 text-rose-700',
};

const PAYMENT_METHODS = ['Cash', 'BankTransfer', 'POS', 'Online'];

function generateSessionLabel() {
  const y = new Date().getFullYear();
  return `${y}/${y + 1}`;
}

// ─── Receipt design ─────────────────────────────────────────────────────────
// School fee receipts carry the brand of the school: Kurios SAT ICT Training
// Center by default, BeadMax Design Vocational School when the course belongs
// to a BeadMax department.
interface SchoolBrand { name: string; school: string; tagline: string; logo: string; primary: string; dark: string; address: string; phone: string; email: string; website: string }
const SCHOOL_BRANDS: Record<'KS' | 'BM', SchoolBrand> = {
  KS: {
    name: 'Kurios SAT', school: 'ICT Training Center', tagline: 'Endless Possibilities', logo: '/brands/kuriossat.jpeg',
    primary: '#4c9a2a', dark: '#1f2a30', address: '51, Ayangburen Road, Opposite Ayangburen Palace, Top Floor, Ikorodu, Lagos',
    phone: '+234 817 002 0431', email: 'info@kurios-sat.tech', website: 'www.kurios-sat.tech',
  },
  BM: {
    name: 'BeadMax Design', school: 'Vocational School', tagline: 'Beads • Beauty • Creativity', logo: '/brands/beadmax.jpeg',
    primary: '#7a1f33', dark: '#3d0f19', address: '51, Ayangburen Road, Opposite Ayangburen Palace, Top Floor, Ikorodu, Lagos',
    phone: '+234 817 002 0431', email: 'info@beadmax.net', website: 'www.beadmax.net',
  },
};

function schoolBrandFor(receipt: any): SchoolBrand {
  const course = receipt.enrollment?.course;
  const code = String(receipt.school || course?.department?.code || course?.departmentCode || course?.businessUnit || '').toUpperCase();
  const text = `${course?.title || ''} ${course?.category || ''}`.toLowerCase();
  return code.startsWith('BM') || /bead/.test(text) ? SCHOOL_BRANDS.BM : SCHOOL_BRANDS.KS;
}

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words(n: number): string {
  n = Math.floor(n);
  if (n === 0) return 'zero';
  const chunk = (x: number): string => {
    const h = Math.floor(x / 100), r = x % 100;
    const t = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? '-' + ONES[r % 10] : ''}`;
    return [h ? `${ONES[h]} hundred` : '', t].filter(Boolean).join(r && h ? ' and ' : '');
  };
  const parts: string[] = [];
  [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand'], [1, '']].forEach(([v, label]) => {
    const q = Math.floor(n / (v as number)); n %= v as number;
    if (q) parts.push(`${chunk(q)}${label ? ' ' + label : ''}`);
  });
  return parts.join(', ');
}
const naira = (v: any) => `₦${Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esc = (v: any) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function receiptStyle(b: SchoolBrand) {
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; }
  .page { width: 760px; margin: 0 auto; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); position: relative; }
  .bar { height: 8px; background: linear-gradient(90deg, ${b.primary}, ${b.dark}); }
  .head { display: flex; justify-content: space-between; align-items: center; padding: 26px 40px 20px; border-bottom: 1px solid #eef0f3; }
  .head img { height: 78px; max-width: 270px; object-fit: contain; }
  .head .meta { text-align: right; }
  .head .title { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: ${b.dark}; }
  .head .school { font-size: 12px; color: ${b.primary}; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }
  .head .num { margin-top: 10px; font-size: 13px; color: #6b7280; }
  .head .num strong { color: #111827; font-family: Consolas, monospace; font-size: 14px; }
  .body { padding: 26px 40px 10px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 24px; margin-bottom: 22px; }
  .grid label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; font-weight: 700; }
  .grid p { font-size: 14px; font-weight: 600; color: #111827; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
  th { background: ${b.dark}; color: #fff; padding: 10px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 12px 14px; border-top: 1px solid #f0f0f0; }
  .r { text-align: right; }
  .sum td { background: #f9fafb; font-weight: 700; }
  .paid td { background: ${b.primary}; color: #fff; font-size: 15px; font-weight: 800; }
  .wordsrow { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-top: 14px; }
  .words { flex: 1; padding: 10px 14px; border-left: 4px solid ${b.primary}; background: #f6faf4; font-size: 12px; color: #374151; }
  .words strong { text-transform: capitalize; color: #111827; }
  .stamp { flex-shrink: 0; transform: rotate(-8deg); border: 3px solid ${b.primary}; color: ${b.primary}; padding: 6px 16px; font-weight: 900; font-size: 18px; letter-spacing: 3px; border-radius: 8px; opacity: 0.85; }
  .stamp.part { border-color: #d97706; color: #d97706; }
  .note { margin-top: 12px; font-size: 12px; color: #6b7280; font-style: italic; }
  .sig { display: flex; justify-content: space-between; gap: 40px; padding: 30px 40px 18px; }
  .sig div { flex: 1; border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 11px; color: #6b7280; text-align: center; }
  .foot { background: ${b.dark}; color: #e5e7eb; padding: 14px 40px; font-size: 11px; display: flex; justify-content: space-between; gap: 16px; }
  .foot strong { color: #fff; }
`;
}

export function buildReceiptPage(receipt: any, origin = window.location.origin): string {
  const b = schoolBrandFor(receipt);
  const enrollment = receipt.enrollment;
  const studentUser = enrollment?.student?.user ?? enrollment?.staff?.user;
  const student = studentUser
    ? `${studentUser.firstName} ${studentUser.lastName}`
    : `${enrollment?.staff?.firstName ?? ''} ${enrollment?.staff?.lastName ?? ''}`.trim() || 'Unknown';
  const course = enrollment?.course?.title ?? 'Course';
  const paid = Number(receipt.amountPaid || 0);
  const balance = Number(receipt.balance ?? 0);
  const fullyPaid = balance <= 0;
  const date = new Date(receipt.paymentDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<style>${receiptStyle(b)}</style><div class="page">
    <div class="bar"></div>
    <div class="head">
      <img src="${origin}${b.logo}" alt="${b.name}" crossorigin="anonymous" />
      <div class="meta">
        <div class="title">FEE RECEIPT</div>
        <div class="school">${b.name} · ${b.school}</div>
        <div class="num">Receipt No. <strong>${esc(receipt.receiptNumber)}</strong></div>
        <div class="num">Date: <strong style="font-family:inherit">${date}</strong></div>
      </div>
    </div>
    <div class="body">
      <div class="grid">
        <div><label>Student</label><p>${esc(student)}</p></div>
        <div><label>Course / Programme</label><p>${esc(course)}</p></div>
        <div><label>Session</label><p>${esc(receipt.session)}</p></div>
        <div><label>Payment method</label><p>${esc(receipt.paymentMethod)}</p></div>
        <div><label>Status</label><p>${esc(String(receipt.status || '').replace(/^./, (c) => c.toUpperCase()))}</p></div>
        <div><label>Balance remaining</label><p style="color:${fullyPaid ? b.primary : '#d97706'}">${naira(balance)}</p></div>
      </div>
      <table>
        <thead><tr><th>Description</th><th>Method</th><th class="r">Amount</th></tr></thead>
        <tbody>
          <tr><td>${esc(course)} — tuition fee (${esc(receipt.session)})</td><td>${esc(receipt.paymentMethod)}</td><td class="r"><strong>${naira(paid)}</strong></td></tr>
          <tr class="sum"><td colspan="2">Balance remaining</td><td class="r">${naira(balance)}</td></tr>
          <tr class="paid"><td colspan="2">Amount paid</td><td class="r">${naira(paid)}</td></tr>
        </tbody>
      </table>
      <div class="wordsrow">
        <div class="words">Amount in words: <strong>${words(paid)} naira only</strong></div>
        <div class="stamp ${fullyPaid ? '' : 'part'}">${fullyPaid ? 'PAID IN FULL' : 'PART PAYMENT'}</div>
      </div>
      ${receipt.notes ? `<div class="note">Note: ${esc(receipt.notes)}</div>` : ''}
    </div>
    <div class="sig"><div>Student / Guardian</div><div>Cashier</div><div>For ${b.name}</div></div>
    <div class="foot">
      <div><strong>${b.name} — ${b.school}</strong><br/>${b.tagline}</div>
      <div style="text-align:right">${b.address}<br/>${b.phone} · ${b.email} · ${b.website}</div>
    </div>
  </div>`;
}

function viewReceipt(receipt: any) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fee Receipt - ${receipt.receiptNumber}</title>
  <style>
    body { background: #f4f6fb; padding: 20px; }
    .print-btn { display: block; text-align: center; margin: 24px auto 0; padding: 10px 28px; background: ${schoolBrandFor(receipt).primary}; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    @media print { .print-btn { display: none; } body { background: white; padding: 0; } .page { box-shadow: none !important; border-radius: 0 !important; } }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  ${buildReceiptPage(receipt)}
  <button class="print-btn" onclick="window.print()">🖨 Print</button>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

async function downloadReceipt(receipt: any) {
  // html2canvas measures a height of 0 (producing a blank PDF) for elements
  // that are themselves position:fixed/absolute — even when off-screen via a
  // large negative offset. So the element passed to html2pdf must stay
  // position:static (normal flow); it's kept off-page instead by nesting it
  // inside a fixed, zero-size, overflow:hidden wrapper, which doesn't affect
  // the static element's own measured dimensions.
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.width = '0';
  wrapper.style.height = '0';
  wrapper.style.overflow = 'hidden';

  const container = document.createElement('div');
  container.innerHTML = buildReceiptPage(receipt);
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  try {
    await html2pdf()
      .from(container)
      .set({
        margin: 0,
        filename: `Receipt-${receipt.receiptNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      })
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function FeeReceipts() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const canCreate = hasPermission('lms.fee_receipt.create.all') || hasPermission('lms.fee_receipt.create.own_department');
  const canDelete = hasPermission('lms.fee_receipt.delete.all') || hasPermission('lms.fee_receipt.delete.own_department');

  const handleDownload = async (r: any) => {
    setDownloadingId(r.id);
    try {
      await downloadReceipt(r);
    } finally {
      setDownloadingId(null);
    }
  };

  const [form, setForm] = useState({
    enrollmentId: '', amountPaid: '', paymentMethod: 'BankTransfer',
    paymentDate: new Date().toISOString().slice(0, 10),
    session: generateSessionLabel(), balanceRemaining: '', status: 'Paid', notes: '',
  });

  const { school, setSchool, info, style } = useSchool();
  const { data: receipts, isLoading } = useQuery({
    queryKey: ['fee-receipts', school],
    queryFn: () => apiClient.get<any[]>('/fee-receipts', { school }),
  });

  // Build the "students in my department" picker from my department's courses' enrollments.
  const { data: courses } = useQuery({
    queryKey: ['courses', 'school', school],
    queryFn: () => apiClient.getRaw('/courses', { school, limit: 100 }),
    enabled: recording,
  });
  const courseList: any[] = (courses as any)?.data ?? [];

  const { data: enrollmentOptions } = useQuery({
    queryKey: ['courses', 'own-department', 'enrollments', courseList.map(c => c.id).join(',')],
    queryFn: async () => {
      const lists = await Promise.all(courseList.map(c => apiClient.get<any[]>(`/courses/${c.id}/enrollments`)));
      return lists.flatMap((list, i) => list.map(e => ({ ...e, courseTitle: courseList[i].title })));
    },
    enabled: recording && courseList.length > 0,
  });

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleteReceipt = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/fee-receipts/${id}`),
    onMutate: (id: number) => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fee-receipts'] }),
  });

  const handleDelete = (r: any) => {
    if (!window.confirm(`Delete receipt ${r.receiptNumber} for ₦${Number(r.amountPaid).toLocaleString()}? This cannot be undone.`)) return;
    deleteReceipt.mutate(r.id);
  };

  const record = useMutation({
    mutationFn: () => apiClient.post('/fee-receipts', {
      enrollmentId: Number(form.enrollmentId), amountPaid: Number(form.amountPaid),
      paymentMethod: form.paymentMethod, paymentDate: form.paymentDate,
      session: form.session, balanceRemaining: form.balanceRemaining ? Number(form.balanceRemaining) : 0,
      status: form.status, notes: form.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-receipts'] });
      setRecording(false);
      setForm({ enrollmentId: '', amountPaid: '', paymentMethod: 'BankTransfer', paymentDate: new Date().toISOString().slice(0, 10), session: generateSessionLabel(), balanceRemaining: '', status: 'Paid', notes: '' });
    },
  });

  // Balance is always shown as the running "how much is left", entered
  // directly by staff on each payment and never re-derived from a single
  // receipt's own stale fields, which is what let an old, since-paid balance
  // be misread as still-owed.
  const seenEnrollments = new Set<number>();

  return (
    <div className="space-y-6" style={style}>
      <SchoolBar school={school} setSchool={setSchool} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Receipts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{info.name} — student fee payments</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setRecording(r => !r)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        )}
      </div>

      {recording && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Record a Payment</h3>
            <button onClick={() => setRecording(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <select
            value={form.enrollmentId} onChange={e => setForm(f => ({ ...f, enrollmentId: e.target.value }))}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900"
          >
            <option value="">Select student / enrollment</option>
            {(enrollmentOptions ?? []).map((e: any) => {
              const u = e.student?.user ?? e.staff?.user;
              const name = u ? `${u.firstName} ${u.lastName}` : `${e.staff?.firstName ?? ''} ${e.staff?.lastName ?? ''}`.trim();
              return <option key={e.id} value={e.id}>{name} — {e.courseTitle}</option>;
            })}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.amountPaid} onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))}
              placeholder="Amount paid (₦)" type="number"
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900"
            />
            <select
              value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900"
            >
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900"
            />
            <input
              value={form.session} onChange={e => setForm(f => ({ ...f, session: e.target.value }))}
              placeholder="Session (e.g. 2026/2027)"
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900"
            />
            <input
              value={form.balanceRemaining} onChange={e => setForm(f => ({ ...f, balanceRemaining: e.target.value }))}
              placeholder="Balance remaining after this payment (₦)" type="number"
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900"
            />
            <select
              value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900"
            >
              <option value="Paid">Paid</option>
              <option value="PartPayment">Part Payment</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <textarea
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes (optional)" rows={2}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900"
          />
          <button
            onClick={() => record.mutate()}
            disabled={!form.enrollmentId || !form.amountPaid || record.isPending}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {record.isPending ? 'Recording…' : 'Record Payment & Issue Receipt'}
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {(receipts ?? []).map((r: any) => {
              const enrollment = r.enrollment;
              const u = enrollment?.student?.user ?? enrollment?.staff?.user;
              const name = u ? `${u.firstName} ${u.lastName}` : `${enrollment?.staff?.firstName ?? ''} ${enrollment?.staff?.lastName ?? ''}`.trim() || 'Unknown';
              // Receipts arrive newest-first, so the first time we see an enrollment
              // is its most recent payment — the only place its balance is current.
              const isLatestForEnrollment = enrollment?.id != null && !seenEnrollments.has(enrollment.id);
              if (enrollment?.id != null) seenEnrollments.add(enrollment.id);
              return (
                <div key={r.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                      <p className="text-xs text-gray-500">{enrollment?.course?.title} • {r.receiptNumber} • {r.session}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">₦{Number(r.amountPaid).toLocaleString()}</p>
                      {Number(r.balance) > 0 && (
                        <p className="text-xs text-rose-500">
                          {isLatestForEnrollment ? 'Balance owing: ' : 'Balance owing at the time: '}₦{Number(r.balance).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                    <button onClick={() => viewReceipt(r)} className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800 dark:text-gray-300">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id}
                        className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                      >
                        {deletingId === r.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                        {deletingId === r.id ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(r)}
                      disabled={downloadingId === r.id}
                      className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      {downloadingId === r.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Download className="w-3.5 h-3.5" />}
                      {downloadingId === r.id ? 'Generating…' : 'Download'}
                    </button>
                  </div>
                </div>
              );
            })}
            {(receipts ?? []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Receipt className="w-10 h-10 mb-3" />
                <p className="font-medium">No fee receipts yet</p>
                <p className="text-sm mt-1">Record a payment to issue the first receipt</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FeeReceipts;
