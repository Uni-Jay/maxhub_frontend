import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@components/ui/button';
import { Alert, AlertDescription } from '@components/ui/alert';
import { useApiMutation } from '@hooks/useApiMutation';
import { useApiQuery } from '@hooks/useApiQuery';
import { taskService } from '@services/taskService';
import { apiClient } from '@services/apiClient';
import type { CreateTaskPayload } from '@services/taskService';

const SAMPLE_STAFF = [
  { id: 1, firstName: 'Adaeze', lastName: 'Okonkwo', employeeId: 'EMP-001' },
  { id: 2, firstName: 'Chukwuemeka', lastName: 'Eze', employeeId: 'EMP-002' },
  { id: 3, firstName: 'Fatima', lastName: 'Usman', employeeId: 'EMP-003' },
  { id: 4, firstName: 'Ngozi', lastName: 'Obi', employeeId: 'EMP-004' },
  { id: 5, firstName: 'Tunde', lastName: 'Adebayo', employeeId: 'EMP-005' },
];

interface StaffMember { id: number; firstName: string; lastName: string; employeeId?: string; }

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  taskCode: z.string().optional(),
  projectId: z.coerce.number().min(1, 'Project is required'),
  assigneeId: z.coerce.number().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z.enum(['Todo', 'InProgress', 'InReview', 'Blocked', 'Done', 'Cancelled']).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  label: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function TaskForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [staffList, setStaffList] = useState<StaffMember[]>(SAMPLE_STAFF);

  useEffect(() => {
    apiClient.get<StaffMember[]>('/staff')
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : data?.data;
        if (Array.isArray(arr) && arr.length > 0) setStaffList(arr);
      })
      .catch(() => setStaffList(SAMPLE_STAFF));
  }, []);

  const { data: existing } = useApiQuery(
    ['tasks', id],
    () => taskService.getById(id!),
    { enabled: isEdit }
  );

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: existing ? {
      title: existing.title,
      description: existing.description ?? '',
      taskCode: existing.taskCode ?? '',
      projectId: existing.projectId,
      assigneeId: existing.assigneeId ?? undefined,
      priority: existing.priority as FormData['priority'],
      status: existing.status as FormData['status'],
      startDate: existing.startDate?.slice(0, 10) ?? '',
      dueDate: existing.dueDate?.slice(0, 10) ?? '',
      estimatedHours: existing.estimatedHours ?? undefined,
      label: existing.label ?? '',
    } : undefined,
  });

  const { mutate: save, isPending, error } = useApiMutation(
    (data: CreateTaskPayload) =>
      isEdit ? taskService.update(id!, data) : taskService.create(data),
    {
      invalidateKeys: [['tasks']],
      onSuccess: () => navigate('/tasks'),
    }
  );

  const onSubmit = (data: FormData) => save(data as CreateTaskPayload);

  const SEL = 'w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const INP = 'w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Task' : 'New Task'}</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Title *" error={errors.title?.message}>
          <input placeholder="Task title" {...register('title')} disabled={isPending} className={INP} />
        </FormField>

        <FormField label="Description" error={errors.description?.message}>
          <textarea
            {...register('description')}
            disabled={isPending}
            rows={3}
            className={`${INP} resize-none`}
            placeholder="Task description..."
          />
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Task Code" error={errors.taskCode?.message}>
            <input placeholder="TASK-001 (auto if blank)" {...register('taskCode')} disabled={isPending} className={INP} />
          </FormField>
          <FormField label="Label" error={errors.label?.message}>
            <input placeholder="e.g. frontend, bug" {...register('label')} disabled={isPending} className={INP} />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Project ID *" error={errors.projectId?.message}>
            <input type="number" placeholder="1" {...register('projectId')} disabled={isPending} className={INP} />
          </FormField>
          <FormField label="Assign To (Staff ID)" error={errors.assigneeId?.message}>
            <select {...register('assigneeId')} disabled={isPending} className={SEL}>
              <option value="">— Unassigned —</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.employeeId ? `${s.employeeId} — ${s.firstName} ${s.lastName}` : `${s.firstName} ${s.lastName}`}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Priority" error={errors.priority?.message}>
            <select {...register('priority')} disabled={isPending} className={SEL}>
              <option value="">Select priority</option>
              {['Low', 'Medium', 'High', 'Critical'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Status" error={errors.status?.message}>
            <select {...register('status')} disabled={isPending} className={SEL}>
              <option value="">Select status</option>
              {['Todo', 'InProgress', 'InReview', 'Blocked', 'Done', 'Cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Start Date" error={errors.startDate?.message}>
            <input type="date" {...register('startDate')} disabled={isPending} className={INP} />
          </FormField>
          <FormField label="Due Date" error={errors.dueDate?.message}>
            <input type="date" {...register('dueDate')} disabled={isPending} className={INP} />
          </FormField>
          <FormField label="Est. Hours" error={errors.estimatedHours?.message}>
            <input type="number" placeholder="8" {...register('estimatedHours')} disabled={isPending} className={INP} />
          </FormField>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Task')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/tasks')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
