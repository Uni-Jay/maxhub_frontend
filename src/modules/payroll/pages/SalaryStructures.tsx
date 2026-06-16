import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Plus, Star, Edit2, Trash2, X, Check } from 'lucide-react';
import { payrollService, type SalaryStructure } from '@services/payrollService';

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;

const INIT_FORM = {
  structureName: '', baseSalary: '', bonus: '', incomeTax: '',
  providentFund: '', healthInsurance: '', isDefault: false,
  departmentId: '', designationId: '',
};

export default function SalaryStructures() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SalaryStructure | null>(null);
  const [form, setForm] = useState(INIT_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: () => payrollService.getStructures(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => payrollService.createStructure(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-structures'] }); setShowModal(false); setForm(INIT_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => payrollService.updateStructure(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-structures'] }); setEditTarget(null); setShowModal(false); setForm(INIT_FORM); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => payrollService.deleteStructure(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-structures'] }),
  });

  const structures: SalaryStructure[] = (data as any)?.data || [];

  const openCreate = () => { setEditTarget(null); setForm(INIT_FORM); setShowModal(true); };
  const openEdit = (s: SalaryStructure) => {
    setEditTarget(s);
    setForm({
      structureName: s.structureName, baseSalary: String(s.baseSalary), bonus: String(s.bonus),
      incomeTax: String(s.incomeTax), providentFund: String(s.providentFund),
      healthInsurance: String(s.healthInsurance), isDefault: s.isDefault,
      departmentId: String(s.departmentId || ''), designationId: String(s.designationId || ''),
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    const payload = {
      structureName: form.structureName,
      baseSalary: Number(form.baseSalary),
      bonus: Number(form.bonus || 0),
      incomeTax: Number(form.incomeTax || 0),
      providentFund: Number(form.providentFund || 0),
      healthInsurance: Number(form.healthInsurance || 0),
      isDefault: form.isDefault,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined,
      designationId: form.designationId ? Number(form.designationId) : undefined,
    };

    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload });
    else createMutation.mutate(payload);
  };

  const computeNet = (f: typeof form) => {
    const base = Number(f.baseSalary || 0);
    const bonus = Number(f.bonus || 0);
    const deductions = Number(f.incomeTax || 0) + Number(f.providentFund || 0) + Number(f.healthInsurance || 0);
    return base + bonus - deductions;
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Structures</h1>
          <p className="text-sm text-gray-500">Configure salary templates for departments</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> New Structure
        </button>
      </div>

      {structures.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No salary structures yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {structures.map((s, i) => {
            const netSalary = Number(s.baseSalary) + Number(s.bonus) - Number(s.incomeTax) - Number(s.providentFund) - Number(s.healthInsurance);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{s.structureName}</h3>
                      {s.isDefault && (
                        <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                          <Star className="h-3 w-3" /> Default
                        </span>
                      )}
                    </div>
                    {(s.department || s.designation) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.department?.name}{s.department && s.designation ? ' · ' : ''}{s.designation?.title}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm('Delete this structure?')) deleteMutation.mutate(s.id); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Base Salary</span><span className="font-medium">{fmt(s.baseSalary)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Bonus</span><span className="font-medium text-green-600">+{fmt(s.bonus)}</span></div>
                  <div className="border-t border-dashed border-gray-100 my-1" />
                  <div className="flex justify-between"><span className="text-gray-500">Income Tax</span><span className="text-red-500">-{fmt(s.incomeTax)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Provident Fund</span><span className="text-red-500">-{fmt(s.providentFund)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Health Insurance</span><span className="text-red-500">-{fmt(s.healthInsurance)}</span></div>
                  <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-700">Net Salary</span>
                    <span className="font-bold text-green-700 text-sm">{fmt(netSalary)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editTarget ? 'Edit Structure' : 'New Salary Structure'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Structure Name *</label>
                <input value={form.structureName} onChange={e => setForm(f => ({ ...f, structureName: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-700">Base Salary *</label><input type="number" value={form.baseSalary} onChange={e => setForm(f => ({ ...f, baseSalary: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Bonus</label><input type="number" value={form.bonus} onChange={e => setForm(f => ({ ...f, bonus: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Income Tax</label><input type="number" value={form.incomeTax} onChange={e => setForm(f => ({ ...f, incomeTax: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Provident Fund</label><input type="number" value={form.providentFund} onChange={e => setForm(f => ({ ...f, providentFund: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Health Insurance</label><input type="number" value={form.healthInsurance} onChange={e => setForm(f => ({ ...f, healthInsurance: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 rounded text-indigo-600" />
                  <label htmlFor="isDefault" className="text-sm text-gray-700">Set as Default</label>
                </div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 text-sm">
                <span className="text-gray-600">Computed Net: </span>
                <span className="font-bold text-green-700">{fmt(computeNet(form))}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending || !form.structureName || !form.baseSalary}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                {editTarget ? 'Save Changes' : 'Create Structure'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
