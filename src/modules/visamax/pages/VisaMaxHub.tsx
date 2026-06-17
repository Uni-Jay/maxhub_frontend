import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plane, Globe, GraduationCap, Hotel, Users, Briefcase, Umbrella,
  Shield, Car, FileText, X, Plus, Search, ChevronDown, ChevronUp,
  Calendar, Clock, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

// ─── Service types ──────────────────────────────────────────
type ServiceType =
  | 'Visa Processing'
  | 'Flight Booking'
  | 'Tourism Package'
  | 'Overseas Study'
  | 'Hotel Reservation'
  | 'Family Visa'
  | 'Business Travel'
  | 'Work Visa / Job Travel'
  | 'Holiday Package'
  | 'Immigration Consulting'
  | 'Travel Insurance'
  | 'Airport Pickup';

const SERVICES: { type: ServiceType; icon: React.FC<{className?:string}>; color: string; bg: string; desc: string }[] = [
  { type: 'Visa Processing',        icon: FileText,      color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20',  desc: 'Tourist, student, work & all visa categories' },
  { type: 'Flight Booking',         icon: Plane,         color: 'text-sky-600 dark:text-sky-400',     bg: 'bg-sky-50 dark:bg-sky-900/20',         desc: 'International & domestic flight reservations' },
  { type: 'Tourism Package',        icon: Globe,         color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', desc: 'Curated travel packages & tours' },
  { type: 'Overseas Study',         icon: GraduationCap, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', desc: 'Study abroad admission & visa support' },
  { type: 'Hotel Reservation',      icon: Hotel,         color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20',     desc: 'Accommodation worldwide' },
  { type: 'Family Visa',            icon: Users,         color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-50 dark:bg-rose-900/20',       desc: 'Family reunion & dependent visas' },
  { type: 'Business Travel',        icon: Briefcase,     color: 'text-slate-600 dark:text-slate-400',  bg: 'bg-slate-50 dark:bg-slate-900/20',     desc: 'Corporate travel arrangements' },
  { type: 'Work Visa / Job Travel', icon: Globe,         color: 'text-teal-600 dark:text-teal-400',   bg: 'bg-teal-50 dark:bg-teal-900/20',       desc: 'Employment visa & relocation support' },
  { type: 'Holiday Package',        icon: Umbrella,      color: 'text-pink-600 dark:text-pink-400',   bg: 'bg-pink-50 dark:bg-pink-900/20',       desc: 'Vacation packages & leisure travel' },
  { type: 'Immigration Consulting', icon: Shield,        color: 'text-cyan-600 dark:text-cyan-400',   bg: 'bg-cyan-50 dark:bg-cyan-900/20',       desc: 'Permanent residency & citizenship advice' },
  { type: 'Travel Insurance',       icon: Shield,        color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', desc: 'Comprehensive travel coverage' },
  { type: 'Airport Pickup',         icon: Car,           color: 'text-lime-600 dark:text-lime-400',   bg: 'bg-lime-50 dark:bg-lime-900/20',       desc: 'Arrival & departure transfers' },
];

type AppStatus = 'Pending' | 'Processing' | 'Awaiting Docs' | 'Approved' | 'Completed' | 'Rejected' | 'On Hold';

const STATUS_STYLE: Record<AppStatus, string> = {
  Pending:       'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  Processing:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Awaiting Docs': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Approved:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Completed:     'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Rejected:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'On Hold':     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

interface Application {
  id: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceType: ServiceType;
  destination: string;
  status: AppStatus;
  assignedTo?: string;
  applicationDate: string;
  processingDate?: string;
  expectedCompletion?: string;
  actualCompletion?: string;
  notes?: string;
}


const INIT_FORM = {
  clientName: '', clientPhone: '', clientEmail: '',
  serviceType: '' as ServiceType | '',
  destination: '',
  status: 'Pending' as AppStatus,
  assignedTo: '',
  applicationDate: new Date().toISOString().slice(0, 10),
  processingDate: '',
  expectedCompletion: '',
  actualCompletion: '',
  notes: '',
};

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400';

function DateRow({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input type="date" value={value} onChange={e => onChange(e.target.value)}
          className={cn(inputCls, 'pl-8')} />
      </div>
    </div>
  );
}

export default function VisaMaxHub() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState<ServiceType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AppStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Application | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [activeTab, setActiveTab] = useState<'applications' | 'services'>('applications');

  const { data, isLoading } = useQuery({
    queryKey: ['visamax-applications', { serviceFilter, statusFilter }],
    queryFn: () => apiClient.get('/visamax/applications', {
      params: { status: statusFilter || undefined },
    } as any),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof INIT_FORM) => apiClient.post('/visamax/applications', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visamax-applications'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Application> }) =>
      apiClient.put(`/visamax/applications/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visamax-applications'] }); closeModal(); },
  });

  const apps: Application[] = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const filtered = apps.filter(a => {
    const q = search.toLowerCase();
    const matchQ = !q || a.clientName.toLowerCase().includes(q) || a.destination.toLowerCase().includes(q) || a.serviceType.toLowerCase().includes(q);
    const matchS = !serviceFilter || a.serviceType === serviceFilter;
    const matchSt = !statusFilter || a.status === statusFilter;
    return matchQ && matchS && matchSt;
  });

  const openCreate = () => { setForm(INIT_FORM); setEditItem(null); setShowModal(true); };
  const openEdit = (app: Application) => {
    setForm({ clientName: app.clientName, clientPhone: app.clientPhone, clientEmail: app.clientEmail, serviceType: app.serviceType, destination: app.destination, status: app.status, assignedTo: app.assignedTo || '', applicationDate: app.applicationDate || '', processingDate: app.processingDate || '', expectedCompletion: app.expectedCompletion || '', actualCompletion: app.actualCompletion || '', notes: app.notes || '' });
    setEditItem(app); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(INIT_FORM); };

  const handleSave = () => {
    if (!form.clientName || !form.serviceType || !form.destination) return;
    if (editItem) updateMutation.mutate({ id: editItem.id, payload: form as Partial<Application> });
    else createMutation.mutate(form);
  };

  const setF = (key: keyof typeof INIT_FORM) => (val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <img src="/images/visamax_logo.jpeg" alt="VisaMax" className="h-9 w-9 rounded-xl object-contain bg-white border border-gray-200 dark:border-gray-700 p-0.5" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VisaMax Travels</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage visa applications, travel bookings & all services</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm">
          <Plus className="h-4 w-4" /> New Application
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: apps.length, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Processing', value: apps.filter(a => a.status === 'Processing').length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Completed', value: apps.filter(a => a.status === 'Completed').length, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Awaiting Docs', value: apps.filter(a => a.status === 'Awaiting Docs').length, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm', s.color.split(' ')[1])}>
            <p className={cn('text-2xl font-bold', s.color.split(' ')[0])}>{s.value}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {(['applications', 'services'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize',
              activeTab === tab ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'services' ? (
        /* Services Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map(({ type, icon: Icon, color, bg, desc }) => (
            <motion.button key={type} onClick={() => { setServiceFilter(type); setActiveTab('applications'); }}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
              className="text-left bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 hover:shadow-md transition">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-3 flex-shrink-0', bg)}>
                <Icon className={cn('h-6 w-6', color)} />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{type}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
            </motion.button>
          ))}
        </div>
      ) : (
        /* Applications List */
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, destination…"
                className={cn(inputCls, 'pl-9')} />
            </div>
            <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value as ServiceType | '')}
              className={cn(inputCls, 'w-auto')}>
              <option value="">All Services</option>
              {SERVICES.map(s => <option key={s.type} value={s.type}>{s.type}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as AppStatus | '')}
              className={cn(inputCls, 'w-auto')}>
              <option value="">All Statuses</option>
              {(Object.keys(STATUS_STYLE) as AppStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(serviceFilter || statusFilter || search) && (
              <button onClick={() => { setSearch(''); setServiceFilter(''); setStatusFilter(''); }}
                className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Clear
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600">
              <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No applications found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              {filtered.map((app, i) => {
                const SvcIcon = SERVICES.find(s => s.type === app.serviceType)?.icon ?? FileText;
                const svcColor = SERVICES.find(s => s.type === app.serviceType)?.color ?? 'text-indigo-600';
                const svcBg = SERVICES.find(s => s.type === app.serviceType)?.bg ?? 'bg-indigo-50';
                return (
                  <motion.div key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition"
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', svcBg)}>
                        <SvcIcon className={cn('h-5 w-5', svcColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{app.clientName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.serviceType} · {app.destination}</p>
                      </div>
                      <div className="hidden md:block text-right">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Applied</p>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{app.applicationDate}</p>
                      </div>
                      {app.expectedCompletion && (
                        <div className="hidden lg:block text-right">
                          <p className="text-xs text-gray-400 dark:text-gray-500">Expected</p>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{app.expectedCompletion}</p>
                        </div>
                      )}
                      <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0', STATUS_STYLE[app.status])}>
                        {app.status}
                      </span>
                      <button onClick={e => { e.stopPropagation(); openEdit(app); }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex-shrink-0">
                        Edit
                      </button>
                      {expandedId === app.id
                        ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                    </div>
                    <AnimatePresence>
                      {expandedId === app.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden">
                          <div className="px-5 py-4 bg-indigo-50/40 dark:bg-indigo-900/10 border-b border-gray-100 dark:border-gray-700">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <DetailCell label="Phone" value={app.clientPhone} />
                              <DetailCell label="Email" value={app.clientEmail} />
                              <DetailCell label="Assigned To" value={app.assignedTo || '—'} />
                              <DetailCell label="Application Date" value={app.applicationDate} icon={<Calendar className="h-3.5 w-3.5" />} />
                              <DetailCell label="Processing Date" value={app.processingDate || '—'} icon={<Clock className="h-3.5 w-3.5" />} />
                              <DetailCell label="Expected Completion" value={app.expectedCompletion || '—'} icon={<AlertCircle className="h-3.5 w-3.5" />} />
                              <DetailCell label="Actual Completion" value={app.actualCompletion || '—'} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
                              {app.notes && <DetailCell label="Notes" value={app.notes} className="col-span-2 md:col-span-4" />}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editItem ? 'Edit Application' : 'New Application'}
                </h3>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Client Info */}
                <div>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">Client Information</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LabeledField label="Client Name *">
                      <input value={form.clientName} onChange={e => setF('clientName')(e.target.value)} placeholder="Full name" className={inputCls} />
                    </LabeledField>
                    <LabeledField label="Phone">
                      <input value={form.clientPhone} onChange={e => setF('clientPhone')(e.target.value)} placeholder="+234…" className={inputCls} />
                    </LabeledField>
                    <LabeledField label="Email">
                      <input value={form.clientEmail} onChange={e => setF('clientEmail')(e.target.value)} placeholder="client@email.com" className={inputCls} />
                    </LabeledField>
                    <LabeledField label="Assigned Consultant">
                      <input value={form.assignedTo} onChange={e => setF('assignedTo')(e.target.value)} placeholder="Consultant name" className={inputCls} />
                    </LabeledField>
                  </div>
                </div>

                {/* Service Info */}
                <div>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">Service Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LabeledField label="Service Type *">
                      <select value={form.serviceType} onChange={e => setF('serviceType')(e.target.value)} className={inputCls}>
                        <option value="">Select service</option>
                        {SERVICES.map(s => <option key={s.type} value={s.type}>{s.type}</option>)}
                      </select>
                    </LabeledField>
                    <LabeledField label="Destination / Country *">
                      <input value={form.destination} onChange={e => setF('destination')(e.target.value)} placeholder="e.g. United Kingdom" className={inputCls} />
                    </LabeledField>
                    <LabeledField label="Status">
                      <select value={form.status} onChange={e => setF('status')(e.target.value)} className={inputCls}>
                        {(Object.keys(STATUS_STYLE) as AppStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </LabeledField>
                  </div>
                </div>

                {/* Processing Dates */}
                <div>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">Processing Timeline</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DateRow label="Application Date" value={form.applicationDate} onChange={setF('applicationDate')} />
                    <DateRow label="Processing Start Date" value={form.processingDate} onChange={setF('processingDate')} />
                    <DateRow label="Expected Completion" value={form.expectedCompletion} onChange={setF('expectedCompletion')} />
                    <DateRow label="Actual Completion" value={form.actualCompletion} onChange={setF('actualCompletion')} />
                  </div>
                </div>

                {/* Notes */}
                <LabeledField label="Notes / Comments">
                  <textarea value={form.notes} onChange={e => setF('notes')(e.target.value)} rows={3}
                    placeholder="Additional notes, requirements, documents needed…"
                    className={cn(inputCls, 'resize-none')} />
                </LabeledField>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={isMutating || !form.clientName || !form.serviceType || !form.destination}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold transition">
                  {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editItem ? 'Save Changes' : 'Create Application'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailCell({ label, value, icon, className }: { label: string; value: string; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
        {icon && <span className="text-gray-400">{icon}</span>}{value}
      </p>
    </div>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
