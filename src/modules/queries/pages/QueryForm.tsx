import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiQuery } from '@hooks/useApiQuery';
import { useApiMutation } from '@hooks/useApiMutation';
import { queryService } from '@services/queryService';
import { apiClient } from '@services/apiClient';
import { ArrowLeft } from 'lucide-react';

const SAMPLE_STAFF = [
  { id: 1, firstName: 'Adaeze', lastName: 'Okonkwo' },
  { id: 2, firstName: 'Chukwuemeka', lastName: 'Eze' },
  { id: 3, firstName: 'Fatima', lastName: 'Usman' },
  { id: 4, firstName: 'Ngozi', lastName: 'Obi' },
  { id: 5, firstName: 'Tunde', lastName: 'Adebayo' },
  { id: 6, firstName: 'Emeka', lastName: 'Nwachukwu' },
];

const DEPARTMENTS = ['HR', 'Finance', 'Kurios SAT', 'BeadMax Design', 'VisaMax Travel Ltd'];

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  type: z.enum(['Query', 'Complaint', 'Task', 'Issue', 'Request']),
  dueDate: z.string().optional(),
  departmentId: z.coerce.number().optional(),
  assignedStaffId: z.coerce.number().min(1, 'Please select a staff member'),
  department: z.string().min(1, 'Please select a department'),
});

type FormData = z.infer<typeof schema>;

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
}

export default function QueryForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [staffList, setStaffList] = useState<StaffMember[]>(SAMPLE_STAFF);

  useEffect(() => {
    apiClient.get<StaffMember[]>('/staff')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setStaffList(data);
      })
      .catch(() => {
        setStaffList(SAMPLE_STAFF);
      });
  }, []);

  const { data: existing } = useApiQuery(
    ['query', id],
    () => queryService.getById(id!),
    { enabled: isEdit }
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'Medium', type: 'Query' },
  });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        description: existing.description,
        priority: existing.priority,
        type: existing.type,
        dueDate: existing.dueDate?.slice(0, 10),
        departmentId: existing.departmentId,
        assignedStaffId: existing.assignedStaffId,
        department: '',
      });
    }
  }, [existing, reset]);

  const mutation = useApiMutation(
    (data: FormData) =>
      isEdit
        ? queryService.update(id!, data)
        : queryService.create(data),
    {
      invalidateKeys: [['queries']],
      onSuccess: () => navigate('/queries'),
    }
  );

  const inputClass = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Query' : 'New Query'}
          </h1>
          <p className="text-sm text-gray-500">
            {isEdit ? 'Update query details' : 'Submit a new query, complaint, or request'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input {...register('title')} className={inputClass} placeholder="Brief title of the query" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
              <select {...register('type')} className={inputClass}>
                {['Query', 'Complaint', 'Task', 'Issue', 'Request'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority *</label>
              <select {...register('priority')} className={inputClass}>
                {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea {...register('description')} rows={5} className={inputClass} placeholder="Provide a detailed description..." />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
            <input type="date" {...register('dueDate')} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Query To (Staff) *</label>
            <select {...register('assignedStaffId')} className={inputClass}>
              <option value="">— Select staff member —</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
            {errors.assignedStaffId && <p className="text-red-500 text-xs mt-1">{errors.assignedStaffId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department *</label>
            <select {...register('department')} className={inputClass}>
              <option value="">— Select department —</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
          </div>

          {mutation.error && (
            <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {(mutation.error as Error).message || 'Failed to save query'}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update Query' : 'Submit Query'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
