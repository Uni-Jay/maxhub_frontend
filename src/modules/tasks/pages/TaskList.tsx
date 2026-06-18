import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@hooks/useApiQuery';
import { useApiMutation } from '@hooks/useApiMutation';
import { taskService } from '@services/taskService';
import { useCurrentRoles } from '@utils/role';
import type { TaskItem } from '@/types';
import { Search, Plus, CheckSquare, ChevronLeft, ChevronRight, User, Calendar, CheckCircle2, Undo2, X } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  Todo:       'bg-gray-50 text-gray-600 border-gray-200',
  InProgress: 'bg-blue-50 text-blue-700 border-blue-200',
  InReview:   'bg-violet-50 text-violet-700 border-violet-200',
  Blocked:    'bg-red-50 text-red-700 border-red-200',
  Done:       'bg-green-50 text-green-700 border-green-200',
  Cancelled:  'bg-gray-50 text-gray-400 border-gray-200',
};

const PRIORITY_STYLES: Record<string, string> = {
  Low:      'bg-gray-50 text-gray-500 border-gray-200',
  Medium:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  High:     'bg-orange-50 text-orange-700 border-orange-200',
  Critical: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_DOTS: Record<string, string> = {
  Todo: 'bg-gray-400', InProgress: 'bg-blue-500', InReview: 'bg-violet-500',
  Blocked: 'bg-red-500', Done: 'bg-green-500', Cancelled: 'bg-gray-300',
};

const TASK_STATUSES = ['Todo', 'InProgress', 'InReview', 'Blocked', 'Done', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

function formatLabel(s: string) {
  return s.replace(/([A-Z])/g, ' $1').trim();
}

export default function TaskList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const { roles } = useCurrentRoles();
  const isStaffOnly = roles.has('staff') && !roles.has('superadmin') && !roles.has('admin') && !roles.has('hr') && !roles.has('hod');

  const { data, isLoading, isError } = useApiQuery(
    ['tasks', { search, page, statusFilter, priorityFilter }],
    () => taskService.getAll({
      search, page, limit: 20,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    }),
    { placeholderData: (prev) => prev }
  );

  const tasks: TaskItem[] = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const qc = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => taskService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total > 0 ? `${total} task${total !== 1 ? 's' : ''}` : 'Manage project tasks'}
          </p>
        </div>
        {isStaffOnly ? (
          <button
            onClick={() => setShowPersonalModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-100 dark:shadow-none"
          >
            <Plus className="h-4 w-4" />
            New Personal Task
          </button>
        ) : (
          <Link
            to="/tasks/create"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-100 dark:shadow-none"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Link>
        )}
      </div>

      {showPersonalModal && (
        <PersonalTaskModal onClose={() => setShowPersonalModal(false)} />
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
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
            {TASK_STATUSES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
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
          Failed to load tasks. Please try again.
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <CheckSquare className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-900 dark:text-white">No tasks found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {search || statusFilter || priorityFilter ? 'Try adjusting your filters' : 'Create your first task'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => {
            const dotColor = STATUS_DOTS[t.status] ?? 'bg-gray-400';
            return (
              <Link key={t.id} to={`/tasks/${t.id}`} className="group block">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {t.title}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {[t.taskCode, t.project?.name].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[t.status] ?? STATUS_STYLES.Todo}`}>
                            {formatLabel(t.status)}
                          </span>
                          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.Medium}`}>
                            {t.priority}
                          </span>
                        </div>
                      </div>

                      {t.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-1">{t.description}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2">
                        {t.assignee && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <User className="h-3 w-3" />
                            <span>{t.assignee.firstName} {t.assignee.lastName}</span>
                          </div>
                        )}
                        {t.dueDate && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" />
                            <span>Due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        )}
                      </div>

                      {t.status === 'InReview' && (
                        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-50 dark:border-gray-700/50">
                          <button
                            onClick={e => { e.preventDefault(); e.stopPropagation(); statusMutation.mutate({ id: t.id, status: 'Done' }); }}
                            disabled={statusMutation.isPending}
                            className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Complete
                          </button>
                          <button
                            onClick={e => { e.preventDefault(); e.stopPropagation(); statusMutation.mutate({ id: t.id, status: 'InProgress' }); }}
                            disabled={statusMutation.isPending}
                            className="flex items-center gap-1 text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            <Undo2 className="h-3.5 w-3.5" /> Send Back
                          </button>
                        </div>
                      )}
                    </div>
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

function PersonalTaskModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const qc = useQueryClient();

  const { mutate: create, isPending } = useApiMutation(
    () => taskService.create({ title, description: description || undefined, dueDate: dueDate || undefined, priority }),
    {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); onClose(); },
    }
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Personal Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          A private to-do just for you — not tied to any project.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (title.trim()) create(undefined); }}
          className="space-y-3"
        >
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-3">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              {isPending ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
