import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import RecordBoard, { type RecordBoardConfig, btnGhost } from '@components/erp/RecordBoard';
import { money } from '@services/erpService';
import ScanReceipt from '@components/erp/ScanReceipt';

const CATEGORIES = [
  'Rent', 'Stock & materials', 'Transport & logistics', 'Shipping & freight', 'Marketing & adverts', 'Utilities & internet',
  'Fuel & generator', 'Repairs & maintenance', 'Embassy & visa fees', 'Software & hosting', 'Equipment', 'Training',
  'Bank charges', 'Taxes & levies', 'Professional fees', 'Welfare & refreshments', 'Other',
];

const expenses: RecordBoardConfig = {
  base: '/erp/expenses', entity: 'business_expense', title: 'Business expenses', singular: 'Expense', brandCode: '',
  subtitle: 'Everything the business spends — rent, stock, freight, adverts, fuel. Leave the brand empty for Head Office costs. Monthly expenses repeat automatically on the 1st.',
  brandChoices: [
    { code: '', label: 'Head Office / all brands' }, { code: 'VM', label: 'VisaMax' }, { code: 'KS', label: 'Kurios SAT' },
    { code: 'BM', label: 'BeadMax' }, { code: 'MF', label: 'Maxfood Farm' },
  ],
  allowMessage: false, allowBoard: false,
  titleOf: (r) => r.title, subtitleOf: (r) => `${r.category}${r.vendor ? ` · ${r.vendor}` : ''}${r.recurring === 'Monthly' ? ' · repeats monthly' : ''}${r.status === 'Awaiting payment' ? ' · approved purchase awaiting payment' : ''}`,
  amountOf: (r) => Number(r.amount || 0),
  fields: [
    { name: 'title', label: 'What was it for?', required: true, placeholder: 'Office rent — November' },
    { name: 'category', label: 'Category', type: 'select', options: CATEGORIES, default: 'Other' },
    { name: 'amount', label: 'Amount', type: 'money', required: true },
    { name: 'currency', label: 'Currency', type: 'currency', default: 'NGN' },
    { name: 'paidAt', label: 'Date paid', type: 'date' },
    { name: 'vendor', label: 'Paid to' },
    { name: 'method', label: 'Paid by', type: 'select', options: ['Transfer', 'Cash', 'POS', 'Card', 'Cheque'], default: 'Transfer' },
    { name: 'reference', label: 'Reference' },
    { name: 'recurring', label: 'Repeats', type: 'select', options: ['No', 'Monthly'], default: 'No' },
    { name: 'status', label: 'Status', type: 'select', options: ['Paid', 'Awaiting payment', 'Cancelled'], default: 'Paid' },
    { name: 'amountNgn', label: 'Naira value', type: 'money', hideInForm: true },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  formHeader: (form, set) => (
    <ScanReceipt onScanned={(r) => set({
      title: r.title || form.title, category: CATEGORIES.includes(r.category) ? r.category : form.category, amount: r.total ?? form.amount,
      currency: r.currency || form.currency, paidAt: r.date || form.paidAt, vendor: r.vendor || form.vendor, method: r.method && ['Transfer', 'Cash', 'POS', 'Card', 'Cheque'].includes(r.method) ? r.method : form.method,
      reference: r.reference || form.reference, receiptUrl: r.receiptUrl || form.receiptUrl,
      notes: r.items?.length ? r.items.map((i) => `${i.name}${i.qty ? ` × ${i.qty}` : ''}${i.amount ? ` — ${i.amount}` : ''}`).join('\n') : form.notes,
    })} />
  ),
  headerExtras: <Link to="/finance/profit" className={btnGhost}><BarChart3 className="h-4 w-4" />Profit & Loss</Link>,
  columns: [
    { key: 'paidAt', label: 'Date', render: (r) => (r.paidAt ? new Date(r.paidAt).toLocaleDateString('en-GB') : '—') },
    { key: 'title', label: 'Expense' }, { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', render: (r) => <span className={r.status === 'Cancelled' ? 'line-through text-gray-400' : ''}>{r.status === 'Awaiting payment' && <span className="block text-[10px] font-semibold text-amber-600 uppercase">Awaiting payment</span>}{money(r.amount, r.currency)}{r.currency !== 'NGN' && r.amountNgn ? <span className="block text-[11px] text-gray-500">{money(r.amountNgn, 'NGN')}</span> : null}</span> },
  ],
};

export default function ExpensesPage() {
  return <RecordBoard cfg={expenses} />;
}
