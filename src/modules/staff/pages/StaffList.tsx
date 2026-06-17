import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '@hooks/useApiQuery';
import { staffService } from '@services/staffService';
import type { StaffMember } from '@/types';
import { Search, Plus, Users, ChevronLeft, ChevronRight, Mail, Phone, Building2 } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-green-50 text-green-700 border border-green-200',
  Inactive: 'bg-gray-50 text-gray-600 border border-gray-200',
  Suspended: 'bg-red-50 text-red-700 border border-red-200',
  OnLeave: 'bg-amber-50 text-amber-700 border border-amber-200',
};

function initials(s: StaffMember) {
  return `${s.firstName?.[0] ?? ''}${s.lastName?.[0] ?? ''}`.toUpperCase();
}

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
];

function avatarColor(id: number | string) {
  const n = typeof id === 'string' ? id.charCodeAt(0) : id;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export default function StaffList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useApiQuery(
    ['staff', { search, page }],
    () => staffService.getAll({ search, page, limit: 20 }),
    { placeholderData: (prev) => prev }
  );

  const staff: StaffMember[] = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total > 0 ? `${total} team member${total !== 1 ? 's' : ''}` : 'Manage your team'}
          </p>
        </div>
        <Link
          to="/staff/create"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-100 dark:shadow-none"
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </Link>
      </div>

      {/* Search bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or employee ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading && !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center text-red-600 dark:text-red-400 text-sm">
          Failed to load staff members. Please try again.
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <Users className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-900 dark:text-white">No staff members found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {search ? 'Try adjusting your search' : 'Add your first team member to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((s) => (
            <Link key={s.id} to={`/staff/${s.id}`} className="group">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${avatarColor(s.id)}`}>
                    {initials(s)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                        {s.firstName} {s.lastName}
                      </p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${STATUS_STYLES[s.status] ?? STATUS_STYLES.Inactive}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{s.employeeId}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {s.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {(s.position || s.designation?.name || s.department?.name) && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {[s.position || s.designation?.name, s.department?.name].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  )}
                  {s.businessUnit && (
                    <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                      <span className="truncate">{s.businessUnit}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
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
