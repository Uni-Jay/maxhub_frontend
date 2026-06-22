import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, Plus, Search, Clock, Users, MapPin,
  ChevronRight, DollarSign, ToggleRight, X, Check, Pencil, Trash2,
} from 'lucide-react';
import { hrService, type JobPosting, type BusinessUnitCode, BUSINESS_UNIT_LABELS } from '@services/hrService';
import { departmentService } from '@services/departmentService';

const errMsg = (error: unknown): string =>
  (error as any)?.response?.data?.message || (error as any)?.message || 'Something went wrong';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Open: 'bg-green-100 text-green-700',
  Closed: 'bg-red-100 text-red-700',
  OnHold: 'bg-yellow-100 text-yellow-700',
  Filled: 'bg-blue-100 text-blue-700',
};

const TYPE_COLORS: Record<string, string> = {
  'Full-time': 'bg-indigo-100 text-indigo-700',
  'Part-time': 'bg-violet-100 text-violet-700',
  Contract: 'bg-amber-100 text-amber-700',
  Temporary: 'bg-orange-100 text-orange-700',
  Internship: 'bg-teal-100 text-teal-700',
};

const INITIAL_FORM = {
  title: '', departmentId: '', noOfPositions: 1,
  jobType: 'Full-time' as 'Contract' | 'Full-time' | 'Part-time' | 'Temporary' | 'Internship', salaryMin: '', salaryMax: '', location: '',
  requiredExperience: '', qualifications: '', skills: '', benefits: '',
  description: '', postedDate: new Date().toISOString().split('T')[0],
  closingDate: '', businessUnit: '' as BusinessUnitCode | '',
};

