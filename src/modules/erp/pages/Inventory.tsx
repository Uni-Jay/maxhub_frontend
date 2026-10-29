import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ExternalLink, ImagePlus, Loader2, Package, Settings2, Store, Trash2, X, Plus } from 'lucide-react';
import RecordBoard, { type RecordBoardConfig, inputCls, labelCls, btnGhost, btnPrimary, card } from '@components/erp/RecordBoard';
import { BrandTheme } from '@components/erp/BrandTheme';
import { ERP_PATHS, erpService, money } from '@services/erpService';
import { apiClient } from '@services/apiClient';
import { uploadToCloudinary } from '@services/cloudinaryService';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

type BrandKey = 'beadmax' | 'maxfood';
const REASONS_IN = ['Restock', 'Production (made in-house)', 'Returned', 'Count correction'];
const REASONS_OUT = ['Sale', 'Damaged', 'Used in production', 'Sample / gift', 'Count correction'];

/** Stock value, low stock and out-of-stock counts for a brand. */
export function InventorySummaryBar({ brand }: { brand: BrandKey }) {
  const { data } = useQuery({ queryKey: ['inventory-summary', brand], queryFn: () => apiClient.get<any>(`/erp/${brand}/inventory-summary`), refetchInterval: 60_000 });
  if (!data) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Tile label="Products" value={String(data.products)} sub={`${Number(data.units).toLocaleString()} units in stock`} />
      <Tile label="Stock value (selling price)" value={money(data.saleValueNgn, 'NGN')} />
      {data.costValueNgn !== null && <Tile label="Stock value (cost)" value={money(data.costValueNgn, 'NGN')} />}
      <Tile label="Low / out of stock" value={`${data.lowStock.length} / ${data.outOfStock}`} warn={data.lowStock.length > 0 || data.outOfStock > 0}
        sub={data.lowStock.slice(0, 2).map((p: any) => `${p.name} (${p.stockQty})`).join(', ')} />
    </div>
  );
}

function Tile({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={cn(card, 'p-4')}>
      <p className="text-xs text-gray-500 flex items-center gap-1">{warn && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}{label}</p>
      <p className={cn('text-lg font-bold tabular-nums mt-0.5', warn ? 'text-amber-600' : 'text-gray-900 dark:text-white')}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
    </div>
  );
}

