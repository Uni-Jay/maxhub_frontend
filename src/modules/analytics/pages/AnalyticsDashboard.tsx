import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Users, Briefcase, GraduationCap, DollarSign, Calendar,
  Download, BarChart3, Target, Clock, CheckCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

type Range = 'week' | 'month' | 'quarter' | 'year';
type Tab = 'overview' | 'hr' | 'sales' | 'students' | 'projects';

const RANGE_LABELS: Record<Range, string> = {
  week: 'This Week', month: 'Last 30 Days', quarter: 'Last 3 Months', year: 'Last Year',
};

function KpiCard({ title, value, icon: Icon, color = 'indigo', change }: { title: string; value: string | number; icon: any; color?: string; change?: number }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600', green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change !== undefined && (
            <p className={cn('text-xs mt-1 font-medium', change >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs last period
            </p>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', colorMap[color] || colorMap.indigo)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm', className)}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Fallback data ──────────────────────────────────────
const REVENUE_FALLBACK = [
  { month: 'Jan', revenue: 450000, target: 500000 },
  { month: 'Feb', revenue: 520000, target: 500000 },
  { month: 'Mar', revenue: 480000, target: 520000 },
  { month: 'Apr', revenue: 610000, target: 550000 },
  { month: 'May', revenue: 550000, target: 560000 },
  { month: 'Jun', revenue: 670000, target: 600000 },
  { month: 'Jul', revenue: 720000, target: 650000 },
  { month: 'Aug', revenue: 690000, target: 680000 },
  { month: 'Sep', revenue: 750000, target: 700000 },
  { month: 'Oct', revenue: 810000, target: 750000 },
  { month: 'Nov', revenue: 780000, target: 780000 },
  { month: 'Dec', revenue: 920000, target: 800000 },
];

const ATTENDANCE_FALLBACK = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (6 - i));
  return { date: d.toLocaleDateString('en', { weekday: 'short' }), present: 38 + Math.floor(Math.random() * 10), absent: Math.floor(Math.random() * 4), late: Math.floor(Math.random() * 3) };
});

const DEPT_FALLBACK = [
  { name: 'Kurios SAT', value: 32 }, { name: 'Visa Max', value: 18 },
  { name: 'Bead Max', value: 24 }, { name: 'HR', value: 8 }, { name: 'Finance', value: 10 },
];

const PROJECT_STATUS_FALLBACK = [
  { name: 'Active', value: 12 }, { name: 'Completed', value: 28 },
  { name: 'On Hold', value: 4 }, { name: 'Delayed', value: 3 },
];

const ENROLLMENT_TREND_FALLBACK = [
  { month: 'Sep', enrolled: 45 }, { month: 'Oct', enrolled: 62 }, { month: 'Nov', enrolled: 58 },
  { month: 'Dec', enrolled: 40 }, { month: 'Jan', enrolled: 75 }, { month: 'Feb', enrolled: 88 },
];

const LEAVE_FALLBACK = [
  { type: 'Annual', used: 45, total: 100 }, { type: 'Sick', used: 28, total: 80 },
  { type: 'Maternity', used: 5, total: 10 }, { type: 'Emergency', used: 12, total: 30 },
];

