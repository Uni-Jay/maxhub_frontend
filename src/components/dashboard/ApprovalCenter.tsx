import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, ChevronDown, ChevronUp, CheckCircle2, XCircle, Eye,
  TrendingUp, Calendar, ArrowUpCircle, Briefcase, CheckSquare, DollarSign, Timer,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';
import { useNavigate } from 'react-router-dom';

interface QueueItem {
  id: number;
  staff?: { firstName: string; lastName: string };
  [key: string]: unknown;
}

interface ApprovalsQueueResponse {
  weeklyReports?: { count: number; items: QueueItem[] };
  leaveRequests?: { count: number; items: QueueItem[] };
  promotions?: { count: number; items: QueueItem[] };
  jobPostings?: { count: number; items: QueueItem[] };
  projects?: { count: number; items: QueueItem[] };
  tasks?: { count: number; items: QueueItem[] };
  payroll?: { count: number; items: QueueItem[] };
  overtime?: { count: number; items: QueueItem[] };
}

type CategoryKey = keyof ApprovalsQueueResponse;

interface CategoryDef {
  label: string;
  icon: React.ElementType;
  color: string;
  viewPath: string;
  itemLabel: (item: QueueItem) => string;
  itemSub: (item: QueueItem) => string;
  approve?: (id: number, comment?: string) => Promise<unknown>;
  reject?: (id: number, comment?: string) => Promise<unknown>;
  approveLabel?: string;
  rejectLabel?: string;
}

const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  weeklyReports: {
    label: 'Weekly Reports', icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950', viewPath: '/hr/weekly-report',
    itemLabel: (i) => i.staff ? `${(i.staff as any).firstName} ${(i.staff as any).lastName}` : `Report #${i.id}`,
    itemSub: (i) => String(i.weekEnding ?? ''),
    approve: (id) => apiClient.patch(`/hr/weekly-reports/${id}/approve`, {}),
    reject: (id, comment) => apiClient.patch(`/hr/weekly-reports/${id}/reject`, { rejectionReason: comment }),
  },
  leaveRequests: {
    label: 'Leave Requests', icon: Calendar, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950', viewPath: '/leave/requests',
    itemLabel: (i) => i.staff ? `${(i.staff as any).firstName} ${(i.staff as any).lastName}` : `Leave #${i.id}`,
    itemSub: (i) => `${i.numberofDays ?? '?'} day(s)`,
    approve: (id, comment) => apiClient.patch(`/leave/requests/${id}/approve`, { comments: comment }),
    reject: (id, comment) => apiClient.patch(`/leave/requests/${id}/reject`, { comments: comment }),
  },
  promotions: {
    label: 'Promotions', icon: ArrowUpCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', viewPath: '/hr/promotions',
    itemLabel: (i) => i.staff ? `${(i.staff as any).firstName} ${(i.staff as any).lastName}` : `Promotion #${i.id}`,
    itemSub: (i) => `Effective ${i.effectiveDate ? new Date(i.effectiveDate as string).toLocaleDateString() : '—'}`,
    approve: (id, comment) => apiClient.patch(`/promotions/${id}/approve`, { approvalRemarks: comment }),
    reject: (id, comment) => apiClient.patch(`/promotions/${id}/reject`, { rejectionReason: comment }),
  },
  jobPostings: {
    label: 'Job Postings', icon: Briefcase, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950', viewPath: '/hr/jobs',
    itemLabel: (i) => String(i.title ?? `Posting #${i.id}`),
    itemSub: (i) => String(i.jobCode ?? ''),
    approve: (id) => apiClient.patch(`/job-postings/${id}/status`, { status: 'Open' }),
    reject: (id) => apiClient.patch(`/job-postings/${id}/status`, { status: 'Closed' }),
    approveLabel: 'Publish',
  },
  projects: {
    label: 'Projects', icon: Briefcase, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950', viewPath: '/projects',
    itemLabel: (i) => String(i.name ?? `Project #${i.id}`),
    itemSub: (i) => String(i.projectCode ?? ''),
    approve: (id) => apiClient.patch(`/projects/${id}`, { status: 'Active' }),
  },
  tasks: {
    label: 'Tasks', icon: CheckSquare, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950', viewPath: '/tasks',
    itemLabel: (i) => String(i.title ?? `Task #${i.id}`),
    itemSub: (i) => String(i.taskCode ?? ''),
    approve: (id) => apiClient.patch(`/tasks/${id}/status`, { status: 'Done' }),
    reject: (id) => apiClient.patch(`/tasks/${id}/status`, { status: 'InProgress' }),
    approveLabel: 'Approve & Complete',
    rejectLabel: 'Send Back',
  },
  payroll: {
    label: 'Payroll', icon: DollarSign, color: 'text-green-600 bg-green-50 dark:bg-green-950', viewPath: '/payroll/periods',
    itemLabel: (i) => String(i.periodName ?? `Period #${i.id}`),
    itemSub: (i) => String(i.status ?? ''),
    approve: (id) => apiClient.patch(`/payroll/periods/${id}/status`, { status: 'Approved' }),
  },
  overtime: {
    label: 'Overtime', icon: Timer, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950', viewPath: '/attendance',
    itemLabel: (i) => i.staff ? `${(i.staff as any).firstName} ${(i.staff as any).lastName}` : `Overtime #${i.id}`,
    itemSub: (i) => `${i.overtimeHours ?? '?'} hr(s) on ${i.date ? new Date(i.date as string).toLocaleDateString() : '—'}`,
    approve: (id) => apiClient.put(`/attendance/overtime/${id}/approve`, {}),
    reject: (id) => apiClient.put(`/attendance/overtime/${id}/reject`, {}),
  },
};

