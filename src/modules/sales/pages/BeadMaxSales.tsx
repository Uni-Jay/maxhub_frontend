import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, ShoppingCart, Truck, BarChart2, Plus, Search, X, Edit2,
  Trash2, Check, ChevronDown, ChevronRight, Globe, Star, Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { cn } from '@utils/cn';
import { apiClient } from '@services/apiClient';

type Tab = 'products' | 'orders' | 'delivery' | 'analytics';

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;

const CATEGORIES = ['Beads', 'Bags', 'Accessories', 'Materials', 'Finished Pieces'];
const CAT_COLORS: Record<string, string> = {
  Beads: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  Bags: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  Accessories: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  Materials: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'Finished Pieces': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
};
const CHART_COLORS = ['#6366f1','#f59e0b','#ec4899','#3b82f6','#10b981'];

const DELIVERY_STAGES = ['Packed', 'Dispatched', 'In Transit', 'Delivered'];

const PAY_STATUS_STYLE: Record<string, string> = {
  Paid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  Pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  Overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};
const DEL_STATUS_STYLE: Record<string, string> = {
  Pending: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  Processing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  Shipped: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  Delivered: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  Cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

function StockBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', {
      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300': status === 'In Stock',
      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300': status === 'Low Stock',
      'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400': status === 'Out of Stock',
    })}>
      {status}
    </span>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => <Star key={i} className={cn('h-3 w-3', i <= Math.round(n) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600')} />)}
    </span>
  );
}

const INIT_PRODUCT = { name: '', category: 'Beads', categoryId: '', price: '', stock: '', description: '' };

