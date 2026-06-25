import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '@hooks/useApiQuery';
import { apiClient } from '@services/apiClient';
import type { AttendanceRecord } from '@/types';
import { Clock, ChevronLeft, ChevronRight, CalendarDays, LogIn, Search } from 'lucide-react';

const NG_TZ = 'Africa/Lagos';
function formatNgTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-US', { timeZone: NG_TZ, hour: '2-digit', minute: '2-digit', hour12: true });
}

const STATUS_STYLES: Record<string, string> = {
  Present:     'bg-green-50 text-green-700 border-green-200',
  Absent:      'bg-red-50 text-red-700 border-red-200',
  Late:        'bg-amber-50 text-amber-700 border-amber-200',
  HalfDay:     'bg-blue-50 text-blue-700 border-blue-200',
  OnLeave:     'bg-violet-50 text-violet-700 border-violet-200',
  Holiday:     'bg-gray-50 text-gray-500 border-gray-200',
};

const AVATAR_COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

export default function AttendanceList() {
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useApiQuery(
    ['attendance', { dateFilter, search, page }],
    () => apiClient.getRaw('/attendance', {
      date: dateFilter || undefined,
      search: search || undefined,
      page,
      limit: 20,
    }) as Promise<{
      data: AttendanceRecord[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,
    { placeholderData: (prev) => prev }
  );

  const records: AttendanceRecord[] = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total > 0 ? `${total} record${total !== 1 ? 's' : ''}` : 'Track team attendance'}
          </p>
        </div>
        <Link
          to="/attendance/check-in"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-100 dark:shadow-none"
        >
          <LogIn className="h-4 w-4" />
          Check In / Out
        </Link>
      </div>

      {/* Search + Date filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          {dateFilter && (
            <button
              onClick={() => { setDateFilter(''); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading && !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center text-red-600 dark:text-red-400 text-sm">
          Failed to load attendance records. Please try again.
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <Clock className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-900 dark:text-white">No records found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {dateFilter ? 'No attendance records for this date' : 'No attendance data yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Staff Member</p>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center w-28">Date</p>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center w-24">Check In</p>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center w-24">Check Out</p>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center w-24">Status</p>
          </div>

          {records.map((a, i) => {
            const staffName = a.staff
              ? `${a.staff.firstName} ${a.staff.lastName}`
              : `Staff #${a.staffId}`;
            const initials = a.staff
              ? `${a.staff.firstName?.[0] ?? ''}${a.staff.lastName?.[0] ?? ''}`.toUpperCase()
              : '#';
            const colorIdx = (a.staffId ?? 0) % AVATAR_COLORS.length;
            const statusStyle = STATUS_STYLES[a.status] ?? 'bg-gray-50 text-gray-500 border-gray-200';

            return (
              <div
                key={a.id}
                className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center ${
                  i !== records.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
                } hover:bg-gray-50 dark:hover:bg-gray-700/30 transition`}
              >
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${AVATAR_COLORS[colorIdx]}`}>
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{staffName}</span>
                </div>

                {/* Date */}
                <div className="w-28 text-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(a.attendanceDate).toLocaleDateString('en-GB', { timeZone: NG_TZ, day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {/* Check In */}
                <div className="w-24 text-center">
                  {a.checkInTime ? (
                    <div className="flex items-center justify-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatNgTime(a.checkInTime)}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                  )}
                </div>

                {/* Check Out */}
                <div className="w-24 text-center">
                  {a.checkOutTime ? (
                    <div className="flex items-center justify-center gap-1 text-sm text-orange-600 dark:text-orange-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatNgTime(a.checkOutTime)}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                  )}
                </div>

                {/* Status */}
                <div className="w-24 text-center">
                  <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${statusStyle}`}>
                    {a.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
