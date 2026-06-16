import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentPortalApi, StudentProfile } from '@/services/studentService';
import { useAuth } from '@/contexts/AuthContext';
import { User, Phone, MapPin, Calendar, Shield, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Field: React.FC<{
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ label, icon: Icon, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow';

const roInputCls =
  'w-full px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed';

type FormData = {
  gender: string;
  dateOfBirth: string;
  address: string;
  state: string;
  bio: string;
  emergencyContact: string;
  emergencyPhone: string;
};

export const StudentProfilePage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['student-portal-profile'],
    queryFn: () => studentPortalApi.getProfile().then((r: any) => r.data?.data as StudentProfile),
  });

  const [form, setForm] = useState<FormData>({
    gender: '',
    dateOfBirth: '',
    address: '',
    state: '',
    bio: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  useEffect(() => {
    if (data) {
      setForm({
        gender:           data.gender         || '',
        dateOfBirth:      data.dateOfBirth    || '',
        address:          (data as any).address        || '',
        state:            (data as any).state          || '',
        bio:              (data as any).bio            || '',
        emergencyContact: (data as any).emergencyContact || '',
        emergencyPhone:   (data as any).emergencyPhone   || '',
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: FormData) => studentPortalApi.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-portal-profile'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          View and update your personal information
        </p>
      </div>

      {/* Avatar + student info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-xl font-bold">{user?.firstName} {user?.lastName}</p>
            <p className="text-violet-200 text-sm">{user?.email}</p>
            {data?.studentNumber && (
              <p className="text-violet-300 text-xs mt-1">Student No: {data.studentNumber}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Program',  value: data?.program?.name || '–' },
            { label: 'Level',    value: data?.program?.level || '–' },
            { label: 'Status',   value: data?.status || '–' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-xl p-3">
              <p className="text-violet-200 text-xs">{label}</p>
              <p className="text-white font-semibold text-sm mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Editable form */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-5"
      >
        <h2 className="font-semibold text-gray-900 dark:text-white">Personal Information</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="First Name" icon={User}>
            <input className={roInputCls} value={user?.firstName || ''} readOnly />
          </Field>
          <Field label="Last Name" icon={User}>
            <input className={roInputCls} value={user?.lastName || ''} readOnly />
          </Field>
        </div>

        <Field label="Email Address" icon={Shield}>
          <input className={roInputCls} value={user?.email || ''} readOnly />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Gender" icon={User}>
            <select
              value={form.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className={inputCls}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Date of Birth" icon={Calendar}>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Home Address" icon={MapPin}>
          <input
            type="text"
            placeholder="Enter your address"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="State / City" icon={MapPin}>
          <input
            type="text"
            placeholder="Enter your state or city"
            value={form.state}
            onChange={(e) => handleChange('state', e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Bio" icon={User}>
          <textarea
            rows={3}
            placeholder="Tell us a little about yourself..."
            value={form.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Emergency Contact</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Contact Name" icon={User}>
              <input
                type="text"
                placeholder="Guardian or emergency contact"
                value={form.emergencyContact}
                onChange={(e) => handleChange('emergencyContact', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Contact Phone" icon={Phone}>
              <input
                type="tel"
                placeholder="+234 xxx xxx xxxx"
                value={form.emergencyPhone}
                onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
          >
            <Save className="h-4 w-4" />
            Profile updated successfully!
          </motion.div>
        )}

        {mutation.error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            Failed to update profile. Please try again.
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </motion.form>
    </div>
  );
};

export default StudentProfilePage;
