import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Alert, AlertDescription } from '@components/ui/alert';
import { useApiMutation } from '@hooks/useApiMutation';
import { useApiQuery } from '@hooks/useApiQuery';
import { staffService } from '@services/staffService';
import { departmentService, designationService } from '@services/departmentService';
import type { CreateStaffPayload } from '@services/staffService';
import { useAuthStore } from '@store/authStore';
import { PlusCircle, Building2 } from 'lucide-react';

// ─── Business units ────────────────────────────────────────
const BUSINESS_UNITS = [
  'Kurios SAT',
  'VisaMax Travels Ltd',
  'Beadmax Design',
  'Beadmax Vocational School',
];

// ─── Fallback data (used when API is unavailable) ──────────
const FALLBACK_DEPARTMENTS = [
  { id: 1, name: 'Kurios SAT' },
  { id: 2, name: 'VisaMax Travels Ltd' },
  { id: 3, name: 'Beadmax Design' },
  { id: 4, name: 'Beadmax Vocational School' },
  { id: 5, name: 'HR' },
  { id: 6, name: 'Finance' },
  { id: 7, name: 'Admin' },
];

const COMMON_POSITIONS = [
  'Creative Director', 'Travel Consultant', 'Project Coordinator',
  'HR Officer', 'Operations Manager', 'Instructor', 'Admin Officer',
  'Software Engineer', 'Accountant', 'Marketing Officer',
  'Sales Executive', 'Customer Service Officer', 'SAT Tutor',
  'Visa Processing Officer', 'Bead Artisan', 'Vocational Trainer',
  'Receptionist', 'Finance Manager', 'Content Creator',
];

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone is required'),
  employeeId: z.string().optional(),
  businessUnit: z.string().min(1, 'Business unit is required'),
  departmentId: z.coerce.number().min(1, 'Department is required'),
  designationId: z.coerce.number().optional(),
  locationId: z.coerce.number().optional(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
});

type FormData = z.infer<typeof schema>;

