import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Circle, UserCheck, RotateCcw, Loader2, Paperclip } from 'lucide-react';
import RecordBoard, { type RecordBoardConfig, btnGhost, inputCls } from '@components/erp/RecordBoard';
import { ERP_PATHS, erpService, money } from '@services/erpService';
import { toast } from '@components/ui/toaster';
import { ClientFilePicker } from '@components/erp/ClientFiles';
import { cn } from '@utils/cn';
import { BrandTheme } from '@components/erp/BrandTheme';

const SERVICES = ['Visa Processing', 'Overseas Study', 'Work Visa / Job Travel', 'Family Visa', 'Business Travel', 'Tourism Package', 'Holiday Package', 'Flight Booking', 'Hotel Reservation', 'Immigration Consulting', 'Travel Insurance', 'Airport Pickup'];
const VISA_TYPES = ['Tourist', 'Student', 'Work', 'Business', 'Residence', 'Transit', 'Medical', 'Family Visa'];

function Checklist({ r, refresh }: { r: any; refresh: () => void }) {
  const [items, setItems] = useState<any[]>(r.checklist || []);
  const [uploading, setUploading] = useState<number | null>(null);
  const save = useMutation({ mutationFn: (list: any[]) => erpService.saveChecklist(r.id, list), onSuccess: () => refresh(), onError: (e) => toast.fromError(e) });
  const regen = useMutation({ mutationFn: () => erpService.regenerateChecklist(r.id), onSuccess: (x: any) => { setItems(x.checklist || []); refresh(); } });
  const onboard = useMutation({ mutationFn: () => erpService.onboard(r.id), onSuccess: () => { toast.success('Customer onboarded', 'Added to Clients'); refresh(); }, onError: (e) => toast.fromError(e) });
  const update = (i: number, patch: any) => { const next = items.map((c, j) => (j === i ? { ...c, ...patch } : c)); setItems(next); save.mutate(next); };
  const received = items.filter((c) => c.received).length;

  // Paperclip: pick the scan from MaxHub Files or the computer — either way it
  // is also filed in Files › VisaMax › <client name>.
  const client = String(r.customerName || '').trim();

  return (
    <div className="space-y-3">
      {!r.onboardingCompleted && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">Not onboarded yet — onboarding registers this person as a client and moves the case to Onboarding.</p>
          <button className={btnGhost} onClick={() => onboard.mutate()} disabled={onboard.isPending}>{onboard.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Onboard</button>
        </div>
      )}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Document checklist · {received}/{items.length}</p>
          <button className="text-xs inline-flex items-center gap-1 text-gray-500 hover:brand-text" onClick={() => regen.mutate()}><RotateCcw className="h-3 w-3" /> Refresh for service</button>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${items.length ? (received / items.length) * 100 : 0}%` }} /></div>
        <ul className="divide-y divide-gray-50 dark:divide-gray-800">
          {items.map((c, i) => (
            <li key={c.item} className="flex items-center gap-2 px-3 py-2">
              <button onClick={() => update(i, { received: !c.received })} className={cn(c.received ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600')}>{c.received ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</button>
              <span className={cn('flex-1 text-sm', c.received ? 'text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200')}>{c.item}</span>
              {c.fileUrl && <a href={c.fileUrl} target="_blank" rel="noreferrer" className="text-xs brand-text hover:underline">View</a>}
              <button type="button" className="text-gray-400 hover:brand-text" title={client ? 'Attach scan — from MaxHub Files or your computer' : 'Add the customer name first'}
                onClick={() => client ? setUploading(i) : toast.error('Add the customer name first', 'Documents are filed in a folder with the client’s name.')}>
                <Paperclip className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        {uploading !== null && items[uploading] && (
          <ClientFilePicker brand="VM" client={client} multiple={false} title={`Attach: ${items[uploading].item}`}
            onClose={() => setUploading(null)} onPicked={(f) => { if (f[0]) update(uploading, { received: true, fileUrl: f[0].url }); }} />
        )}
        <AddItem onAdd={(item) => { const next = [...items, { item, required: false, received: false, fileUrl: null }]; setItems(next); save.mutate(next); }} />
      </div>
    </div>
  );
}

function AddItem({ onAdd }: { onAdd: (s: string) => void }) {
  const [v, setV] = useState('');
  return (
    <form className="flex gap-2 p-2 border-t border-gray-100 dark:border-gray-800" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(''); } }}>
      <input className={inputCls} value={v} onChange={(e) => setV(e.target.value)} placeholder="Add another required document…" />
      <button className={btnGhost}>Add</button>
    </form>
  );
}

export const visaCaseConfig: RecordBoardConfig = {
  base: ERP_PATHS.travelCases, entity: 'travel_case', title: 'VisaMax — Customers & Applications', singular: 'Customer case',
  subtitle: 'Onboard customers, collect documents, track every application from inquiry to travel, message them on WhatsApp or email, and collect signed agreements.',
  brandCode: 'VM', allowPayments: true, allowDocuments: true,
  titleOf: (r) => r.customerName, subtitleOf: (r) => `${r.serviceType}${r.destinationCountry ? ` → ${r.destinationCountry}` : ''}`,
  amountOf: (r) => Number(r.amountQuoted || 0),
  fields: [
    { name: 'customerName', label: 'Full name (as on passport)', required: true },
    { name: 'customerPhone', label: 'Phone', type: 'tel', required: true },
    { name: 'customerWhatsapp', label: 'WhatsApp (if different)', type: 'tel' },
    { name: 'customerEmail', label: 'Email', type: 'email' },
    { name: 'serviceType', label: 'Service', type: 'select', options: SERVICES, required: true, default: 'Visa Processing' },
    { name: 'visaType', label: 'Visa type', type: 'select', options: VISA_TYPES },
    { name: 'destinationCountry', label: 'Destination country' },
    { name: 'travellers', label: 'No. of travellers', type: 'number', default: 1 },
    { name: 'travelDate', label: 'Intended travel date', type: 'date' },
    { name: 'returnDate', label: 'Return date', type: 'date' },
    { name: 'passportNumber', label: 'Passport number' },
    { name: 'passportExpiry', label: 'Passport expiry', type: 'date' },
    { name: 'nationality', label: 'Nationality', default: 'Nigerian' },
    { name: 'dateOfBirth', label: 'Date of birth', type: 'date' },
    { name: 'customerCountry', label: 'Country of residence', default: 'Nigeria' },
    { name: 'source', label: 'How they found us', type: 'select', options: ['Walk-in', 'Website', 'WhatsApp', 'Instagram', 'Facebook', 'Referral', 'Returning client', 'Other'] },
    { name: 'appointmentDate', label: 'Embassy / VFS appointment', type: 'datetime' },
    { name: 'biometricsDate', label: 'Biometrics date', type: 'datetime' },
    { name: 'submissionDate', label: 'Submitted on', type: 'date' },
    { name: 'decisionDate', label: 'Decision date', type: 'date' },
    { name: 'amountQuoted', label: 'Service fee quoted', type: 'money' },
    { name: 'currency', label: 'Currency', type: 'currency', default: 'NGN' },
    { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    { name: 'assignedToUserId', label: 'Consultant', type: 'user' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { key: 'customerName', label: 'Customer' },
    { key: 'serviceType', label: 'Service' },
    { key: 'destinationCountry', label: 'Destination' },
    { key: 'customerPhone', label: 'Phone' },
    { key: 'travelDate', label: 'Travel', render: (r) => (r.travelDate ? new Date(r.travelDate).toLocaleDateString() : '—') },
    { key: 'amountQuoted', label: 'Fee', render: (r) => money(r.amountQuoted, r.currency) },
  ],
  detailExtras: (r, refresh) => (r.serviceType ? <Checklist key={r.id + (r.updatedAt || '')} r={r} refresh={refresh} /> : null),
  headerExtras: <NavLink to="/visamax/bookings" className={btnGhost}>Flights, hotels & bookings</NavLink>,
  emptyHint: 'Start by adding a customer inquiry — a document checklist is created automatically for the service they need.',
};

export default function VisaMaxCases() {
  return <BrandTheme code="VM" header><RecordBoard cfg={visaCaseConfig} /></BrandTheme>;
}

export function VisaMaxBookings() {
  return (
    <BrandTheme code="VM" header>
    <RecordBoard cfg={{
      base: ERP_PATHS.bookings, entity: 'travel_booking', title: 'VisaMax — Bookings', singular: 'Booking', brandCode: 'VM', stageField: 'status',
      subtitle: 'Flights, hotels, insurance, tour packages and airport pickups — with cost, selling price and margin.',
      allowPayments: true, allowDocuments: true,
      titleOf: (r) => `${r.bookingType}: ${r.customerName}`, subtitleOf: (r) => [r.origin, r.destination].filter(Boolean).join(' → ') || r.provider || '',
      amountOf: (r) => Number(r.sellingPrice || 0),
      fields: [
        { name: 'customerName', label: 'Customer', required: true },
        { name: 'customerPhone', label: 'Phone', type: 'tel' },
        { name: 'customerEmail', label: 'Email', type: 'email' },
        { name: 'bookingType', label: 'Type', type: 'select', options: ['Flight', 'Hotel', 'Insurance', 'Tour Package', 'Airport Pickup', 'Visa Fee', 'Other'], required: true, default: 'Flight' },
        { name: 'provider', label: 'Airline / hotel / provider' },
        { name: 'reference', label: 'PNR / booking reference' },
        { name: 'origin', label: 'From' },
        { name: 'destination', label: 'To' },
        { name: 'departAt', label: 'Departure / check-in', type: 'datetime' },
        { name: 'returnAt', label: 'Return / check-out', type: 'datetime' },
        { name: 'passengers', label: 'Passengers / guests', type: 'number', default: 1 },
        { name: 'costPrice', label: 'Our cost', type: 'money' },
        { name: 'sellingPrice', label: 'Price to customer', type: 'money' },
        { name: 'currency', label: 'Currency', type: 'currency', default: 'NGN' },
        { name: 'assignedToUserId', label: 'Handled by', type: 'user' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ],
      columns: [
        { key: 'customerName', label: 'Customer' }, { key: 'bookingType', label: 'Type' }, { key: 'reference', label: 'Ref' },
        { key: 'departAt', label: 'Date', render: (r) => (r.departAt ? new Date(r.departAt).toLocaleString() : '—') },
        { key: 'sellingPrice', label: 'Price', render: (r) => money(r.sellingPrice, r.currency) },
        { key: 'margin', label: 'Margin', render: (r) => money(Number(r.sellingPrice) - Number(r.costPrice), r.currency) },
      ],
      headerExtras: <NavLink to="/visamax/cases" className={btnGhost}>Customer cases</NavLink>,
    }} />
    </BrandTheme>
  );
}
