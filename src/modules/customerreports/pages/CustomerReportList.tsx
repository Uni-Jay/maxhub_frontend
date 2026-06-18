import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Search, ChevronDown, ChevronUp, X, Send,
  CheckCircle2, XCircle, Clock, AlertCircle, Eye, Download,
  User, Phone, Mail, DollarSign, StickyNote, Loader2,
} from 'lucide-react';
import { useAuthStore } from '@store/authStore';
import { apiClient } from '@services/apiClient';
import CloudinaryUpload from '@components/ui/CloudinaryUpload';
import type { CloudinaryUploadResult } from '@services/cloudinaryService';
import { cn } from '@utils/cn';

type ApprovalStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Revision Requested' | 'Archived';

const BUSINESS_UNITS = ['VisaMax Travels Ltd', 'Kurios SAT Training School', 'Kurios SAT Tech', 'Beadmax Design', 'Beadmax Vocational School'] as const;
type BusinessUnit = typeof BUSINESS_UNITS[number];

const UNIT_LOGO: Record<BusinessUnit, string> = {
  'VisaMax Travels Ltd': '/images/visamax_logo.jpeg',
  'Kurios SAT Training School': '/images/kuriossatlogo.jpeg',
  'Kurios SAT Tech': '/images/kuriossatlogo.jpeg',
  'Beadmax Design': '/images/beadmaxlogo.jpeg',
  'Beadmax Vocational School': '/images/beadmaxlogo.jpeg',
};

