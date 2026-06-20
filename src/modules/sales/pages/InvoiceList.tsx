import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, Download, Send, CheckCircle, X,
  Trash2, Eye, DollarSign, Clock, AlertTriangle, ChevronLeft, ChevronRight,
  GraduationCap, BookOpen,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';
import { format } from 'date-fns';

type InvoiceStatus = 'Draft' | 'Issued' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Cancelled';
const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Issued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PartiallyPaid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Cancelled: 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
};

interface LineItem { description: string; qty: number; unitPrice: number; }
interface ClientOption { id: number; fullName: string; email: string; clientId: string; departmentId?: number; }
interface Invoice {
  id: number; invoiceCode: string; clientId?: number; client?: { fullName: string; email?: string; clientId?: string };
  department?: { id: number; name: string; code: string };
  invoiceDate: string; dueDate: string; total: number; subtotal: number; tax: number; discount: number;
  status: InvoiceStatus; items?: LineItem[]; description?: string;
}

function getInvoiceBranding(departmentCode?: string) {
  if (!departmentCode) return { bg: 'bg-indigo-600', name: 'MaxHub ERP', tagline: 'Enterprise Resource Platform', textColor: 'text-white', logo: '/images/maxhublogo.jpeg' };
  if (departmentCode === 'KS') return { bg: 'bg-gradient-to-r from-gray-900 to-green-900', name: 'Kurios SAT', tagline: 'Endless Possibilities · IT Solutions & Training', textColor: 'text-white', logo: '/images/kuriossatlogo.jpeg' };
  if (departmentCode === 'BM') return { bg: 'bg-gradient-to-r from-rose-800 to-pink-700', name: 'BeadMax Design', tagline: 'Beads · Beauty · Creativity', textColor: 'text-white', logo: '/images/beadmaxlogo.jpeg' };
  if (departmentCode === 'VM') return { bg: 'bg-gradient-to-r from-blue-700 to-red-600', name: 'VisaMax Travel Ltd', tagline: 'Your Journey, Our Expertise', textColor: 'text-white', logo: '/images/visamax_logo.jpeg' };
  return { bg: 'bg-indigo-600', name: 'MaxHub ERP', tagline: 'Enterprise Resource Platform', textColor: 'text-white', logo: '/images/maxhublogo.jpeg' };
}

const INIT_FORM = { clientId: '', dueDate: '', taxRate: 7.5, discountRate: 0, notes: '', items: [{ description: '', qty: 1, unitPrice: 0 }] as LineItem[] };

