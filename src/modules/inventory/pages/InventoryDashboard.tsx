import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  Package, AlertTriangle, Boxes, TrendingUp, ShoppingCart, Users,
  Search, Plus, X, Check, Star, ChevronDown, ChevronRight,
  Download, Filter, Tag, Truck,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`;
const fmtShort = (n: number) => n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `₦${(n / 1_000).toFixed(0)}K` : `₦${n}`;

type Tab = 'dashboard' | 'items' | 'suppliers' | 'purchases' | 'valuation';

const SAMPLE_ITEMS = [
  { id: 1, name: 'Seed Beads (Red)', sku: 'BD-001', category: 'Beads', qty: 5000, unit: 'Pieces', unitPrice: 5, reorderLevel: 500, supplier: 'CraftSupply NG' },
  { id: 2, name: 'Bugle Beads (Gold)', sku: 'BD-002', category: 'Beads', qty: 120, unit: 'Packets', unitPrice: 450, reorderLevel: 200, supplier: 'CraftSupply NG' },
  { id: 3, name: 'Crystal Beads (Clear)', sku: 'BD-003', category: 'Beads', qty: 800, unit: 'Pieces', unitPrice: 25, reorderLevel: 300, supplier: 'BeadMart Lagos' },
  { id: 4, name: 'Wooden Beads (Brown)', sku: 'BD-004', category: 'Beads', qty: 0, unit: 'Pieces', unitPrice: 10, reorderLevel: 200, supplier: 'BeadMart Lagos' },
  { id: 5, name: 'Ankara Bag (Large)', sku: 'BG-001', category: 'Bags', qty: 45, unit: 'Units', unitPrice: 8500, reorderLevel: 10, supplier: 'Ankara Creations' },
  { id: 6, name: 'Leather Bag (Small)', sku: 'BG-002', category: 'Bags', qty: 8, unit: 'Units', unitPrice: 15000, reorderLevel: 15, supplier: 'LeatherWorks Abuja' },
  { id: 7, name: 'Fabric Bag (Medium)', sku: 'BG-003', category: 'Bags', qty: 30, unit: 'Units', unitPrice: 3500, reorderLevel: 20, supplier: 'Ankara Creations' },
  { id: 8, name: 'Elastic Band (10m)', sku: 'MT-001', category: 'Materials', qty: 200, unit: 'Rolls', unitPrice: 350, reorderLevel: 50, supplier: 'CraftSupply NG' },
  { id: 9, name: 'Steel Wire (0.5mm)', sku: 'MT-002', category: 'Materials', qty: 12, unit: 'Spools', unitPrice: 1200, reorderLevel: 20, supplier: 'CraftSupply NG' },
  { id: 10, name: 'Nylon Thread (Black)', sku: 'MT-003', category: 'Materials', qty: 60, unit: 'Spools', unitPrice: 600, reorderLevel: 30, supplier: 'CraftSupply NG' },
  { id: 11, name: 'Dell Laptop (Core i7)', sku: 'OE-001', category: 'Office Equipment', qty: 5, unit: 'Units', unitPrice: 850000, reorderLevel: 2, supplier: 'TechVault NG' },
  { id: 12, name: 'HP LaserJet Printer', sku: 'OE-002', category: 'Office Equipment', qty: 3, unit: 'Units', unitPrice: 180000, reorderLevel: 1, supplier: 'TechVault NG' },
  { id: 13, name: 'Cisco Router (AC750)', sku: 'TE-001', category: 'Tech Equipment', qty: 2, unit: 'Units', unitPrice: 95000, reorderLevel: 1, supplier: 'NetPro Solutions' },
  { id: 14, name: 'UPS Unit (1500VA)', sku: 'TE-002', category: 'Tech Equipment', qty: 4, unit: 'Units', unitPrice: 120000, reorderLevel: 2, supplier: 'NetPro Solutions' },
  { id: 15, name: 'CCTV Camera (HD)', sku: 'TE-003', category: 'Tech Equipment', qty: 0, unit: 'Units', unitPrice: 45000, reorderLevel: 2, supplier: 'NetPro Solutions' },
];

const SAMPLE_SUPPLIERS = [
  { id: 1, name: 'CraftSupply NG', contact: 'Amaka Osei', phone: '+234 803 111 2222', email: 'amaka@craftsupply.ng', category: 'Beads & Materials', terms: 'Net 30', itemsSupplied: 8, rating: 5, status: 'Active' },
  { id: 2, name: 'BeadMart Lagos', contact: 'Chidi Nwosu', phone: '+234 806 333 4444', email: 'chidi@beadmart.ng', category: 'Beads', terms: 'Net 15', itemsSupplied: 4, rating: 4, status: 'Active' },
  { id: 3, name: 'Ankara Creations', contact: 'Fatima Bello', phone: '+234 809 555 6666', email: 'fatima@ankara.ng', category: 'Bags', terms: 'COD', itemsSupplied: 3, rating: 4, status: 'Active' },
  { id: 4, name: 'TechVault NG', contact: 'Emeka Eze', phone: '+234 812 777 8888', email: 'emeka@techvault.ng', category: 'Office Equipment', terms: 'Net 45', itemsSupplied: 5, rating: 5, status: 'Active' },
  { id: 5, name: 'NetPro Solutions', contact: 'Biodun Adeyemi', phone: '+234 815 999 0000', email: 'biodun@netpro.ng', category: 'Tech Equipment', terms: 'Net 30', itemsSupplied: 3, rating: 3, status: 'Inactive' },
];

const SAMPLE_POS = [
  {
    id: 1, poNumber: 'PO-2026-001', supplier: 'CraftSupply NG', date: '2026-05-15', totalCost: 485000, status: 'Received',
    items: [{ name: 'Seed Beads (Red)', qty: 10000, unitCost: 5, total: 50000 }, { name: 'Elastic Band (10m)', qty: 100, unitCost: 350, total: 35000 }, { name: 'Nylon Thread (Black)', qty: 200, unitCost: 600, total: 120000 }],
  },
  {
    id: 2, poNumber: 'PO-2026-002', supplier: 'TechVault NG', date: '2026-05-28', totalCost: 4670000, status: 'Received',
    items: [{ name: 'Dell Laptop (Core i7)', qty: 5, unitCost: 850000, total: 4250000 }, { name: 'HP LaserJet Printer', qty: 2, unitCost: 180000, total: 360000 }],
  },
  {
    id: 3, poNumber: 'PO-2026-003', supplier: 'BeadMart Lagos', date: '2026-06-02', totalCost: 22500, status: 'Ordered',
    items: [{ name: 'Crystal Beads (Clear)', qty: 500, unitCost: 25, total: 12500 }, { name: 'Wooden Beads (Brown)', qty: 1000, unitCost: 10, total: 10000 }],
  },
  {
    id: 4, poNumber: 'PO-2026-004', supplier: 'Ankara Creations', date: '2026-06-08', totalCost: 525000, status: 'Pending',
    items: [{ name: 'Ankara Bag (Large)', qty: 40, unitCost: 8500, total: 340000 }, { name: 'Fabric Bag (Medium)', qty: 50, unitCost: 3500, total: 175000 }],
  },
  {
    id: 5, poNumber: 'PO-2026-005', supplier: 'NetPro Solutions', date: '2026-06-10', totalCost: 280000, status: 'Cancelled',
    items: [{ name: 'CCTV Camera (HD)', qty: 4, unitCost: 45000, total: 180000 }, { name: 'UPS Unit (1500VA)', qty: 1, unitCost: 120000, total: 120000 }],
  },
];

const RECENT_TRANSACTIONS = [
  { id: 1, date: '2026-06-15', item: 'Seed Beads (Red)', type: 'Stock In', qty: 5000, ref: 'PO-2026-001' },
  { id: 2, date: '2026-06-14', item: 'Dell Laptop (Core i7)', type: 'Stock Out', qty: 2, ref: 'REQ-0042' },
  { id: 3, date: '2026-06-14', item: 'Elastic Band (10m)', type: 'Stock In', qty: 100, ref: 'PO-2026-001' },
  { id: 4, date: '2026-06-13', item: 'Ankara Bag (Large)', type: 'Stock Out', qty: 5, ref: 'SALE-0018' },
  { id: 5, date: '2026-06-12', item: 'Crystal Beads (Clear)', type: 'Stock Out', qty: 200, ref: 'SALE-0017' },
  { id: 6, date: '2026-06-11', item: 'HP LaserJet Printer', type: 'Stock In', qty: 3, ref: 'PO-2026-002' },
  { id: 7, date: '2026-06-10', item: 'Nylon Thread (Black)', type: 'Stock In', qty: 200, ref: 'PO-2026-001' },
  { id: 8, date: '2026-06-10', item: 'Leather Bag (Small)', type: 'Stock Out', qty: 2, ref: 'SALE-0016' },
  { id: 9, date: '2026-06-09', item: 'UPS Unit (1500VA)', type: 'Stock In', qty: 4, ref: 'PO-2026-002' },
  { id: 10, date: '2026-06-08', item: 'Steel Wire (0.5mm)', type: 'Stock Out', qty: 3, ref: 'REQ-0041' },
];

const MOVEMENT_DATA = [
  { name: 'Jan', In: 42, Out: 28 }, { name: 'Feb', In: 55, Out: 40 },
  { name: 'Mar', In: 38, Out: 35 }, { name: 'Apr', In: 62, Out: 48 },
  { name: 'May', In: 71, Out: 55 }, { name: 'Jun', In: 49, Out: 38 },
];

const VALUATION_HISTORY = [
  { month: 'Jan', value: 12500000 }, { month: 'Feb', value: 13200000 },
  { month: 'Mar', value: 12800000 }, { month: 'Apr', value: 14100000 },
  { month: 'May', value: 15300000 }, { month: 'Jun', value: 14850000 },
];

function getItemStatus(item: typeof SAMPLE_ITEMS[0]) {
  if (item.qty === 0) return 'Out of Stock';
  if (item.qty < item.reorderLevel) return 'Low Stock';
  return 'In Stock';
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', {
      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400': status === 'In Stock' || status === 'Active' || status === 'Received' || status === 'Paid',
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400': status === 'Low Stock' || status === 'Processing' || status === 'Ordered',
      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400': status === 'Out of Stock' || status === 'Cancelled',
      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400': status === 'Pending',
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

const INIT_ITEM_FORM = { name: '', sku: '', category: '', qty: 0, unit: 'Units', unitPrice: 0, reorderLevel: 10, supplier: '' };
const INIT_SUPPLIER_FORM = { name: '', contact: '', phone: '', email: '', category: '', terms: 'Net 30', rating: 5 };

const ITEM_CATEGORIES = ['Beads', 'Bags', 'Materials', 'Office Equipment', 'Tech Equipment'];
const PO_STATUSES = ['Pending', 'Ordered', 'Received', 'Cancelled'];

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [itemSearch, setItemSearch] = useState('');
  const [itemCatFilter, setItemCatFilter] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState(INIT_ITEM_FORM);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState(INIT_SUPPLIER_FORM);
  const [poSupFilter, setPoSupFilter] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('');
  const [expandedPO, setExpandedPO] = useState<number | null>(null);

  const { data: statsRaw } = useQuery({
    queryKey: ['inventory-dashboard-stats'],
    queryFn: async () => {
      try {
        return await apiClient.get<any>('/inventory/dashboard');
      } catch {
        return null;
      }
    },
  });

  const items = SAMPLE_ITEMS;

  const totalItems = (statsRaw as any)?.totalItems ?? items.length;
  const totalValue = (statsRaw as any)?.totalValue ?? items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const lowStockItems = items.filter(i => getItemStatus(i) === 'Low Stock');
  const outOfStockItems = items.filter(i => getItemStatus(i) === 'Out of Stock');
  const categories = ITEM_CATEGORIES;
  const suppliers = SAMPLE_SUPPLIERS;

  const categoryValueData = ITEM_CATEGORIES.map(cat => ({
    name: cat,
    value: items.filter(i => i.category === cat).reduce((s, i) => s + i.qty * i.unitPrice, 0),
  })).filter(d => d.value > 0);

  const valuationByCategory = ITEM_CATEGORIES.map(cat => {
    const catItems = items.filter(i => i.category === cat);
    const totalUnits = catItems.reduce((s, i) => s + i.qty, 0);
    const totalVal = catItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    return { category: cat, count: catItems.length, totalUnits, totalVal, pct: totalValue > 0 ? ((totalVal / totalValue) * 100).toFixed(1) : '0' };
  });

  const filteredItems = items.filter(i => {
    const matchSearch = !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.sku.toLowerCase().includes(itemSearch.toLowerCase());
    const matchCat = !itemCatFilter || i.category === itemCatFilter;
    const matchStatus = !itemStatusFilter || getItemStatus(i) === itemStatusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const filteredPOs = SAMPLE_POS.filter(po => {
    const matchSup = !poSupFilter || po.supplier === poSupFilter;
    const matchStatus = !poStatusFilter || po.status === poStatusFilter;
    return matchSup && matchStatus;
  });

  const totalPOSpend = SAMPLE_POS.filter(p => p.status !== 'Cancelled').reduce((s, p) => s + p.totalCost, 0);

  const monthlySpend = [
    { month: 'Jan', spend: 320000 }, { month: 'Feb', spend: 540000 },
    { month: 'Mar', spend: 280000 }, { month: 'Apr', spend: 720000 },
    { month: 'May', spend: 5155000 }, { month: 'Jun', spend: 805000 },
  ];

  const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { key: 'items', label: 'Stock Items', icon: Package },
    { key: 'suppliers', label: 'Suppliers', icon: Truck },
    { key: 'purchases', label: 'Purchase History', icon: ShoppingCart },
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
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                activeTab === t.key
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Items', value: totalItems, color: 'from-indigo-500 to-indigo-700', icon: Boxes },
              { label: 'Total Value', value: fmtShort(totalValue), color: 'from-emerald-500 to-emerald-700', icon: Tag },
              { label: 'Low Stock', value: lowStockItems.length, color: 'from-amber-500 to-orange-600', icon: AlertTriangle, badge: true },
              { label: 'Out of Stock', value: outOfStockItems.length, color: 'from-red-500 to-red-700', icon: Package },
              { label: 'Categories', value: categories.length, color: 'from-blue-500 to-blue-700', icon: Filter },
              { label: 'Suppliers', value: suppliers.length, color: 'from-purple-500 to-purple-700', icon: Users },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={cn('bg-gradient-to-br rounded-xl p-4 text-white relative overflow-hidden', s.color)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/70 text-xs font-medium">{s.label}</p>
                      <p className="text-2xl font-bold mt-1">{s.value}</p>
                    </div>
                    <Icon className="h-4 w-4 text-white/50 mt-0.5" />
                  </div>
                  {s.badge && Number(s.value) > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {lowStockItems.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Low Stock Alerts</h3>
              </div>
              <div className="space-y-2">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-amber-100 dark:border-amber-800/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku} · {item.category} · {item.qty} {item.unit} remaining (reorder at {item.reorderLevel})</p>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 font-medium">
                      <ShoppingCart className="h-3 w-3" /> Reorder
                    </button>
                  </div>
                ))}
                {outOfStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-red-100 dark:border-red-900/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-red-500 dark:text-red-400">{item.sku} · {item.category} · OUT OF STOCK</p>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium">
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
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryValueData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} isAnimationActive>
                    {categoryValueData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtShort(v)} contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Stock Movement — Last 6 Months</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={MOVEMENT_DATA}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="In" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Out" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Transactions</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Date', 'Item', 'Type', 'Qty', 'Reference'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {RECENT_TRANSACTIONS.map((t, i) => (
                  <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{t.date}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{t.item}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', t.type === 'Stock In' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400')}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{t.qty}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-500 dark:text-gray-400">{t.ref}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'items' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder="Search items or SKU..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <select value={itemCatFilter} onChange={e => setItemCatFilter(e.target.value)} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="">All Categories</option>
              {ITEM_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={itemStatusFilter} onChange={e => setItemStatusFilter(e.target.value)} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="">All Statuses</option>
              {['In Stock', 'Low Stock', 'Out of Stock'].map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => setShowAddItem(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['Item Name', 'Category', 'SKU', 'Quantity', 'Unit', 'Unit Price', 'Total Value', 'Reorder Level', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filteredItems.map((item, i) => {
                  const status = getItemStatus(item);
                  return (
                    <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {status !== 'In Stock' && <AlertTriangle className={cn('h-3.5 w-3.5 flex-shrink-0', status === 'Out of Stock' ? 'text-red-500' : 'text-amber-500')} />}
                          <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{item.category}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">{item.sku}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.qty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{item.unit}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{fmt(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white">{fmt(item.qty * item.unitPrice)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{item.reorderLevel}</td>
                      <td className="px-4 py-3"><StatusBadge status={status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <button className="text-xs text-gray-500 dark:text-gray-400 hover:underline">History</button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Boxes className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No items match your filters</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'suppliers' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddSupplier(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
              <Plus className="h-4 w-4" /> Add Supplier
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['Name', 'Contact', 'Phone', 'Email', 'Category', 'Payment Terms', 'Items', 'Rating', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {SAMPLE_SUPPLIERS.map((sup, i) => (
                  <motion.tr key={sup.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{sup.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{sup.contact}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{sup.phone}</td>
                    <td className="px-4 py-3 text-xs text-indigo-600 dark:text-indigo-400">{sup.email}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{sup.category}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{sup.terms}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-center">{sup.itemsSupplied}</td>
                    <td className="px-4 py-3"><StarRating rating={sup.rating} /></td>
                    <td className="px-4 py-3"><StatusBadge status={sup.status} /></td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 px-2 py-1 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60 whitespace-nowrap">
                        <ShoppingCart className="h-3 w-3" /> Create PO
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'purchases' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select value={poSupFilter} onChange={e => setPoSupFilter(e.target.value)} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="">All Suppliers</option>
              {SAMPLE_SUPPLIERS.map(s => <option key={s.id}>{s.name}</option>)}
            </select>
            <select value={poStatusFilter} onChange={e => setPoStatusFilter(e.target.value)} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="">All Statuses</option>
              {PO_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Total Spend (active POs)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{fmt(totalPOSpend)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-3">Monthly Spend</h3>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={monthlySpend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" fontSize={10} />
                  <YAxis fontSize={10} tickFormatter={v => `₦${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => fmtShort(v)} contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }} />
                  <Bar dataKey="spend" fill="#6366f1" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['PO #', 'Supplier', 'Date', 'Total Cost', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPOs.map((po, i) => (
                  <>
                    <motion.tr
                      key={po.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                      onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                    >
                      <td className="px-4 py-3 text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400">{po.poNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{po.supplier}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{po.date}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmt(po.totalCost)}</td>
                      <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                      <td className="px-4 py-3 text-gray-400">
                        {expandedPO === po.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                    </motion.tr>
                    <AnimatePresence>
                      {expandedPO === po.id && (
                        <tr key={`exp-${po.id}`}>
                          <td colSpan={6} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-indigo-50/40 dark:bg-indigo-900/10"
                            >
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-indigo-100 dark:border-indigo-800/50">
                                    {['Item', 'Qty', 'Unit Cost', 'Total'].map(h => (
                                      <th key={h} className="px-6 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {po.items.map((li, li_i) => (
                                    <tr key={li_i} className="border-b border-indigo-50 dark:border-indigo-800/30 last:border-0">
                                      <td className="px-6 py-2 text-gray-800 dark:text-gray-200">{li.name}</td>
                                      <td className="px-6 py-2 text-gray-600 dark:text-gray-400">{li.qty}</td>
                                      <td className="px-6 py-2 text-gray-600 dark:text-gray-400">{fmt(li.unitCost)}</td>
                                      <td className="px-6 py-2 font-medium text-gray-900 dark:text-white">{fmt(li.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </>
                ))}
              </tbody>
            </table>
            {filteredPOs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No purchase orders match your filters</p>
              </div>
            )}
          </div>
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

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Portfolio Value Trend — Last 6 Months</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={VALUATION_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={v => fmtShort(v)} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['Category', 'Items Count', 'Total Units', 'Avg Unit Value', 'Total Value', '% of Portfolio'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {valuationByCategory.map((row, i) => (
                  <motion.tr key={row.category} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-gray-900 dark:text-white">{row.category}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.count}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.totalUnits.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.totalUnits > 0 ? fmt(Math.round(row.totalVal / row.totalUnits)) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmt(row.totalVal)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 text-right">{row.pct}%</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                <tr>
                  <td className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{items.length}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{items.reduce((s, i) => s + i.qty, 0).toLocaleString()}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-sm font-bold text-indigo-600 dark:text-indigo-400">{fmt(totalValue)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300">100%</td>
                </tr>
              </tfoot>
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
              <div className="grid grid-cols-2 gap-4">
                {([
                  { label: 'Item Name *', field: 'name', type: 'text' },
                  { label: 'SKU *', field: 'sku', type: 'text' },
                ] as const).map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
                    <input type={type} value={itemForm[field] as string} onChange={e => setItemForm(f => ({ ...f, [field]: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Category *</label>
                  <select value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">Select category</option>
                    {ITEM_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Supplier</label>
                  <select value={itemForm.supplier} onChange={e => setItemForm(f => ({ ...f, supplier: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">Select supplier</option>
                    {SAMPLE_SUPPLIERS.map(s => <option key={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                  <input type="number" value={itemForm.qty} onChange={e => setItemForm(f => ({ ...f, qty: Number(e.target.value) }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Unit of Measure</label>
                  <input type="text" value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Unit Price (₦)</label>
                  <input type="number" value={itemForm.unitPrice} onChange={e => setItemForm(f => ({ ...f, unitPrice: Number(e.target.value) }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Reorder Level</label>
                  <input type="number" value={itemForm.reorderLevel} onChange={e => setItemForm(f => ({ ...f, reorderLevel: Number(e.target.value) }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => { setShowAddItem(false); setItemForm(INIT_ITEM_FORM); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button
                onClick={() => setShowAddItem(false)}
                disabled={!itemForm.name || !itemForm.sku || !itemForm.category}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Add Item
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
              <div className="grid grid-cols-2 gap-4">
                {([
                  { label: 'Company Name *', field: 'name' },
                  { label: 'Contact Person', field: 'contact' },
                  { label: 'Phone', field: 'phone' },
                  { label: 'Email', field: 'email' },
                  { label: 'Category', field: 'category' },
                ] as const).map(({ label, field }) => (
                  <div key={field}>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
                    <input type="text" value={supplierForm[field] as string} onChange={e => setSupplierForm(f => ({ ...f, [field]: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Payment Terms</label>
                  <select value={supplierForm.terms} onChange={e => setSupplierForm(f => ({ ...f, terms: e.target.value }))} className="w-full mt-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    {['COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => { setShowAddSupplier(false); setSupplierForm(INIT_SUPPLIER_FORM); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button
                onClick={() => setShowAddSupplier(false)}
                disabled={!supplierForm.name}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Add Supplier
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
