import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Package, ShoppingCart, Truck, BarChart2, Plus, Search, X, Edit2,
  Trash2, Check, ChevronDown, ChevronRight, Globe,
  Star,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { cn } from '@utils/cn';

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

interface Product {
  id: number; name: string; category: string; price: number;
  stock: number; description: string; status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  sold: number; rating: number;
}

interface Order {
  id: number; orderNo: string; customer: string; items: string[];
  total: number; paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  deliveryStatus: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  date: string; address: string; notes: string;
}

interface Delivery {
  id: number; orderNo: string; customer: string; address: string;
  courier: string; trackingNo: string;
  stage: 0 | 1 | 2 | 3;
  international: boolean;
}

const PRODUCTS: Product[] = [
  { id:1, name:'Crystal Seed Beads Set', category:'Beads', price:4500, stock:320, description:'Mixed crystal seed beads, 500g pack', status:'In Stock', sold:148, rating:4.8 },
  { id:2, name:'Ankara Tote Bag', category:'Bags', price:12000, stock:45, description:'Handmade Ankara fabric tote, custom sizes', status:'In Stock', sold:89, rating:4.9 },
  { id:3, name:'Gold-Plated Clasps (50pcs)', category:'Materials', price:2800, stock:8, description:'Premium gold-plated lobster clasps', status:'Low Stock', sold:203, rating:4.6 },
  { id:4, name:'Beaded Necklace — Sunrise', category:'Finished Pieces', price:18500, stock:12, description:'Hand-crafted beaded necklace, multi-strand', status:'In Stock', sold:34, rating:5.0 },
  { id:5, name:'Leather Crossbody Bag', category:'Bags', price:22000, stock:0, description:'Genuine leather with bead embroidery', status:'Out of Stock', sold:61, rating:4.7 },
  { id:6, name:'Elastic Cord Roll (10m)', category:'Materials', price:1200, stock:150, description:'High-stretch elastic cord, 1mm diameter', status:'In Stock', sold:412, rating:4.4 },
  { id:7, name:'Waist Beads Set — Traditional', category:'Accessories', price:3500, stock:6, description:'Traditional Nigerian waist beads, 5 strands', status:'Low Stock', sold:97, rating:4.8 },
  { id:8, name:'Bugle Beads — Assorted', category:'Beads', price:3200, stock:90, description:'Glass bugle beads, 200g mixed colours', status:'In Stock', sold:167, rating:4.5 },
  { id:9, name:'Beaded Clutch Purse', category:'Finished Pieces', price:15000, stock:18, description:'Elegant beaded evening clutch', status:'In Stock', sold:28, rating:4.9 },
  { id:10, name:'Wire Spool 28-gauge', category:'Materials', price:1800, stock:60, description:'Jewellery wire, silver plated', status:'In Stock', sold:289, rating:4.3 },
  { id:11, name:'Mini Fabric Bag — Set of 3', category:'Bags', price:8500, stock:22, description:'Drawstring fabric gift bags, assorted prints', status:'In Stock', sold:75, rating:4.6 },
  { id:12, name:'Jump Rings 4mm (200pcs)', category:'Materials', price:900, stock:200, description:'Silver and gold mixed jump rings', status:'In Stock', sold:350, rating:4.4 },
];

