import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar, Download, Search, TrendingUp, Users, Clock, AlertCircle, Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_STYLES: Record<string, string> = {
  Excellent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Average: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b'];

interface StaffRecord {
  name: string;
  dept: string;
  present: number;
  absent: number;
  late: number;
  rate: string;
  status: string;
}

interface MonthlyPoint { month: string; present: number; absent: number; late: number; }
interface DeptRate { dept: string; rate: number; }

export default function AttendanceReport() {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['attendance-report', month, year],
    queryFn: () =>
      apiClient.get<{ records: StaffRecord[]; monthly: MonthlyPoint[]; departments: DeptRate[] }>(
        `/reports/attendance?month=${month + 1}&year=${year}`
      ),
  });

  const records: StaffRecord[] = data?.records ?? [];
  const monthlyData: MonthlyPoint[] = data?.monthly ?? [];
  const deptData: DeptRate[] = data?.departments ?? [];

  const filteredRecords = records.filter(r =>
    (!search || r.name.toLowerCase().includes(search.toLowerCase())) &&
    (!dept || r.dept === dept)
  );

  const departments = Array.from(new Set(records.map(r => r.dept).filter(Boolean)));

  const totalPresent = filteredRecords.reduce((s, r) => s + r.present, 0);
  const totalAbsent = filteredRecords.reduce((s, r) => s + r.absent, 0);
  const totalLate = filteredRecords.reduce((s, r) => s + r.late, 0);
  const avgRate = filteredRecords.length > 0
    ? Math.round(filteredRecords.reduce((s, r) => s + parseInt(r.rate), 0) / filteredRecords.length)
    : 0;

  const exportCSV = () => {
    const header = 'Name,Department,Present,Absent,Late,Rate,Status\n';
    const rows = filteredRecords.map(r =>
      `${r.name},${r.dept},${r.present},${r.absent},${r.late},${r.rate},${r.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-report-${MONTHS[month]}-${year}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-600" /> Attendance Report
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Monthly attendance analytics for all staff</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={exportCSV}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-100 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-6 text-center text-red-600 dark:text-red-400">
          Failed to load attendance report. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg Attendance', value: `${avgRate}%`, icon: TrendingUp, color: 'bg-emerald-600' },
              { label: 'Total Present', value: totalPresent, icon: Users, color: 'bg-indigo-600' },
              { label: 'Total Absent', value: totalAbsent, icon: AlertCircle, color: 'bg-red-500' },
              { label: 'Total Late', value: totalLate, icon: Clock, color: 'bg-amber-500' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-2xl p-4 text-white text-center', s.color)}>
                <s.icon className="h-5 w-5 mx-auto mb-1 opacity-80" />
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs opacity-80 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Monthly Trend ({year})</p>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data for this year</div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">This Month</p>
              {totalPresent + totalAbsent + totalLate > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: totalPresent },
                        { name: 'Absent', value: totalAbsent },
                        { name: 'Late', value: totalLate },
                      ]}
                      dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30}
                    >
                      {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-gray-400 text-sm">No records this month</div>
              )}
            </div>
          </div>

          {/* Department rates */}
          {deptData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Attendance Rate by Department</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={v => [`${v}%`, 'Rate']} />
                  <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} name="Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Staff table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-wrap gap-y-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search staff..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={dept}
                onChange={e => setDept(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {['Staff Name', 'Department', 'Present', 'Absent', 'Late', 'Rate', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                        {records.length === 0 ? 'No attendance data for this period' : 'No staff match your filters'}
                      </td>
                    </tr>
                  ) : filteredRecords.map((r, i) => (
                    <motion.tr
                      key={r.name + i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{r.name}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{r.dept}</td>
                      <td className="px-5 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">{r.present}</td>
                      <td className="px-5 py-3 text-red-600 dark:text-red-400 font-semibold">{r.absent}</td>
                      <td className="px-5 py-3 text-amber-600 dark:text-amber-400 font-semibold">{r.late}</td>
                      <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{r.rate}</td>
                      <td className="px-5 py-3">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLES[r.status] ?? '')}>{r.status}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
