import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Warehouse as WarehouseIcon, Plus, X, Check, AlertTriangle, MapPin, Package } from 'lucide-react';
import { inventoryService, type Warehouse, type WarehouseStock } from '@services/inventoryService';

const INIT_FORM = {
  warehouseCode: '', warehouseName: '', locationId: '1',
  address: '', city: '', state: '', country: 'Nigeria', capacity: '',
};

export default function WarehouseList() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [form, setForm] = useState(INIT_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryService.getWarehouses({ limit: 50 }),
  });

  const { data: statsRaw } = useQuery({
    queryKey: ['warehouse-stats'],
    queryFn: () => inventoryService.getWarehouseStats(),
  });

  const { data: stockRaw } = useQuery({
    queryKey: ['warehouse-stock', selectedWarehouse?.id],
    queryFn: () => inventoryService.getWarehouseStock(selectedWarehouse!.id),
    enabled: !!selectedWarehouse,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => inventoryService.createWarehouse({ ...payload, locationId: Number(payload.locationId), capacity: payload.capacity ? Number(payload.capacity) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setShowModal(false); setForm(INIT_FORM); },
  });

  const warehouses: Warehouse[] = (data as any)?.data || [];
  const stats = (statsRaw as any)?.data;
  const stock: WarehouseStock[] = (stockRaw as any)?.data || [];

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-sm text-gray-500">Manage storage locations and stock levels</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Warehouse
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'from-gray-500 to-slate-600' },
            { label: 'Active', value: stats.active, color: 'from-green-500 to-emerald-600' },
            { label: 'Low Stock Alerts', value: stats.lowStockItems, color: 'from-orange-500 to-red-600' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white`}>
              <p className="text-white/70 text-xs">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((wh, i) => (
          <motion.div
            key={wh.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => setSelectedWarehouse(wh.id === selectedWarehouse?.id ? null : wh)}
            className={`bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md transition-all ${selectedWarehouse?.id === wh.id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-100'}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <WarehouseIcon className="h-4 w-4 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">{wh.warehouseName}</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{wh.warehouseCode}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${wh.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {wh.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {(wh.city || wh.state) && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {[wh.city, wh.state, wh.country].filter(Boolean).join(', ')}
              </div>
            )}

            {wh.capacity && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Capacity</span>
                  <span>{wh.capacity.toLocaleString()} units</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
            )}

            {wh.stockSummary && (
              <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-lg p-2">
                <div><p className="text-xs font-bold text-gray-900">{wh.stockSummary.totalSkus}</p><p className="text-xs text-gray-400">SKUs</p></div>
                <div><p className={`text-xs font-bold ${wh.stockSummary.lowStockItems > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{wh.stockSummary.lowStockItems}</p><p className="text-xs text-gray-400">Low Stock</p></div>
                <div><p className="text-xs font-bold text-gray-900">{wh.stockSummary.totalQuantity.toLocaleString()}</p><p className="text-xs text-gray-400">Total Qty</p></div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Stock View for selected warehouse */}
      {selectedWarehouse && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="font-semibold text-gray-900">Stock: {selectedWarehouse.warehouseName}</h2>
            <button onClick={() => setSelectedWarehouse(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
          </div>
          {stock.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No stock entries</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Item','Code','Quantity','Reorder Level','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stock.map((s, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${s.isBelowReorderLevel ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {s.isBelowReorderLevel && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                        {s.item?.itemName || `Item #${s.inventoryItemId}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{s.item?.itemCode || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.quantity.toLocaleString()} {s.item?.unitOfMeasure || ''}</td>
                    <td className="px-4 py-3 text-gray-600">{s.reorderLevel}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.isBelowReorderLevel ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {s.isBelowReorderLevel ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Warehouse</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-700">Warehouse Code *</label><input value={form.warehouseCode} onChange={e => setForm(f => ({ ...f, warehouseCode: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Warehouse Name *</label><input value={form.warehouseName} onChange={e => setForm(f => ({ ...f, warehouseName: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">State</label><input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="Max units" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.warehouseCode || !form.warehouseName}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                Create
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