const ORDERS: Order[] = [
  { id:1, orderNo:'BMO-001', customer:'Adaeze Okonkwo', items:['Crystal Seed Beads','Elastic Cord'], total:5700, paymentStatus:'Paid', deliveryStatus:'Delivered', date:'2026-06-10', address:'12 Victoria Island, Lagos', notes:'' },
  { id:2, orderNo:'BMO-002', customer:'Sarah Johnson (UK)', items:['Beaded Necklace — Sunrise'], total:18500, paymentStatus:'Paid', deliveryStatus:'Shipped', date:'2026-06-12', address:'44 Brick Lane, London E1 6RF', notes:'International express shipping' },
  { id:3, orderNo:'BMO-003', customer:'Fatima Aliyu', items:['Ankara Tote Bag','Waist Beads Set'], total:15500, paymentStatus:'Pending', deliveryStatus:'Processing', date:'2026-06-14', address:'5 Maitama, Abuja', notes:'Custom colour requested' },
  { id:4, orderNo:'BMO-004', customer:'Ngozi Eze', items:['Beaded Clutch Purse'], total:15000, paymentStatus:'Paid', deliveryStatus:'Pending', date:'2026-06-15', address:'8 Trans-Amadi, Port Harcourt', notes:'' },
  { id:5, orderNo:'BMO-005', customer:'Amaka Chukwu', items:['Crystal Seed Beads','Jump Rings','Wire Spool'], total:5900, paymentStatus:'Paid', deliveryStatus:'Delivered', date:'2026-06-08', address:'3 Enugu Road, Enugu', notes:'' },
  { id:6, orderNo:'BMO-006', customer:'Grace Mensah (Ghana)', items:['Waist Beads Set — Traditional'], total:3500, paymentStatus:'Overdue', deliveryStatus:'Cancelled', date:'2026-06-01', address:'15 Osu, Accra', notes:'Payment not received' },
  { id:7, orderNo:'BMO-007', customer:'Chidinma Ibe', items:['Ankara Tote Bag'], total:12000, paymentStatus:'Paid', deliveryStatus:'Shipped', date:'2026-06-16', address:'21 Wuse 2, Abuja', notes:'' },
  { id:8, orderNo:'BMO-008', customer:'Blessing Okafor', items:['Mini Fabric Bag Set','Gold-Plated Clasps'], total:11300, paymentStatus:'Pending', deliveryStatus:'Processing', date:'2026-06-16', address:'9 Ikeja GRA, Lagos', notes:'' },
  { id:9, orderNo:'BMO-009', customer:'Temi Adeleke', items:['Bugle Beads Assorted'], total:3200, paymentStatus:'Paid', deliveryStatus:'Delivered', date:'2026-06-05', address:'4 Lekki Phase 1, Lagos', notes:'' },
  { id:10, orderNo:'BMO-010', customer:'Yetunde Bello', items:['Leather Crossbody Bag'], total:22000, paymentStatus:'Paid', deliveryStatus:'Pending', date:'2026-06-17', address:'11 Bodija, Ibadan', notes:'Back-order, will ship in 2 weeks' },
];

const DELIVERIES: Delivery[] = [
  { id:1, orderNo:'BMO-002', customer:'Sarah Johnson', address:'44 Brick Lane, London E1 6RF', courier:'DHL Express', trackingNo:'DHL-1234567890', stage:2, international:true },
  { id:2, orderNo:'BMO-003', customer:'Fatima Aliyu', address:'5 Maitama, Abuja', courier:'GIG Logistics', trackingNo:'GIG-987654', stage:1, international:false },
  { id:3, orderNo:'BMO-004', customer:'Ngozi Eze', address:'8 Trans-Amadi, Port Harcourt', courier:'Courier Plus', trackingNo:'CP-556677', stage:0, international:false },
  { id:4, orderNo:'BMO-007', customer:'Chidinma Ibe', address:'21 Wuse 2, Abuja', courier:'FedEx', trackingNo:'FDX-112233445', stage:2, international:false },
  { id:5, orderNo:'BMO-010', customer:'Yetunde Bello', address:'11 Bodija, Ibadan', courier:'GIG Logistics', trackingNo:'GIG-445566', stage:0, international:false },
];

const REVENUE_DATA = [
  { month:'Jan', revenue:420000 }, { month:'Feb', revenue:380000 }, { month:'Mar', revenue:510000 },
  { month:'Apr', revenue:480000 }, { month:'May', revenue:620000 }, { month:'Jun', revenue:590000 },
  { month:'Jul', revenue:700000 }, { month:'Aug', revenue:650000 }, { month:'Sep', revenue:730000 },
  { month:'Oct', revenue:810000 }, { month:'Nov', revenue:920000 }, { month:'Dec', revenue:1050000 },
];

