import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, Plus, Phone, Mail, Building2,
  X, Check,
} from 'lucide-react';
import { crmService, type Contact } from '@services/crmService';

const STATUS_COLORS: Record<string, string> = {
  Lead: 'bg-blue-100 text-blue-700',
  Prospect: 'bg-yellow-100 text-yellow-700',
  Active: 'bg-green-100 text-green-700',
  Converted: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-700',
  Lost: 'bg-red-100 text-red-700',
};

const INIT_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  company: '', position: '', source: 'Direct', status: 'Lead',
  address: '', city: '', state: '', country: '', notes: '',
};

export default function ContactList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INIT_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['crm-contacts', { search, statusFilter, sourceFilter, page }],
    queryFn: () => crmService.getContacts({ page, limit: 15, search: search || undefined, status: statusFilter || undefined, source: sourceFilter || undefined }),
  });

  const { data: statsRaw } = useQuery({
    queryKey: ['crm-stats'],
    queryFn: () => crmService.getContactStats(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => crmService.createContact(payload as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-contacts'] }); qc.invalidateQueries({ queryKey: ['crm-stats'] }); setShowModal(false); setForm(INIT_FORM); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => crmService.updateContactStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-contacts'] }),
  });

  const contacts: Contact[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination;
  const stats = (statsRaw as any)?.data;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM Contacts</h1>
          <p className="text-sm text-gray-500">Manage leads, prospects, and customers</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Contact
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'from-gray-500 to-slate-600' },
            { label: 'Leads', value: stats.leads, color: 'from-blue-500 to-indigo-600' },
            { label: 'Prospects', value: stats.prospects, color: 'from-yellow-500 to-amber-600' },
            { label: 'Active', value: stats.active, color: 'from-green-500 to-emerald-600' },
            { label: 'Converted', value: stats.converted, color: 'from-violet-500 to-purple-600' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={`bg-gradient-to-br ${s.color} rounded-xl p-3 text-white`}>
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
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search contacts..." className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {['Lead','Prospect','Active','Converted','Inactive','Lost'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Sources</option>
          {['Direct','Website','Email','Phone','Referral','Event','Social','Other'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Contacts table */}
      {contacts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No contacts found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Contact','Company','Phone','Status','Lead Score','Source','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contacts.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Mail className="h-3 w-3" /> {c.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.company ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-gray-400" /> {c.company}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Phone className="h-3.5 w-3.5 text-gray-400" /> {c.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${c.leadScore || 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-6">{c.leadScore || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.source}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={e => statusMutation.mutate({ id: c.id, status: e.target.value })}
                      className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      {['Lead','Prospect','Active','Converted','Inactive','Lost'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
          <span className="text-sm text-gray-600">Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Contact</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">First Name *</label><input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Last Name *</label><input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Email *</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Phone *</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Company</label><input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Position</label><input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {['Direct','Website','Email','Phone','Referral','Event','Social','Other'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {['Lead','Prospect','Active','Converted','Inactive','Lost'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Country</label><input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Notes</label><textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.firstName || !form.email || !form.phone}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                Add Contact
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
