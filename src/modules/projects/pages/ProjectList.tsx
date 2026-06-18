import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@hooks/useApiQuery';
import { projectService } from '@services/projectService';
import type { ProjectItem } from '@/types';
import { Search, Plus, Briefcase, ChevronLeft, ChevronRight, Calendar, TrendingUp, CheckCircle2, Trash2 } from 'lucide-react';

const STATUS_STYLES: Record<string, { badge: string; bar: string }> = {
  Planning:  { badge: 'bg-blue-50 text-blue-700 border-blue-200',   bar: 'bg-blue-400' },
  Active:    { badge: 'bg-green-50 text-green-700 border-green-200', bar: 'bg-green-500' },
  OnHold:    { badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-400' },
  Completed: { badge: 'bg-gray-50 text-gray-700 border-gray-200',   bar: 'bg-gray-400' },
  Cancelled: { badge: 'bg-red-50 text-red-700 border-red-200',      bar: 'bg-red-400' },
  Archived:  { badge: 'bg-purple-50 text-purple-700 border-purple-200', bar: 'bg-purple-400' },
};

const PRIORITY_STYLES: Record<string, string> = {
  Low:      'bg-gray-50 text-gray-600 border-gray-200',
  Medium:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  High:     'bg-orange-50 text-orange-700 border-orange-200',
  Critical: 'bg-red-50 text-red-700 border-red-200',
};

const STATUSES = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled', 'Archived'];

export default function ProjectList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const qc = useQueryClient();

  const { data, isLoading, isError } = useApiQuery(
    ['projects', { search, page, statusFilter }],
    () => projectService.getAll({ search, page, limit: 20, status: statusFilter || undefined }),
    { placeholderData: (prev) => prev }
  );

  const approveMutation = useMutation({
    mutationFn: (id: number) => projectService.update(id, { status: 'Active' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const projects: ProjectItem[] = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total > 0 ? `${total} project${total !== 1 ? 's' : ''}` : 'Track your team projects'}
          </p>
        </div>
        <Link
          to="/projects/create"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-100 dark:shadow-none"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading && !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center text-red-600 dark:text-red-400 text-sm">
          Failed to load projects. Please try again.
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <Briefcase className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-900 dark:text-white">No projects found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {search || statusFilter ? 'Try adjusting your filters' : 'Create your first project to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => {
            const statusStyle = STATUS_STYLES[p.status] ?? STATUS_STYLES.Planning;
            const priorityStyle = PRIORITY_STYLES[p.priority] ?? PRIORITY_STYLES.Medium;
            const progress = p.progress ?? 0;
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="group block">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                        {p.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{p.projectCode}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${priorityStyle}`}>
                        {p.priority}
                      </span>
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${statusStyle.badge}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-1">{p.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(p.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {p.endDate && ` → ${new Date(p.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>{progress}%</span>
                    </div>
                  </div>

                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${statusStyle.bar}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/50">
                    {p.status === 'Planning' && (
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); approveMutation.mutate(p.id); }}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.preventDefault(); e.stopPropagation();
                        if (window.confirm(`Delete project "${p.name}"?`)) deleteMutation.mutate(p.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </Link>
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
