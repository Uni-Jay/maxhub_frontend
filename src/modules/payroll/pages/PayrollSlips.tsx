import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, ChevronDown, ChevronRight, Check, Download, User } from 'lucide-react';
import { payrollService, type EmployeeSalary } from '@services/payrollService';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Approved: 'bg-blue-100 text-blue-700',
  Processed: 'bg-indigo-100 text-indigo-700',
  Paid: 'bg-green-100 text-green-700',
};

const STATUS_NEXT: Record<string, string> = {
  Draft: 'Approved', Approved: 'Processed', Processed: 'Paid',
};

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function downloadPayslip(salary: EmployeeSalary) {
  const employeeName = salary.staff?.user
    ? `${salary.staff.user.firstName} ${salary.staff.user.lastName}`
    : `Staff #${salary.staffId}`;
  const period = (salary as any).period?.periodName || salary.salaryCode;
  const today = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Payslip — ${salary.salaryCode}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a1a2e; background: #f9fafb; }
  .wrapper { max-width: 700px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
  .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 28px 32px; display: flex; align-items: center; gap: 18px; }
  .logo { width: 52px; height: 52px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; flex-shrink: 0; }
  .company h1 { font-size: 20px; font-weight: 700; }
  .company p { font-size: 12px; opacity: 0.75; margin-top: 2px; }
  .slip-title { margin-left: auto; text-align: right; }
  .slip-title h2 { font-size: 18px; font-weight: 700; }
  .slip-title p { font-size: 11px; opacity: 0.75; margin-top: 2px; }
  .body { padding: 28px 32px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8f9ff; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #e5e7eb; }
  .meta-item p:first-child { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
  .meta-item p:last-child { font-size: 13px; font-weight: 600; color: #111827; }
  h3 { font-size: 13px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f3f4f6; text-align: left; padding: 9px 12px; font-weight: 600; color: #374151; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  .amount { text-align: right; font-variant-numeric: tabular-nums; }
  .net-box { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; border-radius: 10px; padding: 18px 24px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
  .net-box .label { font-size: 14px; font-weight: 700; color: #065f46; }
  .net-box .value { font-size: 24px; font-weight: 900; color: #047857; }
  .footer { border-top: 1px solid #e5e7eb; padding: 16px 32px; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #6b7280; }
  .sig-line { border-top: 1px solid #9ca3af; width: 160px; padding-top: 4px; font-size: 11px; color: #6b7280; text-align: center; }
  .print-btn { display: block; margin: 20px auto; padding: 10px 28px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .print-btn:hover { background: #4338ca; }
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
      <p>Lagos, Nigeria · info@maxhub.com · maxhub.app</p>
    </div>
    <div class="slip-title">
      <h2>PAY SLIP</h2>
      <p>${salary.salaryCode}</p>
    </div>
  </div>
  <div class="body">
    <div class="meta">
      <div class="meta-item"><p>Employee Name</p><p>${employeeName}</p></div>
      <div class="meta-item"><p>Pay Period</p><p>${period}</p></div>
      <div class="meta-item"><p>Employee ID</p><p>${salary.salaryCode.split('-')[0] || 'N/A'}</p></div>
      <div class="meta-item"><p>Payment Date</p><p>${today}</p></div>
    </div>
    <h3>Earnings</h3>
    <table>
      <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
      <tbody>
        <tr><td>Basic Salary</td><td class="amount">${fmt(salary.baseSalary)}</td></tr>
        <tr><td>Bonus / Incentive</td><td class="amount">${fmt(salary.bonus)}</td></tr>
        <tr><td><strong>Gross Salary</strong></td><td class="amount"><strong>${fmt(salary.grossSalary)}</strong></td></tr>
      </tbody>
    </table>
    <h3>Deductions</h3>
    <table>
      <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
      <tbody>
        <tr><td>Income Tax (PAYE)</td><td class="amount">- ${fmt(salary.incomeTax)}</td></tr>
        <tr><td>Provident Fund / Pension</td><td class="amount">- ${fmt(salary.providentFund)}</td></tr>
        <tr><td>Health Insurance (HMO)</td><td class="amount">- ${fmt(salary.healthInsurance)}</td></tr>
        <tr><td>Other Deductions</td><td class="amount">- ${fmt(salary.otherDeductions)}</td></tr>
        <tr><td><strong>Total Deductions</strong></td><td class="amount"><strong>- ${fmt(salary.totalDeductions)}</strong></td></tr>
      </tbody>
    </table>
    <div class="net-box">
      <span class="label">💰 Net Pay</span>
      <span class="value">${fmt(salary.netSalary)}</span>
    </div>
  </div>
  <div class="footer">
    <p>Generated on ${today} · MaxHub ERP Payroll System</p>
    <div class="sig-line">Authorised Signatory</div>
  </div>
</div>
<button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.focus();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function PayrollSlips() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-salaries', { page, statusFilter, periodFilter, search }],
    queryFn: () => payrollService.getSalaries({
      page, limit: 15,
      status: statusFilter || undefined,
      periodId: periodFilter ? Number(periodFilter) : undefined,
      search: search || undefined,
    }),
  });

  const { data: periodsRaw } = useQuery({
    queryKey: ['payroll-periods-select'],
    queryFn: () => payrollService.getPeriods({ limit: 50 }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => payrollService.updateSalaryStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-salaries'] }),
  });

  const salaries: EmployeeSalary[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination;
  const periods = (periodsRaw as any)?.data || [];

  const totalGross = salaries.reduce((s, e) => s + Number(e.grossSalary), 0);
  const totalDeductions = salaries.reduce((s, e) => s + Number(e.totalDeductions), 0);
  const totalNet = salaries.reduce((s, e) => s + Number(e.netSalary), 0);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Slips</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Review, approve, and download employee payslips</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
          <input type="text" placeholder="Search employee name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400" />
        </div>
        <select value={periodFilter} onChange={e => { setPeriodFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Periods</option>
          {periods.map((p: any) => <option key={p.id} value={p.id}>{p.periodName}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {['Draft','Approved','Processed','Paid'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {salaries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No salary records found</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            {salaries.map((salary, i) => (
              <motion.div key={salary.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <div
                  className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === salary.id ? null : salary.id)}
                >
                  <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {salary.staff?.user ? `${salary.staff.user.firstName} ${salary.staff.user.lastName}` : `Staff #${salary.staffId}`}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{salary.salaryCode}</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Gross</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{fmt(salary.grossSalary)}</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Net</p>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{fmt(salary.netSalary)}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[salary.status] || 'bg-gray-100 text-gray-700'}`}>
                    {salary.status}
                  </span>
                  {STATUS_NEXT[salary.status] && (
                    <button
                      onClick={e => { e.stopPropagation(); statusMutation.mutate({ id: salary.id, status: STATUS_NEXT[salary.status] }); }}
                      disabled={statusMutation.isPending}
                      className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition"
                    >
                      <Check className="h-3 w-3" /> {STATUS_NEXT[salary.status]}
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); downloadPayslip(salary); }}
                    title="Download payslip"
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                  {expandedId === salary.id
                    ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                </div>

                <AnimatePresence>
                  {expandedId === salary.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-indigo-50/40 dark:bg-indigo-900/10"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Base Salary</p>
                          <p className="font-medium text-gray-900 dark:text-white">{fmt(salary.baseSalary)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Bonus</p>
                          <p className="font-medium text-emerald-600 dark:text-emerald-400">+{fmt(salary.bonus)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Gross Salary</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{fmt(salary.grossSalary)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Income Tax</p>
                          <p className="font-medium text-red-600 dark:text-red-400">-{fmt(salary.incomeTax)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Pension Fund</p>
                          <p className="font-medium text-red-600 dark:text-red-400">-{fmt(salary.providentFund)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Health Insurance</p>
                          <p className="font-medium text-red-600 dark:text-red-400">-{fmt(salary.healthInsurance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Other Deductions</p>
                          <p className="font-medium text-red-600 dark:text-red-400">-{fmt(salary.otherDeductions)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Net Salary</p>
                          <p className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">{fmt(salary.netSalary)}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Totals row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Gross', value: totalGross, color: 'text-gray-900 dark:text-white' },
              { label: 'Total Deductions', value: totalDeductions, color: 'text-red-600 dark:text-red-400' },
              { label: 'Total Net', value: totalNet, color: 'text-emerald-700 dark:text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{fmt(s.value)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">Prev</button>
          <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">Next</button>
        </div>
      )}
    </div>
  );
}
