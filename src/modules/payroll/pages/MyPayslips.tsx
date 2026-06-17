import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Download, FileText, ChevronDown, ChevronRight,
  TrendingUp, Calendar, Wallet, Clock,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';
import { cn } from '@utils/cn';

const fmt = (n: number) =>
  `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  Processed: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  Approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  Draft: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

interface MyPayslip {
  id: number;
  salaryCode: string;
  periodName: string;
  baseSalary: number;
  bonus: number;
  grossSalary: number;
  incomeTax: number;
  providentFund: number;
  healthInsurance: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
  payDate: string;
}


function generatePayslipHTML(slip: MyPayslip, employeeName: string, employeeId: string) {
  const today = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Payslip — ${slip.salaryCode}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a1a2e; background: #f9fafb; }
  .wrapper { max-width: 700px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
  .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 28px 32px; display: flex; align-items: center; gap: 18px; }
  .logo { width: 52px; height: 52px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; flex-shrink: 0; }
  .company h1 { font-size: 20px; font-weight: 700; }
  .company p { font-size: 11px; opacity: 0.75; margin-top: 2px; }
  .slip-badge { margin-left: auto; text-align: right; }
  .slip-badge h2 { font-size: 16px; font-weight: 700; background: rgba(255,255,255,0.15); padding: 6px 14px; border-radius: 8px; }
  .slip-badge p { font-size: 11px; opacity: 0.7; margin-top: 4px; }
  .body { padding: 28px 32px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8f9ff; border-radius: 10px; padding: 16px; margin-bottom: 24px; border: 1px solid #e5e7eb; }
  .meta-item p:first-child { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
  .meta-item p:last-child { font-size: 13px; font-weight: 700; color: #111827; }
  h3 { font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; margin-top: 20px; padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-weight: 600; color: #374151; font-size: 11px; text-transform: uppercase; }
  td { padding: 9px 12px; border-bottom: 1px solid #f9fafb; }
  .amount { text-align: right; font-variant-numeric: tabular-nums; }
  .total-row td { font-weight: 700; background: #f3f4f6; }
  .net-box { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; border-radius: 12px; padding: 20px 28px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
  .net-box .label { font-size: 15px; font-weight: 700; color: #065f46; }
  .net-box .value { font-size: 28px; font-weight: 900; color: #047857; }
  .footer { border-top: 1px solid #e5e7eb; padding: 14px 32px; background: #f9fafb; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #9ca3af; }
  .sig { border-top: 1px solid #9ca3af; width: 160px; padding-top: 4px; font-size: 11px; color: #6b7280; text-align: center; }
  .print-btn { display: block; margin: 20px auto 24px; padding: 11px 32px; background: #4f46e5; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; letter-spacing: 0.02em; }
  @media print {
    body { background: white; }
    .wrapper { box-shadow: none; margin: 0; border-radius: 0; }
    .print-btn { display: none; }
    @page { size: A4; margin: 15mm 20mm; }
  }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <img src="/images/maxhublogo.jpeg" alt="MaxHub" style="width:56px;height:56px;border-radius:10px;object-fit:contain;background:#fff;padding:4px;flex-shrink:0;" />
    <div class="company">
      <h1>MaxHub</h1>
      <p>Lagos, Nigeria &nbsp;·&nbsp; info@maxhub.com &nbsp;·&nbsp; maxhub.app</p>
    </div>
    <div class="slip-badge">
      <h2>PAY SLIP</h2>
      <p>${slip.periodName}</p>
    </div>
  </div>
  <div class="body">
    <div class="meta">
      <div class="meta-item"><p>Employee Name</p><p>${employeeName}</p></div>
      <div class="meta-item"><p>Pay Period</p><p>${slip.periodName}</p></div>
      <div class="meta-item"><p>Employee ID / Code</p><p>${employeeId || slip.salaryCode}</p></div>
      <div class="meta-item"><p>Payment Date</p><p>${new Date(slip.payDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
    </div>
    <h3>Earnings</h3>
    <table>
      <thead><tr><th>Description</th><th class="amount">Amount (₦)</th></tr></thead>
      <tbody>
        <tr><td>Basic Salary</td><td class="amount">${fmt(slip.baseSalary)}</td></tr>
        <tr><td>Bonus / Incentive</td><td class="amount">${fmt(slip.bonus)}</td></tr>
        <tr class="total-row"><td>Gross Salary</td><td class="amount">${fmt(slip.grossSalary)}</td></tr>
      </tbody>
    </table>
    <h3>Deductions</h3>
    <table>
      <thead><tr><th>Description</th><th class="amount">Amount (₦)</th></tr></thead>
      <tbody>
        <tr><td>Income Tax (PAYE)</td><td class="amount">- ${fmt(slip.incomeTax)}</td></tr>
        <tr><td>Pension Contribution</td><td class="amount">- ${fmt(slip.providentFund)}</td></tr>
        <tr><td>Health Insurance (HMO)</td><td class="amount">- ${fmt(slip.healthInsurance)}</td></tr>
        <tr><td>Other Deductions</td><td class="amount">- ${fmt(slip.otherDeductions)}</td></tr>
        <tr class="total-row"><td>Total Deductions</td><td class="amount">- ${fmt(slip.totalDeductions)}</td></tr>
      </tbody>
    </table>
    <div class="net-box">
      <span class="label">💰 Net Pay</span>
      <span class="value">${fmt(slip.netSalary)}</span>
    </div>
  </div>
  <div class="footer">
    <p>Generated on ${today} &nbsp;·&nbsp; This is a computer-generated payslip. No signature required.</p>
    <div class="sig">Authorised Signatory</div>
  </div>
</div>
<button class="print-btn" onclick="window.print()">🖨&nbsp; Print / Save as PDF</button>
</body>
</html>`;
}