export default function BeadMaxSales() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('products');
  const [prodSearch, setProdSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState(INIT_PRODUCT);

  const { data: productsRaw, isLoading: productsLoading } = useQuery({
    queryKey: ['beadmax-products', prodSearch, catFilter],
    queryFn: () => apiClient.getRaw(`/beadmax/products?limit=100${prodSearch ? `&search=${encodeURIComponent(prodSearch)}` : ''}`),
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => apiClient.get<any[]>('/inventory/categories').catch(() => [] as any[]),
  });

  const { data: ordersRaw, isLoading: ordersLoading } = useQuery({
    queryKey: ['beadmax-orders', orderFilter],
    queryFn: () => apiClient.getRaw(`/beadmax/orders?limit=100${orderFilter ? `&status=${orderFilter}` : ''}`),
  });

  const { data: deliveriesRaw, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['beadmax-deliveries'],
    queryFn: () => apiClient.get<any[]>('/beadmax/deliveries').catch(() => [] as any[]),
  });

  const { data: analyticsRaw } = useQuery({
    queryKey: ['beadmax-analytics'],
    queryFn: () => apiClient.get<any>('/beadmax/analytics').catch(() => null),
  });

  const createProduct = useMutation({
    mutationFn: (data: typeof INIT_PRODUCT) => apiClient.post('/beadmax/products', { ...data, price: Number(data.price), stock: Number(data.stock) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['beadmax-products'] }); setShowAddProduct(false); setNewProduct(INIT_PRODUCT); },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/beadmax/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beadmax-products'] }),
  });

  const products: any[] = (productsRaw as any)?.data ?? (Array.isArray(productsRaw) ? productsRaw : []);
  const categories: any[] = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const orders: any[] = (ordersRaw as any)?.data ?? (Array.isArray(ordersRaw) ? ordersRaw : []);
  const deliveries: any[] = Array.isArray(deliveriesRaw) ? deliveriesRaw : [];
  const analytics = analyticsRaw as any;

  const filteredProducts = products.filter(p => {
    if (catFilter && p.category !== catFilter) return false;
    if (stockFilter && p.status !== stockFilter) return false;
    return true;
  });

  const totalRevenue = analytics?.mtdRevenue ?? 0;
  const mtdOrders = analytics?.mtdOrders ?? orders.length;
  const avgOrder = analytics?.avgOrder ?? 0;
  const revenueData = analytics?.revenueData ?? [];
  const catSales = (analytics?.categorySales ?? []).filter((c: any) => c.value > 0);
  const topProduct = [...products].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))[0]?.name ?? '-';

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'products', label: 'Products', icon: Package },
    { key: 'orders', label: 'Orders', icon: ShoppingCart },
    { key: 'delivery', label: 'Delivery', icon: Truck },
    { key: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bead Max Sales</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Product management, orders, delivery & analytics</p>
        </div>
        {tab === 'products' && (
          <button onClick={() => setShowAddProduct(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow transition">
            <Plus className="h-4 w-4" /> Add Product
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              tab === key ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={prodSearch} onChange={e => setProdSearch(e.target.value)} placeholder="Search products..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Stock</option>
              <option>In Stock</option><option>Low Stock</option><option>Out of Stock</option>
            </select>
          </div>

          {productsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No products found. Add inventory items to see them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className={cn('h-28 flex items-center justify-center', CAT_COLORS[p.category]?.split(' ')[0] || 'bg-indigo-50 dark:bg-indigo-900/20')}>
                    <Package className={cn('h-10 w-10 opacity-40', CAT_COLORS[p.category]?.split(' ')[2] || 'text-indigo-400')} />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{p.name}</p>
                      <StockBadge status={p.status} />
                    </div>
                    <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full font-medium', CAT_COLORS[p.category] || 'bg-gray-100 text-gray-600')}>{p.category}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.description || '—'}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">{fmt(p.price)}</span>
                      <Stars n={p.rating ?? 5} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                      <span>Stock: {p.stock}</span>
                      <span>{p.sold ?? 0} sold</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition">
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                      <button onClick={() => deleteProduct.mutate(p.id)}
                        disabled={deleteProduct.isPending}
                        className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition disabled:opacity-50">
                        {deleteProduct.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(s => (
              <button key={s} onClick={() => setOrderFilter(s)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  orderFilter === s ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-gray-800')}>
                {s || 'All'}
              </button>
            ))}
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              {orders.map((order, i) => (
                <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <div onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                    <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{order.orderNo}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{order.customer} · {(order.items ?? []).join(', ') || '—'}</p>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-sm hidden md:block">{fmt(order.total)}</span>
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', PAY_STATUS_STYLE[order.paymentStatus])}>{order.paymentStatus}</span>
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', DEL_STATUS_STYLE[order.deliveryStatus])}>{order.deliveryStatus}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 hidden lg:block">{order.date}</span>
                    {expandedOrder === order.id ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                  </div>
                  <AnimatePresence>
                    {expandedOrder === order.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-indigo-50/30 dark:bg-indigo-900/10">
                        <div className="px-5 py-4 text-sm space-y-2">
                          {order.items?.length > 0 && <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Items: </span>{order.items.join(' | ')}</p>}
                          {order.address && <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Shipping to: </span>{order.address}</p>}
                          {order.trackingNo && <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Tracking: </span><span className="font-mono">{order.trackingNo}</span></p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'delivery' && (
        <div className="space-y-4">
          {deliveriesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active shipments</p>
            </div>
          ) : (
            deliveries.map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900 dark:text-white">{d.orderNo}</p>
                      {d.international && (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                          <Globe className="h-3 w-3" /> International
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{d.customer}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{d.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{d.courier}</p>
                    <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{d.trackingNo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0">
                  {DELIVERY_STAGES.map((stage, si) => (
                    <div key={stage} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                          si < d.stage ? 'bg-emerald-500 border-emerald-500 text-white' :
                          si === d.stage ? 'bg-indigo-600 border-indigo-600 text-white' :
                          'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500')}>
                          {si < d.stage ? <Check className="h-4 w-4" /> : si + 1}
                        </div>
                        <p className={cn('text-[10px] mt-1 font-medium text-center', si <= d.stage ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500')}>{stage}</p>
                      </div>
                      {si < DELIVERY_STAGES.length - 1 && (
                        <div className={cn('h-0.5 w-full -mt-4 mx-1', si < d.stage ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700')} />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Revenue MTD', value: fmt(totalRevenue), color: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Orders MTD', value: String(mtdOrders), color: 'text-violet-600 dark:text-violet-400' },
              { label: 'Avg Order', value: fmt(avgOrder), color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Top Product', value: topProduct.split(' ').slice(0, 2).join(' ') || '—', color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Total Products', value: String(products.length), color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Total Orders', value: String(analytics?.totalOrders ?? 0), color: 'text-pink-600 dark:text-pink-400' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{kpi.label}</p>
                <p className={cn('font-bold text-lg leading-tight', kpi.color)}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Revenue Trend (12 months)</p>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Sales by Category</p>
              {catSales.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={catSales} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                        {catSales.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {catSales.map((s: any, i: number) => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-gray-600 dark:text-gray-400">{s.name}</span>
                        </div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{s.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
              )}
            </div>
          </div>

          {products.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Products by Price</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart layout="vertical" data={[...products].sort((a, b) => b.price - a.price).slice(0, 5).map(p => ({ name: p.name.split(' ').slice(0, 3).join(' '), price: p.price }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="price" fill="#6366f1" radius={[0, 4, 4, 0]} name="Price" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showAddProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-indigo-600">
                <h2 className="font-bold text-white">Add Product</h2>
                <button onClick={() => { setShowAddProduct(false); setNewProduct(INIT_PRODUCT); }} className="p-1.5 hover:bg-white/20 rounded-full text-white/80 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {createProduct.isError && <p className="text-sm text-red-500">{(createProduct.error as any)?.message}</p>}
                {[
                  { label: 'Product Name', key: 'name', type: 'text', placeholder: 'e.g. Crystal Seed Beads' },
                  { label: 'Price (₦)', key: 'price', type: 'number', placeholder: '0' },
                  { label: 'Description', key: 'description', type: 'text', placeholder: 'Brief description...' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{f.label}</label>
                    <input type={f.type} value={(newProduct as any)[f.key]} onChange={e => setNewProduct(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      className="w-full mt-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Category</label>
                  <select value={newProduct.categoryId} onChange={e => setNewProduct(p => ({ ...p, categoryId: e.target.value }))}
                    className="w-full mt-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white">
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => { setShowAddProduct(false); setNewProduct(INIT_PRODUCT); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">Cancel</button>
                <button onClick={() => createProduct.mutate(newProduct)}
                  disabled={!newProduct.name || !newProduct.categoryId || !newProduct.price || createProduct.isPending}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition">
                  {createProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add Product
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
