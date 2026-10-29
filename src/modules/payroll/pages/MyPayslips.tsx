import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Download, FileText, ChevronDown, ChevronRight,
  TrendingUp, Calendar, Wallet, Clock,
} from 'lucide-react';
import { openPayslip } from '@components/payroll/payslip';
import { apiClient } from '@services/apiClient';
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


export default function MyPayslips() {
  const [expandedId, setExpandedId] = useState<number | null>(null);


  const { data: myBrands } = useQuery({ queryKey: ['my-brands'], queryFn: () => apiClient.get<any>('/erp/my-brands').catch(() => null) });
  const employer = myBrands?.brands?.find((b: any) => b.isPrimary);
  const others = (myBrands?.brands || []).filter((b: any) => !b.isPrimary);

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

  const handleDownload = (slip: MyPayslip) => { openPayslip(slip.id); };


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

      {employer && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap items-center gap-4" style={{ borderTop: `4px solid ${employer.color || '#4f46e5'}` }}>
          {employer.logoUrl && <img src={employer.logoUrl} alt={employer.name} className="h-12 max-w-[160px] object-contain" />}
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs uppercase tracking-wider text-gray-400">Employed by</p>
            <p className="font-semibold text-gray-900 dark:text-white">{employer.name}</p>
            <p className="text-xs text-gray-500">Your payslips carry {employer.name}'s letterhead.</p>
          </div>
          {others.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Also working for</span>
              {others.map((b: any) => b.logoUrl
                ? <img key={b.departmentId} src={b.logoUrl} alt={b.name} title={b.name} className="h-7 max-w-[90px] object-contain opacity-80" />
                : <span key={b.departmentId} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{b.name}</span>)}
            </div>
          )}
        </div>
      )}

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
