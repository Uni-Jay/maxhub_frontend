import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, AlertTriangle, X, Check, Boxes } from 'lucide-react';
import { inventoryService, type InventoryItem, type InventoryCategory } from '@services/inventoryService';

const INIT_FORM = {
  itemCode: '', itemName: '', categoryId: '', description: '',
  unitOfMeasure: 'Unit', reorderLevel: 10, costPrice: '', sellingPrice: '', isActive: true,
};

export default function ItemList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INIT_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-items', { search, categoryFilter, page }],
    queryFn: () => inventoryService.getItems({ page, limit: 15, search: search || undefined, categoryId: categoryFilter ? Number(categoryFilter) : undefined }),
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => inventoryService.getCategories(),
  });

  const { data: lowStockRaw } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: () => inventoryService.getLowStockItems(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => inventoryService.createItem({ ...payload, categoryId: Number(payload.categoryId), reorderLevel: Number(payload.reorderLevel), costPrice: payload.costPrice ? Number(payload.costPrice) : undefined, sellingPrice: payload.sellingPrice ? Number(payload.sellingPrice) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-items'] }); setShowModal(false); setForm(INIT_FORM); },
  });

  const items: InventoryItem[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination;
  const categories: InventoryCategory[] = (categoriesRaw as any)?.data || [];
  const lowStockItems: InventoryItem[] = (lowStockRaw as any)?.data || [];

  const totalItems = pagination?.total || 0;
  const activeItems = items.filter(i => i.isActive).length;
  const lowStockCount = lowStockItems.length;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Items</h1>
          <p className="text-sm text-gray-500">Manage products and stock levels</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: totalItems, color: 'from-gray-500 to-slate-600' },
          { label: 'Active Items', value: activeItems, color: 'from-green-500 to-emerald-600' },
          { label: 'Low Stock', value: lowStockCount, color: 'from-orange-500 to-red-600' },
          { label: 'Categories', value: categories.length, color: 'from-blue-500 to-indigo-600' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white`}>
            <p className="text-white/70 text-xs">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">{lowStockCount} item{lowStockCount > 1 ? 's' : ''} below reorder level</p>
            <p className="text-xs text-orange-600">{lowStockItems.slice(0, 3).map(i => i.itemName).join(', ')}{lowStockCount > 3 ? ` +${lowStockCount - 3} more` : ''}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search items..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
        </select>
      </div>

      {/* Items Table */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Boxes className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No inventory items found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Code','Name','Category','Unit','Reorder Level','Cost','Selling','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, i) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`hover:bg-gray-50 ${item.isBelowReorderLevel ? 'bg-red-50/30' : ''}`}
                >
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{item.itemCode}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.isBelowReorderLevel && <AlertTriangle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
                      <span className="font-medium text-gray-900">{item.itemName}</span>
                    </div>
                    {item.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{item.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.category?.categoryName || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.unitOfMeasure}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${item.isBelowReorderLevel ? 'text-red-600' : 'text-gray-700'}`}>{item.reorderLevel}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.costPrice ? `₦${Number(item.costPrice).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.sellingPrice ? `₦${Number(item.sellingPrice).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">Add Inventory Item</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-700">Item Code *</label><input value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Item Name *</label><input value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Category *</label>
                  <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-medium text-gray-700">Unit of Measure</label><input value={form.unitOfMeasure} onChange={e => setForm(f => ({ ...f, unitOfMeasure: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Reorder Level</label><input type="number" value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: Number(e.target.value) }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Cost Price (₦)</label><input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-xs font-medium text-gray-700">Selling Price (₦)</label><input type="number" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700">Description</label><textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.itemCode || !form.itemName || !form.categoryId}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                Add Item
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
