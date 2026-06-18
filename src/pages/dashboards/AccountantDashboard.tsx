import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, FileText, TrendingUp, CreditCard,
  Receipt, BarChart3, ArrowUpRight, Wallet, PieChart,
} from 'lucide-react';
import { useAuthStore } from '@store/authStore';
import { accountantDashboardService } from '@services/dashboardService';

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`;

const QUICK_LINKS = [
  { label: 'Payroll Dashboard', href: '/payroll', icon: Wallet, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
  { label: 'Pay Periods', href: '/payroll/periods', icon: BarChart3, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
  { label: 'Salary Structures', href: '/payroll/structures', icon: PieChart, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  { label: 'Invoices', href: '/invoices', icon: Receipt, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  { label: 'All Payslips', href: '/payroll/slips', icon: FileText, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
  { label: 'Analytics', href: '/analytics', icon: TrendingUp, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
];

const STATUS_STYLE: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Issued: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PartiallyPaid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Cancelled: 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
};

export default function AccountantDashboard() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data: stats, isLoading } = useQuery({
    queryKey: ['accountant-dashboard-stats'],
    queryFn: () => accountantDashboardService.getStats(),
  });

  const STATS = [
    { label: 'Monthly Payroll', value: fmt(stats?.monthlyPayroll ?? 0), icon: Wallet, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', href: '/payroll' },
    { label: 'Pending Invoices', value: String(stats?.pendingInvoices ?? 0), icon: FileText, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', href: '/invoices' },
    { label: 'Revenue (MTD)', value: fmt(stats?.revenueMTD ?? 0), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', href: '/analytics' },
    { label: 'Dept. Budget Used', value: stats?.departmentBudget ? `${stats.departmentBudget.utilization}%` : '—', icon: CreditCard, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20', href: '/analytics' },
  ];

  const recentInvoices = stats?.recentInvoices ?? [];

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{user?.firstName ?? 'Accountant'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm">
          <DollarSign className="h-4 w-4" /> Finance Desk
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} to={href}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
            </div>
          </Link>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-500" /> Recent Invoices
            </h2>
            <Link to="/invoices" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : recentInvoices.length === 0 ? (
              <p className="text-sm text-gray-400">No invoices yet.</p>
            ) : recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{inv.id}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(inv.amount)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLE[inv.status] ?? STATUS_STYLE.Draft}`}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-violet-500" /> Finance Modules
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map(({ label, href, icon: Icon, color }) => (
              <Link key={href} to={href}
                className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* My Department Budget — genuinely department-scoped, unlike the org-wide stats above */}
      <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <PieChart className="h-5 w-5 text-amber-500" /> My Department Budget
        </h2>
        {stats?.departmentBudget ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {fmt(stats.departmentBudget.spent)} of {fmt(stats.departmentBudget.amount)} spent
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">{stats.departmentBudget.utilization}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full ${stats.departmentBudget.utilization > 90 ? 'bg-red-500' : stats.departmentBudget.utilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, stats.departmentBudget.utilization)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{fmt(stats.departmentBudget.remaining)} remaining</p>
            {stats.pendingExpenseApprovals > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 pt-1">
                {stats.pendingExpenseApprovals} expense{stats.pendingExpenseApprovals !== 1 ? 's' : ''} awaiting approval in your department
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No active budget set for your department yet.</p>
        )}
      </motion.div>
    </motion.div>
  );
}
