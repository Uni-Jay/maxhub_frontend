import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Alert, AlertDescription } from '@components/ui/alert';
import { useApiMutation } from '@hooks/useApiMutation';
import { useApiQuery } from '@hooks/useApiQuery';
import { leaveService } from '@services/leaveService';
import type { CreateLeavePayload } from '@services/leaveService';
import type { LeaveType } from '@/types';

const schema = z.object({
  leaveTypeId: z.coerce.number().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(5, 'Please provide a reason (min 5 chars)'),
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

type FormData = z.infer<typeof schema>;

export default function LeaveForm() {
  const navigate = useNavigate();

  const { data: leaveTypes } = useApiQuery<LeaveType[]>(
    ['leave', 'types'],
    () => leaveService.getTypes()
  );

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const start = watch('startDate');
  const end = watch('endDate');
  const days = start && end && end >= start
    ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
    : 0;

  const { mutate: apply, isPending, error } = useApiMutation(
    (data: CreateLeavePayload) => leaveService.createRequest(data),
    {
      invalidateKeys: [['leave', 'requests'], ['leave', 'balance']],
      onSuccess: () => navigate('/leave/requests'),
    }
  );

  const onSubmit = (data: FormData) => apply(data as CreateLeavePayload);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Apply for Leave</h1>
        <p className="text-gray-600 mt-1">Submit a new leave request</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Leave Type *" error={errors.leaveTypeId?.message}>
          <select {...register('leaveTypeId')} disabled={isPending}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select leave type</option>
            {(leaveTypes ?? []).map((t: LeaveType) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Start Date *" error={errors.startDate?.message}>
            <Input type="date" {...register('startDate')} disabled={isPending} />
          </FormField>
          <FormField label="End Date *" error={errors.endDate?.message}>
            <Input type="date" {...register('endDate')} disabled={isPending} />
          </FormField>
        </div>

        {days > 0 && (
          <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-700">
            Duration: <strong>{days} day{days !== 1 ? 's' : ''}</strong>
          </div>
        )}

        <FormField label="Reason *" error={errors.reason?.message}>
          <textarea
            {...register('reason')}
            disabled={isPending}
            rows={4}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Please provide a reason for your leave..."
          />
        </FormField>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending || days <= 0}>
            {isPending ? 'Submitting…' : 'Submit Request'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/leave/requests')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