const CATEGORY_ORDER: CategoryKey[] = ['weeklyReports', 'leaveRequests', 'promotions', 'jobPostings', 'projects', 'tasks', 'payroll', 'overtime'];

export function ApprovalCenter({ endpoint }: { endpoint: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['approvals-queue', endpoint],
    queryFn: () => apiClient.get<ApprovalsQueueResponse>(endpoint),
  });

  const actionMutation = useMutation({
    mutationFn: ({ fn, id, comment }: { fn: (id: number, comment?: string) => Promise<unknown>; id: number; comment?: string }) => fn(id, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals-queue', endpoint] }),
    onError: (error: any) => window.alert(error?.response?.data?.message || error?.message || 'Action failed'),
  });

  const visibleCategories = CATEGORY_ORDER.filter((k) => data?.[k]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-muted/30 h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (visibleCategories.length === 0) return null;

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm space-y-4">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        Approval Center
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleCategories.map((key) => {
          const cat = CATEGORIES[key];
          const queue = data![key]!;
          const Icon = cat.icon;
          return (
            <button
              key={key}
              onClick={() => setOpenCategory(openCategory === key ? null : key)}
              className={cn('rounded-lg p-4 text-left hover:opacity-80 transition-opacity', cat.color, openCategory === key && 'ring-2 ring-offset-1 ring-current')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">{cat.label}</p>
                  <p className="text-2xl font-bold mt-1">{queue.count}</p>
                </div>
                <Icon className="w-6 h-6 opacity-50" />
              </div>
              <p className="text-xs mt-2 opacity-60 flex items-center gap-1">
                {openCategory === key ? <>Hide <ChevronUp className="w-3 h-3" /></> : <>Expand <ChevronDown className="w-3 h-3" /></>}
              </p>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {openCategory && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{CATEGORIES[openCategory].label} — Pending</p>
                <button onClick={() => navigate(CATEGORIES[openCategory!].viewPath)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                  <Eye className="h-3.5 w-3.5" /> View All
                </button>
              </div>
              {data![openCategory]!.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nothing pending</p>
              ) : (
                data![openCategory]!.items.map((item) => {
                  const cat = CATEGORIES[openCategory];
                  const draftKey = `${openCategory}-${item.id}`;
                  return (
                    <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/60">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{cat.itemLabel(item)}</p>
                        <p className="text-xs text-muted-foreground">{cat.itemSub(item)}</p>
                        {cat.reject && (
                          <input
                            type="text"
                            placeholder="Optional comment..."
                            value={commentDrafts[draftKey] ?? ''}
                            onChange={(e) => setCommentDrafts((d) => ({ ...d, [draftKey]: e.target.value }))}
                            className="mt-2 w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {cat.approve && (
                          <button
                            onClick={() => actionMutation.mutate({ fn: cat.approve!, id: item.id, comment: commentDrafts[draftKey] })}
                            disabled={actionMutation.isPending}
                            className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> {cat.approveLabel ?? 'Approve'}
                          </button>
                        )}
                        {cat.reject && (
                          <button
                            onClick={() => actionMutation.mutate({ fn: cat.reject!, id: item.id, comment: commentDrafts[draftKey] })}
                            disabled={actionMutation.isPending}
                            className="flex items-center gap-1 text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" /> {cat.rejectLabel ?? 'Reject'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ApprovalCenter;