export default function JobPostingsList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(INITIAL_FORM); };

  const openEdit = (job: JobPosting) => {
    setEditingId(job.id);
    setForm({
      title: job.title,
      departmentId: String(job.departmentId),
      noOfPositions: job.noOfPositions,
      jobType: job.jobType,
      salaryMin: job.salaryMin != null ? String(job.salaryMin) : '',
      salaryMax: job.salaryMax != null ? String(job.salaryMax) : '',
      location: job.location || '',
      requiredExperience: job.requiredExperience || '',
      qualifications: job.qualifications || '',
      skills: job.skills || '',
      benefits: job.benefits || '',
      description: job.description || '',
      postedDate: job.postedDate?.slice(0, 10) || '',
      closingDate: job.closingDate?.slice(0, 10) || '',
      businessUnit: job.businessUnit || '',
    });
    setShowModal(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['job-postings', { search, statusFilter, page }],
    queryFn: () => hrService.getJobPostings({ page, limit: 12, search: search || undefined, status: statusFilter || undefined }),
  });

  const { data: stats } = useQuery({
    queryKey: ['job-postings-stats'],
    queryFn: () => hrService.getJobPostingStats(),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => hrService.createJobPosting({
      ...payload, departmentId: Number(payload.departmentId),
      noOfPositions: Number(payload.noOfPositions),
      salaryMin: payload.salaryMin ? Number(payload.salaryMin) : undefined,
      salaryMax: payload.salaryMax ? Number(payload.salaryMax) : undefined,
      businessUnit: payload.businessUnit as BusinessUnitCode,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-postings'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: typeof form) => hrService.updateJobPosting(editingId!, {
      title: payload.title, description: payload.description,
      noOfPositions: Number(payload.noOfPositions), jobType: payload.jobType,
      salaryMin: payload.salaryMin ? Number(payload.salaryMin) : undefined,
      salaryMax: payload.salaryMax ? Number(payload.salaryMax) : undefined,
      location: payload.location, requiredExperience: payload.requiredExperience,
      qualifications: payload.qualifications, skills: payload.skills, benefits: payload.benefits,
      closingDate: payload.closingDate, businessUnit: payload.businessUnit as BusinessUnitCode,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-postings'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => hrService.deleteJobPosting(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-postings'] }); qc.invalidateQueries({ queryKey: ['job-postings-stats'] }); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => hrService.updateJobPostingStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-postings'] }),
  });

  const handleDelete = (job: JobPosting) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(job.id);
  };

  const postings: JobPosting[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination;
  const statsData = (stats as any)?.data;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Postings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage open positions and recruitment</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New Job Posting
        </button>
      </div>

      {/* Stats */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: statsData.total, color: 'from-gray-500 to-gray-600' },
            { label: 'Open', value: statsData.open, color: 'from-green-500 to-emerald-600' },
            { label: 'On Hold', value: statsData.onHold ?? 0, color: 'from-yellow-500 to-amber-600' },
            { label: 'Closed', value: statsData.closed, color: 'from-red-500 to-rose-600' },
            { label: 'Filled', value: statsData.filled, color: 'from-blue-500 to-indigo-600' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white`}
            >
              <p className="text-white/70 text-xs">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search job titles..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {['Draft', 'Open', 'Closed', 'OnHold', 'Filled'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {(statusMutation.isError || deleteMutation.isError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-2.5">
          {errMsg(statusMutation.error || deleteMutation.error)}
        </div>
      )}

      {/* Postings Grid */}
      {postings.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No job postings found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {postings.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{job.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{job.jobCode}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[job.status] || 'bg-gray-100'}`}>
                  {job.status}
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                {job.businessUnit && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <Briefcase className="h-3.5 w-3.5 text-gray-400" /> {BUSINESS_UNIT_LABELS[job.businessUnit]}
                    {job.syncStatus && (
                      <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        job.syncStatus === 'Synced' ? 'bg-green-100 text-green-700'
                          : job.syncStatus === 'Failed' ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {job.syncStatus}
                      </span>
                    )}
                  </div>
                )}
                {job.department && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <Users className="h-3.5 w-3.5 text-gray-400" /> {job.department.name}
                  </div>
                )}
                {job.location && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" /> {job.location}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <Clock className="h-3.5 w-3.5 text-gray-400" /> Closes {new Date(job.closingDate).toLocaleDateString()}
                </div>
                {(job.salaryMin || job.salaryMax) && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                    {job.salaryMin ? `₦${Number(job.salaryMin).toLocaleString()}` : ''}{job.salaryMin && job.salaryMax ? ' – ' : ''}{job.salaryMax ? `₦${Number(job.salaryMax).toLocaleString()}` : ''}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[job.jobType] || 'bg-gray-100 text-gray-600'}`}>
                  {job.jobType}
                </span>
                <div className="flex items-center gap-2">
                  {job.status === 'Draft' && (
                    <button
                      onClick={() => statusMutation.mutate({ id: job.id, status: 'Open' })}
                      className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                    >
                      <ToggleRight className="h-3.5 w-3.5" /> Open
                    </button>
                  )}
                  {job.status === 'Open' && (
                    <button
                      onClick={() => statusMutation.mutate({ id: job.id, status: 'Closed' })}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Close
                    </button>
                  )}
                  <button onClick={() => openEdit(job)} className="p-1 text-gray-400 hover:text-indigo-600 transition" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {job.status === 'Draft' && (
                    <button onClick={() => handleDelete(job)} className="p-1 text-gray-400 hover:text-red-600 transition" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Prev</button>
          <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Next</button>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? 'Edit Job Posting' : 'New Job Posting'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Job Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Department *</label>
                  <select disabled={!!editingId} value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                    <option value="">Select department</option>
                    {(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  {editingId && <p className="text-[11px] text-gray-400 mt-0.5">Department can't be changed after creation</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Business Unit *</label>
                  <select value={form.businessUnit} onChange={e => setForm(f => ({ ...f, businessUnit: e.target.value as BusinessUnitCode | '' }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select business unit</option>
                    {(Object.entries(BUSINESS_UNIT_LABELS) as [BusinessUnitCode, string][]).map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Positions *</label>
                  <input type="number" min={1} value={form.noOfPositions} onChange={e => setForm(f => ({ ...f, noOfPositions: Number(e.target.value) }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Job Type *</label>
                  <select value={form.jobType} onChange={e => setForm(f => ({ ...f, jobType: e.target.value as typeof INITIAL_FORM['jobType'] }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Salary Min (₦)</label>
                  <input type="number" value={form.salaryMin} onChange={e => setForm(f => ({ ...f, salaryMin: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Salary Max (₦)</label>
                  <input type="number" value={form.salaryMax} onChange={e => setForm(f => ({ ...f, salaryMax: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Posted Date *</label>
                  <input disabled={!!editingId} type="date" value={form.postedDate} onChange={e => setForm(f => ({ ...f, postedDate: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Closing Date *</label>
                  <input type="date" value={form.closingDate} onChange={e => setForm(f => ({ ...f, closingDate: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Required Skills</label>
                  <input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="e.g. React, Node.js, SQL" className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              {(createMutation.isError || updateMutation.isError) && (
                <p className="text-red-500 text-xs mt-3">{errMsg(createMutation.error || updateMutation.error)}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">Cancel</button>
              <button
                onClick={() => editingId ? updateMutation.mutate(form) : createMutation.mutate(form)}
                disabled={createMutation.isPending || updateMutation.isPending || !form.title || !form.departmentId || !form.closingDate || !form.businessUnit}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? 'Save Changes' : 'Create Posting'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
