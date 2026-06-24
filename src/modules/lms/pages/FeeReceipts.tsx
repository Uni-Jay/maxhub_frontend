import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Plus, Download, Eye, Loader2, X } from 'lucide-react';
import html2pdf from 'html2pdf.js';
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

const RECEIPT_STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; }
  .page { max-width: 750px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #2d5016 100%); color: white; padding: 32px 40px; }
  .header h1 { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
  .header p { opacity: 0.8; font-size: 12px; margin-top: 2px; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .receipt-badge { text-align: right; }
  .receipt-badge .num { font-size: 18px; font-weight: 700; }
  .receipt-badge .status { display: inline-block; margin-top: 6px; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.25); }
  .body { padding: 32px 40px; }
  .school-name { font-size: 16px; font-weight: 700; color: #4a7c2f; border-bottom: 2px solid #4a7c2f; padding-bottom: 8px; margin-bottom: 24px; }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .info-block label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600; }
  .info-block p { font-size: 14px; font-weight: 600; color: #111827; margin-top: 2px; }
  .table-wrap { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin: 24px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead { background: #f3f4f6; }
  th { padding: 10px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 700; }
  td { padding: 12px 14px; border-top: 1px solid #f0f0f0; }
  .total-row { background: #f0f4ff; }
  .total-row td { font-weight: 700; color: #4a7c2f; font-size: 15px; }
  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
  .footer p { font-size: 11px; color: #6b7280; }
  .authorized { text-align: right; }
  .authorized .line { width: 140px; border-top: 1px solid #9ca3af; margin: 0 0 0 auto; padding-top: 4px; font-size: 10px; color: #6b7280; text-align: center; }
`;

function buildReceiptPage(receipt: any): string {
  const enrollment = receipt.enrollment;
  const studentUser = enrollment?.student?.user ?? enrollment?.staff?.user;
  const student = studentUser
    ? `${studentUser.firstName} ${studentUser.lastName}`
    : `${enrollment?.staff?.firstName ?? ''} ${enrollment?.staff?.lastName ?? ''}`.trim() || 'Unknown';
  const course = enrollment?.course?.title ?? 'Unknown Course';

  return `<div class="page">
    <div class="header">
      <div class="header-row">
        <div>
          <h1>Kurios SAT School</h1>
          <p>Endless Possibilities · ICT &amp; Vocational Training</p>
        </div>
        <div class="receipt-badge">
          <div class="num">${receipt.receiptNumber}</div>
          <div class="status">${receipt.status.toUpperCase()}</div>
        </div>
      </div>
    </div>
    <div class="body">
      <div class="school-name">Kurios SAT School — Official Fee Receipt</div>
      <div class="row2">
        <div class="info-block"><label>Student Name</label><p>${student}</p></div>
        <div class="info-block"><label>Course</label><p>${course}</p></div>
        <div class="info-block"><label>Academic Session</label><p>${receipt.session}</p></div>
        <div class="info-block"><label>Balance Remaining</label><p>₦${Number(receipt.balance ?? 0).toLocaleString()}</p></div>
        <div class="info-block"><label>Payment Date</label><p>${new Date(receipt.paymentDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
        <div class="info-block"><label>Payment Method</label><p>${receipt.paymentMethod}</p></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Description</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            <tr>
              <td>${course} Tuition Fee</td>
              <td>${receipt.paymentMethod}</td>
              <td style="text-align:right; font-weight:600">₦${Number(receipt.amountPaid).toLocaleString()}</td>
            </tr>
            ${receipt.notes ? `<tr><td colspan="3" style="font-size:12px; color:#6b7280; font-style:italic;">Note: ${receipt.notes}</td></tr>` : ''}
          </tbody>
          <tfoot>
            <tr class="total-row"><td colspan="2"><strong>Total Amount Paid</strong></td><td style="text-align:right">₦${Number(receipt.amountPaid).toLocaleString()}</td></tr>
            <tr><td colspan="2"><strong>Balance Remaining</strong></td><td style="text-align:right">₦${Number(receipt.balance ?? 0).toLocaleString()}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
    <div class="footer">
      <div>
        <p><strong>Kurios SAT School</strong></p>
        <p>Generated: ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p>This is an official school fee receipt. Keep for your records.</p>
      </div>
      <div class="authorized"><div class="line">Authorized Signature</div></div>
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
    ${RECEIPT_STYLE}
    body { background: #f4f6fb; padding: 20px; }
    .print-btn { display: block; text-align: center; margin: 24px auto 0; padding: 10px 28px; background: #4a7c2f; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    @media print { .print-btn { display: none; } body { background: white; padding: 0; } .page { box-shadow: none; border-radius: 0; } }
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
  container.innerHTML = `<style>${RECEIPT_STYLE}</style>${buildReceiptPage(receipt)}`;
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
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const canCreate = hasPermission('lms.fee_receipt.create.all') || hasPermission('lms.fee_receipt.create.own_department');

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
    session: generateSessionLabel(), balance: '0', status: 'Paid', notes: '',
  });

  const { data: receipts, isLoading } = useQuery({
    queryKey: ['fee-receipts'],
    queryFn: () => apiClient.get<any[]>('/fee-receipts'),
  });

  // Build the "students in my department" picker from my department's courses' enrollments.
  const { data: courses } = useQuery({
    queryKey: ['courses', 'own-department', user?.departmentId],
    queryFn: () => apiClient.getRaw('/courses', { departmentId: user?.departmentId, limit: 100 }),
    enabled: recording && !!user?.departmentId,
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

  const record = useMutation({
    mutationFn: () => apiClient.post('/fee-receipts', {
      enrollmentId: Number(form.enrollmentId), amountPaid: Number(form.amountPaid),
      paymentMethod: form.paymentMethod, paymentDate: form.paymentDate,
      session: form.session, balance: Number(form.balance) || 0, status: form.status, notes: form.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-receipts'] });
      setRecording(false);
      setForm({ enrollmentId: '', amountPaid: '', paymentMethod: 'BankTransfer', paymentDate: new Date().toISOString().slice(0, 10), session: generateSessionLabel(), balance: '0', status: 'Paid', notes: '' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Receipts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kurios SAT — Student Fee Payments</p>
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
              value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
              placeholder="Balance remaining (₦)" type="number"
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
                      {Number(r.balance) > 0 && <p className="text-xs text-rose-500">Bal: ₦{Number(r.balance).toLocaleString()}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                    <button onClick={() => viewReceipt(r)} className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800 dark:text-gray-300">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
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