/** Stock in / out and the movement history of one product. */
export function StockPanel({ brand, product, refresh }: { brand: BrandKey; product: any; refresh: () => void }) {
  const qc = useQueryClient();
  const [dir, setDir] = useState<'in' | 'out'>('in');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState(REASONS_IN[0]);
  const [note, setNote] = useState('');
  const moves = useQuery({ queryKey: ['stock-moves', brand, product.id], queryFn: () => apiClient.get<any[]>(`/erp/${brand}/stock-movements`, { productId: product.id }) });
  const save = useMutation({
    mutationFn: () => apiClient.post(`/erp/${brand}/stock`, { productId: product.id, change: (dir === 'in' ? 1 : -1) * Number(qty), reason, note }),
    onSuccess: () => {
      toast.success('Stock updated'); setQty(''); setNote('');
      moves.refetch(); refresh(); qc.invalidateQueries({ queryKey: ['inventory-summary', brand] });
    },
    onError: (e: any) => toast.fromError(e, 'Could not update stock'),
  });
  const low = Number(product.reorderLevel) > 0 && Number(product.stockQty) <= Number(product.reorderLevel);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Package className="h-4 w-4" />Stock</p>
        <p className={cn('text-lg font-bold tabular-nums', low ? 'text-amber-600' : 'text-gray-900 dark:text-white')}>{Number(product.stockQty)} <span className="text-xs font-normal text-gray-500">{product.unit}</span></p>
      </div>
      <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 w-fit text-xs">
        <button onClick={() => { setDir('in'); setReason(REASONS_IN[0]); }} className={cn('px-3 py-1 rounded-md flex items-center gap-1', dir === 'in' ? 'bg-white dark:bg-gray-900 shadow-sm text-emerald-700' : 'text-gray-500')}><ArrowDownCircle className="h-3.5 w-3.5" />Stock in</button>
        <button onClick={() => { setDir('out'); setReason(REASONS_OUT[0]); }} className={cn('px-3 py-1 rounded-md flex items-center gap-1', dir === 'out' ? 'bg-white dark:bg-gray-900 shadow-sm text-red-600' : 'text-gray-500')}><ArrowUpCircle className="h-3.5 w-3.5" />Stock out</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Quantity</label><input type="number" min={0} step="0.01" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        <div><label className={labelCls}>Reason</label><select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>{(dir === 'in' ? REASONS_IN : REASONS_OUT).map((r) => <option key={r}>{r}</option>)}</select></div>
        <div className="col-span-2"><label className={labelCls}>Note (optional)</label><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier, invoice no., customer…" /></div>
      </div>
      <button className={btnPrimary} disabled={!(Number(qty) > 0) || save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
      {!!moves.data?.length && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-2 max-h-48 overflow-y-auto">
          {moves.data.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-600 dark:text-gray-300">{m.reason}{m.reference ? ` · ${m.reference}` : ''} <span className="text-gray-400">· {m.createdByName} · {new Date(m.createdAt).toLocaleDateString('en-GB')}</span></span>
              <span className={cn('font-semibold tabular-nums', Number(m.change) > 0 ? 'text-emerald-600' : 'text-red-600')}>{Number(m.change) > 0 ? '+' : ''}{Number(m.change)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Product photos (up to 6) uploaded to Cloudinary. */
function ImagesField({ form, set }: { form: any; set: (p: any) => void }) {
  const images: string[] = Array.isArray(form.images) ? form.images : [];
  const [busy, setBusy] = useState(false);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 6 - images.length)) urls.push((await uploadToCloudinary(f, 'beadmax-shop')).url);
      set({ images: [...images, ...urls] });
    } catch (e: any) { toast.error('Upload failed', e?.message); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Photos <span className="text-xs font-normal text-gray-500">— the first one is the main photo on the shop</span></p>
      <div className="flex flex-wrap gap-2">
        {images.map((u, i) => (
          <div key={u} className="relative w-20 h-20 rounded-lg overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 group">
            <img src={u} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => set({ images: images.filter((_, j) => j !== i) })} className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
          </div>
        ))}
        {images.length < 6 && (
          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-gray-400">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ImagePlus className="h-5 w-5" /><span className="text-[10px] mt-0.5">Add</span></>}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
          </label>
        )}
      </div>
    </div>
  );
}

const BM_FINISHED = ['Necklace', 'Bracelet', 'Earrings', 'Anklet', 'Bridal set', 'Waist beads', 'Bag', 'Hair accessory', 'Home décor', 'Other'];
const BM_RAW = ['Beads', 'Crystals', 'Pearls', 'Wire', 'Thread', 'Clasps & findings', 'Packaging', 'Tools'];

export const shopProducts: RecordBoardConfig = {
  base: ERP_PATHS.shopProducts, entity: 'shop_product', title: 'BeadMax — Inventory & products', singular: 'Product', brandCode: 'BM', allowMessage: false, allowBoard: false,
  subtitle: 'Finished pieces for sale and raw materials (beads, wire, clasps…). Tick “Show on beadmax.net” to sell a piece in the online shop.',
  titleOf: (r) => r.name, subtitleOf: (r) => `${r.kind === 'Raw material' ? 'Raw material' : r.category}${r.colour ? ` · ${r.colour}` : ''}${r.isPublished ? ' · On the website' : ''}`,
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: 'Coral bridal set' },
    { name: 'kind', label: 'Type', type: 'select', options: ['Finished product', 'Raw material'], default: 'Finished product' },
    { name: 'category', label: 'Category', type: 'select', options: [...BM_FINISHED, ...BM_RAW], default: 'Necklace' },
    { name: 'material', label: 'Material', placeholder: 'Crystal, coral, seed beads…' },
    { name: 'colour', label: 'Colour' },
    { name: 'size', label: 'Size / length', placeholder: '18 inch, 8 mm…' },
    { name: 'unit', label: 'Counted in', type: 'select', options: ['piece', 'set', 'pair', 'strand', 'pack', 'roll', 'gram'], default: 'piece' },
    { name: 'stockQty', label: 'Opening stock', type: 'number', createOnly: true },
    { name: 'reorderLevel', label: 'Alert me when stock falls to', type: 'number' },
    { name: 'costPrice', label: 'Cost price', type: 'money' },
    { name: 'price', label: 'Selling price', type: 'money' },
    { name: 'compareAtPrice', label: 'Old price (shown crossed out)', type: 'money' },
    { name: 'currency', label: 'Currency', type: 'currency', default: 'NGN' },
    { name: 'supplier', label: 'Supplier' },
    { name: 'madeToOrder', label: 'Made to order (can sell when out of stock)', type: 'checkbox' },
    { name: 'leadTimeDays', label: 'Days to make', type: 'number' },
    { name: 'isPublished', label: 'Show on beadmax.net', type: 'checkbox' },
    { name: 'isFeatured', label: 'Feature on the shop front page', type: 'checkbox' },
    { name: 'isActive', label: 'Active', type: 'checkbox', default: true },
    { name: 'description', label: 'Description (shown on the website)', type: 'textarea' },
  ],
  formExtras: (form, set) => (form.kind === 'Raw material' ? null : <ImagesField form={form} set={set} />),
  detailExtras: (r, refresh) => (
    <div className="space-y-3">
      {Array.isArray(r.images) && r.images.length > 0 && <div className="flex gap-2 flex-wrap">{r.images.map((u: string) => <img key={u} src={u} alt="" className="w-20 h-20 rounded-lg object-cover ring-1 ring-gray-200" />)}</div>}
      {r.isPublished && r.slug && <a href={`https://www.beadmax.net/shop/${r.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs brand-text font-medium"><ExternalLink className="h-3.5 w-3.5" />View on beadmax.net</a>}
      <StockPanel brand="beadmax" product={r} refresh={refresh} />
    </div>
  ),
  summary: <InventorySummaryBar brand="beadmax" />,
  columns: [
    { key: 'name', label: 'Product', render: (r) => <span className="flex items-center gap-2">{Array.isArray(r.images) && r.images[0] ? <img src={r.images[0]} alt="" className="w-8 h-8 rounded object-cover" /> : null}{r.name}</span> },
    { key: 'category', label: 'Category', render: (r) => `${r.category}${r.kind === 'Raw material' ? ' (raw)' : ''}` },
    { key: 'price', label: 'Price', render: (r) => money(r.price, r.currency) },
    { key: 'stockQty', label: 'Stock', render: (r) => <span className={cn(Number(r.reorderLevel) > 0 && Number(r.stockQty) <= Number(r.reorderLevel) && 'text-amber-600 font-semibold')}>{Number(r.stockQty)} {r.unit}</span> },
    { key: 'isPublished', label: 'Website', render: (r) => (r.isPublished ? <span className="text-emerald-600 text-xs font-medium">Live</span> : <span className="text-gray-400 text-xs">—</span>) },
  ],
};

function ShopOrderItems({ form, set }: { form: any; set: (p: any) => void }) {
  const { data } = useQuery({ queryKey: ['erp:shop_product:list', 'picker'], queryFn: () => erpService.list(ERP_PATHS.shopProducts, { limit: 500, kind: 'Finished product' }) });
  const products = data?.items ?? [];
  const items: any[] = Array.isArray(form.items) ? form.items : [];
  const update = (next: any[]) => set({ items: next });
  const subtotal = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.price || 0), 0);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <div className="flex justify-between items-center"><p className="text-sm font-medium text-gray-900 dark:text-white">Items</p>
        <button type="button" className={btnGhost} onClick={() => update([...items, { productId: '', name: '', qty: 1, price: 0 }])}><Plus className="h-4 w-4" /> Add item</button></div>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-6"><label className={labelCls}>Product</label>
            <select className={inputCls} value={it.productId || ''} onChange={(e) => {
              const p = products.find((x: any) => String(x.id) === e.target.value);
              update(items.map((x, j) => (j === i ? { ...x, productId: e.target.value, name: p?.name || x.name, price: p ? Number(p.price) : x.price, image: p?.images?.[0] } : x)));
            }}>
              <option value="">Choose…</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {money(p.price, p.currency)} · stock {Number(p.stockQty)}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className={labelCls}>Qty</label><input type="number" min={1} className={inputCls} value={it.qty} onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} /></div>
          <div className="col-span-3"><label className={labelCls}>Price</label><input type="number" step="0.01" className={inputCls} value={it.price} onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} /></div>
          <button type="button" className="col-span-1 p-2 text-red-500" onClick={() => update(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <p className="text-xs text-gray-500 text-right">Subtotal {money(subtotal, 'NGN')} · Total = subtotal + delivery − discount. Stock is taken out when you confirm the order.</p>
    </div>
  );
}

function ShopSettings({ onClose }: { onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['beadmax-shop-settings'], queryFn: () => apiClient.get<any>('/erp/beadmax/shop-settings') });
  const [f, setF] = useState<any>(null);
  const v = f || data;
  const save = useMutation({
    mutationFn: () => apiClient.put('/erp/beadmax/shop-settings', v),
    onSuccess: () => { toast.success('Shop settings saved'); onClose(); },
    onError: (e: any) => toast.fromError(e, 'Could not save'),
  });
  if (!v) return null;
  const set = (patch: any) => setF({ ...v, ...patch });
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900 dark:text-white">Online shop settings</h3><button onClick={onClose}><X className="h-4 w-4 text-gray-500" /></button></div>
        <p className="text-xs text-gray-500">Shown to customers at checkout on beadmax.net and in their order email.</p>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Delivery fee — Lagos (₦)</label><input type="number" className={inputCls} value={v.deliveryFees?.Lagos ?? ''} onChange={(e) => set({ deliveryFees: { ...v.deliveryFees, Lagos: e.target.value } })} /></div>
          <div><label className={labelCls}>Other states (₦)</label><input type="number" className={inputCls} value={v.deliveryFees?.['Other states'] ?? ''} onChange={(e) => set({ deliveryFees: { ...v.deliveryFees, 'Other states': e.target.value } })} /></div>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white pt-2">Bank account for transfers</p>
        <div><label className={labelCls}>Bank</label><input className={inputCls} value={v.bank?.bankName || ''} onChange={(e) => set({ bank: { ...v.bank, bankName: e.target.value } })} /></div>
        <div><label className={labelCls}>Account name</label><input className={inputCls} value={v.bank?.accountName || ''} onChange={(e) => set({ bank: { ...v.bank, accountName: e.target.value } })} /></div>
        <div><label className={labelCls}>Account number</label><input className={inputCls} value={v.bank?.accountNumber || ''} onChange={(e) => set({ bank: { ...v.bank, accountNumber: e.target.value } })} /></div>
        <div className="flex justify-end gap-2 pt-2"><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={() => save.mutate()} disabled={save.isPending}>Save</button></div>
      </div>
    </div>
  );
}

function ShopHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href="https://www.beadmax.net/shop" target="_blank" rel="noreferrer" className={btnGhost}><Store className="h-4 w-4" />Open the shop</a>
      <button className={btnGhost} onClick={() => setOpen(true)}><Settings2 className="h-4 w-4" />Shop settings</button>
      {open && <ShopSettings onClose={() => setOpen(false)} />}
    </div>
  );
}

export const shopOrders: RecordBoardConfig = {
  base: ERP_PATHS.shopOrders, entity: 'shop_order', title: 'BeadMax — Online shop orders', singular: 'Shop order', brandCode: 'BM',
  subtitle: 'Orders from beadmax.net arrive here automatically. Add Instagram, WhatsApp and walk-in orders too.',
  allowPayments: true, allowDocuments: false,
  titleOf: (r) => r.customerName, subtitleOf: (r) => `${r.source} · ${r.deliveryMethod}${r.state ? ` · ${r.state}` : ''} · ${r.paymentStatus}`,
  amountOf: (r) => Number(r.total || 0), currencyOf: () => 'NGN',
  fields: [
    { name: 'customerName', label: 'Customer', required: true },
    { name: 'customerPhone', label: 'Phone', type: 'tel', required: true },
    { name: 'customerWhatsapp', label: 'WhatsApp', type: 'tel' },
    { name: 'customerEmail', label: 'Email', type: 'email' },
    { name: 'source', label: 'Order came from', type: 'select', options: ['Website', 'Instagram', 'WhatsApp', 'Walk-in', 'Referral', 'Other'], default: 'Instagram' },
    { name: 'deliveryMethod', label: 'Delivery', type: 'select', options: ['Delivery', 'Pick-up'], default: 'Delivery' },
    { name: 'deliveryAddress', label: 'Address', type: 'textarea' },
    { name: 'city', label: 'City' },
    { name: 'state', label: 'State' },
    { name: 'deliveryFee', label: 'Delivery fee', type: 'money' },
    { name: 'discount', label: 'Discount', type: 'money' },
    { name: 'paymentMethod', label: 'Payment', type: 'select', options: ['Bank transfer', 'Pay on delivery', 'Card (Paystack)', 'Cash'], default: 'Bank transfer' },
    { name: 'paymentStatus', label: 'Payment status', type: 'select', options: ['Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
    { name: 'trackingNo', label: 'Dispatch / tracking number' },
    { name: 'assignedToUserId', label: 'Handled by', type: 'user' },
    { name: 'subtotal', label: 'Subtotal', type: 'money', hideInForm: true },
    { name: 'total', label: 'Total', type: 'money', hideInForm: true },
    { name: 'customerNote', label: 'Customer note', type: 'textarea', hideInForm: true },
    { name: 'notes', label: 'Internal notes', type: 'textarea' },
  ],
  formExtras: (form, set) => <ShopOrderItems form={form} set={set} />,
  detailExtras: (r) => (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <table className="w-full text-sm"><thead><tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500"><th className="text-left px-3 py-2">Item</th><th className="text-right px-3 py-2">Qty</th><th className="text-right px-3 py-2">Price</th><th className="text-right px-3 py-2">Line</th></tr></thead>
        <tbody>{(r.items || []).map((i: any, k: number) => (
          <tr key={k} className="border-t border-gray-50 dark:border-gray-800"><td className="px-3 py-2 flex items-center gap-2">{i.image && <img src={i.image} alt="" className="w-7 h-7 rounded object-cover" />}{i.name}</td><td className="px-3 py-2 text-right">{i.qty}</td><td className="px-3 py-2 text-right">{money(i.price, 'NGN')}</td><td className="px-3 py-2 text-right">{money(Number(i.qty) * Number(i.price), 'NGN')}</td></tr>
        ))}</tbody></table>
      <div className="text-xs text-gray-600 dark:text-gray-300 px-3 py-2 space-y-0.5 border-t border-gray-100 dark:border-gray-800">
        <p>Delivery {money(r.deliveryFee, 'NGN')}{Number(r.discount) ? ` · Discount −${money(r.discount, 'NGN')}` : ''} · <b>Total {money(r.total, 'NGN')}</b></p>
        {r.customerNote && <p className="italic">“{r.customerNote}”</p>}
      </div>
    </div>
  ),
  headerExtras: <ShopHeader />,
  columns: [
    { key: 'customerName', label: 'Customer' }, { key: 'source', label: 'From' },
    { key: 'items', label: 'Items', render: (r) => (r.items || []).map((i: any) => `${i.qty}× ${i.name}`).join(', ') },
    { key: 'paymentStatus', label: 'Payment', render: (r) => <span className={cn('text-xs font-medium', r.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600')}>{r.paymentStatus}</span> },
    { key: 'total', label: 'Total', render: (r) => money(r.total, 'NGN') },
  ],
};

export function BeadMaxInventory() {
  return <BrandTheme code="BM" header><RecordBoard cfg={shopProducts} /></BrandTheme>;
}

export function BeadMaxShop() {
  return <BrandTheme code="BM" header><RecordBoard cfg={shopOrders} /></BrandTheme>;
}
