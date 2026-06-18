import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@components/ui/button';
import { Alert, AlertDescription } from '@components/ui/alert';
import { useApiMutation } from '@hooks/useApiMutation';
import { useApiQuery } from '@hooks/useApiQuery';
import { projectService } from '@services/projectService';
import { departmentService } from '@services/departmentService';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';
import { useCurrentRoles, useCurrentPermissions, hasPermission } from '@utils/role';
import type { CreateProjectPayload } from '@services/projectService';


interface StaffMember { id: number; firstName: string; lastName: string; employeeId?: string; }

const schema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  projectCode: z.string().optional(),
  departmentId: z.coerce.number().min(1, 'Department is required'),
  projectManagerId: z.coerce.number().min(1, 'Project manager is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  budget: z.coerce.number().optional(),
  status: z.enum(['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled', 'Archived']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
});

type FormData = z.infer<typeof schema>;

export default function ProjectForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffError, setStaffError] = useState(false);
  const { user } = useAuthStore();
  const { roles } = useCurrentRoles();
  const permissions = useCurrentPermissions();
  // HOD-style callers can only ever create within their own department — the
  // backend forces this regardless, but lock the field client-side too so the
  // picker doesn't imply a choice that doesn't exist.
  const canPickDepartment = hasPermission(roles, permissions, 'project.create.all');

  useEffect(() => {
    apiClient.get<StaffMember[]>('/staff')
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : data?.data;
        if (Array.isArray(arr)) setStaffList(arr);
      })
      .catch(() => setStaffError(true));
  }, []);

  const { data: existing } = useApiQuery(
    ['projects', id],
    () => projectService.getById(id!),
    { enabled: isEdit }
  );

  const { data: departments } = useApiQuery(['departments'], () => departmentService.getAll());

  const deptList = (departments ?? []) as { id: number; name: string }[];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: (!isEdit && !canPickDepartment && user?.departmentId)
      ? { departmentId: user.departmentId }
      : undefined,
    values: existing ? {
      name: existing.name,
      description: existing.description ?? '',
      projectCode: existing.projectCode ?? '',
      departmentId: existing.departmentId,
      projectManagerId: existing.projectManagerId ?? 0,
      startDate: existing.startDate?.slice(0, 10) ?? '',
      endDate: existing.endDate?.slice(0, 10) ?? '',
      budget: existing.budget ?? undefined,
      status: existing.status as FormData['status'],
      priority: existing.priority as FormData['priority'],
    } : undefined,
  });

  const { mutate: save, isPending, error } = useApiMutation(
    (data: CreateProjectPayload) =>
      isEdit ? projectService.update(id!, data) : projectService.create(data),
    {
      invalidateKeys: [['projects']],
      onSuccess: () => navigate('/projects'),
    }
  );

  const onSubmit = (data: FormData) => save(data as CreateProjectPayload);

  const SEL = 'w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const INP = 'w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Project' : 'New Project'}</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      {staffError && (
        <Alert variant="destructive">
          <AlertDescription>Could not load staff list. Check your connection and refresh.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Project Name *" error={errors.name?.message}>
          <input placeholder="e.g. Website Redesign" {...register('name')} disabled={isPending} className={INP} />
        </FormField>

        <FormField label="Description" error={errors.description?.message}>
          <textarea
            {...register('description')}
            disabled={isPending}
            rows={3}
            className={`${INP} resize-none`}
            placeholder="Project description..."
          />
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Project Code" error={errors.projectCode?.message}>
            <input placeholder="PRJ-001 (auto if blank)" {...register('projectCode')} disabled={isPending} className={INP} />
          </FormField>
          <FormField label="Budget (₦)" error={errors.budget?.message}>
            <input type="number" placeholder="50000" {...register('budget')} disabled={isPending} className={INP} />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Department *" error={errors.departmentId?.message}>
            {canPickDepartment ? (
              <select {...register('departmentId')} disabled={isPending} className={SEL}>
                <option value="">Select department</option>
                {deptList.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="text"
                  disabled
                  value={deptList.find(d => d.id === user?.departmentId)?.name ?? 'Your department'}
                  className={`${INP} bg-gray-50 dark:bg-gray-800 cursor-not-allowed`}
                />
                <input type="hidden" {...register('departmentId')} />
              </>
            )}
          </FormField>
          <FormField label="Project Manager *" error={errors.projectManagerId?.message}>
            <select {...register('projectManagerId')} disabled={isPending} className={SEL}>
              <option value="">Select project manager</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.employeeId ? `${s.employeeId} — ${s.firstName} ${s.lastName}` : `${s.firstName} ${s.lastName}`}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status" error={errors.status?.message}>
            <select {...register('status')} disabled={isPending} className={SEL}>
              <option value="">Select status</option>
              {['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled', 'Archived'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Priority" error={errors.priority?.message}>
            <select {...register('priority')} disabled={isPending} className={SEL}>
              <option value="">Select priority</option>
              {['Low', 'Medium', 'High', 'Critical'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Start Date *" error={errors.startDate?.message}>
            <input type="date" {...register('startDate')} disabled={isPending} className={INP} />
          </FormField>
          <FormField label="End Date" error={errors.endDate?.message}>
            <input type="date" {...register('endDate')} disabled={isPending} className={INP} />
          </FormField>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Project')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/projects')}>Cancel</Button>
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