// ─── Export helpers ─────────────────────────────────────────
function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function AnalyticsDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [range, setRange] = useState<Range>('month');
  const [exportOpen, setExportOpen] = useState(false);

  const { data: revenueData = REVENUE_FALLBACK } = useQuery({
    queryKey: ['analytics-revenue', range],
    queryFn: async () => {
      try { return await apiClient.get('/dashboards/super-admin/revenue?months=12') as any; } catch { return REVENUE_FALLBACK; }
    },
  });

  const { data: attendanceData = ATTENDANCE_FALLBACK } = useQuery({
    queryKey: ['analytics-attendance', range],
    queryFn: async () => {
      try { return await apiClient.get('/dashboards/super-admin/attendance?days=30') as any; } catch { return ATTENDANCE_FALLBACK; }
    },
  });

  const { data: deptData = DEPT_FALLBACK } = useQuery({
    queryKey: ['analytics-departments'],
    queryFn: async () => {
      try { return await apiClient.get('/dashboards/super-admin/departments') as any; } catch { return DEPT_FALLBACK; }
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: async () => {
      try { return await apiClient.get('/dashboards/super-admin/stats'); } catch { return null; }
    },
  });

  const { data: crmData } = useQuery({
    queryKey: ['analytics-crm'],
    queryFn: async () => {
      try { return await apiClient.get('/dashboards/super-admin/crm'); } catch { return null; }
    },
  });

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'hr', label: 'HR Analytics', icon: Users },
    { key: 'sales', label: 'Sales Analytics', icon: DollarSign },
    { key: 'students', label: 'Student Analytics', icon: GraduationCap },
    { key: 'projects', label: 'Project Analytics', icon: Briefcase },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Comprehensive insights across all MaxHub departments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
            {(Object.entries(RANGE_LABELS) as [Range, string][]).map(([k, v]) => (
              <button key={k} onClick={() => setRange(k)}
                className={cn('px-3 py-2 font-medium transition-colors', range === k ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
                {v}
              </button>
            ))}
          </div>
          <div className="relative">
            <button onClick={() => setExportOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
                {[
                  { label: 'Export CSV', action: () => { exportCSV(revenueData as any, `analytics-revenue-${range}.csv`); setExportOpen(false); } },
                  { label: 'Export JSON', action: () => { exportJSON({ revenue: revenueData, attendance: attendanceData, departments: deptData }, `analytics-${range}.json`); setExportOpen(false); } },
                  { label: 'Print / PDF', action: () => { setExportOpen(false); window.print(); } },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2">
                    <Download className="h-3 w-3 text-gray-400" /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t.key ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard title="Total Revenue" value={`₦${((statsData as any)?.totalRevenue || 4200000).toLocaleString()}`} icon={DollarSign} color="green" change={12} />
            <KpiCard title="Staff Count" value={(statsData as any)?.totalEmployees || 92} icon={Users} color="indigo" change={5} />
            <KpiCard title="Active Projects" value={(statsData as any)?.activeProjects || 18} icon={Briefcase} color="amber" change={-2} />
            <KpiCard title="Students" value={(statsData as any)?.totalStudents || 340} icon={GraduationCap} color="blue" change={18} />
            <KpiCard title="CRM Leads" value={(crmData as any)?.totalLeads || 87} icon={Target} color="purple" change={9} />
            <KpiCard title="Attendance Rate" value={`${(statsData as any)?.attendanceRate || 94}%`} icon={Calendar} color="green" change={2} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Revenue vs Target (Monthly)">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => `₦${Number(v).toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#gradRev)" name="Revenue" strokeWidth={2} />
                  <Line type="monotone" dataKey="target" stroke="#f59e0b" name="Target" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Attendance Overview (Last 7 Days)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="present" fill="#10b981" name="Present" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="late" fill="#f59e0b" name="Late" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ChartCard title="Staff by Department">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={deptData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {deptData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Project Status Distribution">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={PROJECT_STATUS_FALLBACK} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                    {PROJECT_STATUS_FALLBACK.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </motion.div>
      )}

      {/* ── HR ANALYTICS ── */}
      {tab === 'hr' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total Staff" value={92} icon={Users} color="indigo" />
            <KpiCard title="New Hires (Month)" value={4} icon={Users} color="green" change={33} />
            <KpiCard title="Pending Leaves" value={12} icon={Clock} color="amber" />
            <KpiCard title="Avg Attendance" value="94%" icon={CheckCircle} color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Leave Utilization by Type">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={LEAVE_FALLBACK} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="used" fill="#6366f1" name="Used" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="total" fill="#e5e7eb" name="Quota" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Attendance Trend">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={ATTENDANCE_FALLBACK}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="present" stroke="#10b981" name="Present" strokeWidth={2} />
                  <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Late" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ChartCard title="Staff Distribution by Department">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" name="Staff Count" radius={[4, 4, 0, 0]}>
                    {deptData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Turnover & Retention">
              <div className="space-y-4 pt-4">
                {[{ label: 'Retention Rate', value: 95, color: 'bg-emerald-500' }, { label: 'Satisfaction Score', value: 82, color: 'bg-indigo-500' }, { label: 'Training Completion', value: 74, color: 'bg-amber-500' }].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{m.label}</span>
                      <span className="font-semibold">{m.value}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div className={cn('h-2 rounded-full', m.color)} style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </motion.div>
      )}

      {/* ── SALES ANALYTICS ── */}
      {tab === 'sales' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total Revenue" value="₦4.2M" icon={DollarSign} color="green" change={12} />
            <KpiCard title="Pipeline Value" value="₦8.7M" icon={TrendingUp} color="indigo" />
            <KpiCard title="Win Rate" value={`${(crmData as any)?.conversionRate || 26}%`} icon={Target} color="amber" change={3} />
            <KpiCard title="Avg Deal Size" value="₦480K" icon={DollarSign} color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Revenue Trend (12 Months)">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={REVENUE_FALLBACK}>
                  <defs>
                    <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => `₦${Number(v).toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#grad2)" name="Revenue" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="CRM Pipeline Funnel">
              <div className="space-y-3 pt-3">
                {[
                  { stage: 'Leads', count: (crmData as any)?.totalLeads || 87, color: 'bg-blue-400' },
                  { stage: 'Qualified', count: 54, color: 'bg-indigo-400' },
                  { stage: 'Proposal', count: 32, color: 'bg-purple-400' },
                  { stage: 'Negotiation', count: 18, color: 'bg-amber-400' },
                  { stage: 'Won', count: (crmData as any)?.convertedDeals || 23, color: 'bg-emerald-500' },
                ].map((s, _i, arr) => (
                  <div key={s.stage} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20">{s.stage}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-7 overflow-hidden">
                      <div className={cn('h-full rounded-full flex items-center px-3 transition-all', s.color)}
                        style={{ width: `${Math.round((s.count / arr[0].count) * 100)}%` }}>
                        <span className="text-white text-xs font-semibold">{s.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </motion.div>
      )}

      {/* ── STUDENT ANALYTICS ── */}
      {tab === 'students' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total Enrolled" value={340} icon={GraduationCap} color="blue" change={18} />
            <KpiCard title="Active Students" value={298} icon={Users} color="green" />
            <KpiCard title="Completions" value={124} icon={CheckCircle} color="indigo" change={22} />
            <KpiCard title="Avg Score" value="78%" icon={Target} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Enrollment Trend">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ENROLLMENT_TREND_FALLBACK}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="enrolled" fill="#6366f1" name="Enrolled" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Course Completion Rates">
              <div className="space-y-4 pt-2">
                {[
                  { course: 'Fashion Design', completion: 85 },
                  { course: 'Bead Making', completion: 72 },
                  { course: 'Bag Crafting', completion: 68 },
                  { course: 'Business Skills', completion: 91 },
                  { course: 'Digital Marketing', completion: 60 },
                ].map(c => (
                  <div key={c.course}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{c.course}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{c.completion}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${c.completion}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </motion.div>
      )}

      {/* ── PROJECTS ANALYTICS ── */}
      {tab === 'projects' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total Projects" value={47} icon={Briefcase} color="indigo" />
            <KpiCard title="Active" value={12} icon={TrendingUp} color="green" />
            <KpiCard title="Completed" value={28} icon={CheckCircle} color="blue" />
            <KpiCard title="Overdue" value={3} icon={Clock} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Projects by Status">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={PROJECT_STATUS_FALLBACK} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" nameKey="name">
                    {PROJECT_STATUS_FALLBACK.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Task Completion by Month">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  { month: 'Oct', done: 42, open: 18 }, { month: 'Nov', done: 38, open: 22 },
                  { month: 'Dec', done: 55, open: 14 }, { month: 'Jan', done: 48, open: 20 },
                  { month: 'Feb', done: 61, open: 12 }, { month: 'Mar', done: 52, open: 16 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="done" fill="#10b981" name="Completed" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="open" fill="#e5e7eb" name="Open" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </motion.div>
      )}
    </div>
  );
}
