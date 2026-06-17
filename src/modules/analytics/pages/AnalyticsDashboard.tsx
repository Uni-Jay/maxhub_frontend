import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Users, Briefcase, GraduationCap, DollarSign, Calendar,
  Download, BarChart3, Target, Clock, CheckCircle, Loader2,
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

function EmptyChart({ height = 240 }: { height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center text-gray-300 dark:text-gray-600" style={{ height }}>
      <BarChart3 className="h-10 w-10 mb-2" />
      <p className="text-sm">No data yet</p>
    </div>
  );
}

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

  const { data: revenueRaw, isLoading: revLoading } = useQuery({
    queryKey: ['analytics-revenue', range],
    queryFn: () => apiClient.get<any[]>('/dashboards/super-admin/revenue?months=12').catch(() => []),
  });

  const { data: attendanceRaw, isLoading: attLoading } = useQuery({
    queryKey: ['analytics-attendance', range],
    queryFn: () => apiClient.get<any[]>('/dashboards/super-admin/attendance?days=7').catch(() => []),
  });

  const { data: deptRaw, isLoading: deptLoading } = useQuery({
    queryKey: ['analytics-departments'],
    queryFn: () => apiClient.get<any[]>('/dashboards/super-admin/departments').catch(() => []),
  });

  const { data: statsRaw } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: () => apiClient.get<any>('/dashboards/super-admin/stats').catch(() => null),
  });

  const { data: crmRaw } = useQuery({
    queryKey: ['analytics-crm'],
    queryFn: () => apiClient.get<any>('/dashboards/super-admin/crm').catch(() => null),
  });

  const { data: projectsRaw, isLoading: projLoading } = useQuery({
    queryKey: ['analytics-projects'],
    queryFn: () => apiClient.get<any>('/dashboards/super-admin/projects').catch(() => null),
  });

  const { data: studentsRaw, isLoading: studLoading } = useQuery({
    queryKey: ['analytics-students'],
    queryFn: () => apiClient.get<any>('/dashboards/super-admin/students').catch(() => null),
  });

  const { data: leaveSummaryRaw } = useQuery({
    queryKey: ['analytics-leave-summary'],
    queryFn: () => apiClient.get<any>('/dashboards/head-of-admin/leave-summary').catch(() => null),
  });

  const revenueData: any[] = Array.isArray(revenueRaw) ? revenueRaw : [];
  const attendanceData: any[] = Array.isArray(attendanceRaw) ? attendanceRaw : [];
  const deptData: any[] = Array.isArray(deptRaw) ? deptRaw : [];
  const stats = statsRaw as any;
  const crm = crmRaw as any;
  const projects = projectsRaw as any;
  const students = studentsRaw as any;
  const leave = leaveSummaryRaw as any;

  // Project status chart data
  const projectStatusData = projects ? [
    { name: 'Active', value: projects.active ?? 0 },
    { name: 'Completed', value: projects.completed ?? 0 },
    { name: 'On Hold', value: projects.onHold ?? 0 },
    { name: 'Cancelled', value: projects.cancelled ?? 0 },
  ].filter(d => d.value > 0) : [];

  // Student status data
  const studentStatusData = students ? Object.entries(students)
    .filter(([k]) => !['total'].includes(k))
    .map(([name, value]) => ({ name, value: Number(value) }))
    .filter(d => d.value > 0) : [];

  // Leave data from summary
  const leaveData = leave ? [
    { type: 'Annual', used: leave.approved ?? 0, total: (leave.approved ?? 0) + (leave.pending ?? 0) + (leave.rejected ?? 0) },
    { type: 'Pending', used: leave.pending ?? 0, total: leave.total ?? 0 },
  ].filter(d => d.total > 0) : [];

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'hr', label: 'HR Analytics', icon: Users },
    { key: 'sales', label: 'Sales Analytics', icon: DollarSign },
    { key: 'students', label: 'Student Analytics', icon: GraduationCap },
    { key: 'projects', label: 'Project Analytics', icon: Briefcase },
  ];

  return (
    <div className="space-y-6">
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

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
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

      {tab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard title="Total Revenue" value={stats?.totalRevenue ? `₦${Number(stats.totalRevenue).toLocaleString()}` : '—'} icon={DollarSign} color="green" />
            <KpiCard title="Staff Count" value={stats?.totalEmployees ?? '—'} icon={Users} color="indigo" />
            <KpiCard title="Active Projects" value={stats?.activeProjects ?? projects?.active ?? '—'} icon={Briefcase} color="amber" />
            <KpiCard title="Students" value={stats?.totalStudents ?? students?.total ?? '—'} icon={GraduationCap} color="blue" />
            <KpiCard title="CRM Leads" value={crm?.totalLeads ?? '—'} icon={Target} color="purple" />
            <KpiCard title="Pending Leaves" value={stats?.pendingLeaves ?? '—'} icon={Calendar} color="green" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Revenue vs Target (Monthly)">
              {revLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> :
               revenueData.length === 0 ? <EmptyChart /> : (
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
                    {revenueData[0]?.target !== undefined && <Line type="monotone" dataKey="target" stroke="#f59e0b" name="Target" strokeDasharray="4 4" strokeWidth={2} dot={false} />}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Attendance Overview (Last 7 Days)">
              {attLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> :
               attendanceData.length === 0 ? <EmptyChart /> : (
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
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ChartCard title="Staff by Department">
              {deptLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> :
               deptData.length === 0 ? <EmptyChart height={220} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={deptData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {deptData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Project Status Distribution">
              {projLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> :
               projectStatusData.length === 0 ? <EmptyChart height={220} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                      {projectStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </motion.div>
      )}

      {tab === 'hr' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total Staff" value={stats?.totalEmployees ?? '—'} icon={Users} color="indigo" />
            <KpiCard title="Active Departments" value={stats?.totalDepartments ?? deptData.length} icon={Users} color="green" />
            <KpiCard title="Pending Leaves" value={stats?.pendingLeaves ?? leave?.pending ?? '—'} icon={Clock} color="amber" />
            <KpiCard title="Total Attendance" value={stats?.todayAttendance ?? '—'} icon={CheckCircle} color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Leave Summary">
              {leaveData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={leaveData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="used" fill="#6366f1" name="Count" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="total" fill="#e5e7eb" name="Total" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Attendance Trend">
              {attendanceData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="present" stroke="#10b981" name="Present" strokeWidth={2} />
                    <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Late" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ChartCard title="Staff Distribution by Department">
              {deptData.length === 0 ? <EmptyChart height={220} /> : (
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
              )}
            </ChartCard>

            <ChartCard title="Leave Status Breakdown">
              {!leave ? <EmptyChart height={220} /> : (
                <div className="space-y-4 pt-4">
                  {[
                    { label: 'Approved Leaves', value: leave.approved ?? 0, total: leave.total ?? 1, color: 'bg-emerald-500' },
                    { label: 'Pending Leaves', value: leave.pending ?? 0, total: leave.total ?? 1, color: 'bg-amber-500' },
                    { label: 'Rejected Leaves', value: leave.rejected ?? 0, total: leave.total ?? 1, color: 'bg-red-500' },
                  ].map(m => {
                    const pct = m.total > 0 ? Math.round((m.value / m.total) * 100) : 0;
                    return (
                      <div key={m.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">{m.label}</span>
                          <span className="font-semibold">{m.value} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <div className={cn('h-2 rounded-full', m.color)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </div>
        </motion.div>
      )}

      {tab === 'sales' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total Revenue" value={stats?.totalRevenue ? `₦${Number(stats.totalRevenue).toLocaleString()}` : '—'} icon={DollarSign} color="green" />
            <KpiCard title="Total Leads" value={crm?.totalLeads ?? '—'} icon={TrendingUp} color="indigo" />
            <KpiCard title="Win Rate" value={crm?.conversionRate ? `${crm.conversionRate}%` : '—'} icon={Target} color="amber" />
            <KpiCard title="Won Deals" value={crm?.convertedDeals ?? '—'} icon={DollarSign} color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Revenue Trend (12 Months)">
              {revLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> :
               revenueData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={revenueData}>
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
              )}
            </ChartCard>

            <ChartCard title="CRM Pipeline Funnel">
              {!crm ? <EmptyChart /> : (
                <div className="space-y-3 pt-3">
                  {[
                    { stage: 'Leads', count: crm.totalLeads ?? 0, color: 'bg-blue-400' },
                    { stage: 'Prospects', count: crm.totalProspects ?? 0, color: 'bg-indigo-400' },
                    { stage: 'Won', count: crm.convertedDeals ?? crm.wonDeals ?? 0, color: 'bg-emerald-500' },
                    { stage: 'Lost', count: crm.lostDeals ?? 0, color: 'bg-red-400' },
                  ].map((s, _i, arr) => {
                    const max = Math.max(...arr.map(a => a.count)) || 1;
                    return (
                      <div key={s.stage} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-20">{s.stage}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-7 overflow-hidden">
                          <div className={cn('h-full rounded-full flex items-center px-3 transition-all', s.color)}
                            style={{ width: `${Math.round((s.count / max) * 100)}%` }}>
                            <span className="text-white text-xs font-semibold">{s.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </div>
        </motion.div>
      )}

      {tab === 'students' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total Enrolled" value={students?.total ?? stats?.totalStudents ?? '—'} icon={GraduationCap} color="blue" />
            <KpiCard title="Active Students" value={students?.Active ?? students?.enrolled ?? '—'} icon={Users} color="green" />
            <KpiCard title="Graduated" value={students?.Graduated ?? students?.completed ?? '—'} icon={CheckCircle} color="indigo" />
            <KpiCard title="Pending" value={students?.Pending ?? students?.pending ?? '—'} icon={Target} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Enrollment by Status">
              {studLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> :
               studentStatusData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={studentStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#6366f1" name="Students" radius={[4, 4, 0, 0]}>
                      {studentStatusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Student Status Distribution">
              {studentStatusData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={studentStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name">
                      {studentStatusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </motion.div>
      )}

      {tab === 'projects' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total Projects" value={(projects?.active ?? 0) + (projects?.completed ?? 0) + (projects?.onHold ?? 0) + (projects?.cancelled ?? 0) || '—'} icon={Briefcase} color="indigo" />
            <KpiCard title="Active" value={projects?.active ?? '—'} icon={TrendingUp} color="green" />
            <KpiCard title="Completed" value={projects?.completed ?? '—'} icon={CheckCircle} color="blue" />
            <KpiCard title="On Hold" value={projects?.onHold ?? '—'} icon={Clock} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Projects by Status">
              {projLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> :
               projectStatusData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" nameKey="name">
                      {projectStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Project Status Breakdown">
              {projectStatusData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={projectStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" name="Projects" radius={[4, 4, 0, 0]}>
                      {projectStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </motion.div>
      )}
    </div>
  );
}
