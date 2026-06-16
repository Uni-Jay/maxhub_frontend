import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Briefcase, Download, Search, TrendingUp, CheckSquare, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

const STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Planning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'On Hold': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PIE_COLORS = ['#10b981','#6366f1','#f59e0b','#94a3b8','#ef4444'];

const SAMPLE_PROJECTS = [
  { name:'MaxHub ERP Build',     dept:'Engineering',  manager:'Adaeze Okonkwo',   status:'In Progress', progress:80, tasks:45, done:36, dueDate:'2026-08-01' },
  { name:'Visa Processing Portal', dept:'Visa Max',   manager:'Fatima Usman',      status:'Completed',   progress:100, tasks:20, done:20, dueDate:'2026-05-15' },
  { name:'Bead Catalogue 2026',  dept:'Bead Max',     manager:'Tunde Adebayo',     status:'In Progress', progress:60, tasks:15, done:9, dueDate:'2026-07-01' },
  { name:'SAT Curriculum Update', dept:'Kurios SAT',  manager:'Ngozi Obi',         status:'Planning',    progress:20, tasks:30, done:6, dueDate:'2026-09-01' },
  { name:'HR Digital Onboarding', dept:'HR',          manager:'Amina Ibrahim',     status:'On Hold',     progress:35, tasks:12, done:4, dueDate:'2026-06-30' },
  { name:'Financial Audit 2026', dept:'Finance',      manager:'Emeka Nwachukwu',   status:'Overdue',     progress:45, tasks:18, done:8, dueDate:'2026-05-30' },
  { name:'Website Redesign',     dept:'Engineering',  manager:'Blessing Ogundele', status:'In Progress', progress:70, tasks:25, done:17, dueDate:'2026-07-15' },
];

const DEPT_COMPLETION = [
  { dept:'Engineering', rate:75 }, { dept:'Visa Max', rate:100 },
  { dept:'Bead Max', rate:60 }, { dept:'Kurios SAT', rate:20 },
  { dept:'HR', rate:35 }, { dept:'Finance', rate:45 },
];

const STATUS_COUNTS = [
  { name:'Completed', value:1 }, { name:'In Progress', value:3 },
  { name:'Planning', value:1 }, { name:'On Hold', value:1 }, { name:'Overdue', value:1 },
];

export default function ProjectsReport() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useQuery({
    queryKey: ['projects-report'],
    queryFn: async () => {
      try { return await apiClient.get('/reports/projects'); }
      catch { return null; }
    },
  });

  const projects = SAMPLE_PROJECTS.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.manager.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || p.status === statusFilter)
  );

  const totalTasks = SAMPLE_PROJECTS.reduce((s, p) => s + p.tasks, 0);
  const totalDone = SAMPLE_PROJECTS.reduce((s, p) => s + p.done, 0);
  const completed = SAMPLE_PROJECTS.filter(p => p.status === 'Completed').length;
  const overdue = SAMPLE_PROJECTS.filter(p => p.status === 'Overdue').length;

  const exportCSV = () => {
    const header = 'Project,Department,Manager,Status,Progress,Tasks,Done,Due Date\n';
    const rows = SAMPLE_PROJECTS.map(p => `${p.name},${p.dept},${p.manager},${p.status},${p.progress}%,${p.tasks},${p.done},${p.dueDate}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'projects-report.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-600" /> Projects Report
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Overview of all projects and their progress</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Projects', value:SAMPLE_PROJECTS.length, icon:Briefcase, color:'bg-indigo-600' },
          { label:'Completed', value:completed, icon:CheckSquare, color:'bg-emerald-600' },
          { label:'Tasks Done', value:`${totalDone}/${totalTasks}`, icon:TrendingUp, color:'bg-blue-600' },
          { label:'Overdue', value:overdue, icon:AlertCircle, color:'bg-red-500' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-2xl p-4 text-white text-center', s.color)}>
            <s.icon className="h-5 w-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs opacity-80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Completion Rate by Department</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DEPT_COMPLETION}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dept" tick={{ fontSize:11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize:11 }} />
              <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }} formatter={v => [`${v}%`, 'Completion']} />
              <Bar dataKey="rate" fill="#6366f1" radius={[4,4,0,0]} name="Completion %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Status Breakdown</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={STATUS_COUNTS} dataKey="value" cx="50%" cy="50%" outerRadius={60}>
                {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }} />
              <Legend wrapperStyle={{ fontSize:10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-wrap gap-y-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects or managers..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
            <option value="">All Statuses</option>
            {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {['Project','Department','Manager','Status','Progress','Tasks','Due Date'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <motion.tr key={p.name} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}
                  className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{p.name}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{p.dept}</td>
                  <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{p.manager}</td>
                  <td className="px-5 py-3">
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLES[p.status])}>{p.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden min-w-[60px]">
                        <div className={cn('h-full rounded-full', p.progress >= 100 ? 'bg-emerald-500' : p.progress >= 60 ? 'bg-indigo-500' : p.status === 'Overdue' ? 'bg-red-500' : 'bg-amber-500')}
                          style={{ width:`${p.progress}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{p.done}/{p.tasks}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-mono">{p.dueDate}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
