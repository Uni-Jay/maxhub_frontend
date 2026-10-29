import { type ReactNode } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, GraduationCap, ShoppingBag, Users, BookOpen, Receipt, Award, ClipboardList, AlertTriangle } from 'lucide-react';
import RecordBoard, { type RecordBoardConfig, btnGhost, inputCls, labelCls, card } from '@components/erp/RecordBoard';
import { ERP_PATHS, erpService, money } from '@services/erpService';
import { cn } from '@utils/cn';
import { BrandTheme } from '@components/erp/BrandTheme';
import { StockPanel, InventorySummaryBar } from './Inventory';

function Tabs({ tabs }: { tabs: { key: string; label: string; node: ReactNode }[] }) {
  const [params, setParams] = useSearchParams();
  const active = params.get('tab') || tabs[0].key;
  const current = tabs.find((t) => t.key === active) || tabs[0];
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { const p = new URLSearchParams(); p.set('tab', t.key); setParams(p, { replace: true }); }}
            className={cn('px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px', current.key === t.key ? 'brand-border brand-text' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200')}>
            {t.label}
          </button>
        ))}
      </div>
      <div key={current.key}>{current.node}</div>
    </div>
  );
}

function QuickLinks({ title, links }: { title: string; links: { to: string; label: string; icon: any; desc: string }[] }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={cn(card, 'p-4 brand-hover-border transition flex gap-3')}>
            <div className="h-10 w-10 rounded-xl brand-soft flex items-center justify-center flex-shrink-0"><l.icon className="h-5 w-5" /></div>
            <div><p className="font-medium text-gray-900 dark:text-white">{l.label}</p><p className="text-xs text-gray-500">{l.desc}</p></div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

const contactFields = [
  { name: 'customerName', label: 'Client / company', required: true },
  { name: 'customerPhone', label: 'Phone', type: 'tel' as const },
  { name: 'customerEmail', label: 'Email', type: 'email' as const },
];

// ─── Kurios SAT ─────────────────────────────────────────────────────────────
const techProjects: RecordBoardConfig = {
  base: ERP_PATHS.techProjects, entity: 'tech_project', title: 'Client projects', singular: 'Client project', brandCode: 'KS-ICT',
  subtitle: 'Websites, web apps, mobile apps and software for clients — from lead to delivery and maintenance.',
  allowPayments: true, allowDocuments: true, titleOf: (r) => r.title, subtitleOf: (r) => `${r.customerName} · ${r.projectType}`,
  amountOf: (r) => Number(r.contractValue || 0),
  fields: [
    ...contactFields,
    { name: 'title', label: 'Project title', required: true },
    { name: 'projectType', label: 'Type', type: 'select', options: ['Website', 'Web Application', 'Mobile Application', 'E-commerce', 'ERP / Business Software', 'UI/UX Design', 'API / Integration', 'IT Support', 'Networking / Hardware', 'Other'], default: 'Web Application' },
    { name: 'techStack', label: 'Tech stack', placeholder: 'React, Node, Postgres…' },
    { name: 'startDate', label: 'Start date', type: 'date' },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'contractValue', label: 'Contract value', type: 'money' },
    { name: 'currency', label: 'Currency', type: 'currency', default: 'NGN' },
    { name: 'progress', label: 'Progress (%)', type: 'number', default: 0 },
    { name: 'assignedToUserId', label: 'Project lead', type: 'user' },
    { name: 'repoUrl', label: 'Repository URL' },
    { name: 'stagingUrl', label: 'Staging URL' },
    { name: 'liveUrl', label: 'Live URL' },
    { name: 'description', label: 'Scope / requirements', type: 'textarea' },
  ],
  columns: [
    { key: 'title', label: 'Project' }, { key: 'customerName', label: 'Client' }, { key: 'projectType', label: 'Type' },
    { key: 'dueDate', label: 'Due', render: (r) => (r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—') },
    { key: 'progress', label: 'Progress', render: (r) => <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded"><div className="h-full brand-bg rounded" style={{ width: `${r.progress || 0}%` }} /></div> },
    { key: 'contractValue', label: 'Value', render: (r) => money(r.contractValue, r.currency) },
  ],
};

const subscriptions: RecordBoardConfig = {
  base: ERP_PATHS.subscriptions, entity: 'service_subscription', title: 'Hosting, domains & renewals', singular: 'Service', brandCode: 'KS-ICT', stageField: 'status',
  subtitle: 'Reminders go to the owner 30, 7 and 1 day before renewal.', allowPayments: true, allowDocuments: true, allowBoard: false,
  titleOf: (r) => r.name, subtitleOf: (r) => `${r.serviceType} · ${r.customerName}`, amountOf: (r) => Number(r.sellingPrice || 0),
  fields: [
    ...contactFields,
    { name: 'serviceType', label: 'Service', type: 'select', options: ['Domain', 'Hosting', 'SSL', 'Business Email', 'Maintenance', 'Cloud Server', 'Software License', 'SMS/API', 'Other'], default: 'Hosting', required: true },
    { name: 'name', label: 'Domain / plan name', required: true, placeholder: 'clientsite.com' },
    { name: 'provider', label: 'Provider', placeholder: 'Whogohost, Namecheap, AWS…' },
    { name: 'startDate', label: 'Start date', type: 'date' },
    { name: 'renewalDate', label: 'Renewal date', type: 'date', required: true },
    { name: 'billingCycle', label: 'Billing cycle', type: 'select', options: ['Monthly', 'Quarterly', 'Yearly', 'Two-yearly'], default: 'Yearly' },
    { name: 'costPrice', label: 'Our cost', type: 'money' },
    { name: 'sellingPrice', label: 'Client price', type: 'money' },
    { name: 'currency', label: 'Currency', type: 'currency', default: 'NGN' },
    { name: 'autoRenew', label: 'Auto-renew', type: 'checkbox' },
    { name: 'assignedToUserId', label: 'Owner', type: 'user' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { key: 'name', label: 'Service' }, { key: 'serviceType', label: 'Type' }, { key: 'customerName', label: 'Client' },
    { key: 'renewalDate', label: 'Renews', render: (r) => { const d = r.renewalDate ? Math.ceil((new Date(r.renewalDate).getTime() - Date.now()) / 86400000) : null; return <span className={cn(d !== null && d <= 7 ? 'text-red-600 font-medium' : d !== null && d <= 30 ? 'text-amber-600' : '')}>{r.renewalDate ? new Date(r.renewalDate).toLocaleDateString() : '—'}{d !== null ? ` (${d}d)` : ''}</span>; } },
    { key: 'sellingPrice', label: 'Price', render: (r) => money(r.sellingPrice, r.currency) },
  ],
};

export const ticketsConfig = (brandCode = 'KS-ICT'): RecordBoardConfig => ({
  base: ERP_PATHS.tickets, entity: 'support_ticket', title: 'Support tickets', singular: 'Ticket', brandCode, stageField: 'status',
  subtitle: 'Customer issues with SLA timers (Urgent 4h · High 24h · Medium 72h · Low 5 days).', allowDocuments: false,
  brandChoices: [{ code: 'KS-ICT', label: 'Kurios SAT — ICT Solutions' }, { code: 'VM', label: 'VisaMax' }, { code: 'BM', label: 'BeadMax' }, { code: 'MF', label: 'Maxfood Farm' }],
  titleOf: (r) => r.subject, subtitleOf: (r) => `${r.customerName} · ${r.priority}`,
  fields: [
    ...contactFields,
    { name: 'subject', label: 'Subject', required: true, span: 2 },
    { name: 'category', label: 'Category', type: 'select', options: ['Bug', 'Feature request', 'Hosting / downtime', 'Email', 'Account / login', 'Billing', 'Training', 'Other'] },
    { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    { name: 'assignedToUserId', label: 'Assigned to', type: 'user' },
    { name: 'slaDueAt', label: 'SLA due', type: 'datetime', hideInForm: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'resolution', label: 'Resolution', type: 'textarea' },
  ],
  columns: [
    { key: 'subject', label: 'Subject' }, { key: 'customerName', label: 'Customer' }, { key: 'priority', label: 'Priority' },
    { key: 'slaDueAt', label: 'SLA', render: (r) => { const late = r.slaDueAt && new Date(r.slaDueAt) < new Date() && !['Resolved', 'Closed'].includes(r.status); return <span className={cn(late && 'text-red-600 font-medium inline-flex items-center gap-1')}>{late && <AlertTriangle className="h-3 w-3" />}{r.slaDueAt ? new Date(r.slaDueAt).toLocaleString() : '—'}</span>; } },
  ],
});

export function KuriosSolutions() {
  return (
    <BrandTheme code="KS" header><Tabs tabs={[
      { key: 'projects', label: 'Client projects', node: <RecordBoard cfg={techProjects} /> },
      { key: 'renewals', label: 'Hosting & renewals', node: <RecordBoard cfg={subscriptions} /> },
      { key: 'tickets', label: 'Support tickets', node: <RecordBoard cfg={ticketsConfig()} /> },
    ]} /></BrandTheme>
  );
}

export function KuriosTraining() {
  return <BrandTheme code="KS" header><QuickLinks title="Kurios SAT — ICT Training Center" links={[
    { to: '/lms/courses?school=KS', label: 'Courses', icon: BookOpen, desc: 'Programmes, modules and lessons' },
    { to: '/lms/students?school=KS', label: 'Students', icon: Users, desc: 'Enrolled students and progress' },
    { to: '/lms/exams?school=KS', label: 'Exams (CBT)', icon: ClipboardList, desc: 'Computer-based tests and results' },
    { to: '/lms/certificates?school=KS', label: 'Certificates', icon: Award, desc: 'Issue and verify certificates' },
    { to: '/lms/fee-receipts?school=KS', label: 'Fee receipts', icon: Receipt, desc: 'Tuition payments and balances' },
    { to: '/documents?brand=KS', label: 'Student terms & agreements', icon: GraduationCap, desc: 'Send T&Cs for students to sign' },
  ]} /></BrandTheme>;
}

// ─── BeadMax ────────────────────────────────────────────────────────────────
const customOrders: RecordBoardConfig = {
  base: ERP_PATHS.customOrders, entity: 'custom_order', title: 'BeadMax Design — Custom orders', singular: 'Custom order', brandCode: 'BM-DSN',
  subtitle: 'Bespoke bead bags, jewellery and sets — from request and design through production, quality check and delivery.',
  allowPayments: true, allowDocuments: true, titleOf: (r) => r.title, subtitleOf: (r) => `${r.customerName} · ${r.itemType} × ${r.quantity}`,
  amountOf: (r) => Number(r.totalPrice || 0),
  fields: [
    { name: 'customerName', label: 'Customer', required: true },
    { name: 'customerPhone', label: 'Phone', type: 'tel', required: true },
    { name: 'customerWhatsapp', label: 'WhatsApp', type: 'tel' },
    { name: 'customerEmail', label: 'Email', type: 'email' },
    { name: 'title', label: 'Order title', required: true, placeholder: 'Wedding bead set — wine & gold' },
    { name: 'itemType', label: 'Item', type: 'select', options: ['Bag', 'Necklace', 'Bracelet', 'Earrings', 'Anklet', 'Set', 'Crown / Hair piece', 'Waist beads', 'Accessory', 'Other'], default: 'Bag' },
    { name: 'colors', label: 'Colours' },
    { name: 'materials', label: 'Beads / materials' },
    { name: 'size', label: 'Size / measurements' },
    { name: 'quantity', label: 'Quantity', type: 'number', default: 1 },
    { name: 'unitPrice', label: 'Unit price', type: 'money' },
    { name: 'currency', label: 'Currency', type: 'currency', default: 'NGN' },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'deliveryMethod', label: 'Delivery', type: 'select', options: ['Pickup', 'Dispatch rider (Lagos)', 'Interstate courier', 'International shipping'] },
    { name: 'deliveryAddress', label: 'Delivery address', type: 'textarea' },
    { name: 'assignedToUserId', label: 'Artisan', type: 'user' },
    { name: 'description', label: 'Design brief', type: 'textarea' },
  ],
  columns: [
    { key: 'title', label: 'Order' }, { key: 'customerName', label: 'Customer' }, { key: 'itemType', label: 'Item' },
    { key: 'dueDate', label: 'Due', render: (r) => (r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—') },
    { key: 'totalPrice', label: 'Total', render: (r) => money(r.totalPrice, r.currency) },
  ],
};

export function BeadMaxCustomOrders() {
  return <BrandTheme code="BM" header><RecordBoard cfg={{ ...customOrders, headerExtras: <div className="flex gap-2"><NavLink to="/beadmax/shop" className={btnGhost}><ShoppingBag className="h-4 w-4" /> Online shop orders</NavLink><NavLink to="/beadmax/inventory" className={btnGhost}><ShoppingBag className="h-4 w-4" /> Inventory & products</NavLink></div> }} /></BrandTheme>;
}

export function BeadMaxSchool() {
  return <BrandTheme code="BM" header><QuickLinks title="Beadmax Design Vocational School" links={[
    { to: '/lms/students?school=BM', label: 'Students', icon: Users, desc: 'Register and manage students' },
    { to: '/lms/courses?school=BM', label: 'Courses', icon: BookOpen, desc: 'Bag making, jewellery, accessories' },
    { to: '/lms/fee-receipts?school=BM', label: 'Fee receipts', icon: Receipt, desc: 'Course fees and balances' },
    { to: '/lms/certificates?school=BM', label: 'Certificates', icon: Award, desc: 'Graduation certificates' },
    { to: '/documents?brand=BM', label: 'Enrolment agreements', icon: GraduationCap, desc: 'Send the enrolment agreement to sign' },
  ]} /></BrandTheme>;
}

// ─── Maxfood Farm ───────────────────────────────────────────────────────────
function OrderItems({ form, set }: { form: any; set: (p: any) => void }) {
  const { data } = useQuery({ queryKey: ['erp:food_product:list', 'picker'], queryFn: () => erpService.list(ERP_PATHS.foodProducts, { limit: 500 }) });
  const products = data?.items ?? [];
  const items: any[] = Array.isArray(form.items) ? form.items : [];
  const update = (next: any[]) => set({ items: next });
  const subtotal = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unitPrice || 0), 0);
  const weight = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.weightKg || 0), 0);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <div className="flex justify-between items-center"><p className="text-sm font-medium text-gray-900 dark:text-white">Items</p>
        <button type="button" className={btnGhost} onClick={() => update([...items, { productId: '', name: '', qty: 1, unitPrice: 0, weightKg: 1 }])}><Plus className="h-4 w-4" /> Add item</button></div>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-5"><label className={labelCls}>Product</label>
            <select className={inputCls} value={it.productId || ''} onChange={(e) => {
              const p = products.find((x: any) => String(x.id) === e.target.value);
              update(items.map((x, j) => (j === i ? { ...x, productId: e.target.value, name: p?.name || x.name, unitPrice: p ? Number(p.sellingPrice) : x.unitPrice, weightKg: p ? Number(p.unitWeightKg) : x.weightKg, unit: p?.unit } : x)));
            }}>
              <option value="">Custom item…</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.unit}) — stock {Number(p.stockQty)}</option>)}
            </select>
            {!it.productId && <input className={cn(inputCls, 'mt-1')} placeholder="Item name" value={it.name} onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />}
          </div>
          <div className="col-span-2"><label className={labelCls}>Qty</label><input type="number" min={0} className={inputCls} value={it.qty} onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} /></div>
          <div className="col-span-2"><label className={labelCls}>Unit price</label><input type="number" step="0.01" className={inputCls} value={it.unitPrice} onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} /></div>
          <div className="col-span-2"><label className={labelCls}>kg / unit</label><input type="number" step="0.01" className={inputCls} value={it.weightKg} onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, weightKg: e.target.value } : x)))} /></div>
          <button type="button" className="col-span-1 p-2 text-red-500" onClick={() => update(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <p className="text-xs text-gray-500 text-right">Subtotal {money(subtotal, form.currency || 'USD')} · Weight {weight.toFixed(2)} kg · Total = subtotal + shipping + other charges</p>
    </div>
  );
}

