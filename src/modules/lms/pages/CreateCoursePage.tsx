import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, BookOpen } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useAuth } from '@/contexts/AuthContext';

const STATUSES = ['Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled', 'Archived'];

export function CreateCoursePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user } = useAuth();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '', courseCode: '', description: '', instructorName: '',
    duration: '', fee: '0', startDate: '', endDate: '',
    certificateRequired: false, passingScore: '70',
    maxParticipants: '', minParticipants: '', status: 'Draft',
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['courses', id],
    queryFn: () => apiClient.get<any>(`/courses/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      title: existing.title ?? '',
      courseCode: existing.courseCode ?? '',
      description: existing.description ?? '',
      instructorName: existing.instructorName ?? '',
      duration: String(existing.duration ?? ''),
      fee: String(existing.fee ?? '0'),
      startDate: existing.startDate?.slice(0, 10) ?? '',
      endDate: existing.endDate?.slice(0, 10) ?? '',
      certificateRequired: !!existing.certificateRequired,
      passingScore: String(existing.passingScore ?? '70'),
      maxParticipants: existing.maxParticipants != null ? String(existing.maxParticipants) : '',
      minParticipants: existing.minParticipants != null ? String(existing.minParticipants) : '',
      status: existing.status ?? 'Draft',
    });
  }, [existing]);

  useEffect(() => {
    if (!isEdit && !form.courseCode && form.title) {
      const code = form.title.trim().slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      setForm(f => ({ ...f, courseCode: f.courseCode || `${code}-${Date.now().toString().slice(-4)}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

  const payload = {
    title: form.title,
    courseCode: form.courseCode,
    description: form.description || undefined,
    instructorName: form.instructorName,
    duration: Number(form.duration),
    fee: Number(form.fee) || 0,
    startDate: form.startDate,
    endDate: form.endDate || undefined,
    certificateRequired: form.certificateRequired,
    passingScore: Number(form.passingScore) || undefined,
    maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
    minParticipants: form.minParticipants ? Number(form.minParticipants) : undefined,
    ...(isEdit ? { status: form.status } : {}),
  };

  const saveMutation = useMutation({
    mutationFn: () => isEdit ? apiClient.put(`/courses/${id}`, payload) : apiClient.post('/courses', payload),
    onSuccess: (course: any) => {
      navigate(`/lms/courses/${course.uuid ?? course.id ?? id}`, { replace: true });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err?.message || `Failed to ${isEdit ? 'update' : 'create'} course`);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.courseCode || !form.instructorName || !form.duration || !form.startDate) {
      setError('Title, course code, instructor, duration and start date are required.');
      return;
    }
    saveMutation.mutate();
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/lms/courses" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Course' : 'New Course'}</h1>
          <p className="text-sm text-gray-500">
            {isEdit ? 'Update course details' : (user?.departmentId ? 'Created for your department' : 'Create a new course')}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Course Title *</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Course Code *</label>
            <input
              value={form.courseCode}
              onChange={e => setForm(f => ({ ...f, courseCode: e.target.value.toUpperCase() }))}
              className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Instructor *</label>
            <input
              value={form.instructorName}
              onChange={e => setForm(f => ({ ...f, instructorName: e.target.value }))}
              placeholder="Instructor's full name"
              className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Duration (hours) *</label>
            <input
              type="number" min={1}
              value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Fee (₦)</label>
            <input
              type="number" min={0}
              value={form.fee}
              onChange={e => setForm(f => ({ ...f, fee: e.target.value }))}
              className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Start Date *</label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Passing Score (%)</label>
            <input
              type="number" min={0} max={100}
              value={form.passingScore}
              onChange={e => setForm(f => ({ ...f, passingScore: e.target.value }))}
              className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Min Participants</label>
            <input
              type="number" min={0}
              value={form.minParticipants}
              onChange={e => setForm(f => ({ ...f, minParticipants: e.target.value }))}
              className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Max Participants</label>
            <input
              type="number" min={0}
              value={form.maxParticipants}
              onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value }))}
              className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {isEdit && (
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.certificateRequired}
            onChange={e => setForm(f => ({ ...f, certificateRequired: e.target.checked }))}
            className="rounded border-gray-300"
          />
          Award a certificate on completion
        </label>

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saveMutation.isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Course')}
        </button>
      </form>
    </div>
  );
}

export default CreateCoursePage;