const CAT_SALES = [
  { name:'Finished Pieces', value:38 }, { name:'Bags', value:28 }, { name:'Beads', value:18 },
  { name:'Accessories', value:10 }, { name:'Materials', value:6 },
];

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

function StockBadge({ status }: { status: Product['status'] }) {
  const s: Record<string, string> = {
    'In Stock': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    'Low Stock': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    'Out of Stock': 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };
  return <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', s[status])}>{status}</span>;
}

function Stars({ n }: { n: number }) {
  return <span className="flex items-center gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className={cn('h-3 w-3', i <= Math.round(n) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600')} />)}</span>;
}

export default function BeadMaxSales() {
  useQueryClient();
  const [tab, setTab] = useState<Tab>('products');
  const [prodSearch, setProdSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [, setShowAddOrder] = useState(false);
  const [newProduct, setNewProduct] = useState({ name:'', category:'Beads', price:'', stock:'', description:'' });
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [orders] = useState<Order[]>(ORDERS);

  const filteredProducts = products.filter(p => {
    if (catFilter && p.category !== catFilter) return false;
    if (stockFilter && p.status !== stockFilter) return false;
    if (prodSearch && !p.name.toLowerCase().includes(prodSearch.toLowerCase())) return false;
    return true;
  });

  const filteredOrders = orders.filter(o => {
    if (orderFilter && o.deliveryStatus !== orderFilter) return false;
    return true;
  });

  const totalRevenue = orders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
  const topProduct = [...products].sort((a,b) => b.sold - a.sold)[0]?.name || '-';

  const addProduct = () => {
    const p: Product = {
      id: Date.now(), name: newProduct.name, category: newProduct.category,
      price: Number(newProduct.price), stock: Number(newProduct.stock),
      description: newProduct.description,
      status: Number(newProduct.stock) === 0 ? 'Out of Stock' : Number(newProduct.stock) <= 10 ? 'Low Stock' : 'In Stock',
      sold: 0, rating: 5.0,
    };
    setProducts(ps => [p, ...ps]);
    setShowAddProduct(false);
    setNewProduct({ name:'', category:'Beads', price:'', stock:'', description:'' });
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key:'products', label:'Products', icon: Package },
    { key:'orders', label:'Orders', icon: ShoppingCart },
    { key:'delivery', label:'Delivery', icon: Truck },
    { key:'analytics', label:'Analytics', icon: BarChart2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bead Max Sales</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Product management, orders, delivery & analytics</p>
        </div>
        <button onClick={() => tab === 'products' ? setShowAddProduct(true) : setShowAddOrder(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow transition">
          <Plus className="h-4 w-4" /> {tab === 'products' ? 'Add Product' : tab === 'orders' ? 'New Order' : ''}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              tab === key ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Products ── */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className={cn('h-28 flex items-center justify-center', CAT_COLORS[p.category]?.split(' ')[0] || 'bg-indigo-50 dark:bg-indigo-900/20')}>
                  <Package className={cn('h-10 w-10 opacity-40', CAT_COLORS[p.category]?.split(' ')[2] || 'text-indigo-400')} />
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{p.name}</p>
                    <StockBadge status={p.status} />
                  </div>
                  <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full font-medium', CAT_COLORS[p.category])}>{p.category}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">{fmt(p.price)}</span>
                    <Stars n={p.rating} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <span>Stock: {p.stock}</span>
                    <span>{p.sold} sold</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition">
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => setProducts(ps => ps.filter(x => x.id !== p.id))}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Orders ── */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'Pending','Processing','Shipped','Delivered','Cancelled'].map(s => (
              <button key={s} onClick={() => setOrderFilter(s)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  orderFilter === s ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-gray-800')}>
                {s || 'All'}
              </button>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            {filteredOrders.map((order, i) => (
              <motion.div key={order.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.03 }}>
                <div onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                  <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{order.orderNo}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{order.customer} · {order.items.join(', ')}</p>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white text-sm hidden md:block">{fmt(order.total)}</span>
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', PAY_STATUS_STYLE[order.paymentStatus])}>{order.paymentStatus}</span>
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', DEL_STATUS_STYLE[order.deliveryStatus])}>{order.deliveryStatus}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 hidden lg:block">{order.date}</span>
                  {expandedOrder === order.id ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                </div>
                <AnimatePresence>
                  {expandedOrder === order.id && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden bg-indigo-50/30 dark:bg-indigo-900/10">
                      <div className="px-5 py-4 text-sm space-y-2">
                        <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Items: </span>{order.items.join(' | ')}</p>
                        <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Shipping to: </span>{order.address}</p>
                        {order.notes && <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Notes: </span>{order.notes}</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Delivery ── */}
      {tab === 'delivery' && (
        <div className="space-y-4">
          {DELIVERIES.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.05 }}
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
              {/* Stage stepper */}
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
                      <p className={cn('text-[10px] mt-1 font-medium text-center',
                        si <= d.stage ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500')}>
                        {stage}
                      </p>
                    </div>
                    {si < DELIVERY_STAGES.length - 1 && (
                      <div className={cn('h-0.5 w-full -mt-4 mx-1', si < d.stage ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700')} />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Analytics ── */}
      {tab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label:'Revenue MTD', value: fmt(590000), color:'text-indigo-600 dark:text-indigo-400' },
              { label:'Orders MTD', value:'12', color:'text-violet-600 dark:text-violet-400' },
              { label:'Avg Order', value: fmt(avgOrder), color:'text-blue-600 dark:text-blue-400' },
              { label:'Top Product', value: topProduct.split(' ').slice(0,2).join(' '), color:'text-amber-600 dark:text-amber-400' },
              { label:'New Customers', value:'8', color:'text-emerald-600 dark:text-emerald-400' },
              { label:'Repeat Rate', value:'64%', color:'text-pink-600 dark:text-pink-400' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{kpi.label}</p>
                <p className={cn('font-bold text-lg leading-tight', kpi.color)}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Revenue trend */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Revenue Trend (12 months)</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={REVENUE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ fill:'#6366f1', r:3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category split */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Sales by Category</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={CAT_SALES} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                    {CAT_SALES.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {CAT_SALES.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-gray-600 dark:text-gray-400">{s.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top products */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Top Products by Units Sold</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart layout="vertical" data={[...products].sort((a,b) => b.sold - a.sold).slice(0,5).map(p => ({ name: p.name.split(' ').slice(0,3).join(' '), sold: p.sold }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize:11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize:11 }} width={120} />
                <Tooltip />
                <Bar dataKey="sold" fill="#6366f1" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Add Product Modal ── */}
      <AnimatePresence>
        {showAddProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-indigo-600">
                <h2 className="font-bold text-white">Add Product</h2>
                <button onClick={() => setShowAddProduct(false)} className="p-1.5 hover:bg-white/20 rounded-full text-white/80 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { label:'Product Name', key:'name', type:'text', placeholder:'e.g. Crystal Seed Beads' },
                  { label:'Price (₦)', key:'price', type:'number', placeholder:'0' },
                  { label:'Stock Quantity', key:'stock', type:'number', placeholder:'0' },
                  { label:'Description', key:'description', type:'text', placeholder:'Brief description...' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{f.label}</label>
                    <input type={f.type} value={(newProduct as any)[f.key]} onChange={e => setNewProduct(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      className="w-full mt-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Category</label>
                  <select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
                    className="w-full mt-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => setShowAddProduct(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">Cancel</button>
                <button onClick={addProduct} disabled={!newProduct.name || !newProduct.price}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition">
                  <Check className="h-4 w-4" /> Add Product
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
