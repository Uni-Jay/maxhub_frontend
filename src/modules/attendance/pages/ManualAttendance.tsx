import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle2 } from 'lucide-react';
import { staffService } from '@services/staffService';
import { attendanceManagementService } from '@services/attendanceManagementService';

const errMsg = (error: unknown): string =>
  (error as any)?.response?.data?.message || (error as any)?.message || 'Something went wrong';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'HalfDay', 'OnLeave', 'Holiday', 'Weekend'];

const inputClass = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function ManualAttendance() {
  const [form, setForm] = useState({
    staffId: '',
    attendanceDate: new Date().toISOString().slice(0, 10),
    status: 'Present',
    checkInTime: '',
    checkOutTime: '',
    remarks: '',
  });
  const [success, setSuccess] = useState(false);

  const { data: staffData } = useQuery({
    queryKey: ['staff-picker'],
    queryFn: () => staffService.getAll({ limit: 500, status: 'Active' }),
  });
  const staffList = staffData?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => attendanceManagementService.manualMark({
      staffId: Number(form.staffId),
      attendanceDate: form.attendanceDate,
      status: form.status,
      checkInTime: form.checkInTime ? `${form.attendanceDate}T${form.checkInTime}:00` : undefined,
      checkOutTime: form.checkOutTime ? `${form.attendanceDate}T${form.checkOutTime}:00` : undefined,
      remarks: form.remarks || undefined,
    }),
    onSuccess: () => setSuccess(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    mutation.mutate();
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarCheck className="h-6 w-6 text-indigo-600" /> Mark Attendance
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Record or correct attendance for any staff member, any date — Super Admin only.
        </p>
      </div>

      {success && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Attendance recorded successfully.</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Staff *</label>
          <select required value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))} className={inputClass}>
            <option value="">Select staff member...</option>
            {staffList.map((s: any) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName}{s.employeeId ? ` (${s.employeeId})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
            <input required type="date" value={form.attendanceDate}
              onChange={e => setForm(f => ({ ...f, attendanceDate: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
            <select required value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Check-in Time</label>
            <input type="time" value={form.checkInTime}
              onChange={e => setForm(f => ({ ...f, checkInTime: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Check-out Time</label>
            <input type="time" value={form.checkOutTime}
              onChange={e => setForm(f => ({ ...f, checkOutTime: e.target.value }))} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
          <textarea rows={2} value={form.remarks}
            onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
            placeholder="Optional note about this attendance entry..." className={inputClass} />
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">{errMsg(mutation.error)}</p>
        )}

        <button type="submit" disabled={!form.staffId || mutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition">
          {mutation.isPending ? 'Saving...' : 'Save Attendance'}
        </button>
      </form>
    </div>
  );
}
