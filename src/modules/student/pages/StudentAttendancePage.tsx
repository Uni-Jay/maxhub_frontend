import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentPortalApi, AttendanceRecord } from '@/services/studentService';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, React.ReactElement> = {
    Present: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    Absent:  <XCircle    className="h-4 w-4 text-red-500"     />,
    Late:    <Clock      className="h-4 w-4 text-amber-500"   />,
    Excused: <AlertCircle className="h-4 w-4 text-blue-500"  />,
  };
  return map[status] || <></>;
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    Present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Absent:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Late:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Excused: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[status] || ''}`}>
      {status}
    </span>
  );
};

export const StudentAttendancePage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['student-portal-attendance', dateFrom, dateTo],
    queryFn: () =>
      studentPortalApi
        .getAttendance(dateFrom && dateTo ? { dateFrom, dateTo } : {})
        .then((r: any) => r.data?.data),
  });

  const records: AttendanceRecord[] = data?.records || [];
  const summary = data?.summary || { total: 0, present: 0, attendancePercentage: 0 };

  const pct = summary.attendancePercentage;
  const pctColor = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
  const barColor = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track your class attendance record</p>
      </div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Attendance Rate</p>
            <p className={`text-4xl font-bold mt-1 ${pctColor}`}>{pct}%</p>
          </div>
          <div className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-gray-800 flex items-center justify-center">
            <Calendar className={`h-8 w-8 ${pctColor}`} />
          </div>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{summary.total}</p>
            <p className="text-xs text-gray-500">Total Classes</p>
          </div>
          <div>
            <p className="font-bold text-emerald-600">{summary.present}</p>
            <p className="text-xs text-gray-500">Present</p>
          </div>
          <div>
            <p className="font-bold text-red-500">{summary.total - summary.present}</p>
            <p className="text-xs text-gray-500">Absent</p>
          </div>
        </div>

        {pct < 75 && (
          <div className="mt-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Your attendance is below the required 75%. Please attend classes regularly to avoid academic issues.
            </p>
          </div>
        )}
      </motion.div>

      {/* Date filter */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="self-end px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No attendance records found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          {records.map((record, i) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <StatusIcon status={record.status} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                {record.checkInTime && (
                  <p className="text-xs text-gray-500 mt-0.5">Checked in at {record.checkInTime}</p>
                )}
                {record.minutesLate && (
                  <p className="text-xs text-amber-600 mt-0.5">{record.minutesLate} minutes late</p>
                )}
                {record.excuseReason && (
                  <p className="text-xs text-blue-600 mt-0.5">Excused: {record.excuseReason}</p>
                )}
              </div>
              <StatusPill status={record.status} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAttendancePage;
