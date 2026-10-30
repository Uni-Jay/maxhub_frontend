import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, Heart, Loader2, Crown, Quote, Sparkles } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { Modal, Field, Empty, inp, btnPrimary, btnGhost, card } from '@components/erp/Kit';

interface Winner { id: number; month: string; monthLabel: string; staffId: number; name: string; position?: string; departmentName?: string; avatar?: string | null; citation: string; prize?: string | null }
interface Nominee { staffId: number; name: string; position?: string; departmentName?: string; avatar?: string | null; votes: number; reasons: Array<{ reason: string; by: string; at: string }> }
interface Data { month: string; monthLabel: string; current: Winner | null; latest: Winner | null; winners: Winner[]; myNomination: any; totalNominations: number; nominees: Nominee[]; people: Array<{ id: number; name: string; position?: string; departmentName?: string }>; canAward: boolean; canSeeNominations: boolean; myWins: number }

function Avatar({ name, src, size = 'h-12 w-12' }: { name: string; src?: string | null; size?: string }) {
  return src ? <img src={src} alt="" className={cn(size, 'rounded-full object-cover')} />
    : <div className={cn(size, 'rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold flex items-center justify-center')}>{name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>;
}

export default function StaffOfMonthPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['recognition'], queryFn: () => apiClient.get<Data>('/erp/recognition') });
  const d = q.data;
  const [nominating, setNominating] = useState(false);
  const [awarding, setAwarding] = useState<Nominee | { staffId: number; name: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['recognition'] });
  if (q.isLoading || !d) return <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-16" />;
  const champ = d.current || d.latest;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff of the Month</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Nominate a colleague who went the extra mile. Management picks the winner and the whole company celebrates.</p>
        </div>
        {!d.current && <button onClick={() => setNominating(true)} className={btnPrimary}><Heart className="h-4 w-4" />{d.myNomination ? 'Change my nomination' : 'Nominate a colleague'}</button>}
      </div>

      {champ && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-rose-500/10 border border-amber-200 dark:border-amber-900 p-6">
          <Sparkles className="absolute right-6 top-6 h-16 w-16 text-amber-200 dark:text-amber-900" />
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><Crown className="h-4 w-4" />Staff of the month · {champ.monthLabel}</p>
          <div className="flex items-center gap-4 mt-3">
            <Avatar name={champ.name} src={champ.avatar} size="h-16 w-16" />
            <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{champ.name}</p><p className="text-sm text-gray-600 dark:text-gray-400">{[champ.position, champ.departmentName].filter(Boolean).join(' · ')}</p></div>
          </div>
          <p className="mt-4 text-gray-800 dark:text-gray-200 max-w-2xl">“{champ.citation}”</p>
          {champ.prize && <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">🎁 {champ.prize}</p>}
          {d.myWins > 0 && champ.staffId && <p className="mt-3 text-sm font-semibold text-amber-800 dark:text-amber-300">You have won {d.myWins} time{d.myWins === 1 ? '' : 's'} — well done!</p>}
        </div>
      )}

      {!d.current && (
        <div className={cn(card, 'p-5')}>
          <p className="font-semibold">{d.monthLabel}: nominations are open</p>
          <p className="text-sm text-gray-500 mt-1">{d.totalNominations} nomination{d.totalNominations === 1 ? '' : 's'} so far. {d.myNomination ? <>You nominated <b>{d.myNomination.nomineeName}</b>.</> : 'You have not nominated anyone yet.'}</p>
        </div>
      )}

      {d.canSeeNominations && !d.current && (
        <div className={card}>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800"><p className="font-semibold">Nominations for {d.monthLabel}</p><p className="text-xs text-gray-500">Only management and HR see this list.</p></div>
          {!d.nominees.length ? <Empty icon={Heart} title="No nominations yet" text="Staff are reminded to nominate on the 25th of each month." /> : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {d.nominees.map((n) => (
                <div key={n.staffId} className="p-4 flex gap-4">
                  <Avatar name={n.name} src={n.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><p className="font-semibold">{n.name}</p><span className="text-xs text-gray-500">{[n.position, n.departmentName].filter(Boolean).join(' · ')}</span><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{n.votes} nomination{n.votes === 1 ? '' : 's'}</span></div>
                    <ul className="mt-2 space-y-1.5">{n.reasons.map((r, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><Quote className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" /><span>{r.reason} <span className="text-xs text-gray-500">— {r.by}</span></span></li>)}</ul>
                  </div>
                  {d.canAward && <button onClick={() => setAwarding(n)} className={cn(btnPrimary, 'self-start bg-amber-500 hover:bg-amber-600')}><Trophy className="h-4 w-4" />Choose</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {d.winners.length > 0 && (
        <div className={card}>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center"><p className="font-semibold flex-1">Hall of fame</p>{d.canAward && !d.current && <button onClick={() => setAwarding({ staffId: 0, name: '' })} className="text-xs text-indigo-600">Choose someone not nominated</button>}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {d.winners.map((w) => (
              <div key={w.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 flex gap-3">
                <Avatar name={w.name} src={w.avatar} size="h-10 w-10" />
                <div className="min-w-0"><p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">{w.monthLabel}</p><p className="font-medium truncate">{w.name}</p><p className="text-xs text-gray-500 line-clamp-2">{w.citation}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {d.canAward && !d.winners.length && !d.nominees.length && <button onClick={() => setAwarding({ staffId: 0, name: '' })} className={btnGhost}><Trophy className="h-4 w-4" />Choose staff of the month directly</button>}

      {nominating && <NominateModal d={d} onClose={() => setNominating(false)} onDone={() => { setNominating(false); refresh(); }} />}
      {awarding && <AwardModal d={d} pick={awarding} onClose={() => setAwarding(null)} onDone={() => { setAwarding(null); refresh(); }} />}
    </div>
  );
}

function NominateModal({ d, onClose, onDone }: { d: Data; onClose: () => void; onDone: () => void }) {
  const [staffId, setStaffId] = useState(d.myNomination ? String(d.myNomination.nomineeStaffId) : '');
  const [reason, setReason] = useState(d.myNomination?.reason || '');
  const save = useMutation({ mutationFn: () => apiClient.post<any>('/erp/recognition/nominate', { staffId: Number(staffId), reason }), onSuccess: (_r: any) => { toast.success('Nomination sent', 'Thank you for recognising a colleague'); onDone(); }, onError: (e: any) => toast.fromError(e) });
  return (
    <Modal title="Nominate a colleague" sub={`Staff of the month — ${d.monthLabel}. One nomination each; you can change it until the winner is chosen.`} onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending || !staffId || reason.trim().length < 10} className={btnPrimary}><Heart className="h-4 w-4" />Send nomination</button></>}>
      <Field label="Who?"><select className={inp} value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="">Choose a colleague…</option>{d.people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.departmentName ? ` — ${p.departmentName}` : ''}</option>)}</select></Field>
      <Field label="What did they do?" hint="Be specific — a client they helped, a problem they solved, how they supported the team."><textarea rows={4} className={inp} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
}

function AwardModal({ d, pick, onClose, onDone }: { d: Data; pick: { staffId: number; name: string } & Partial<Nominee>; onClose: () => void; onDone: () => void }) {
  const [staffId, setStaffId] = useState(pick.staffId ? String(pick.staffId) : '');
  const [citation, setCitation] = useState(pick.reasons?.[0]?.reason || '');
  const [prize, setPrize] = useState('');
  const save = useMutation({ mutationFn: () => apiClient.post('/erp/recognition/award', { staffId: Number(staffId), citation, prize, month: d.month }), onSuccess: () => { toast.success('Announced! 🏆', 'Everyone has been told and it is posted in General'); onDone(); }, onError: (e: any) => toast.fromError(e) });
  return (
    <Modal title={`Staff of the month — ${d.monthLabel}`} sub="This tells everyone, posts in the General channel and emails the winner." onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending || !staffId || citation.trim().length < 10} className={cn(btnPrimary, 'bg-amber-500 hover:bg-amber-600')}><Trophy className="h-4 w-4" />Announce winner</button></>}>
      {pick.staffId ? <p className="font-semibold">{pick.name}</p> : (
        <Field label="Winner"><select className={inp} value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="">Choose…</option>{d.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      )}
      <Field label="Citation" hint="Shown to everyone — why they won."><textarea rows={4} className={inp} value={citation} onChange={(e) => setCitation(e.target.value)} /></Field>
      <Field label="Prize (optional)"><input className={inp} value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. ₦50,000 shopping voucher and a day off" /></Field>
    </Modal>
  );
}