export default function StaffForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const isEdit = !!id;
  const isCEO = currentUser?.roles?.includes('superadmin') ?? false;
  const [createdStaff, setCreatedStaff] = useState<any>(null);
  const [useCustomPosition, setUseCustomPosition] = useState(false);
  const [customPosition, setCustomPosition] = useState('');
  const [customPositionError, setCustomPositionError] = useState('');
  const [additionalUnits, setAdditionalUnits] = useState<string[]>([]);

  const { data: existing } = useApiQuery(
    ['staff', id],
    () => staffService.getById(id!),
    { enabled: isEdit }
  );

  const { data: deptData } = useApiQuery(['departments'], () => departmentService.getAll());
  const { data: desgData } = useApiQuery(['designations'], () => designationService.getAll());

  // Use API data if available, fall back to local list
  const departments = (deptData as any[])?.length ? deptData as any[] : FALLBACK_DEPARTMENTS;
  const designations = (desgData as any[]) ?? [];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: existing ? {
      firstName: existing.firstName,
      lastName: existing.lastName,
      email: existing.email,
      phone: existing.phone,
      employeeId: existing.employeeId,
      businessUnit: (existing as any).businessUnit ?? '',
      departmentId: existing.departmentId,
      designationId: existing.designationId,
      locationId: existing.locationId,
      joiningDate: existing.joiningDate?.slice(0, 10) ?? '',
      dateOfBirth: existing.dateOfBirth?.slice(0, 10) ?? '',
      gender: existing.gender,
    } : undefined,
  });

  const { mutate: save, isPending, error } = useApiMutation(
    (data: CreateStaffPayload) =>
      isEdit ? staffService.update(id!, data) : staffService.create(data),
    {
      invalidateKeys: [['staff']],
      onSuccess: (data: any) => {
        if (isEdit) navigate('/staff');
        else setCreatedStaff(data);
      },
    }
  );

  const onSubmit = (data: FormData) => {
    if (useCustomPosition && !customPosition.trim()) {
      setCustomPositionError('Please enter a position title');
      return;
    }
    setCustomPositionError('');
    const payload: any = { ...data, additionalUnits };
    if (useCustomPosition) {
      payload.customPosition = customPosition.trim();
      payload.designationId = undefined;
    }
    save(payload as CreateStaffPayload);
  };

  const toggleAdditionalUnit = (unit: string) => {
    setAdditionalUnits(prev =>
      prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
    );
  };

  // ── Success screen ──
  if (createdStaff) {
    const raw = createdStaff?.data ?? createdStaff;
    const staffId = raw?.employeeId || 'EMP-AUTO';
    const fullName = `${raw?.firstName || ''} ${raw?.lastName || ''}`.trim();
    const email = raw?.email || '';
    const department = raw?.department?.name || raw?.departmentName || '';
    const businessUnitDisplay = (raw as any)?.businessUnit || '';
    const role = raw?.role || raw?.roles?.[0] || 'Staff';
    const loginUrl = `${window.location.origin}/auth/login`;

    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Staff Added Successfully</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{fullName} has been added to the system.</p>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-5 mb-6 text-left space-y-3">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Staff Credentials</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Staff ID</span>
              <span className="font-mono font-bold text-lg text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 rounded-lg">{staffId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Full Name</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{fullName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Temporary Password</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">MaxHub@2025</span>
            </div>
            {businessUnitDisplay && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Business Unit</span>
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{businessUnitDisplay}</span>
              </div>
            )}
            {department && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Department</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{department}</span>
              </div>
            )}
            {(role || customPosition) && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Position / Role</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{customPosition || role}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Login URL</span>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 break-all">{loginUrl}</span>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Welcome Email Sent</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              A welcome email with Staff ID <strong>{staffId}</strong>, temporary password, department, role, and login link has been sent to <strong>{email}</strong>. Staff should change their password upon first login.
            </p>
          </div>

          <Button onClick={() => navigate('/staff')} className="w-full">Go to Staff List</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {isEdit ? 'Edit Staff Member' : 'Add Staff Member'}
      </h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="First Name" error={errors.firstName?.message}>
            <Input placeholder="John" {...register('firstName')} disabled={isPending} />
          </FormField>
          <FormField label="Last Name" error={errors.lastName?.message}>
            <Input placeholder="Doe" {...register('lastName')} disabled={isPending} />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="john@company.com" {...register('email')} disabled={isPending} />
          </FormField>
          <FormField label="Phone" error={errors.phone?.message}>
            <Input placeholder="+234..." {...register('phone')} disabled={isPending} />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Employee ID" error={errors.employeeId?.message}>
            <Input placeholder="Auto-generated if blank" {...register('employeeId')} disabled={isPending} />
          </FormField>
          <FormField label="Gender" error={errors.gender?.message}>
            <select {...register('gender')} disabled={isPending}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700">
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </FormField>
        </div>

        {/* Business Unit */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
            <Building2 className="h-4 w-4" />
            <p className="text-sm font-semibold">Business Unit Assignment</p>
          </div>
          <FormField label="Primary Business Unit *" error={errors.businessUnit?.message}>
            <select {...register('businessUnit')} disabled={isPending}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select business unit</option>
              {BUSINESS_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </FormField>
          {/* Multi-unit access — CEO only */}
          {isCEO && (
            <div>
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">Additional Unit Access (CEO only)</p>
              <div className="grid grid-cols-2 gap-2">
                {BUSINESS_UNITS.map(u => (
                  <label key={u} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={additionalUnits.includes(u)}
                      onChange={() => toggleAdditionalUnit(u)}
                      className="w-4 h-4 accent-indigo-600" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{u}</span>
                  </label>
                ))}
              </div>
              {additionalUnits.length > 0 && (
                <p className="text-xs text-indigo-500 mt-1">
                  Additional access granted to: {additionalUnits.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Department — uses fallback if API unavailable */}
          <FormField label="Department *" error={errors.departmentId?.message}>
            <select {...register('departmentId')} disabled={isPending}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700">
              <option value="">Select department</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </FormField>

          {/* Position — dropdown + custom entry */}
          <FormField label="Position / Role" error={customPositionError || errors.designationId?.message}>
            {useCustomPosition ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={customPosition}
                  onChange={e => { setCustomPosition(e.target.value); setCustomPositionError(''); }}
                  placeholder="e.g. Creative Director"
                  className="w-full border border-indigo-300 dark:border-indigo-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isPending}
                />
                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {COMMON_POSITIONS.map(p => (
                    <button key={p} type="button"
                      onClick={() => setCustomPosition(p)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                      {p}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => { setUseCustomPosition(false); setCustomPosition(''); }}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline">
                  ← Use designation list instead
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <select {...register('designationId')} disabled={isPending}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700">
                  <option value="">Select position</option>
                  {designations.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setUseCustomPosition(true)}
                  className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200">
                  <PlusCircle className="h-3 w-3" /> Create custom position
                </button>
              </div>
            )}
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Joining Date" error={errors.joiningDate?.message}>
            <Input type="date" {...register('joiningDate')} disabled={isPending} />
          </FormField>
          <FormField label="Date of Birth" error={errors.dateOfBirth?.message}>
            <Input type="date" {...register('dateOfBirth')} disabled={isPending} />
          </FormField>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Staff')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/staff')}>Cancel</Button>
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