export default function MyPayslips() {
  const user = useAuthStore(s => s.user);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const employeeName = user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() : 'Employee';
  const employeeId = (user as any)?.staffCode || (user as any)?.employeeId || `EMP-${(user as any)?.id || '001'}`;

  const { data } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: async () => {
      try { return await apiClient.get('/payroll/my-slips') as any; }
      catch { return []; }
    },
  });

  const slips: MyPayslip[] = Array.isArray(data) ? data : (data as any)?.data || [];

  const ytdGross = slips.filter(s => s.status === 'Paid').reduce((sum, s) => sum + s.grossSalary, 0);
  const ytdDeductions = slips.filter(s => s.status === 'Paid').reduce((sum, s) => sum + s.totalDeductions, 0);
  const ytdNet = slips.filter(s => s.status === 'Paid').reduce((sum, s) => sum + s.netSalary, 0);
  const latest = slips[0];

  const nextPayDate = (() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    return next.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  const STATS = [
    { label: 'YTD Earnings', value: fmt(ytdGross), icon: TrendingUp, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'YTD Deductions', value: fmt(ytdDeductions), icon: Wallet, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'YTD Net Received', value: fmt(ytdNet), icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Next Pay Date', value: nextPayDate, icon: Calendar, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  ];

  const handleDownload = (slip: MyPayslip) => {
    const html = generatePayslipHTML(slip, employeeName, employeeId);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.focus();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Payslips</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and download your salary records</p>
        </div>
        {latest && (
          <button onClick={() => handleDownload(latest)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm">
            <Download className="h-4 w-4" /> Latest Payslip
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', bg)}>
              <Icon className={cn('h-4.5 w-4.5', color)} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className={cn('text-base font-bold mt-0.5', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Payslip list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Payslip History</h2>
        </div>

        {slips.map((slip, i) => (
          <motion.div key={slip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
            <div
              onClick={() => setExpandedId(expandedId === slip.id ? null : slip.id)}
              className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
            >
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{slip.periodName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {new Date(slip.payDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400 dark:text-gray-500">Gross</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fmt(slip.grossSalary)}</p>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-400 dark:text-gray-500">Net Pay</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{fmt(slip.netSalary)}</p>
              </div>

              <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0', STATUS_STYLES[slip.status] || STATUS_STYLES.Draft)}>
                {slip.status}
              </span>

              <button
                onClick={e => { e.stopPropagation(); handleDownload(slip); }}
                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition font-medium flex-shrink-0"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>

              {expandedId === slip.id
                ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
            </div>

            <AnimatePresence>
              {expandedId === slip.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-indigo-50/30 dark:bg-indigo-900/10"
                >
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Basic Salary</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{fmt(slip.baseSalary)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Bonus</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">+{fmt(slip.bonus)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Tax</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">-{fmt(slip.incomeTax)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Pension</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">-{fmt(slip.providentFund)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">HMO</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">-{fmt(slip.healthInsurance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Other</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">-{fmt(slip.otherDeductions)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Deductions</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">-{fmt(slip.totalDeductions)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-2.5 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Net Salary</p>
                        <p className="font-bold text-emerald-700 dark:text-emerald-400 text-base">{fmt(slip.netSalary)}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
