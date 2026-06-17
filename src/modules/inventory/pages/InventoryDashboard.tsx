import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Package, AlertTriangle, Boxes, TrendingUp, ShoppingCart, Users,
  Search, Plus, X, Check, Star,
  Download, Filter, Tag, Truck, Loader2,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`;
const fmtShort = (n: number) => n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `₦${(n / 1_000).toFixed(0)}K` : `₦${n}`;

type Tab = 'dashboard' | 'items' | 'suppliers' | 'purchases' | 'valuation';

interface Item {
  id: number; itemCode: string; itemName: string; sku?: string;
  category?: { id: number; categoryName: string };
  unitOfMeasure: string; unitCost: number; reorderLevel: number; status: string;
  qty?: number;
}
interface Supplier {
  id: number; supplierName: string; contactPerson?: string; phone?: string;
  email?: string; paymentTerms?: string; rating?: number; status: string;
}
interface PO {
  id: number; poCode: string; poDate: string; total: number; status: string;
  supplier?: { supplierName: string };
}

function getItemStatus(item: Item) {
  const qty = item.qty ?? 0;
  if (qty === 0) return 'Out of Stock';
  if (qty < item.reorderLevel) return 'Low Stock';
  return 'In Stock';
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', {
      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400': status === 'In Stock' || status === 'Active' || status === 'Received' || status === 'Paid',
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400': status === 'Low Stock' || status === 'Processing' || status === 'Ordered' || status === 'PartiallyReceived',
      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400': status === 'Out of Stock' || status === 'Cancelled' || status === 'Blocked' || status === 'Rejected',
      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400': status === 'Pending' || status === 'Draft',
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400': status === 'Confirmed' || status === 'Issued',
      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400': status === 'Inactive',
    })}>
      {status}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={cn('h-3.5 w-3.5', s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600')} />
      ))}
    </div>
  );
}

const INIT_ITEM_FORM = { itemName: '', sku: '', categoryId: '', unitOfMeasure: 'Units', unitCost: 0, reorderLevel: 10, reorderQuantity: 50 };
const INIT_SUPPLIER_FORM = { supplierName: '', contactPerson: '', phone: '', email: '', paymentTerms: 'Net 30', notes: '' };

export default function InventoryDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [itemSearch, setItemSearch] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState(INIT_ITEM_FORM);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState(INIT_SUPPLIER_FORM);
  const [poStatusFilter, setPoStatusFilter] = useState('');

  const { data: statsRaw, isLoading: statsLoading } = useQuery({
    queryKey: ['inventory-dashboard-stats'],
    queryFn: () => apiClient.get<any>('/inventory/dashboard').catch(() => null),
  });

  const { data: itemsRaw, isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory-items', itemSearch],
    queryFn: () => apiClient.getRaw(`/inventory/items?limit=100${itemSearch ? `&search=${encodeURIComponent(itemSearch)}` : ''}`),
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => apiClient.get<any[]>('/inventory/categories'),
  });

  const { data: suppliersRaw, isLoading: suppliersLoading } = useQuery({
    queryKey: ['inventory-suppliers'],
    queryFn: () => apiClient.get<Supplier[]>('/inventory/suppliers').catch(() => [] as Supplier[]),
  });

  const { data: posRaw, isLoading: posLoading } = useQuery({
    queryKey: ['inventory-pos', poStatusFilter],
    queryFn: () => apiClient.get<PO[]>(`/inventory/purchase-orders${poStatusFilter ? `?status=${poStatusFilter}` : ''}`).catch(() => [] as PO[]),
  });

  const { data: lowStockRaw } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: () => apiClient.get<any[]>('/inventory/items/low-stock').catch(() => [] as any[]),
  });

  const createItem = useMutation({
    mutationFn: (data: typeof INIT_ITEM_FORM) => apiClient.post('/inventory/items', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-items'] }); setShowAddItem(false); setItemForm(INIT_ITEM_FORM); },
  });

  const createSupplier = useMutation({
    mutationFn: (data: typeof INIT_SUPPLIER_FORM) => apiClient.post('/inventory/suppliers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-suppliers'] }); setShowAddSupplier(false); setSupplierForm(INIT_SUPPLIER_FORM); },
  });

  const items: Item[] = (itemsRaw as any)?.data ?? (Array.isArray(itemsRaw) ? itemsRaw : []);
  const categories: { id: number; categoryName: string }[] = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const suppliers: Supplier[] = Array.isArray(suppliersRaw) ? suppliersRaw : [];
  const pos: PO[] = Array.isArray(posRaw) ? posRaw : [];
  const lowStock: any[] = Array.isArray(lowStockRaw) ? lowStockRaw : [];

  const stats = statsRaw as any;
  const totalItems = stats?.totalItems ?? items.length;
  const totalValue = stats?.totalValue ?? 0;
  const lowStockCount = stats?.lowStockCount ?? lowStock.length;
  const outOfStockCount = stats?.outOfStockCount ?? 0;

  const filteredItems = items.filter(i => {
    const matchStatus = !itemStatusFilter || getItemStatus(i) === itemStatusFilter;
    return matchStatus;
  });

  const categoryValueData = categories.map(cat => ({
    name: cat.categoryName,
    value: items.filter(i => i.category?.id === cat.id).reduce((s, i) => s + (i.qty ?? 0) * i.unitCost, 0),
  })).filter(d => d.value > 0);

  const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { key: 'items', label: 'Stock Items', icon: Package },
    { key: 'suppliers', label: 'Suppliers', icon: Truck },
    { key: 'purchases', label: 'Purchase Orders', icon: ShoppingCart },
    { key: 'valuation', label: 'Valuation', icon: Tag },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track stock, suppliers, and purchase orders</p>
        </div>
        <button
          onClick={() => { setActiveTab('items'); setShowAddItem(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all', activeTab === t.key ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Items', value: totalItems, color: 'from-indigo-500 to-indigo-700', icon: Boxes },
                { label: 'Total Value', value: fmtShort(totalValue), color: 'from-emerald-500 to-emerald-700', icon: Tag },
                { label: 'Low Stock', value: lowStockCount, color: 'from-amber-500 to-orange-600', icon: AlertTriangle, badge: true },
                { label: 'Out of Stock', value: outOfStockCount, color: 'from-red-500 to-red-700', icon: Package },
                { label: 'Categories', value: categories.length, color: 'from-blue-500 to-blue-700', icon: Filter },
                { label: 'Suppliers', value: suppliers.length, color: 'from-purple-500 to-purple-700', icon: Users },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className={cn('bg-gradient-to-br rounded-xl p-4 text-white relative overflow-hidden', s.color)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white/70 text-xs font-medium">{s.label}</p>
                        <p className="text-2xl font-bold mt-1">{s.value}</p>
                      </div>
                      <Icon className="h-4 w-4 text-white/50 mt-0.5" />
                    </div>
                    {s.badge && Number(s.value) > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse" />}
                  </motion.div>
                );
              })}
            </div>
          )}

          {lowStock.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Low Stock Alerts</h3>
              </div>
              <div className="space-y-2">
                {lowStock.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-amber-100 dark:border-amber-800/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.itemName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.itemCode} · {item.totalQty ?? 0} {item.unitOfMeasure} remaining (reorder at {item.reorderLevel})</p>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 font-medium">
                      <ShoppingCart className="h-3 w-3" /> Reorder
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Stock Value by Category</h3>
              {categoryValueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={categoryValueData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} isAnimationActive>
                      {categoryValueData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtShort(v)} contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">No stock value data yet</div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Items by Category</h3>
              {categories.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categories.map(c => ({ name: c.categoryName, count: items.filter(i => i.category?.id === c.id).length }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Items" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">No categories yet</div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'items' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items or SKU..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <select value={itemStatusFilter} onChange={e => setItemStatusFilter(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="">All Statuses</option>
              <option>Active</option><option>Inactive</option><option>Discontinued</option>
            </select>
            <button onClick={() => setShowAddItem(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>

          {itemsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    {['Item Name', 'Category', 'Item Code', 'SKU', 'Unit', 'Unit Cost', 'Reorder Level', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filteredItems.map((item, i) => (
                    <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.itemName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{item.category?.categoryName ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">{item.itemCode}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">{item.sku ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{item.unitOfMeasure}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{fmt(item.unitCost)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{item.reorderLevel}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <button className="text-xs text-gray-500 dark:text-gray-400 hover:underline">Stock</button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Boxes className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{itemsLoading ? 'Loading…' : 'No items found'}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'suppliers' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddSupplier(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
              <Plus className="h-4 w-4" /> Add Supplier
            </button>
          </div>
          {suppliersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    {['Name', 'Contact', 'Phone', 'Email', 'Payment Terms', 'Rating', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {suppliers.map((sup, i) => (
                    <motion.tr key={sup.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{sup.supplierName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{sup.contactPerson ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{sup.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-indigo-600 dark:text-indigo-400">{sup.email ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{sup.paymentTerms ?? '—'}</td>
                      <td className="px-4 py-3"><StarRating rating={sup.rating ?? 0} /></td>
                      <td className="px-4 py-3"><StatusBadge status={sup.status} /></td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {suppliers.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No suppliers yet</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'purchases' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex gap-3">
            <select value={poStatusFilter} onChange={e => setPoStatusFilter(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="">All Statuses</option>
              {['Draft', 'Issued', 'Confirmed', 'PartiallyReceived', 'Received', 'Cancelled', 'Rejected'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {posLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    {['PO Code', 'Supplier', 'Date', 'Total', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po, i) => (
                    <motion.tr key={po.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400">{po.poCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{(po.supplier as any)?.supplierName ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{po.poDate?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmt(po.total)}</td>
                      <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {pos.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No purchase orders yet</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'valuation' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">Total Portfolio Value</p>
              <p className="text-4xl font-bold mt-1">{fmt(totalValue)}</p>
              <p className="text-white/60 text-xs mt-1">{totalItems} items across {categories.length} categories</p>
            </div>
            <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['Category', 'Items Count', 'Unit Cost (Avg)', 'Total Value', '% of Portfolio'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {categories.map((cat, i) => {
                  const catItems = items.filter(item => item.category?.id === cat.id);
                  const catValue = catItems.reduce((s, item) => s + (item.qty ?? 0) * item.unitCost, 0);
                  const pct = totalValue > 0 ? ((catValue / totalValue) * 100).toFixed(1) : '0';
                  const avgCost = catItems.length > 0 ? catItems.reduce((s, i) => s + i.unitCost, 0) / catItems.length : 0;
                  return (
                    <motion.tr key={cat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-medium text-gray-900 dark:text-white">{cat.categoryName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{catItems.length}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{fmt(Math.round(avgCost))}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmt(catValue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Stock Item</h2>
              <button onClick={() => { setShowAddItem(false); setItemForm(INIT_ITEM_FORM); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {createItem.isError && <p className="text-sm text-red-500">{(createItem.error as any)?.message}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Item Name *</label>
                  <input value={itemForm.itemName} onChange={e => setItemForm(f => ({ ...f, itemName: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">SKU</label>
                  <input value={itemForm.sku} onChange={e => setItemForm(f => ({ ...f, sku: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Category *</label>
                  <select value={itemForm.categoryId} onChange={e => setItemForm(f => ({ ...f, categoryId: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Unit of Measure *</label>
                  <input value={itemForm.unitOfMeasure} onChange={e => setItemForm(f => ({ ...f, unitOfMeasure: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Unit Cost (₦) *</label>
                  <input type="number" value={itemForm.unitCost} onChange={e => setItemForm(f => ({ ...f, unitCost: Number(e.target.value) }))}
                    className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Reorder Level *</label>
                  <input type="number" value={itemForm.reorderLevel} onChange={e => setItemForm(f => ({ ...f, reorderLevel: Number(e.target.value) }))}
                    className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => { setShowAddItem(false); setItemForm(INIT_ITEM_FORM); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button
                onClick={() => createItem.mutate(itemForm)}
                disabled={!itemForm.itemName || !itemForm.categoryId || createItem.isPending}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {createItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add Item
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showAddSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Supplier</h2>
              <button onClick={() => { setShowAddSupplier(false); setSupplierForm(INIT_SUPPLIER_FORM); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {createSupplier.isError && <p className="text-sm text-red-500">{(createSupplier.error as any)?.message}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Company Name *</label>
                  <input value={supplierForm.supplierName} onChange={e => setSupplierForm(f => ({ ...f, supplierName: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                {(['contactPerson', 'phone', 'email'] as const).map(field => (
                  <div key={field}>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{field === 'contactPerson' ? 'Contact Person' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <input value={supplierForm[field]} onChange={e => setSupplierForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Payment Terms</label>
                  <select value={supplierForm.paymentTerms} onChange={e => setSupplierForm(f => ({ ...f, paymentTerms: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    {['COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => { setShowAddSupplier(false); setSupplierForm(INIT_SUPPLIER_FORM); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button
                onClick={() => createSupplier.mutate(supplierForm)}
                disabled={!supplierForm.supplierName || createSupplier.isPending}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {createSupplier.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add Supplier
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
