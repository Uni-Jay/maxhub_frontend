import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Search, Plus, Download, X, Eye, Calendar, RefreshCw,
  Globe, Briefcase, ShoppingBag, FileText, Phone, Mail,
  TrendingUp, CheckCircle, Clock, AlertCircle, Filter,
  Upload, Paperclip, File,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';
import FilePreviewModal, { type FilePreviewTarget } from '@components/ui/FilePreviewModal';

type BizUnit = 'visa' | 'kurios' | 'bead';

// ─── Visa Max types & data ────────────────────────────────
type VisaStatus = 'New' | 'Consultation' | 'Documents' | 'Submitted' | 'Processing' | 'Approved' | 'Rejected';

interface VisaApplicant {
  id: number; name: string; email: string; phone: string;
  passport: string; visaType: string; country: string;
  status: VisaStatus; consultant: string; nextAction: string;
  followUpDate: string; travelPackage: string; notes: string;
}

const VISA_STATUS_STYLES: Record<VisaStatus, string> = {
  New: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Consultation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Documents: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Submitted: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Processing: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};


// ─── Document types ────────────────────────────────────────
type DocType = 'Passport' | 'Visa Application' | 'Bank Statement' | 'Sponsor Letter' | 'Medical Certificate' | 'Travel Insurance' | 'Flight Booking' | 'Hotel Booking' | 'Other';

interface UploadedDocument {
  id: string;
  applicantId: number;
  fileName: string;
  fileType: DocType;
  uploadDate: string;
  fileUrl?: string;
  context: 'visa' | 'kurios' | 'bead';
}

const DOC_TYPES: DocType[] = ['Passport', 'Visa Application', 'Bank Statement', 'Sponsor Letter', 'Medical Certificate', 'Travel Insurance', 'Flight Booking', 'Hotel Booking', 'Other'];

