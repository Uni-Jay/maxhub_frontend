import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, DollarSign, CheckCircle, Clock,
  Calendar, ChevronRight, Play, FileText, Settings,
} from 'lucide-react';
import { payrollService } from '@services/payrollService';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Processing: 'bg-yellow-100 text-yellow-700',
  Processed: 'bg-blue-100 text-blue-700',
  Paid: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const fmt = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n);

export default function PayrollDashboard() {
  const { data: overviewRaw, isLoading: loadingOverview } = useQuery({
    queryKey: ['payroll-overview'],
    queryFn: () => payrollService.getOverview(),
  });

  const { data: periodsRaw } = useQuery({
    queryKey: ['payroll-periods', { page: 1, limit: 5 }],
    queryFn: () => payrollService.getPeriods({ page: 1, limit: 5 }),
  });

  const overview = (overviewRaw as any)?.data;
  const periods = (periodsRaw as any)?.data || [];

  if (loadingOverview) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = [
    { label: 'Total Staff', value: overview?.totalStaff ?? 0, icon: Users, color: 'from-blue-500 to-indigo-600', format: (v: number) => v.toString() },
    { label: 'Processed Salaries', value: overview?.processedSalaries ?? 0, icon: CheckCircle, color: 'from-green-500 to-emerald-600', format: (v: number) => v.toString() },
    { label: 'Net Payout', value: overview?.totalNetPayout ?? 0, icon: DollarSign, color: 'from-violet-500 to-purple-600', format: fmt },
    { label: 'Pending Approvals', value: overview?.pendingApprovals ?? 0, icon: Clock, color: 'from-orange-500 to-amber-600', format: (v: number) => v.toString() },
    { label: 'Active Period', value: overview?.activePeriod?.periodName ?? 'None', icon: Calendar, color: 'from-indigo-500 to-violet-600', format: (v: any) => v },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-500 text-sm">Manage salaries, periods, and structures</p>
        </div>
        <div className="flex gap-2">
          <Link to="/payroll/periods" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
            <Play className="h-4 w-4" /> Run Payroll
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/70 text-xs font-medium">{s.label}</p>
                <Icon className="h-4 w-4 text-white/60" />
              </div>
              <p className="text-xl font-bold truncate">{s.format(s.value)}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/payroll/periods', icon: Calendar, label: 'Pay Periods', desc: 'Manage payroll cycles', color: 'text-indigo-600 bg-indigo-50' },
          { to: '/payroll/slips', icon: FileText, label: 'Salary Slips', desc: 'View & approve salaries', color: 'text-green-600 bg-green-50' },
          { to: '/payroll/structures', icon: Settings, label: 'Salary Structures', desc: 'Configure pay templates', color: 'text-violet-600 bg-violet-50' },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.to} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
              <Link to={item.to} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow group">
                <div className={`p-3 rounded-xl ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Pay Periods */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Pay Periods</h2>
          <Link to="/payroll/periods" className="text-sm text-indigo-600 hover:text-indigo-700">View all</Link>
        </div>
        {periods.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No pay periods yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {periods.map((period: any, i: number) => (
              <motion.div
                key={period.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{period.periodName}</p>
                    <p className="text-xs text-gray-500">{period.periodCode} · {new Date(period.startDate).toLocaleDateString()} – {new Date(period.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[period.status] || 'bg-gray-100'}`}>
                    {period.status}
                  </span>
                  <Link to="/payroll/periods" className="text-gray-400 hover:text-gray-600">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
