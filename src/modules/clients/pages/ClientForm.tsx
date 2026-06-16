import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiQuery } from '@hooks/useApiQuery';
import { useApiMutation } from '@hooks/useApiMutation';
import { clientService } from '@services/clientService';
import { ArrowLeft } from 'lucide-react';
import type { ClientStatus } from '@/types';

const schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(6, 'Phone number is required'),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Pending', 'Suspended'] as [ClientStatus, ...ClientStatus[]]),
  notes: z.string().optional(),
  departmentId: z.coerce.number().optional(),
  assignedStaffId: z.coerce.number().optional(),
  registrationDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const inputClass = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { data: existing } = useApiQuery(
    ['client', id],
    () => clientService.getById(id!),
    { enabled: isEdit }
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'Pending',
      registrationDate: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        fullName: existing.fullName,
        email: existing.email,
        phone: existing.phone,
        alternatePhone: existing.alternatePhone || '',
        address: existing.address || '',
        city: existing.city || '',
        state: existing.state || '',
        country: existing.country || '',
        nationality: existing.nationality || '',
        dateOfBirth: existing.dateOfBirth?.slice(0, 10) || '',
        status: existing.status,
        notes: existing.notes || '',
        departmentId: existing.departmentId,
        assignedStaffId: existing.assignedStaffId,
        registrationDate: existing.registrationDate?.slice(0, 10),
      });
    }
  }, [existing, reset]);

  const mutation = useApiMutation(
    (data: FormData) =>
      isEdit ? clientService.update(id!, data) : clientService.create(data),
    {
      invalidateKeys: [['clients']],
      onSuccess: () => navigate('/clients'),
    }
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Client' : 'Add New Client'}
          </h1>
          <p className="text-sm text-gray-500">
            {isEdit ? 'Update client profile details' : 'Register a new client in the system'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
              <input {...register('fullName')} className={inputClass} placeholder="John Doe" />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
              <input type="email" {...register('email')} className={inputClass} placeholder="john@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
              <input {...register('phone')} className={inputClass} placeholder="+234 800 000 0000" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alternate Phone</label>
              <input {...register('alternatePhone')} className={inputClass} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
              <input type="date" {...register('dateOfBirth')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nationality</label>
              <input {...register('nationality')} className={inputClass} placeholder="e.g. Nigerian" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
              <select {...register('status')} className={inputClass}>
                <option value="Pending">Pending</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration Date</label>
              <input type="date" {...register('registrationDate')} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Address Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
              <input {...register('address')} className={inputClass} placeholder="123 Main Street, Apt 4B" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input {...register('city')} className={inputClass} placeholder="Lagos" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State / Province</label>
              <input {...register('state')} className={inputClass} placeholder="Lagos State" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
              <input {...register('country')} className={inputClass} placeholder="Nigeria" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Additional Notes</h2>
          <textarea
            {...register('notes')}
            rows={4}
            className={inputClass}
            placeholder="Any additional information about this client..."
          />
        </div>

        {mutation.error && (
          <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
            {(mutation.error as Error).message || 'Failed to save client'}
          </div>
        )}

        <div className="flex gap-3">
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
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Client' : 'Add Client'}
          </button>
        </div>
      </form>
    </div>
  );
}
