import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Target, Award, BarChart2 } from 'lucide-react';
import { crmService, type Opportunity } from '@services/crmService';

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'] as const;

const STAGE_COLORS: Record<string, string> = {
  Lead: 'bg-blue-400',
  Qualified: 'bg-violet-400',
  Proposal: 'bg-amber-400',
  Negotiation: 'bg-orange-400',
  ClosedWon: 'bg-green-500',
  ClosedLost: 'bg-red-400',
};

const fmt = (n: number) =>
  n >= 1_000_000
    ? `₦${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `₦${(n / 1_000).toFixed(0)}K`
    : `₦${n.toLocaleString()}`;

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SalesForecasting() {
  const { data, isLoading } = useQuery({
    queryKey: ['crm-opportunities-all'],
    queryFn: () => crmService.getOpportunities({ limit: 500 }),
  });

  useQuery({
    queryKey: ['crm-opp-stats'],
    queryFn: () => crmService.getOpportunityStats(),
  });

  const opportunities: Opportunity[] = (data as any)?.data || [];

  // Monthly forecast: group by expectedCloseDate month for open deals
  const monthly: Record<string, { weighted: number; full: number; count: number }> = {};
  const open = opportunities.filter(o => !['ClosedWon', 'ClosedLost'].includes(o.stage));
  open.forEach(o => {
    if (!o.expectedCloseDate) return;
    const d = new Date(o.expectedCloseDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthly[key]) monthly[key] = { weighted: 0, full: 0, count: 0 };
    monthly[key].weighted += Number(o.value) * (o.probability / 100);
    monthly[key].full += Number(o.value);
    monthly[key].count++;
  });

  const monthlyEntries = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).slice(0, 6);
  const maxWeighted = Math.max(...monthlyEntries.map(([, v]) => v.weighted), 1);

  // Stage funnel: total value per stage (active deals)
  const stageFunnel = STAGES.slice(0, 4).map(stage => {
    const stageOpps = opportunities.filter(o => o.stage === stage);
    return { stage, count: stageOpps.length, value: stageOpps.reduce((s, o) => s + Number(o.value), 0) };
  });
  const maxFunnelValue = Math.max(...stageFunnel.map(s => s.value), 1);

  // Top deals: highest value open opportunities
  const topDeals = [...open].sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 5);

  const wonTotal = opportunities.filter(o => o.stage === 'ClosedWon').reduce((s, o) => s + Number(o.value), 0);
  const wonCount = opportunities.filter(o => o.stage === 'ClosedWon').length;
  const lostCount = opportunities.filter(o => o.stage === 'ClosedLost').length;
  const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
  const pipelineTotal = open.reduce((s, o) => s + Number(o.value), 0);
  const weightedPipeline = open.reduce((s, o) => s + Number(o.value) * (o.probability / 100), 0);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Forecasting</h1>
        <p className="text-sm text-gray-500">Pipeline analysis and revenue projections</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Pipeline', value: fmt(pipelineTotal), sub: `${open.length} open deals`, icon: DollarSign, color: 'from-indigo-500 to-violet-600' },
          { label: 'Weighted Forecast', value: fmt(weightedPipeline), sub: 'Probability-adjusted', icon: BarChart2, color: 'from-blue-500 to-indigo-600' },
          { label: 'Won Revenue', value: fmt(wonTotal), sub: `${wonCount} deals closed`, icon: Award, color: 'from-green-500 to-emerald-600' },
          { label: 'Win Rate', value: `${winRate}%`, sub: `${wonCount}W / ${lostCount}L`, icon: Target, color: 'from-amber-500 to-orange-600' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`bg-gradient-to-br ${s.color} rounded-xl p-5 text-white`}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-white/70 text-xs">{s.label}</p>
                <Icon className="h-4 w-4 text-white/60" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-white/60 text-xs mt-1">{s.sub}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly forecast bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" /> Monthly Forecast
          </h2>
          {monthlyEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No upcoming close dates</div>
          ) : (
            <div className="space-y-3">
              {monthlyEntries.map(([key, val], i) => {
                const [year, month] = key.split('-');
                const label = `${MONTH_NAMES[Number(month) - 1]} ${year}`;
                const pct = (val.weighted / maxWeighted) * 100;
                return (
                  <motion.div key={key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{label}</span>
                      <div className="text-right">
                        <span className="text-xs font-bold text-indigo-700">{fmt(val.weighted)}</span>
                        <span className="text-xs text-gray-400 ml-2">({val.count} deals)</span>
                      </div>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.1, duration: 0.6 }}
                        className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-lg"
                      />
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-xs text-gray-500">Full: {fmt(val.full)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stage funnel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Pipeline Funnel</h2>
          {stageFunnel.every(s => s.count === 0) ? (
            <div className="text-center py-8 text-gray-400 text-sm">No open pipeline</div>
          ) : (
            <div className="space-y-3">
              {stageFunnel.map((s, i) => {
                const pct = (s.value / maxFunnelValue) * 100;
                return (
                  <motion.div key={s.stage} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{s.stage}</span>
                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-900">{fmt(s.value)}</span>
                        <span className="text-xs text-gray-400 ml-1">({s.count})</span>
                      </div>
                    </div>
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        className={`h-full ${STAGE_COLORS[s.stage]} rounded-full`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top deals */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Top Open Opportunities</h2>
        {topDeals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No open deals</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                {['Deal','Contact','Value','Probability','Stage','Close Date'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topDeals.map((o, i) => (
                <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-900">{o.title}</td>
                  <td className="py-3 pr-4 text-gray-600">{o.contact ? `${o.contact.firstName} ${o.contact.lastName}` : '—'}</td>
                  <td className="py-3 pr-4 font-bold text-indigo-700">{fmt(Number(o.value))}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-indigo-400 rounded-full" style={{ width: `${o.probability}%` }} /></div>
                      <span className="text-xs text-gray-500">{o.probability}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[o.stage]?.replace('bg-', 'bg-').replace('-400', '-100').replace('-500', '-100')} text-gray-700`}>{o.stage}</span>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">{o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString() : '—'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