function printInvoice(invoice: Invoice) {
  const brand = getInvoiceBranding(invoice.department?.code);
  const items = invoice.items ?? [{ description: 'Services', qty: 1, unitPrice: invoice.total }];
  const itemRows = items.map(it => `
    <tr>
      <td style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;">${it.description}</td>
      <td style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;text-align:center;">${it.qty}</td>
      <td style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;text-align:right;">₦${Number(it.unitPrice).toLocaleString()}</td>
      <td style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;font-weight:600;text-align:right;">₦${(it.qty * it.unitPrice).toLocaleString()}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Invoice ${invoice.invoiceCode}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; background:#f4f6fb; padding:20px; }
    .page { max-width:750px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.1); }
    .print-btn { display:block; text-align:center; margin:24px auto 0; padding:10px 28px; background:#4f46e5; color:white; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; }
    @media print { .print-btn { display:none; } body { background:white; padding:0; } .page { box-shadow:none; border-radius:0; } }
  </style></head>
  <body>
    <div class="page">
      <div style="padding:32px 40px;color:white;" class="${brand.bg}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div><div style="font-size:24px;font-weight:900;">${brand.name}</div><div style="opacity:0.8;font-size:12px;margin-top:4px;">${brand.tagline}</div></div>
          <div style="text-align:right;"><div style="font-size:18px;font-weight:700;">${invoice.invoiceCode}</div><div style="margin-top:6px;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(255,255,255,0.25);display:inline-block;">${invoice.status.toUpperCase()}</div></div>
        </div>
      </div>
      <div style="padding:32px 40px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
          <div><label style="font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600;">Bill To</label><p style="font-size:14px;font-weight:600;margin-top:2px;">${invoice.client?.fullName ?? 'Client'}</p></div>
          <div><label style="font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600;">Due Date</label><p style="font-size:14px;font-weight:600;margin-top:2px;">${new Date(invoice.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead style="background:#f3f4f6;"><tr>
              <th style="padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7280;">Description</th>
              <th style="padding:10px 14px;text-align:center;font-size:10px;text-transform:uppercase;color:#6b7280;">Qty</th>
              <th style="padding:10px 14px;text-align:right;font-size:10px;text-transform:uppercase;color:#6b7280;">Unit Price</th>
              <th style="padding:10px 14px;text-align:right;font-size:10px;text-transform:uppercase;color:#6b7280;">Amount</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr><td colspan="3" style="padding:8px 14px;text-align:right;font-size:12px;color:#6b7280;">Subtotal</td><td style="padding:8px 14px;text-align:right;font-size:12px;">₦${Number(invoice.subtotal).toLocaleString()}</td></tr>
              ${Number(invoice.discount) > 0 ? `<tr><td colspan="3" style="padding:8px 14px;text-align:right;font-size:12px;color:#6b7280;">Discount</td><td style="padding:8px 14px;text-align:right;font-size:12px;">-₦${Number(invoice.discount).toLocaleString()}</td></tr>` : ''}
              ${Number(invoice.tax) > 0 ? `<tr><td colspan="3" style="padding:8px 14px;text-align:right;font-size:12px;color:#6b7280;">Tax</td><td style="padding:8px 14px;text-align:right;font-size:12px;">₦${Number(invoice.tax).toLocaleString()}</td></tr>` : ''}
              <tr style="background:#f0f4ff;"><td colspan="3" style="padding:12px 14px;text-align:right;font-size:14px;font-weight:700;color:#4f46e5;">Total</td><td style="padding:12px 14px;text-align:right;font-size:15px;font-weight:700;color:#4f46e5;">₦${Number(invoice.total).toLocaleString()}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
    <button class="print-btn" onclick="window.print()">Print Invoice</button>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
}


function calcLine(item: LineItem) { return item.qty * item.unitPrice; }
function calcTotal(items: LineItem[], tax: number, discount: number) {
  const sub = items.reduce((s, i) => s + calcLine(i), 0);
  return sub + (sub * tax / 100) - (sub * discount / 100);
}

function InvoiceDetailModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const brand = getInvoiceBranding(invoice.department?.code);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Invoice header */}
        <div className={`${brand.bg} text-white p-6`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <img src={brand.logo} alt={brand.name} className="h-10 w-auto object-contain brightness-0 invert" onError={e => (e.currentTarget.style.display = 'none')} />
              <div>
                <div className="text-2xl font-black">{brand.name}</div>
                <div className="text-white/70 text-sm mt-1">{brand.tagline}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">{invoice.invoiceCode}</div>
              <div className={cn('mt-1 inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-white/20')}>{invoice.status}</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between text-sm">
            <div><p className="text-gray-500">Bill To</p><p className="font-semibold text-gray-900 dark:text-white mt-1">{invoice.client?.fullName ?? '—'}</p></div>
            <div className="text-right">
              <p className="text-gray-500">Issue Date</p><p className="font-medium">{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</p>
              <p className="text-gray-500 mt-2">Due Date</p><p className="font-medium">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>{['Description', 'Qty', 'Unit Price', 'Total'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody>
                {invoice.items ? invoice.items.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-2.5">{item.description}</td>
                    <td className="px-4 py-2.5">{item.qty}</td>
                    <td className="px-4 py-2.5">₦{Number(item.unitPrice).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-medium">₦{calcLine(item).toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-2.5">Services</td>
                    <td className="px-4 py-2.5">1</td>
                    <td className="px-4 py-2.5">₦{Number(invoice.total).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-medium">₦{Number(invoice.total).toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Amount breakdown in detail modal */}
          <div className="flex justify-end">
            <div className="w-56 space-y-1.5 text-sm bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-medium">₦{Number(invoice.subtotal).toLocaleString()}</span>
              </div>
              {Number(invoice.tax) > 0 && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Tax</span>
                  <span className="font-medium">+₦{Number(invoice.tax).toLocaleString()}</span>
                </div>
              )}
              {Number(invoice.discount) > 0 && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Discount</span>
                  <span className="font-medium text-green-600 dark:text-green-400">−₦{Number(invoice.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1.5">
                <span className="font-bold text-gray-900 dark:text-white">Total</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">₦{Number(invoice.total).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Close</button>
            <button onClick={() => printInvoice(invoice)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCHOOL FEE RECEIPTS
// ═══════════════════════════════════════════════════════════
type FeeStatus = 'Paid' | 'Part-Payment' | 'Pending';

const FEE_STATUS_STYLES: Record<FeeStatus, string> = {
  Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Part-Payment': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Pending: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface FeeReceipt {
  id: number;
  receiptNumber: string;
  studentName: string;
  studentId: string;
  program: string;
  school: string;
  session: string;
  term: string;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
  status: FeeStatus;
}


const PROGRAMS = ['Fashion Design', 'Digital Marketing', 'Beadwork & Jewellery', 'Graphics Design', 'SAT Prep', 'Web Development'];
const SCHOOLS = ['Kurios SAT School', 'Bead Max Vocational School'];
const TERMS = ['First Term', 'Second Term', 'Third Term'];
const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'POS', 'Online'];

const INIT_FEE_FORM = {
  studentName: '',
  studentId: '',
  program: 'Fashion Design',
  school: 'Kurios SAT School',
  session: '2026/2027',
  term: 'First Term',
  amountPaid: '',
  paymentMethod: 'Bank Transfer',
  paymentDate: new Date().toISOString().slice(0, 10),
  notes: '',
};

function generateReceiptNumber() {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `REC-${year}-${num}`;
}

function getSchoolBranding(school: string) {
  if (school.toLowerCase().includes('kurios')) {
    return { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #2d5016 100%)', accent: '#4a7c2f', name: 'Kurios SAT School', tagline: 'Endless Possibilities · ICT & Vocational Training', contact: 'support@kuriosat.com | +234 801 234 5678', logo: '/images/kuriossatlogo.jpeg' };
  }
  if (school.toLowerCase().includes('bead')) {
    return { gradient: 'linear-gradient(135deg, #7c2d5a 0%, #b5446e 60%, #c8956c 100%)', accent: '#b5446e', name: 'BeadMax Vocational School', tagline: 'Beads · Beauty · Creativity', contact: 'info@beadmax.ng | +234 802 345 6789', logo: '/images/beadmaxlogo.jpeg' };
  }
  return { gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', accent: '#4f46e5', name: school, tagline: 'Official Fee Receipt', contact: '', logo: '/images/maxhublogo.jpeg' };
}

function downloadFeeReceipt(receipt: FeeReceipt) {
  const brand = getSchoolBranding(receipt.school);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fee Receipt - ${receipt.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #f4f6fb; padding: 20px; }
    .page { max-width: 750px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    .header { background: ${brand.gradient}; color: white; padding: 32px 40px; }
    .header h1 { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
    .header p { opacity: 0.8; font-size: 12px; margin-top: 2px; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .receipt-badge { text-align: right; }
    .receipt-badge .num { font-size: 18px; font-weight: 700; }
    .receipt-badge .status { display: inline-block; margin-top: 6px; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.25); }
    .body { padding: 32px 40px; }
    .school-name { font-size: 16px; font-weight: 700; color: ${brand.accent}; border-bottom: 2px solid ${brand.accent}; padding-bottom: 8px; margin-bottom: 24px; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .info-block label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600; }
    .info-block p { font-size: 14px; font-weight: 600; color: #111827; margin-top: 2px; }
    .table-wrap { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin: 24px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: #f3f4f6; }
    th { padding: 10px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 700; }
    td { padding: 12px 14px; border-top: 1px solid #f0f0f0; }
    .total-row { background: #f0f4ff; }
    .total-row td { font-weight: 700; color: ${brand.accent}; font-size: 15px; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
    .footer p { font-size: 11px; color: #6b7280; }
    .authorized { text-align: right; }
    .authorized .line { width: 140px; border-top: 1px solid #9ca3af; margin: 0 0 0 auto; padding-top: 4px; font-size: 10px; color: #6b7280; text-align: center; }
    .status-paid { color: #059669; }
    .status-partial { color: #d97706; }
    .status-pending { color: #dc2626; }
    .print-btn { display: block; text-align: center; margin: 24px auto 0; padding: 10px 28px; background: ${brand.accent}; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    @media print { .print-btn { display: none; } body { background: white; padding: 0; } .page { box-shadow: none; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-row">
        <div style="display:flex;align-items:center;gap:14px">
          <img src="${brand.logo}" alt="${brand.name}" style="height:50px;width:auto;object-fit:contain;filter:brightness(0) invert(1)" onerror="this.style.display='none'" />
          <div>
            <h1>${brand.name}</h1>
            <p>${brand.tagline}</p>
            ${brand.contact ? `<p style="margin-top:4px;font-size:11px;opacity:0.7">${brand.contact}</p>` : ''}
          </div>
        </div>
        <div class="receipt-badge">
          <div class="num">${receipt.receiptNumber}</div>
          <div class="status">${receipt.status.toUpperCase()}</div>
        </div>
      </div>
    </div>
    <div class="body">
      <div class="school-name">${receipt.school} — Official Fee Receipt</div>
      <div class="row2">
        <div class="info-block"><label>Student Name</label><p>${receipt.studentName}</p></div>
        <div class="info-block"><label>Student ID</label><p>${receipt.studentId}</p></div>
        <div class="info-block"><label>Program</label><p>${receipt.program}</p></div>
        <div class="info-block"><label>Academic Session</label><p>${receipt.session}</p></div>
        <div class="info-block"><label>Term</label><p>${receipt.term}</p></div>
        <div class="info-block"><label>Payment Date</label><p>${receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Term</th>
              <th>Payment Method</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${receipt.program} Tuition Fee</td>
              <td>${receipt.term}</td>
              <td>${receipt.paymentMethod || '—'}</td>
              <td style="text-align:right; font-weight:600">₦${receipt.amountPaid.toLocaleString()}</td>
            </tr>
            ${receipt.notes ? `<tr><td colspan="4" style="font-size:12px; color:#6b7280; font-style:italic;">Note: ${receipt.notes}</td></tr>` : ''}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3"><strong>Total Amount Paid</strong></td>
              <td style="text-align:right">₦${receipt.amountPaid.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p style="font-size:12px;color:#6b7280;margin-top:8px;">
        Payment Status: <span class="${receipt.status === 'Paid' ? 'status-paid' : receipt.status === 'Part-Payment' ? 'status-partial' : 'status-pending'}">${receipt.status}</span>
      </p>
    </div>
    <div class="footer">
      <div>
        <p><strong>${brand.name}</strong></p>
        <p>Generated: ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p>This is an official school fee receipt. Keep for your records.</p>
      </div>
      <div class="authorized">
        <div class="line">Authorized by Finance Dept</div>
      </div>
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">Print Receipt</button>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function SchoolFeeReceiptsTab() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [form, setForm] = useState(INIT_FEE_FORM);
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleGenerate = () => {
    if (!form.studentName || !form.amountPaid) return;
    const newReceipt: FeeReceipt = {
      id: Date.now(),
      receiptNumber: generateReceiptNumber(),
      studentName: form.studentName,
      studentId: form.studentId,
      program: form.program,
      school: form.school,
      session: form.session,
      term: form.term,
      amountPaid: Number(form.amountPaid),
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
      notes: form.notes,
      status: Number(form.amountPaid) > 0 ? 'Paid' : 'Pending',
    };
    setReceipts(prev => [newReceipt, ...prev]);
    setForm(INIT_FEE_FORM);
    setShowGenerate(false);
  };

  const filtered = receipts.filter(r =>
    (!search || r.studentName.toLowerCase().includes(search.toLowerCase()) || r.receiptNumber.includes(search)) &&
    (!statusFilter || r.status === statusFilter)
  );

  const feeStats = {
    total: receipts.length,
    paid: receipts.filter(r => r.status === 'Paid').length,
    partial: receipts.filter(r => r.status === 'Part-Payment').length,
    pending: receipts.filter(r => r.status === 'Pending').length,
    revenue: receipts.reduce((s, r) => s + r.amountPaid, 0),
  };

  const INP = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const LBL = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: feeStats.total, icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Paid', value: feeStats.paid, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Part-Payment', value: feeStats.partial, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Pending', value: feeStats.pending, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
          { label: 'Total Revenue', value: `₦${(feeStats.revenue / 1000).toFixed(0)}k`, icon: DollarSign, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', s.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters + action */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student or receipt #..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          <option>Paid</option>
          <option>Part-Payment</option>
          <option>Pending</option>
        </select>
        <button onClick={() => setShowGenerate(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
          <Plus className="h-4 w-4" /> Generate Receipt
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {['Receipt #', 'Student', 'Program', 'Session/Term', 'Amount Paid', 'Payment Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No receipts found</p>
                </td></tr>
              ) : filtered.map((r, i) => (
                <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{r.receiptNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{r.studentName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.studentId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 dark:text-gray-300">{r.program}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.school}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                    <p>{r.session}</p>
                    <p>{r.term}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                    {r.amountPaid > 0 ? `₦${r.amountPaid.toLocaleString()}` : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{r.paymentDate}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold', FEE_STATUS_STYLES[r.status])}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => downloadFeeReceipt(r)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors" title="Download Receipt">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setReceipts(prev => prev.filter(x => x.id !== r.id))}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Receipt Modal */}
      <AnimatePresence>
        {showGenerate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowGenerate(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Generate School Fee Receipt</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fill in the details below</p>
                </div>
                <button onClick={() => setShowGenerate(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X className="h-4 w-4" /></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={LBL}>Student Name *</label>
                    <input value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))}
                      placeholder="Full name" className={INP} />
                  </div>
                  <div>
                    <label className={LBL}>Student ID</label>
                    <input value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                      placeholder="e.g. STU-007" className={INP} />
                  </div>
                  <div>
                    <label className={LBL}>Program</label>
                    <select value={form.program} onChange={e => setForm(f => ({ ...f, program: e.target.value }))} className={INP}>
                      {PROGRAMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>School</label>
                    <select value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} className={INP}>
                      {SCHOOLS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>Session</label>
                    <input value={form.session} onChange={e => setForm(f => ({ ...f, session: e.target.value }))}
                      placeholder="e.g. 2026/2027" className={INP} />
                  </div>
                  <div>
                    <label className={LBL}>Term</label>
                    <select value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className={INP}>
                      {TERMS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>Amount Paid (₦) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 font-medium">₦</span>
                      <input type="number" value={form.amountPaid} onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))}
                        placeholder="0" className={cn(INP, 'pl-7')} />
                    </div>
                  </div>
                  <div>
                    <label className={LBL}>Payment Method</label>
                    <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className={INP}>
                      {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>Payment Date</label>
                    <input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} className={INP} />
                  </div>
                </div>
                <div>
                  <label className={LBL}>Notes (optional)</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any additional notes..." rows={2}
                    className={cn(INP, 'resize-none')} />
                </div>
              </div>

              <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setShowGenerate(false)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button onClick={handleGenerate} disabled={!form.studentName || !form.amountPaid}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
                  <FileText className="h-3.5 w-3.5" /> Generate Receipt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN INVOICE LIST
// ═══════════════════════════════════════════════════════════
type MainTab = 'invoices' | 'school-fees';

export default function InvoiceList() {
  const [mainTab, setMainTab] = useState<MainTab>('invoices');
  const [tab, setTab] = useState<InvoiceStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [formError, setFormError] = useState('');
  const qc = useQueryClient();
  const LIMIT = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', tab, search, page],
    queryFn: async () => {
      return await apiClient.getRaw('/invoices', { page, limit: LIMIT, ...(tab !== 'All' && { status: tab }), ...(search && { search }) }) as any;
    },
    enabled: mainTab === 'invoices',
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'for-invoice-pick'],
    queryFn: () => apiClient.getRaw('/clients', { page: 1, limit: 200 }),
    enabled: showCreate,
  });
  const clientOptions: ClientOption[] = (clientsData as any)?.data ?? [];

  const invoices: Invoice[] = (data as any)?.data ?? [];
  const pagination = (data as any)?.pagination ?? { total: invoices.length, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post('/invoices', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setShowCreate(false); setForm(INIT_FORM); setFormError(''); },
    onError: (err: any) => setFormError(err?.response?.data?.message || err?.message || 'Failed to create invoice'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiClient.patch(`/invoices/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/invoices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const stats = { total: invoices.length, paid: invoices.filter(i => i.status === 'Paid').length, pending: invoices.filter(i => i.status === 'Issued').length, overdue: invoices.filter(i => i.status === 'Overdue').length, revenue: invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.total), 0) };

  const setItem = (idx: number, key: keyof LineItem, val: string | number) => {
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [key]: val } : item) }));
  };

  const INVOICE_TABS: (InvoiceStatus | 'All')[] = ['All', 'Draft', 'Issued', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invoices & Receipts</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sales invoices, payment tracking and school fee receipts</p>
        </div>
        {mainTab === 'invoices' && (
          <button onClick={() => { setFormError(''); setShowCreate(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" /> New Invoice
          </button>
        )}
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
        {([
          { key: 'invoices', label: 'Invoices', icon: FileText },
          { key: 'school-fees', label: 'School Fee Receipts', icon: GraduationCap },
        ] as { key: MainTab; label: string; icon: any }[]).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setMainTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                mainTab === t.key
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}>
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {mainTab === 'school-fees' ? (
          <motion.div key="school-fees" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <SchoolFeeReceiptsTab />
          </motion.div>
        ) : (
          <motion.div key="invoices" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              {[
                { label: 'Total', value: stats.total, icon: FileText, color: 'text-gray-600 bg-gray-50 dark:bg-gray-700' },
                { label: 'Paid', value: stats.paid, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
                { label: 'Revenue', value: `₦${(stats.revenue / 1000).toFixed(0)}k`, icon: DollarSign, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', s.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3 mb-5">
              <div className="flex flex-wrap gap-1">
                {INVOICE_TABS.map(t => (
                  <button key={t} onClick={() => { setTab(t); setPage(1); }}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', tab === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600')}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client or invoice number..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      {['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Amount', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /></td>)}</tr>
                    )) : invoices.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No invoices found</p>
                      </td></tr>
                    ) : invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{inv.invoiceCode}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{inv.client?.fullName ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{format(new Date(inv.invoiceDate), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{format(new Date(inv.dueDate), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">₦{Number(inv.total).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold', STATUS_STYLES[inv.status])}>{inv.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors" title="View"><Eye className="h-3.5 w-3.5" /></button>
                            <button onClick={() => printInvoice(inv)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors" title="Download PDF"><Download className="h-3.5 w-3.5" /></button>
                            {inv.status === 'Draft' && (
                              <button onClick={() => statusMutation.mutate({ id: inv.id, status: 'Issued' })} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition-colors" title="Send"><Send className="h-3.5 w-3.5" /></button>
                            )}
                            {(inv.status === 'Issued' || inv.status === 'PartiallyPaid') && (
                              <button onClick={() => statusMutation.mutate({ id: inv.id, status: 'Paid' })} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg transition-colors" title="Mark Paid"><CheckCircle className="h-3.5 w-3.5" /></button>
                            )}
                            {inv.status === 'Draft' && (
                              <button onClick={() => { if (confirm(`Delete invoice ${inv.invoiceCode}?`)) deleteMutation.mutate(inv.id); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {pagination.totalPages}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                    <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>

            {/* Create Invoice Modal */}
            <AnimatePresence>
              {showCreate && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
                  <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Invoice</h2>
                      <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X className="h-4 w-4" /></button>
                    </div>

                    <div className="p-6 space-y-4">
                      {formError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-3 py-2 text-xs">{formError}</div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                          <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">Select a client</option>
                            {clientOptions.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.clientId})</option>)}
                          </select></div>
                        <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                          <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                        <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                          <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tax %</label>
                            <input type="number" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                          <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                            <input type="number" value={form.discountRate} onChange={e => setForm(f => ({ ...f, discountRate: Number(e.target.value) }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                        </div>
                      </div>

                      {/* Line items */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Line Items</label>
                          <button onClick={() => setForm(f => ({ ...f, items: [...f.items, { description: '', qty: 1, unitPrice: 0 }] }))}
                            className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium">+ Add Item</button>
                        </div>
                        {/* Column headers */}
                        <div className="grid grid-cols-12 gap-2 mb-1 px-1">
                          <span className="col-span-5 text-[10px] font-semibold text-gray-400 uppercase">Description</span>
                          <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase text-center">Qty</span>
                          <span className="col-span-3 text-[10px] font-semibold text-gray-400 uppercase text-center">Unit Price (₦)</span>
                          <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase text-right pr-1">Amount (₦)</span>
                        </div>
                        <div className="space-y-2">
                          {form.items.map((item, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-5">
                                <input value={item.description} onChange={e => setItem(i, 'description', e.target.value)}
                                  placeholder="Item description" className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                              </div>
                              <div className="col-span-2">
                                <input type="number" min={1} value={item.qty} onChange={e => setItem(i, 'qty', Number(e.target.value))}
                                  className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center" />
                              </div>
                              <div className="col-span-3">
                                <input type="number" min={0} value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', Number(e.target.value))}
                                  placeholder="0" className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right" />
                              </div>
                              <div className="col-span-2 flex items-center justify-end gap-1">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 text-right flex-1">
                                  {calcLine(item).toLocaleString()}
                                </span>
                                {form.items.length > 1 && (
                                  <button onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))} className="p-0.5 text-red-400 hover:text-red-600 flex-shrink-0"><X className="h-3 w-3" /></button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Amount breakdown */}
                      {(() => {
                        const subtotal = form.items.reduce((s, it) => s + calcLine(it), 0);
                        const taxAmt = subtotal * form.taxRate / 100;
                        const discAmt = subtotal * form.discountRate / 100;
                        const grandTotal = subtotal + taxAmt - discAmt;
                        return (
                          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 space-y-1.5 text-sm border-t border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                              <span>Subtotal</span>
                              <span className="font-medium text-gray-700 dark:text-gray-300">₦{subtotal.toLocaleString()}</span>
                            </div>
                            {form.taxRate > 0 && (
                              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Tax ({form.taxRate}%)</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">+₦{taxAmt.toLocaleString()}</span>
                              </div>
                            )}
                            {form.discountRate > 0 && (
                              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Discount ({form.discountRate}%)</span>
                                <span className="font-medium text-green-600 dark:text-green-400">−₦{discAmt.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                              <span className="font-bold text-gray-900 dark:text-white">Total Amount</span>
                              <span className="font-bold text-xl text-indigo-600 dark:text-indigo-400">₦{grandTotal.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })()}

                      <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Notes / payment terms..." rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />

                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                        <button onClick={() => {
                            setFormError('');
                            const subtotal = form.items.reduce((s, it) => s + calcLine(it), 0);
                            const taxAmt = subtotal * form.taxRate / 100;
                            const discAmt = subtotal * form.discountRate / 100;
                            createMutation.mutate({
                              clientId: Number(form.clientId), dueDate: form.dueDate,
                              subtotal, tax: taxAmt, discount: discAmt,
                              total: calcTotal(form.items, form.taxRate, form.discountRate),
                              currency: 'NGN', description: form.notes || undefined, items: form.items,
                            });
                          }}
                          disabled={!form.clientId || !form.dueDate || createMutation.isPending}
                          className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50">
                          {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invoice detail modal */}
            <AnimatePresence>
              {selectedInvoice && <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
