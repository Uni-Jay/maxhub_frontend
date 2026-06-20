import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApiMutation } from '@hooks/useApiMutation';
import { authApi } from '@services/auth.api';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Phone, CheckCircle2, AlertCircle, Save } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const inputClass = (err?: boolean) =>
  `w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
    err ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'
  }`;

export default function ProfileSettings() {
  const { user, setUser } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  });

  const { mutate: save, isPending, isSuccess, error } = useApiMutation(
    (data: ProfileFormData) => authApi.updateProfile(data),
    {
      onSuccess: (updated) => {
        if (setUser) setUser(updated);
      },
    }
  );

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Update your personal information</p>
      </div>

      {/* Avatar section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{user?.roles?.[0]?.toLowerCase() ?? 'staff'}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error.message}</p>
        </div>
      )}
      {isSuccess && (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400">Profile updated successfully!</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit((data) => save(data))} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  First Name
                </span>
              </label>
              <input
                placeholder="John"
                {...register('firstName')}
                disabled={isPending}
                className={inputClass(!!errors.firstName)}
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  Last Name
                </span>
              </label>
              <input
                placeholder="Doe"
                {...register('lastName')}
                disabled={isPending}
                className={inputClass(!!errors.lastName)}
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              Email Address
            </span>
          </label>
          <input
            type="email"
            placeholder="john@example.com"
            {...register('email')}
            disabled={isPending}
            className={inputClass(!!errors.email)}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-gray-400" />
              Phone Number
            </span>
          </label>
          <input
            placeholder="+1 234 567 890"
            {...register('phone')}
            disabled={isPending}
            className={inputClass(!!errors.phone)}
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            type="submit"
            disabled={isPending || !isDirty}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm shadow-sm shadow-indigo-100 dark:shadow-none"
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