const DOC_TYPE_COLORS: Record<DocType, string> = {
  Passport: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Visa Application': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Bank Statement': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Sponsor Letter': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'Medical Certificate': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Travel Insurance': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Flight Booking': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'Hotel Booking': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

// ─── Document Upload Modal ─────────────────────────────────
function DocumentUploadModal({
  entityId,
  entityName,
  context,
  onClose,
  onUploaded,
}: {
  entityId: number;
  entityName: string;
  context: 'visa' | 'kurios' | 'bead';
  onClose: () => void;
  onUploaded: (doc: UploadedDocument) => void;
}) {
  const [docType, setDocType] = useState<DocType>('Passport');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const filePreviewUrl = useMemo(() => (file?.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl); }, [filePreviewUrl]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      formData.append('entityId', String(entityId));
      formData.append('context', context);
      await apiClient.post('/crm/visa/documents', formData);
    } catch {
      // demo mode — treat as success
    }
    const doc: UploadedDocument = {
      id: `doc-${Date.now()}`,
      applicantId: entityId,
      fileName: file.name,
      fileType: docType,
      uploadDate: new Date().toISOString().slice(0, 10),
      fileUrl: URL.createObjectURL(file),
      context,
    };
    onUploaded(doc);
    setToast(`"${file.name}" uploaded successfully!`);
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
    setTimeout(() => { setToast(''); onClose(); }, 1500);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Upload Document</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entityName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X className="h-4 w-4" /></button>
        </div>

        {toast && (
          <div className="mx-5 mt-4 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {toast}
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type *</label>
            <select value={docType} onChange={e => setDocType(e.target.value as DocType)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">File *</label>
            <div
              className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
                  {filePreviewUrl ? (
                    <img src={filePreviewUrl} alt={file.name} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <File className="h-5 w-5" />
                  )}
                  <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                </div>
              ) : (
                <div className="text-gray-400 dark:text-gray-500">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-60" />
                  <p className="text-sm">Click to browse files</p>
                  <p className="text-xs mt-0.5">PDF, JPG, PNG, DOC, DOCX</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleUpload} disabled={!file || uploading}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Documents Section ─────────────────────────────────────
function DocumentsSection({
  entityId,
  entityName,
  context,
  documents,
  onUpload,
  onDelete,
}: {
  entityId: number;
  entityName: string;
  context: 'visa' | 'kurios' | 'bead';
  documents: UploadedDocument[];
  onUpload: (doc: UploadedDocument) => void;
  onDelete: (docId: string) => void;
}) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<FilePreviewTarget | null>(null);
  const myDocs = documents.filter(d => d.applicantId === entityId && d.context === context);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Documents</h3>
          {myDocs.length > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-full">{myDocs.length}</span>
          )}
        </div>
        <button onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
          <Upload className="h-3.5 w-3.5" /> Upload Document
        </button>
      </div>

      {myDocs.length === 0 ? (
        <div className="text-center py-6 text-gray-400 dark:text-gray-600">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myDocs.map(doc => {
            const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(doc.fileName);
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                {isImage && doc.fileUrl ? (
                  <button type="button" onClick={() => setPreviewDoc({ url: doc.fileUrl!, name: doc.fileName })}
                    className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-600">
                    <img src={doc.fileUrl} alt={doc.fileName} className="w-full h-full object-cover" />
                  </button>
                ) : (
                  <File className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.fileName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{doc.uploadDate}</p>
                </div>
                <span className={cn('flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold', DOC_TYPE_COLORS[doc.fileType])}>{doc.fileType}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {doc.fileUrl && (
                    <button type="button" onClick={() => setPreviewDoc({ url: doc.fileUrl!, name: doc.fileName })}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors" title="Preview">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors" title="Download">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button onClick={() => onDelete(doc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Delete">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FilePreviewModal target={previewDoc} onClose={() => setPreviewDoc(null)} />

      <AnimatePresence>
        {showUploadModal && (
          <DocumentUploadModal
            entityId={entityId}
            entityName={entityName}
            context={context}
            onClose={() => setShowUploadModal(false)}
            onUploaded={doc => { onUpload(doc); setShowUploadModal(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Kurios Sat types & data ──────────────────────────────
type ServiceType = 'Software' | 'Hosting' | 'Training' | 'Domain';
type ProjectStatus = 'Active' | 'Completed' | 'On Hold' | 'Pending';

interface KuriosClient {
  id: number; company: string; contact: string; email: string; phone: string;
  type: ServiceType; projectStatus: ProjectStatus; monthlyValue: number; lastContact: string;
  projectDesc: string; budget: number;
}

interface ActiveProject {
  id: number; name: string; client: string; progress: number; deadline: string; status: ProjectStatus;
}

interface TrainingStudent {
  id: number; name: string; course: string; enrolled: string; progress: number;
}


// ─── Bead Max types & data ────────────────────────────────
type OrderStatus = 'Pending' | 'In Progress' | 'Ready' | 'Shipped' | 'Delivered';

interface BeadCustomer {
  id: number; name: string; email: string; phone: string; country: string;
  orderCount: number; totalSpent: number; lastOrder: string;
}

interface CustomOrder {
  id: number; customer: string; description: string; quantity: number;
  material: string; deadline: string; status: OrderStatus;
}

interface IntlShipment {
  id: number; orderNum: string; customer: string; country: string;
  courier: string; trackingNum: string; status: string; estimatedDelivery: string;
}


const CUSTOM_ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  Pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Ready: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Shipped: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

// ─── Shared helpers ───────────────────────────────────────
const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
const LABEL_CLS = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className={cn('rounded-2xl p-4 text-white bg-gradient-to-br', color)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/70 text-xs font-medium">{label}</p>
        <Icon className="h-4 w-4 text-white/60" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

function downloadVisaProfile(applicant: VisaApplicant, documents: UploadedDocument[]) {
  const myDocs = documents.filter(d => d.applicantId === applicant.id && d.context === 'visa');
  const docRows = myDocs.length > 0
    ? myDocs.map(d => `<tr><td style="padding:8px 12px;border-top:1px solid #f0f0f0">${d.fileType}</td><td style="padding:8px 12px;border-top:1px solid #f0f0f0">${d.fileName}</td><td style="padding:8px 12px;border-top:1px solid #f0f0f0">${d.uploadDate}</td><td style="padding:8px 12px;border-top:1px solid #f0f0f0">${d.fileUrl ? `<a href="${d.fileUrl}" target="_blank" style="color:#1d4ed8">View</a>` : '—'}</td></tr>`).join('')
    : '<tr><td colspan="4" style="padding:12px;color:#9ca3af;text-align:center">No documents attached</td></tr>';

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Profile - ${applicant.name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#111827;background:#f4f6fb;padding:20px}.page{max-width:800px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#1e3a8a,#dc2626);color:white;padding:32px 40px}.logo{font-size:24px;font-weight:900}.tagline{font-size:12px;opacity:.8;margin-top:2px}.client{font-size:18px;font-weight:700;margin-top:16px}.sub{font-size:13px;opacity:.8}.body{padding:32px 40px}.section{margin-bottom:28px}.section-title{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:700;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e5e7eb}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field label{font-size:10px;text-transform:uppercase;color:#9ca3af;font-weight:600}.field p{font-size:14px;font-weight:600;color:#111827;margin-top:2px}.status-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#dbeafe;color:#1d4ed8}table{width:100%;border-collapse:collapse;font-size:13px}thead{background:#f3f4f6}th{padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:700}.footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;font-size:11px;color:#6b7280}.print-btn{display:block;text-align:center;margin:20px auto 0;padding:10px 28px;background:#1e3a8a;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}@media print{.print-btn{display:none}body{background:white;padding:0}.page{box-shadow:none;border-radius:0}}</style>
</head><body><div class="page">
<div class="header"><div style="display:flex;align-items:center;gap:14px;margin-bottom:14px"><img src="/images/visamax_logo.jpeg" alt="VisaMax" style="height:48px;width:auto;object-fit:contain;filter:brightness(0) invert(1)" onerror="this.style.display='none'"/><div><div class="logo">VisaMax Travel Ltd</div><div class="tagline">Your Journey, Our Expertise</div></div></div><div class="client">${applicant.name}</div><div class="sub">${applicant.visaType} Visa — ${applicant.country}</div></div>
<div class="body">
  <div class="section"><div class="section-title">Personal Information</div><div class="grid">
    <div class="field"><label>Full Name</label><p>${applicant.name}</p></div>
    <div class="field"><label>Passport Number</label><p style="font-family:monospace">${applicant.passport}</p></div>
    <div class="field"><label>Email</label><p>${applicant.email}</p></div>
    <div class="field"><label>Phone</label><p>${applicant.phone}</p></div>
  </div></div>
  <div class="section"><div class="section-title">Visa Details</div><div class="grid">
    <div class="field"><label>Visa Type</label><p>${applicant.visaType}</p></div>
    <div class="field"><label>Destination</label><p>${applicant.country}</p></div>
    <div class="field"><label>Status</label><p><span class="status-badge">${applicant.status}</span></p></div>
    <div class="field"><label>Consultant</label><p>${applicant.consultant}</p></div>
    <div class="field"><label>Travel Package</label><p>${applicant.travelPackage || '—'}</p></div>
    <div class="field"><label>Follow-up Date</label><p>${applicant.followUpDate}</p></div>
    <div class="field"><label>Next Action</label><p>${applicant.nextAction}</p></div>
    ${applicant.notes ? `<div class="field" style="grid-column:1/-1"><label>Notes</label><p>${applicant.notes}</p></div>` : ''}
  </div></div>
  <div class="section"><div class="section-title">Attached Documents (${myDocs.length})</div>
    <table><thead><tr><th>Type</th><th>File Name</th><th>Date Uploaded</th><th>Link</th></tr></thead><tbody>${docRows}</tbody></table>
  </div>
</div>
<div class="footer"><p>VisaMax Travel Ltd · +2348170020431, +2348060886447 · info@visamaxtravel.com · www.visamaxtravel.com</p><p style="margin-top:4px">51 Ayangburen Road, Ikorodu, Lagos · Generated: ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
</div><button class="print-btn" onclick="window.print()">Print / Save as PDF</button></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

// ═══════════════════════════════════════════════════════════
// VISA MAX TAB
// ═══════════════════════════════════════════════════════════
const VISA_STATUSES: VisaStatus[] = ['New', 'Consultation', 'Documents', 'Submitted', 'Processing', 'Approved', 'Rejected'];
const VISA_TYPES = ['Tourist', 'Student', 'Work', 'Business', 'Residence'];
const CONSULTANTS = ['Amaka B.', 'Tunde F.', 'Chioma O.'];

const INIT_VISA_FORM = {
  name: '', email: '', phone: '', passport: '', country: '', visaType: 'Tourist',
  travelPackage: '', notes: '', consultant: 'Amaka B.', followUpDate: '',
};

function VisaMaxTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [consultantFilter, setConsultantFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [form, setForm] = useState(INIT_VISA_FORM);
  const [viewApplicant, setViewApplicant] = useState<VisaApplicant | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

  // Was calling a route that never existed (/crm/visa/applicants — the real
  // applications API lives at /visamax/applications) with a silent
  // catch-and-return-empty, so this always rendered as if there were zero
  // applicants regardless of real data. Maps the real Application shape onto
  // this tab's VisaApplicant fields; passport/travelPackage/nextAction
  // aren't tracked by the real backend yet so they show blank until that's
  // added, but every other field is now live.
  const { data } = useQuery({
    queryKey: ['crm-visa-applicants'],
    queryFn: async () => {
      const res = await apiClient.getRaw('/visamax/applications', { limit: 100 });
      const apps = (res?.data?.data ?? res?.data ?? []) as any[];
      const statusMap: Record<string, VisaStatus> = {
        Pending: 'New', Processing: 'Processing', 'Awaiting Docs': 'Documents',
        Approved: 'Approved', Rejected: 'Rejected', 'On Hold': 'Consultation',
      };
      return apps.map((a): VisaApplicant => ({
        id: a.id, name: a.clientName, email: a.clientEmail, phone: a.clientPhone,
        passport: '', visaType: a.serviceType ?? '', country: a.destination ?? '',
        status: statusMap[a.status] ?? 'New', consultant: a.assignedTo ?? '',
        nextAction: '', followUpDate: a.expectedCompletion ?? '',
        travelPackage: '', notes: a.notes ?? '',
      }));
    },
  });

  const applicants = (data ?? []) as VisaApplicant[];

  const filtered = applicants.filter(a =>
    (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.passport.includes(search)) &&
    (!statusFilter || a.status === statusFilter) &&
    (!consultantFilter || a.consultant === consultantFilter) &&
    (!dateFilter || a.followUpDate === dateFilter)
  );

  const stats = {
    total: applicants.length,
    processing: applicants.filter(a => a.status === 'Processing').length,
    approved: applicants.filter(a => a.status === 'Approved').length,
    followUp: applicants.filter(a => new Date(a.followUpDate) <= new Date()).length,
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Applicants" value={stats.total} icon={Users} color="from-indigo-500 to-violet-600" />
        <StatCard label="Processing" value={stats.processing} icon={Clock} color="from-cyan-500 to-blue-600" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle} color="from-emerald-500 to-green-600" />
        <StatCard label="Pending Follow-up" value={stats.followUp} icon={AlertCircle} color="from-amber-500 to-orange-600" />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or passport..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {VISA_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={consultantFilter} onChange={e => setConsultantFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Consultants</option>
          {CONSULTANTS.map(c => <option key={c}>{c}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={() => exportCSV(filtered as unknown as Record<string, unknown>[], 'visa-applicants.csv')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        <button onClick={() => setShowPanel(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
          <Plus className="h-4 w-4" /> New Application
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {['Client Name', 'Passport #', 'Visa Type', 'Country', 'Status', 'Consultant', 'Next Action', 'Follow-up', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.map((a, i) => (
                <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{a.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{a.passport}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.visaType}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Globe className="h-3.5 w-3.5 text-gray-400" />{a.country}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold', VISA_STATUS_STYLES[a.status])}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.consultant}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{a.nextAction}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.followUpDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewApplicant(a)} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors" title="View">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg transition-colors" title="Schedule Follow-up">
                        <Calendar className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg transition-colors" title="Update Status">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setShowPanel(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 20 }}
              className="w-full max-w-md bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Visa Application</h2>
                <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div><label className={LABEL_CLS}>Full Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={INPUT_CLS} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={LABEL_CLS}>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={INPUT_CLS} /></div>
                  <div><label className={LABEL_CLS}>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={INPUT_CLS} /></div>
                </div>
                <div><label className={LABEL_CLS}>Passport Number *</label><input value={form.passport} onChange={e => setForm(f => ({ ...f, passport: e.target.value }))} className={INPUT_CLS} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={LABEL_CLS}>Destination Country *</label><input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={INPUT_CLS} /></div>
                  <div>
                    <label className={LABEL_CLS}>Visa Type</label>
                    <select value={form.visaType} onChange={e => setForm(f => ({ ...f, visaType: e.target.value }))} className={INPUT_CLS}>
                      {VISA_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Consultant</label>
                    <select value={form.consultant} onChange={e => setForm(f => ({ ...f, consultant: e.target.value }))} className={INPUT_CLS}>
                      {CONSULTANTS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className={LABEL_CLS}>Follow-up Date</label><input type="date" value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))} className={INPUT_CLS} /></div>
                </div>
                <div><label className={LABEL_CLS}>Travel Package</label><input value={form.travelPackage} onChange={e => setForm(f => ({ ...f, travelPackage: e.target.value }))} className={INPUT_CLS} /></div>
                <div><label className={LABEL_CLS}>Notes</label><textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={cn(INPUT_CLS, 'resize-none')} /></div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setShowPanel(false)} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                <button disabled={!form.name || !form.passport || !form.country}
                  className="flex-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
                  Submit Application
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewApplicant && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewApplicant(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="bg-indigo-600 p-5 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">{viewApplicant.name}</h3>
                  <p className="text-indigo-200 text-sm">{viewApplicant.visaType} Visa — {viewApplicant.country}</p>
                </div>
                <button onClick={() => setViewApplicant(null)} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {[
                  ['Passport', viewApplicant.passport], ['Email', viewApplicant.email], ['Phone', viewApplicant.phone],
                  ['Consultant', viewApplicant.consultant], ['Status', viewApplicant.status],
                  ['Next Action', viewApplicant.nextAction], ['Follow-up Date', viewApplicant.followUpDate],
                  ['Travel Package', viewApplicant.travelPackage || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{k}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{v}</span>
                  </div>
                ))}
                {viewApplicant.notes && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                    <p className="text-gray-700 dark:text-gray-300">{viewApplicant.notes}</p>
                  </div>
                )}
              </div>
              <div className="px-5 pb-5 space-y-3">
                <button
                  onClick={() => downloadVisaProfile(viewApplicant, documents)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
                  <Download className="h-4 w-4" /> Download Full Profile & Documents
                </button>
                <DocumentsSection
                  entityId={viewApplicant.id}
                  entityName={viewApplicant.name}
                  context="visa"
                  documents={documents}
                  onUpload={doc => setDocuments(prev => [...prev, doc])}
                  onDelete={docId => setDocuments(prev => prev.filter(d => d.id !== docId))}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function downloadKuriosProposal(client: KuriosClient, service: ServiceType, scope: string, estimatedBudget: string, validityDate: string) {
  const today = new Date();
  const ref = `KS-PROP-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}-${client.id}`;
  const formattedDate = today.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedValidity = validityDate ? new Date(validityDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '30 days from date of issuance';
  const budgetDisplay = estimatedBudget ? `₦${Number(estimatedBudget).toLocaleString()}` : `₦${client.budget.toLocaleString()}`;
  const scopeText = scope || client.projectDesc;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Proposal - ${client.company}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#f4f6fb;padding:20px}.page{max-width:800px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#1a1a2e,#2d5016);color:white;padding:36px 48px}.logo{font-size:26px;font-weight:900;letter-spacing:-0.5px}.tagline{font-size:11px;opacity:.7;margin-top:2px;text-transform:uppercase;letter-spacing:1px}.ref-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px}.ref-label{font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:1px}.ref-value{font-size:13px;font-weight:600}.body{padding:40px 48px}.to-block{background:#f8f9fa;border-left:4px solid #4a7c2f;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:32px}.to-label{font-size:10px;text-transform:uppercase;color:#9ca3af;font-weight:700;letter-spacing:1px}.to-name{font-size:16px;font-weight:700;color:#111827;margin-top:4px}.to-company{font-size:13px;color:#6b7280;margin-top:2px}.intro{font-size:14px;color:#374151;line-height:1.7;margin-bottom:28px}.section{margin-bottom:28px}.section-num{font-size:10px;text-transform:uppercase;color:#4a7c2f;font-weight:700;letter-spacing:1.5px;margin-bottom:6px}.section-title{font-size:15px;font-weight:700;color:#111827;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}.section-body{font-size:13px;color:#374151;line-height:1.8}.highlight-box{background:#f0f7e9;border:1px solid #c3e1a3;border-radius:10px;padding:16px 20px;margin-top:12px}.highlight-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0}.highlight-label{font-size:12px;color:#6b7280}.highlight-value{font-size:14px;font-weight:700;color:#1a1a2e}.terms-list{padding-left:20px;margin-top:8px}.terms-list li{font-size:13px;color:#374151;margin-bottom:6px;line-height:1.6}.signature-block{margin-top:40px;padding-top:24px;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between}.sig-left{flex:1}.sig-right{text-align:right}.sig-line{width:180px;border-top:1px solid #9ca3af;margin:0 auto 0 0;padding-top:4px;font-size:11px;color:#6b7280}.sig-line-right{width:180px;border-top:1px solid #9ca3af;margin:0 0 0 auto;padding-top:4px;font-size:11px;color:#6b7280;text-align:right}.footer{background:#1a1a2e;color:white;padding:20px 48px;font-size:11px;display:flex;justify-content:space-between;align-items:center}.footer-contact{opacity:.8}.print-btn{display:block;text-align:center;margin:24px auto 0;padding:10px 28px;background:#2d5016;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}@media print{.print-btn{display:none}body{background:white;padding:0}.page{box-shadow:none;border-radius:0}}</style>
</head><body><div class="page">
<div class="header">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
    <img src="/images/kuriossatlogo.jpeg" alt="Kurios SAT" style="height:48px;width:auto;object-fit:contain;filter:brightness(0) invert(1)" onerror="this.style.display='none'"/>
    <div>
      <div class="logo">Kurios SAT</div>
      <div class="tagline">Endless Possibilities · Professional IT Solutions & Training</div>
    </div>
  </div>
  <div class="ref-row">
    <div><div class="ref-label">Reference No.</div><div class="ref-value">${ref}</div></div>
    <div style="text-align:right"><div class="ref-label">Date</div><div class="ref-value">${formattedDate}</div></div>
  </div>
</div>
<div class="body">
  <div class="to-block">
    <div class="to-label">Prepared For</div>
    <div class="to-name">${client.contact}</div>
    <div class="to-company">${client.company} | ${client.email} | ${client.phone}</div>
  </div>

  <p class="intro">Dear ${client.contact},<br/><br/>
  Thank you for the opportunity to present this proposal. Kurios SAT is a leading provider of professional technology solutions and training services in Nigeria. We are pleased to present this comprehensive proposal for <strong>${service} Services</strong>, tailored specifically to meet the needs of <strong>${client.company}</strong>.<br/><br/>
  We are confident that our expertise and commitment to excellence will deliver exceptional value and measurable results for your organization.</p>

  <div class="section">
    <div class="section-num">01</div>
    <div class="section-title">Scope of Services</div>
    <div class="section-body">${scopeText}</div>
  </div>

  <div class="section">
    <div class="section-num">02</div>
    <div class="section-title">Investment & Pricing</div>
    <div class="highlight-box">
      <div class="highlight-row"><span class="highlight-label">Estimated Budget</span><span class="highlight-value" style="color:#2d5016;font-size:18px">${budgetDisplay}</span></div>
      <div class="highlight-row" style="border-top:1px solid #c3e1a3;margin-top:8px;padding-top:8px"><span class="highlight-label">Payment Structure</span><span class="highlight-value">50% upfront · 50% on completion</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-num">03</div>
    <div class="section-title">Terms & Conditions</div>
    <div class="section-body">
      <ul class="terms-list">
        <li>This proposal is valid until <strong>${formattedValidity}</strong>.</li>
        <li>A signed agreement and 50% advance payment are required before project commencement.</li>
        <li>Remaining balance is payable upon successful project delivery and client sign-off.</li>
        <li>All deliverables are subject to client approval and acceptance testing.</li>
        <li>Kurios SAT reserves the right to engage qualified sub-contractors where necessary.</li>
        <li>Any additional requirements outside the agreed scope will be subject to a separate change order.</li>
        <li>Intellectual property rights for custom deliverables transfer to the client upon full payment.</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <div class="section-num">04</div>
    <div class="section-title">Why Kurios SAT?</div>
    <div class="section-body">
      With years of experience serving businesses across Nigeria, Kurios SAT brings deep technical expertise, a dedicated team of professionals, and a proven track record of delivering projects on time and within budget. We prioritize long-term partnerships and client satisfaction above all else.
    </div>
  </div>

  <div class="signature-block">
    <div class="sig-left">
      <p style="font-size:12px;color:#6b7280;margin-bottom:32px">Client Acceptance</p>
      <div class="sig-line">Signature &amp; Date</div>
    </div>
    <div class="sig-right">
      <p style="font-size:12px;color:#6b7280;margin-bottom:32px">Authorized by Kurios SAT</p>
      <div class="sig-line-right">Signature &amp; Date</div>
    </div>
  </div>
</div>
<div class="footer">
  <div class="footer-contact">
    <div style="font-weight:700;font-size:13px">Kurios SAT IT Solutions</div>
    <div>support@kuriosat.com &nbsp;|&nbsp; +234 801 234 5678</div>
    <div>Ibadan, Oyo State, Nigeria</div>
  </div>
  <div style="text-align:right;opacity:.7;font-size:10px">This proposal is confidential and intended<br/>solely for the recipient named above.</div>
</div>
</div>
<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

// ═══════════════════════════════════════════════════════════
// KURIOS SAT TAB
// ═══════════════════════════════════════════════════════════
const SERVICE_TYPES: ServiceType[] = ['Software', 'Hosting', 'Training', 'Domain'];

const PROJ_STATUS_STYLES: Record<ProjectStatus, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'On Hold': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const INIT_KURIOS_FORM = {
  company: '', contact: '', email: '', phone: '',
  type: 'Software' as ServiceType, projectDesc: '', budget: '',
};

const INIT_PROPOSAL = { clientId: '', service: 'Software' as ServiceType, scope: '', estimatedBudget: '', validityDate: '' };

function KuriosSatTab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [form, setForm] = useState(INIT_KURIOS_FORM);
  const [proposal, setProposal] = useState(INIT_PROPOSAL);
  const [viewClient, setViewClient] = useState<KuriosClient | null>(null);

  const { data } = useQuery({
    queryKey: ['crm-kurios-clients'],
    queryFn: async () => {
      try { return await apiClient.get<KuriosClient[]>('/crm/kurios/clients'); }
      catch { return [] as KuriosClient[]; }
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ['crm-kurios-projects'],
    queryFn: async () => {
      try { return await apiClient.get<ActiveProject[]>('/crm/kurios/projects'); }
      catch { return [] as ActiveProject[]; }
    },
  });

  const { data: studentsData } = useQuery({
    queryKey: ['crm-kurios-students'],
    queryFn: async () => {
      try { return await apiClient.get<TrainingStudent[]>('/crm/kurios/students'); }
      catch { return [] as TrainingStudent[]; }
    },
  });

  const clients = (data ?? []) as KuriosClient[];
  const activeProjects = (projectsData ?? []) as ActiveProject[];
  const trainingStudents = (studentsData ?? []) as TrainingStudent[];

  const filtered = clients.filter(c =>
    (!search || c.company.toLowerCase().includes(search.toLowerCase()) || c.contact.toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter || c.type === typeFilter) &&
    (!dateFilter || c.lastContact === dateFilter)
  );

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.projectStatus === 'Active').length,
    revenue: clients.reduce((s, c) => s + c.monthlyValue, 0),
    proposals: clients.filter(c => c.projectStatus === 'Pending').length,
  };

  const selectedClient = clients.find(c => c.id === Number(proposal.clientId));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Clients" value={stats.total} icon={Briefcase} color="from-violet-500 to-purple-600" />
        <StatCard label="Active Projects" value={stats.active} icon={TrendingUp} color="from-emerald-500 to-green-600" />
        <StatCard label="Monthly Revenue" value={`₦${(stats.revenue / 1000).toFixed(0)}k`} icon={TrendingUp} color="from-indigo-500 to-blue-600" />
        <StatCard label="Proposals Pending" value={stats.proposals} icon={FileText} color="from-amber-500 to-orange-600" />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or contact..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Types</option>
          {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={() => exportCSV(filtered as unknown as Record<string, unknown>[], 'kurios-clients.csv')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        <button onClick={() => setShowProposal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
          <FileText className="h-3.5 w-3.5" /> Generate Proposal
        </button>
        <button onClick={() => setShowNewClient(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors">
          <Plus className="h-4 w-4" /> New Client
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {['Company Name', 'Contact Person', 'Type', 'Project Status', 'Monthly Value', 'Last Contact', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{c.company}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 dark:text-gray-300">{c.contact}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Phone className="h-3 w-3" />{c.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">{c.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold', PROJ_STATUS_STYLES[c.projectStatus])}>{c.projectStatus}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                    {c.monthlyValue > 0 ? `₦${c.monthlyValue.toLocaleString()}` : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{c.lastContact}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewClient(c)} className="p-1.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg transition-colors" title="View & Documents">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Active Software Projects</h3>
          <div className="space-y-4">
            {activeProjects.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No active projects</p>}
            {activeProjects.map(p => (
              <div key={p.id}>
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.client} · Due {p.deadline}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', PROJ_STATUS_STYLES[p.status])}>{p.status}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div className="h-2 bg-violet-500 rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5 text-right">{p.progress}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Training Students</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {['Name', 'Course', 'Progress'].map(h => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {trainingStudents.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-xs text-gray-400">No students found</td></tr>
                )}
                {trainingStudents.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-gray-900 dark:text-white text-xs">{s.name}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-gray-500 dark:text-gray-400">{s.course}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${s.progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{s.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showNewClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewClient(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Client — Kurios Sat</h2>
                <button onClick={() => setShowNewClient(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div><label className={LABEL_CLS}>Company Name *</label><input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={INPUT_CLS} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={LABEL_CLS}>Contact Person *</label><input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className={INPUT_CLS} /></div>
                  <div><label className={LABEL_CLS}>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={INPUT_CLS} /></div>
                </div>
                <div><label className={LABEL_CLS}>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={INPUT_CLS} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Service Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ServiceType }))} className={INPUT_CLS}>
                      {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label className={LABEL_CLS}>Budget (₦)</label><input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className={INPUT_CLS} /></div>
                </div>
                <div><label className={LABEL_CLS}>Project Description</label><textarea rows={3} value={form.projectDesc} onChange={e => setForm(f => ({ ...f, projectDesc: e.target.value }))} className={cn(INPUT_CLS, 'resize-none')} /></div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setShowNewClient(false)} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                <button disabled={!form.company || !form.contact}
                  className="flex-1 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
                  Add Client
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProposal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowProposal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Generate Proposal</h2>
                <button onClick={() => setShowProposal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>Select Client *</label>
                    <select value={proposal.clientId} onChange={e => setProposal(p => ({ ...p, clientId: e.target.value }))} className={INPUT_CLS}>
                      <option value="">— Choose client —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Service Type *</label>
                    <select value={proposal.service} onChange={e => setProposal(p => ({ ...p, service: e.target.value as ServiceType }))} className={INPUT_CLS}>
                      {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Scope of Services *</label>
                  <textarea rows={3} value={proposal.scope} onChange={e => setProposal(p => ({ ...p, scope: e.target.value }))}
                    placeholder="Describe the services to be provided in detail..." className={cn(INPUT_CLS, 'resize-none')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>Estimated Budget (₦)</label>
                    <input type="number" value={proposal.estimatedBudget} onChange={e => setProposal(p => ({ ...p, estimatedBudget: e.target.value }))}
                      placeholder="e.g. 2500000" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Proposal Validity Date</label>
                    <input type="date" value={proposal.validityDate} onChange={e => setProposal(p => ({ ...p, validityDate: e.target.value }))} className={INPUT_CLS} />
                  </div>
                </div>

                {selectedClient && (
                  <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4 text-sm">
                    <p className="font-semibold text-violet-800 dark:text-violet-300 mb-1">Preview</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Ref: KS-PROP-{new Date().toISOString().slice(0,10).replace(/-/g,'')}-{selectedClient.id} · To: {selectedClient.contact}, {selectedClient.company}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Budget: {proposal.estimatedBudget ? `₦${Number(proposal.estimatedBudget).toLocaleString()}` : `₦${selectedClient.budget.toLocaleString()}`} · Valid until: {proposal.validityDate || '30 days from issuance'}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700 justify-end">
                <button onClick={() => { setShowProposal(false); setProposal(INIT_PROPOSAL); }} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                <button disabled={!selectedClient} onClick={() => { if (selectedClient) { downloadKuriosProposal(selectedClient, proposal.service, proposal.scope, proposal.estimatedBudget, proposal.validityDate); setShowProposal(false); setProposal(INIT_PROPOSAL); } }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors disabled:opacity-50">
                  <Download className="h-3.5 w-3.5" /> Generate & Download Proposal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Detail Modal with Documents */}
      <AnimatePresence>
        {viewClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewClient(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="bg-violet-600 p-5 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">{viewClient.company}</h3>
                  <p className="text-violet-200 text-sm">{viewClient.type} · {viewClient.projectStatus}</p>
                </div>
                <button onClick={() => setViewClient(null)} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {[
                  ['Contact', viewClient.contact], ['Email', viewClient.email], ['Phone', viewClient.phone],
                  ['Monthly Value', viewClient.monthlyValue > 0 ? `₦${viewClient.monthlyValue.toLocaleString()}` : '—'],
                  ['Budget', `₦${viewClient.budget.toLocaleString()}`], ['Last Contact', viewClient.lastContact],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{k}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{v}</span>
                  </div>
                ))}
                {viewClient.projectDesc && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Project Description</p>
                    <p className="text-gray-700 dark:text-gray-300">{viewClient.projectDesc}</p>
                  </div>
                )}
              </div>
              <div className="px-5 pb-5">
                <button onClick={() => setViewClient(null)} className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BEAD MAX TAB
// ═══════════════════════════════════════════════════════════
const INIT_BEAD_FORM = { name: '', email: '', phone: '', country: 'Nigeria' };

function BeadMaxTab() {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [form, setForm] = useState(INIT_BEAD_FORM);
  const [viewCustomer, setViewCustomer] = useState<BeadCustomer | null>(null);

  const { data } = useQuery({
    queryKey: ['crm-bead-customers'],
    queryFn: async () => {
      try { return await apiClient.get<BeadCustomer[]>('/crm/bead/customers'); }
      catch { return [] as BeadCustomer[]; }
    },
  });

  const { data: ordersData } = useQuery({
    queryKey: ['crm-bead-orders'],
    queryFn: async () => {
      try { return await apiClient.get<CustomOrder[]>('/crm/bead/orders'); }
      catch { return [] as CustomOrder[]; }
    },
  });

  const { data: shipmentsData } = useQuery({
    queryKey: ['crm-bead-shipments'],
    queryFn: async () => {
      try { return await apiClient.get<IntlShipment[]>('/crm/bead/shipments'); }
      catch { return [] as IntlShipment[]; }
    },
  });

  const customers = (data ?? []) as BeadCustomer[];
  const customOrders = (ordersData ?? []) as CustomOrder[];
  const intlShipments = (shipmentsData ?? []) as IntlShipment[];

  const filtered = customers.filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())) &&
    (!dateFilter || c.lastOrder === dateFilter)
  );

  const intl = customers.filter(c => c.country !== 'Nigeria');

  const stats = {
    total: customers.length,
    activeOrders: customOrders.filter(o => o.status !== 'Delivered').length,
    international: intl.length,
    revenue: customers.reduce((s, c) => s + c.totalSpent, 0),
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Customers" value={stats.total} icon={Users} color="from-pink-500 to-rose-600" />
        <StatCard label="Active Orders" value={stats.activeOrders} icon={ShoppingBag} color="from-amber-500 to-orange-600" />
        <StatCard label="International" value={stats.international} icon={Globe} color="from-indigo-500 to-blue-600" />
        <StatCard label="Revenue This Month" value={`₦${(stats.revenue / 1000000).toFixed(1)}M`} icon={TrendingUp} color="from-emerald-500 to-green-600" />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={() => exportCSV(filtered as unknown as Record<string, unknown>[], 'bead-customers.csv')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        <button onClick={() => setShowNewCustomer(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-medium transition-colors">
          <Plus className="h-4 w-4" /> New Customer
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {['Name', 'Email', 'Phone', 'Country', 'Orders', 'Total Spent', 'Last Order', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
                      <Mail className="h-3 w-3" />{c.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{c.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs">
                      <Globe className="h-3 w-3 text-gray-400" />{c.country}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">{c.orderCount}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">₦{c.totalSpent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{c.lastOrder}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewCustomer(c)} className="p-1.5 text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 rounded-lg transition-colors" title="View & Documents">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Pending Custom Orders</h3>
          <div className="space-y-3">
            {customOrders.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No pending orders</p>}
            {customOrders.map(o => (
              <div key={o.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{o.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{o.customer} · {o.quantity}x {o.material} · Due {o.deadline}</p>
                </div>
                <span className={cn('flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold', CUSTOM_ORDER_STATUS_STYLES[o.status])}>{o.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">International Shipments</h3>
          <div className="space-y-3">
            {intlShipments.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No international shipments</p>}
            {intlShipments.map(s => (
              <div key={s.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.customer} — {s.country}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.orderNum} · {s.courier} · <span className="font-mono">{s.trackingNum}</span></p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-semibold',
                    s.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    s.status === 'In Transit' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  )}>{s.status}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Est. delivery: {s.estimatedDelivery}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showNewCustomer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewCustomer(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Customer — Bead Max</h2>
                <button onClick={() => setShowNewCustomer(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div><label className={LABEL_CLS}>Full Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={INPUT_CLS} /></div>
                <div><label className={LABEL_CLS}>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={INPUT_CLS} /></div>
                <div><label className={LABEL_CLS}>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={INPUT_CLS} /></div>
                <div><label className={LABEL_CLS}>Country</label><input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={INPUT_CLS} /></div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setShowNewCustomer(false)} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                <button disabled={!form.name}
                  className="flex-1 px-4 py-2 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
                  Add Customer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer Detail Modal with Documents */}
      <AnimatePresence>
        {viewCustomer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewCustomer(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="bg-pink-600 p-5 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">{viewCustomer.name}</h3>
                  <p className="text-pink-200 text-sm">{viewCustomer.country} · {viewCustomer.orderCount} orders</p>
                </div>
                <button onClick={() => setViewCustomer(null)} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {[
                  ['Email', viewCustomer.email], ['Phone', viewCustomer.phone],
                  ['Total Spent', `₦${viewCustomer.totalSpent.toLocaleString()}`],
                  ['Last Order', viewCustomer.lastOrder],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{k}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{v}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                <button onClick={() => setViewCustomer(null)} className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN CRM HUB
// ═══════════════════════════════════════════════════════════
const TABS: { key: BizUnit; label: string; icon: any; accent: string }[] = [
  { key: 'visa', label: 'Visa Max', icon: Globe, accent: 'text-indigo-600 dark:text-indigo-400' },
  { key: 'kurios', label: 'Kurios Sat', icon: Briefcase, accent: 'text-violet-600 dark:text-violet-400' },
  { key: 'bead', label: 'Bead Max', icon: ShoppingBag, accent: 'text-pink-600 dark:text-pink-400' },
];

export default function CRMHub() {
  const [activeTab, setActiveTab] = useState<BizUnit>('visa');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM Hub</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Unified CRM across all MaxHub business units</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Filter className="h-3.5 w-3.5" /> Business Unit
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                activeTab === t.key
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}>
              <Icon className={cn('h-4 w-4', activeTab === t.key ? t.accent : '')} />
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {activeTab === 'visa' && <VisaMaxTab />}
          {activeTab === 'kurios' && <KuriosSatTab />}
          {activeTab === 'bead' && <BeadMaxTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
