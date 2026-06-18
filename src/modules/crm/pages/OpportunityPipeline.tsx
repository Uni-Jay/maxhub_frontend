import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Plus, X, Check, DollarSign, Calendar, ArrowRight, Target, Search } from 'lucide-react';
import { crmService, type Opportunity } from '@services/crmService';

const STAGES = ['Lead','Qualified','Proposal','Negotiation','ClosedWon','ClosedLost'] as const;

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Lead: { label: 'Lead', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  Qualified: { label: 'Qualified', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  Proposal: { label: 'Proposal', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  Negotiation: { label: 'Negotiation', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  ClosedWon: { label: 'Won', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  ClosedLost: { label: 'Lost', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;

const INIT_FORM = {
  title: '', contactId: '', value: '', currency: 'NGN',
  stage: 'Lead', probability: 50, expectedCloseDate: '',
  description: '',
};

export default function OpportunityPipeline() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INIT_FORM);
  const [lostReason, setLostReason] = useState('');
  const [showLostModal, setShowLostModal] = useState<{ id: number } | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['crm-opportunities', { search }],
    queryFn: () => crmService.getOpportunities({ limit: 200, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => crmService.createOpportunity({ ...payload, contactId: Number(payload.contactId), value: Number(payload.value), probability: Number(payload.probability) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-opportunities'] }); setShowModal(false); setForm(INIT_FORM); },
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage, lostReason }: { id: number; stage: string; lostReason?: string }) =>
      crmService.moveStage(id, stage, lostReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-opportunities'] }); setShowLostModal(null); setLostReason(''); },
  });

  const opportunities: Opportunity[] = (data as any)?.data || [];

  const grouped = STAGES.reduce((acc, stage) => {
    acc[stage] = opportunities.filter(o => o.stage === stage);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  const totalPipeline = opportunities.filter(o => !['ClosedWon','ClosedLost'].includes(o.stage)).reduce((s, o) => s + Number(o.value), 0);
  const wonTotal = grouped['ClosedWon'].reduce((s, o) => s + Number(o.value), 0);
  const wonCount = grouped['ClosedWon'].length;
  const lostCount = grouped['ClosedLost'].length;
  const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const NEXT_STAGE: Record<string, string | null> = {
    Lead: 'Qualified', Qualified: 'Proposal', Proposal: 'Negotiation',
    Negotiation: 'ClosedWon', ClosedWon: null, ClosedLost: null,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunity Pipeline</h1>
          <p className="text-sm text-gray-500">Track deals through the sales funnel</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> New Opportunity
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Pipeline', value: fmt(totalPipeline), icon: DollarSign, color: 'from-indigo-500 to-violet-600' },
          { label: 'Won Revenue', value: fmt(wonTotal), icon: TrendingUp, color: 'from-green-500 to-emerald-600' },
          { label: 'Win Rate', value: `${winRate}%`, icon: Target, color: 'from-blue-500 to-indigo-600' },
          { label: 'Total Deals', value: opportunities.length.toString(), icon: TrendingUp, color: 'from-amber-500 to-orange-600' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-white/70 text-xs">{s.label}</p>
                <Icon className="h-4 w-4 text-white/60" />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search opportunities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-2">
        {STAGES.map(stage => {
          const cfg = STAGE_CONFIG[stage];
          const cards = grouped[stage];
          const colTotal = cards.reduce((s, o) => s + Number(o.value), 0);
          return (
            <div key={stage} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 min-w-[180px]`}>
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${cfg.color} uppercase tracking-wide`}>{cfg.label}</span>
                  <span className={`text-xs font-bold ${cfg.color} bg-white/60 rounded-full px-1.5`}>{cards.length}</span>
                </div>
                {colTotal > 0 && <p className="text-xs text-gray-500 mt-0.5">{fmt(colTotal)}</p>}
              </div>
              <div className="space-y-2">
                {cards.map(opp => (
                  <motion.div
                    key={opp.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-lg p-3 shadow-sm border border-white/80 hover:shadow-md transition-shadow"
                  >
                    <p className="font-medium text-gray-900 text-xs mb-1 line-clamp-2">{opp.title}</p>
                    {opp.contact && (
                      <p className="text-xs text-gray-500 mb-1">{opp.contact.firstName} {opp.contact.lastName}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{fmt(opp.value)}</span>
                      <span className="text-xs text-gray-400">{opp.probability}%</span>
                    </div>
                    {opp.expectedCloseDate && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-400">{new Date(opp.expectedCloseDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {NEXT_STAGE[stage] && (
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => {
                            if (NEXT_STAGE[stage] === 'ClosedWon') stageMutation.mutate({ id: opp.id, stage: 'ClosedWon' });
                            else stageMutation.mutate({ id: opp.id, stage: NEXT_STAGE[stage]! });
                          }}
                          className="flex items-center gap-0.5 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded hover:bg-indigo-200"
                        >
                          <ArrowRight className="h-3 w-3" /> {STAGE_CONFIG[NEXT_STAGE[stage]!]?.label}
                        </button>
                        {stage !== 'Lead' && (
                          <button
                            onClick={() => setShowLostModal({ id: opp.id })}
                            className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded hover:bg-red-200"
                          >
                            Lost
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Opportunity Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Opportunity</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Contact ID *</label><input type="number" value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Value (₦) *</label><input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Probability (%)</label><input type="number" min={0} max={100} value={form.probability} onChange={e => setForm(f => ({ ...f, probability: Number(e.target.value) }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Stage</label>
                  <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Expected Close *</label><input type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</label><textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.title || !form.contactId || !form.value || !form.expectedCloseDate}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                Create
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lost Reason Modal */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Mark as Lost</h3>
            <textarea value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="Reason for losing this deal..." rows={3} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowLostModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={() => stageMutation.mutate({ id: showLostModal.id, stage: 'ClosedLost', lostReason })} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">Mark Lost</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