const exportOrders: RecordBoardConfig = {
  base: ERP_PATHS.exportOrders, entity: 'export_order', title: 'Maxfood Farm — Export orders', singular: 'Export order', brandCode: 'MF',
  subtitle: 'Nigerian foodstuff for customers abroad: payment, sourcing, packaging, export documents, customs and shipping. Stock is deducted when packing starts.',
  allowPayments: true, allowDocuments: true, titleOf: (r) => r.customerName, subtitleOf: (r) => `${r.destinationCity ? `${r.destinationCity}, ` : ''}${r.destinationCountry} · ${r.shippingMethod}`,
  amountOf: (r) => Number(r.total || 0),
  fields: [
    { name: 'customerName', label: 'Customer', required: true },
    { name: 'customerWhatsapp', label: 'WhatsApp', type: 'tel' },
    { name: 'customerPhone', label: 'Phone', type: 'tel' },
    { name: 'customerEmail', label: 'Email', type: 'email' },
    { name: 'destinationCountry', label: 'Destination country', required: true, placeholder: 'United Kingdom' },
    { name: 'destinationCity', label: 'City' },
    { name: 'deliveryAddress', label: 'Delivery address', type: 'textarea' },
    { name: 'currency', label: 'Currency', type: 'currency', default: 'USD' },
    { name: 'shippingMethod', label: 'Shipping method', type: 'select', options: ['Air Cargo', 'Sea Freight', 'Courier (DHL)', 'Courier (FedEx)', 'Courier (UPS)', 'Other'], default: 'Air Cargo' },
    { name: 'shippingFee', label: 'Shipping fee', type: 'money' },
    { name: 'otherCharges', label: 'Other charges (packaging, docs)', type: 'money' },
    { name: 'carrier', label: 'Carrier / agent' },
    { name: 'trackingNo', label: 'Tracking number' },
    { name: 'airwayBill', label: 'Airway bill / BL number' },
    { name: 'shipDate', label: 'Ship date', type: 'date' },
    { name: 'expectedDelivery', label: 'Expected delivery', type: 'date' },
    { name: 'assignedToUserId', label: 'Handled by', type: 'user' },
    { name: 'subtotal', label: 'Subtotal', type: 'money', hideInForm: true },
    { name: 'total', label: 'Total', type: 'money', hideInForm: true },
    { name: 'totalWeightKg', label: 'Total weight (kg)', hideInForm: true },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  formExtras: (form, set) => <OrderItems form={form} set={set} />,
  detailExtras: (r) => (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <table className="w-full text-sm"><thead><tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500"><th className="text-left px-3 py-2">Item</th><th className="text-right px-3 py-2">Qty</th><th className="text-right px-3 py-2">Price</th><th className="text-right px-3 py-2">Line</th></tr></thead>
        <tbody>{(r.items || []).map((i: any, k: number) => <tr key={k} className="border-t border-gray-50 dark:border-gray-800"><td className="px-3 py-2">{i.name}</td><td className="px-3 py-2 text-right">{i.qty}</td><td className="px-3 py-2 text-right">{money(i.unitPrice, r.currency)}</td><td className="px-3 py-2 text-right">{money(Number(i.qty) * Number(i.unitPrice), r.currency)}</td></tr>)}</tbody></table>
      <p className="text-xs text-gray-500 px-3 py-2">Customers can track this order at <span className="font-mono">/track</span> with code <strong>{r.code}</strong>.</p>
    </div>
  ),
  columns: [
    { key: 'customerName', label: 'Customer' }, { key: 'destinationCountry', label: 'Destination' }, { key: 'shippingMethod', label: 'Method' },
    { key: 'trackingNo', label: 'Tracking' }, { key: 'total', label: 'Total', render: (r) => money(r.total, r.currency) },
  ],
};

const foodProducts: RecordBoardConfig = {
  base: ERP_PATHS.foodProducts, entity: 'food_product', title: 'Products & stock', singular: 'Product', brandCode: 'MF', allowMessage: false, allowBoard: false,
  subtitle: 'Export foodstuff by weight — batch, origin, harvest and expiry dates, cost and export price. Stock changes are recorded with a reason.',
  titleOf: (r) => r.name, subtitleOf: (r) => `${r.category} · ${r.packSize || r.unit}${r.batchNo ? ` · batch ${r.batchNo}` : ''}`,
  fields: [
    { name: 'name', label: 'Product name', required: true, placeholder: 'Egusi (ground)' },
    { name: 'category', label: 'Category', type: 'select', options: ['Grains', 'Tubers & Flour (garri, elubo, poundo)', 'Spices & Seasoning', 'Palm Oil & Oils', 'Dried Fish & Seafood', 'Soup Ingredients (egusi, ogbono…)', 'Snacks', 'Vegetables & Leaves', 'Beverages', 'Other'], default: 'Grains' },
    { name: 'unit', label: 'Sold per', placeholder: 'bag, litre, pack', default: 'bag' },
    { name: 'packSize', label: 'Pack size', placeholder: '1 kg pouch, 25 kg bag' },
    { name: 'unitWeightKg', label: 'Weight per unit (kg)', type: 'number', default: 1 },
    { name: 'stockQty', label: 'Opening stock', type: 'number', createOnly: true },
    { name: 'reorderLevel', label: 'Alert me when stock falls to', type: 'number' },
    { name: 'costPrice', label: 'Cost price', type: 'money', currencyField: 'costCurrency' },
    { name: 'costCurrency', label: 'Cost currency', type: 'currency', default: 'NGN' },
    { name: 'sellingPrice', label: 'Export price', type: 'money' },
    { name: 'currency', label: 'Export currency', type: 'currency', default: 'USD' },
    { name: 'originState', label: 'Sourced from', placeholder: 'Ogun State farm, Kano market…' },
    { name: 'batchNo', label: 'Batch number' },
    { name: 'harvestDate', label: 'Harvest / processing date', type: 'date' },
    { name: 'expiryDate', label: 'Best before', type: 'date' },
    { name: 'storageCondition', label: 'Storage', type: 'select', options: ['Dry', 'Cool & dry', 'Chilled', 'Frozen'], default: 'Cool & dry' },
    { name: 'warehouse', label: 'Where it is kept' },
    { name: 'nafdacNo', label: 'NAFDAC number' },
    { name: 'shelfLifeDays', label: 'Shelf life (days)', type: 'number' },
    { name: 'isActive', label: 'Available for sale', type: 'checkbox', default: true },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
  detailExtras: (r, refresh) => <StockPanel brand="maxfood" product={r} refresh={refresh} />,
  summary: <InventorySummaryBar brand="maxfood" />,
  columns: [
    { key: 'name', label: 'Product' }, { key: 'category', label: 'Category' }, { key: 'packSize', label: 'Pack', render: (r) => r.packSize || r.unit },
    { key: 'batchNo', label: 'Batch', render: (r) => r.batchNo || '—' },
    { key: 'expiryDate', label: 'Best before', render: (r) => (r.expiryDate ? <span className={cn(new Date(r.expiryDate) < new Date(Date.now() + 30 * 864e5) && 'text-red-600 font-medium')}>{new Date(r.expiryDate).toLocaleDateString('en-GB')}</span> : '—') },
    { key: 'sellingPrice', label: 'Price', render: (r) => money(r.sellingPrice, r.currency) },
    { key: 'stockQty', label: 'Stock', render: (r) => <span className={cn(Number(r.reorderLevel) > 0 && Number(r.stockQty) <= Number(r.reorderLevel) && 'text-amber-600 font-semibold')}>{Number(r.stockQty)} {r.unit}</span> },
  ],
};

export function MaxfoodHub() {
  return (
    <BrandTheme code="MF" header><Tabs tabs={[
      { key: 'orders', label: 'Export orders', node: <RecordBoard cfg={exportOrders} /> },
      { key: 'products', label: 'Products & stock', node: <RecordBoard cfg={foodProducts} /> },
      { key: 'tickets', label: 'Customer issues', node: <RecordBoard cfg={ticketsConfig('MF')} /> },
    ]} /></BrandTheme>
  );
}