const UNIT_COLOR: Record<BusinessUnit, string> = {
  'VisaMax Travels Ltd': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'Kurios SAT Training School': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'Kurios SAT Tech': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Beadmax Design': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Beadmax Vocational School': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  Draft:               'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Submitted:           'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Under Review':      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Approved:            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Rejected:            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Revision Requested': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Archived:            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

interface Note { date: string; text: string; author: string }
interface Payment { date: string; amount: number; description: string }

interface CustomerReport {
  id: number;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  assignedStaff?: string;
  servicePurchased: string;
  department?: string;
  businessUnit: BusinessUnit;
  currentStatus: string;
  pendingActions?: string;
  completedActions?: string;
  totalAmount?: number;
  amountPaid?: number;
  outstandingBalance?: number;
  notes: Note[];
  payments: Payment[];
  attachments: CloudinaryUploadResult[];
  approvalStatus: ApprovalStatus;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  revisionNote?: string;
  createdAt: string;
}


const INIT_FORM = {
  clientName: '', clientPhone: '', clientEmail: '',
  assignedStaff: '', servicePurchased: '', department: '',
  businessUnit: '' as BusinessUnit | '',
  currentStatus: '', pendingActions: '', completedActions: '',
  totalAmount: '', amountPaid: '', outstandingBalance: '',
  noteText: '',
};

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400';
const fmtN = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`;

export default function CustomerReportList() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isCEO = user?.roles?.includes('superadmin') ?? false;
  const isManager = isCEO || (user?.roles?.some(r => ['hr', 'hod', 'admin'].includes(r)) ?? false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | ''>('');
  const [unitFilter, setUnitFilter] = useState<BusinessUnit | ''>(
    isCEO ? '' : ((user?.businessUnit as BusinessUnit | undefined) ?? '')
  );
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<CustomerReport | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [attachments, setAttachments] = useState<CloudinaryUploadResult[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'financials' | 'attachments'>('details');
  const [actionReason, setActionReason] = useState('');
  const [actionTarget, setActionTarget] = useState<{ id: number; action: 'approve' | 'reject' | 'revision' | 'archive' } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-reports', { statusFilter }],
    queryFn: async () => {
      try { return await apiClient.get('/customer-reports', { params: { status: statusFilter || undefined } } as any); }
      catch { return []; }
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post('/customer-reports', payload).catch(() => ({ ...payload, id: Date.now() })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-reports'] }); closeModal(); },
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/customer-reports/${id}/submit`).catch(() => ({ id, approvalStatus: 'Submitted' })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-reports'] }),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: string; reason?: string }) =>
      apiClient.patch(`/customer-reports/${id}/${action}`, { reason }).catch(() => ({ id, action })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-reports'] }); setActionTarget(null); setActionReason(''); },
  });

  const reports: CustomerReport[] = Array.isArray(data) ? data : (data as any)?.data || [];

  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    const mq = !q || r.clientName.toLowerCase().includes(q) || r.servicePurchased.toLowerCase().includes(q);
    const ms = !statusFilter || r.approvalStatus === statusFilter;
    const mu = !unitFilter || r.businessUnit === unitFilter;
    const myUnit = user?.businessUnit as BusinessUnit | undefined;
    const myAdditional = (user as any)?.additionalUnits as string[] | undefined;
    const canSee = isCEO || !myUnit || r.businessUnit === myUnit || (myAdditional?.includes(r.businessUnit) ?? false);
    return mq && ms && mu && canSee;
  });

  const openCreate = () => {
    const defaultUnit = (user?.businessUnit as BusinessUnit | undefined) ?? '';
    setForm({ ...INIT_FORM, businessUnit: defaultUnit });
    setAttachments([]); setEditItem(null); setShowModal(true); setActiveTab('details');
  };
  const openEdit = (r: CustomerReport) => {
    setForm({ clientName: r.clientName, clientPhone: r.clientPhone || '', clientEmail: r.clientEmail || '', assignedStaff: r.assignedStaff || '', servicePurchased: r.servicePurchased, department: r.department || '', businessUnit: r.businessUnit, currentStatus: r.currentStatus, pendingActions: r.pendingActions || '', completedActions: r.completedActions || '', totalAmount: String(r.totalAmount || ''), amountPaid: String(r.amountPaid || ''), outstandingBalance: String(r.outstandingBalance || ''), noteText: '' });
    setAttachments(r.attachments || []);
    setEditItem(r); setShowModal(true); setActiveTab('details');
  };
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(INIT_FORM); setAttachments([]); };

  const handleSave = (asDraft: boolean) => {
    if (!form.clientName || !form.servicePurchased) return;
    const payload = {
      ...form,
      department: form.businessUnit || form.department,
      attachments,
      approvalStatus: asDraft ? 'Draft' : 'Submitted',
      totalAmount: Number(form.totalAmount) || 0,
      amountPaid: Number(form.amountPaid) || 0,
      outstandingBalance: Number(form.outstandingBalance) || 0,
      submittedBy: `${user?.firstName} ${user?.lastName}`,
    };
    createMutation.mutate(payload);
  };

  const handleAction = () => {
    if (!actionTarget) return;
    actionMutation.mutate({ id: actionTarget.id, action: actionTarget.action, reason: actionReason });
  };

  const setF = (k: keyof typeof INIT_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track client activities, progress and financials</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition">
          <Plus className="h-4 w-4" /> New Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: reports.length, cls: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' },
          { label: 'Pending Review', value: reports.filter(r => r.approvalStatus === 'Submitted').length, cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
          { label: 'Approved', value: reports.filter(r => r.approvalStatus === 'Approved').length, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
          { label: 'Needs Revision', value: reports.filter(r => r.approvalStatus === 'Revision Requested').length, cls: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-2xl border border-gray-100 dark:border-gray-700 p-4', s.cls.split(' ').slice(0, 2).join(' '))}>
            <p className={cn('text-2xl font-bold', s.cls.split(' ').slice(2).join(' '))}>{s.value}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, service…"
            className={cn(inputCls, 'pl-9')} />
        </div>
        {isCEO && (
          <select value={unitFilter} onChange={e => setUnitFilter(e.target.value as BusinessUnit | '')}
            className={cn(inputCls, 'w-auto')}>
            <option value="">All Business Units</option>
            {BUSINESS_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ApprovalStatus | '')}
          className={cn(inputCls, 'w-auto')}>
          <option value="">All Statuses</option>
          {(Object.keys(STATUS_STYLE) as ApprovalStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No customer reports found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
          {filtered.map((report, i) => (
            <motion.div key={report.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition cursor-pointer"
                onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}>
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                  {report.businessUnit && UNIT_LOGO[report.businessUnit]
                    ? <img src={UNIT_LOGO[report.businessUnit]} alt={report.businessUnit} className="w-10 h-10 object-cover" />
                    : <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{report.clientName}</p>
                    {report.businessUnit && (
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', UNIT_COLOR[report.businessUnit])}>
                        {report.businessUnit}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{report.servicePurchased}</p>
                </div>
                {report.outstandingBalance !== undefined && report.outstandingBalance > 0 && (
                  <div className="hidden md:block text-right">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Outstanding</p>
                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{fmtN(report.outstandingBalance)}</p>
                  </div>
                )}
                <div className="hidden lg:block text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Staff</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{report.assignedStaff || '—'}</p>
                </div>
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0', STATUS_STYLE[report.approvalStatus])}>
                  {report.approvalStatus}
                </span>
                {/* Quick actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {report.approvalStatus === 'Draft' && (
                    <button onClick={e => { e.stopPropagation(); submitMutation.mutate(report.id); }}
                      className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition font-medium">
                      <Send className="h-3 w-3" /> Submit
                    </button>
                  )}
                  {isManager && report.approvalStatus === 'Submitted' && (
                    <>
                      <button onClick={e => { e.stopPropagation(); setActionTarget({ id: report.id, action: 'approve' }); }}
                        className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg transition">
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </button>
                      <button onClick={e => { e.stopPropagation(); setActionTarget({ id: report.id, action: 'reject' }); }}
                        className="flex items-center gap-1 text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-lg transition">
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                    </>
                  )}
                  <button onClick={e => { e.stopPropagation(); openEdit(report); }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
                {expandedId === report.id ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
              </div>

              <AnimatePresence>
                {expandedId === report.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-5 py-4 bg-indigo-50/40 dark:bg-indigo-900/10 border-b border-gray-100 dark:border-gray-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <QuickCell icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={report.clientPhone || '—'} />
                        <QuickCell icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={report.clientEmail || '—'} />
                        <QuickCell icon={<DollarSign className="h-3.5 w-3.5" />} label="Total Amount" value={report.totalAmount ? fmtN(report.totalAmount) : '—'} />
                        <QuickCell icon={<DollarSign className="h-3.5 w-3.5" />} label="Amount Paid" value={report.amountPaid ? fmtN(report.amountPaid) : '—'} />
                        <div className="col-span-2 md:col-span-4">
                          <QuickCell icon={<Clock className="h-3.5 w-3.5" />} label="Current Status" value={report.currentStatus} />
                        </div>
                        {report.pendingActions && <div className="col-span-2 md:col-span-4">
                          <QuickCell icon={<AlertCircle className="h-3.5 w-3.5" />} label="Pending Actions" value={report.pendingActions} />
                        </div>}
                        {report.notes.length > 0 && (
                          <div className="col-span-2 md:col-span-4 space-y-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</p>
                            {report.notes.slice(0, 2).map((n, ni) => (
                              <div key={ni} className="flex items-start gap-2 text-xs">
                                <StickyNote className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700 dark:text-gray-300">{n.date} — {n.text} <span className="text-gray-400">({n.author})</span></span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Approval history */}
                      {(report.submittedBy || report.approvedBy) && (
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          {report.submittedBy && <span>Submitted by <b className="text-gray-700 dark:text-gray-300">{report.submittedBy}</b> on {report.submittedAt}</span>}
                          {report.approvedBy && <span>Approved by <b className="text-gray-700 dark:text-gray-300">{report.approvedBy}</b> on {report.approvedAt}</span>}
                          {report.rejectionReason && <span className="text-red-500">Rejected: {report.rejectionReason}</span>}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Action confirmation modal */}
      <AnimatePresence>
        {actionTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 capitalize">
                {actionTarget.action === 'approve' ? '✓ Approve Report' : actionTarget.action === 'reject' ? '✗ Reject Report' : actionTarget.action === 'revision' ? '↺ Request Revision' : 'Archive Report'}
              </h3>
              {actionTarget.action !== 'approve' && (
                <textarea value={actionReason} onChange={e => setActionReason(e.target.value)} rows={3}
                  placeholder={actionTarget.action === 'reject' ? 'Reason for rejection…' : actionTarget.action === 'revision' ? 'What needs to be revised…' : 'Archive reason (optional)…'}
                  className={cn(inputCls, 'resize-none mb-4')} />
              )}
              <div className="flex gap-3">
                <button onClick={() => { setActionTarget(null); setActionReason(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  Cancel
                </button>
                <button onClick={handleAction} disabled={actionMutation.isPending}
                  className={cn('flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition',
                    actionTarget.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700')}>
                  {actionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editItem ? `${editItem.clientName} — Report` : 'New Customer Report'}
                </h3>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 px-6 pt-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                {(['details', 'activity', 'financials', 'attachments'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={cn('px-3 py-2 text-xs font-semibold rounded-t-lg capitalize transition border-b-2',
                      activeTab === t ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto flex-1 p-6 space-y-4">
                {activeTab === 'details' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <MField label="Client Name *"><input value={form.clientName} onChange={setF('clientName')} placeholder="Full name" className={inputCls} /></MField>
                      <MField label="Phone"><input value={form.clientPhone} onChange={setF('clientPhone')} placeholder="+234…" className={inputCls} /></MField>
                      <MField label="Email"><input value={form.clientEmail} onChange={setF('clientEmail')} placeholder="client@email.com" className={inputCls} /></MField>
                      <MField label="Assigned Staff"><input value={form.assignedStaff} onChange={setF('assignedStaff')} placeholder="Staff member name" className={inputCls} /></MField>
                      <MField label="Service Purchased *"><input value={form.servicePurchased} onChange={setF('servicePurchased')} placeholder="e.g. UK Study Visa" className={inputCls} /></MField>
                      <MField label="Business Unit *">
                        <select value={form.businessUnit} onChange={setF('businessUnit')} className={inputCls}>
                          <option value="">Select unit…</option>
                          {BUSINESS_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </MField>
                    </div>
                    <MField label="Current Status">
                      <textarea value={form.currentStatus} onChange={setF('currentStatus')} rows={2} placeholder="Current state of the application / project" className={cn(inputCls, 'resize-none')} />
                    </MField>
                    <div className="grid grid-cols-2 gap-4">
                      <MField label="Pending Actions">
                        <textarea value={form.pendingActions} onChange={setF('pendingActions')} rows={2} placeholder="What is still outstanding" className={cn(inputCls, 'resize-none')} />
                      </MField>
                      <MField label="Completed Actions">
                        <textarea value={form.completedActions} onChange={setF('completedActions')} rows={2} placeholder="What has been done" className={cn(inputCls, 'resize-none')} />
                      </MField>
                    </div>
                  </>
                )}

                {activeTab === 'activity' && (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Add an interaction note</p>
                    <MField label="Note">
                      <textarea value={form.noteText} onChange={setF('noteText')} rows={3} placeholder="Enter note or interaction update…" className={cn(inputCls, 'resize-none')} />
                    </MField>
                    {(editItem?.notes?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Previous Notes</p>
                        {editItem?.notes.map((n, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                              <span>{n.author}</span><span>{n.date}</span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{n.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'financials' && (
                  <div className="grid grid-cols-3 gap-4">
                    <MField label="Total Amount (₦)"><input type="number" value={form.totalAmount} onChange={setF('totalAmount')} placeholder="0" className={inputCls} /></MField>
                    <MField label="Amount Paid (₦)"><input type="number" value={form.amountPaid} onChange={setF('amountPaid')} placeholder="0" className={inputCls} /></MField>
                    <MField label="Outstanding (₦)"><input type="number" value={form.outstandingBalance} onChange={setF('outstandingBalance')} placeholder="0" className={inputCls} /></MField>
                    {(editItem?.payments?.length ?? 0) > 0 && (
                      <div className="col-span-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Payment History</p>
                        {editItem?.payments.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{p.description}</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtN(p.amount)}</span>
                            <span className="text-gray-400 text-xs">{p.date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'attachments' && (
                  <CloudinaryUpload folder="maxhub-erp/customer-reports" onUpload={files => setAttachments(prev => [...prev, ...files])}
                    label="Upload Supporting Documents" />
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                <button onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  Cancel
                </button>
                <button onClick={() => handleSave(true)} disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <Download className="h-4 w-4" /> Save Draft
                </button>
                <button onClick={() => handleSave(false)} disabled={createMutation.isPending || !form.clientName || !form.servicePurchased}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit for Review
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-0.5">
        <span className="text-gray-400">{icon}</span>{label}
      </p>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
