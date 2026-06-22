import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '@hooks/useApiQuery';
import { useApiMutation } from '@hooks/useApiMutation';
import { leaveService } from '@services/leaveService';
import { useCurrentRoles } from '@/utils/role';
import type { LeaveRequestItem } from '@/types';
import { Plus, Calendar, CheckCircle2, XCircle, Clock, FileText, ChevronLeft, ChevronRight, User, Search, ShieldAlert } from 'lucide-react';

const STATUS_STYLES: Record<string, { badge: string; icon: React.ElementType; iconColor: string }> = {
  Pending:   { badge: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Clock,         iconColor: 'text-amber-500' },
  Approved:  { badge: 'bg-green-50 text-green-700 border-green-200',  icon: CheckCircle2,  iconColor: 'text-green-500' },
  Rejected:  { badge: 'bg-red-50 text-red-700 border-red-200',        icon: XCircle,       iconColor: 'text-red-500' },
  Cancelled: { badge: 'bg-gray-50 text-gray-500 border-gray-200',     icon: XCircle,       iconColor: 'text-gray-400' },
  Withdrawn: { badge: 'bg-gray-50 text-gray-500 border-gray-200',     icon: XCircle,       iconColor: 'text-gray-400' },
};

const STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Withdrawn'];

export default function LeaveRequests() {
  const { roles } = useCurrentRoles();
  const isSuperAdmin = roles.has('superadmin');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useApiQuery(
    ['leave', 'requests', { statusFilter, search, page }],
    () => leaveService.getRequests({ status: statusFilter || undefined, search: search || undefined, page, limit: 20 }),
    { placeholderData: (prev) => prev }
  );

  const requests: LeaveRequestItem[] = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const { mutate: approve, isPending: approving } = useApiMutation(
    (id: number) => leaveService.approve(id),
    { invalidateKeys: [['leave', 'requests']] }
  );
  const { mutate: reject, isPending: rejecting } = useApiMutation(
    (id: number) => leaveService.reject(id),
    { invalidateKeys: [['leave', 'requests']] }
  );

  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total > 0 ? `${total} request${total !== 1 ? 's' : ''}` : 'Review team leave applications'}
            {pendingCount > 0 && ` · ${pendingCount} pending`}
          </p>
        </div>
        <Link
          to="/leave/apply"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-100 dark:shadow-none"
        >
          <Plus className="h-4 w-4" />
          Apply for Leave
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by staff name or leave type..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              statusFilter === '' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                statusFilter === s ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading && !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center text-red-600 dark:text-red-400 text-sm">
          Failed to load leave requests. Please try again.
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-900 dark:text-white">No leave requests found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {statusFilter ? `No ${statusFilter.toLowerCase()} requests` : 'No requests have been submitted yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const style = STATUS_STYLES[r.status] ?? STATUS_STYLES.Pending;
            const StatusIcon = style.icon;
            const days = r.numberofDays;
            return (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {r.staff ? `${r.staff.firstName} ${r.staff.lastName}` : `Request #${r.id}`}
                        </p>
                        <span className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${style.badge}`}>
                          <StatusIcon className={`h-3 w-3 ${style.iconColor}`} />
                          {r.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {r.leaveType?.name ?? 'Leave'} · {days} day{days !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pl-12 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span>
                      {new Date(r.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' — '}
                      {new Date(r.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {r.reason && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                      {r.reason}
                    </p>
                  )}
                </div>

                {r.status === 'Pending' && (
                  r.requiresSuperAdminApproval && !isSuperAdmin ? (
                    <div className="mt-4 pl-12 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
                      Requester is HR/Admin — only Super Admin can approve or reject this request
                    </div>
                  ) : (
                    <div className="mt-4 pl-12 flex gap-2">
                      <button
                        onClick={() => approve(r.id)}
                        disabled={approving}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => reject(r.id)}
                        disabled={rejecting}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold transition disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )
                )}
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
