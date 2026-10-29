import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, ChevronDown, ChevronRight, Check, Download, User } from 'lucide-react';
import { openPayslip } from '@components/payroll/payslip';
import { payrollService, type EmployeeSalary } from '@services/payrollService';
import { useCurrentRoles, useCurrentPermissions, hasPermission } from '@utils/role';

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
  openPayslip(salary.id);
}

export default function PayrollSlips() {
  const qc = useQueryClient();
  const { roles } = useCurrentRoles();
  const permissions = useCurrentPermissions();
  const canManage = hasPermission(roles, permissions, 'hr.payroll.manage.all');
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
                      {salary.staff ? `${salary.staff.firstName} ${salary.staff.lastName}` : `Staff #${salary.staffId}`}
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
                  {canManage && STATUS_NEXT[salary.status] && (
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
