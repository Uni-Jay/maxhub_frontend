import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApiQuery } from '@hooks/useApiQuery';
import { useApiMutation } from '@hooks/useApiMutation';
import { clientService } from '@services/clientService';
import {
  ArrowLeft, Edit2, Trash2, FileText, StickyNote, Plus, Download,
  Mail, Phone, MapPin, Calendar, Flag, Upload,
} from 'lucide-react';
import type { DocumentCategory, ClientStatus } from '@/types';
import { ClientFilePicker } from '@components/erp/ClientFiles';
import { useBrands } from '@hooks/useErp';
import { saveFileToComputer } from '@services/downloadFile';

const STATUS_COLORS: Record<ClientStatus, string> = {
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-100 text-gray-700',
  Pending: 'bg-yellow-100 text-yellow-800',
  Suspended: 'bg-red-100 text-red-800',
};

const DOC_CATEGORIES: DocumentCategory[] = [
  'Passport', 'Certificate', 'Visa', 'AdmissionLetter',
  'EmploymentDocument', 'Contract', 'IdentityDocument', 'Other',
];

type Tab = 'profile' | 'documents' | 'notes';

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [newNote, setNewNote] = useState('');
  const [docForm, setDocForm] = useState({ documentName: '', category: 'Other' as DocumentCategory, fileUrl: '', description: '' });
  const [showDocForm, setShowDocForm] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickedName, setPickedName] = useState('');
  const { byDepartmentId } = useBrands();

  const { data: client } = useApiQuery(
    ['client', id],
    () => clientService.getById(id!)
  );

  const { data: documents, refetch: refetchDocs } = useApiQuery(
    ['client-docs', id],
    () => clientService.getDocuments(id!),
    { enabled: activeTab === 'documents' }
  );

  const { data: notes, refetch: refetchNotes } = useApiQuery(
    ['client-notes', id],
    () => clientService.getNotes(id!),
    { enabled: activeTab === 'notes' }
  );

  const deleteMutation = useApiMutation(
    () => clientService.delete(id!),
    { invalidateKeys: [['clients']], onSuccess: () => navigate('/clients') }
  );

  const addNoteMutation = useApiMutation(
    (note: string) => clientService.addNote(id!, note),
    { invalidateKeys: [['client-notes', id]], onSuccess: () => { setNewNote(''); refetchNotes(); } }
  );

  const deleteNoteMutation = useApiMutation(
    (noteId: number | string) => clientService.deleteNote(id!, noteId),
    { invalidateKeys: [['client-notes', id]], onSuccess: () => refetchNotes() }
  );

  const uploadDocMutation = useApiMutation(
    (data: typeof docForm) => clientService.uploadDocument(id!, data),
    {
      invalidateKeys: [['client-docs', id]],
      onSuccess: () => { setDocForm({ documentName: '', category: 'Other', fileUrl: '', description: '' }); setPickedName(''); setShowDocForm(false); refetchDocs(); },
    }
  );

  const deleteDocMutation = useApiMutation(
    (docId: number | string) => clientService.deleteDocument(id!, docId),
    { invalidateKeys: [['client-docs', id]], onSuccess: () => refetchDocs() }
  );

  if (!client) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>;

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: 'Profile', icon: Flag },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'notes', label: 'Notes', icon: StickyNote },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-semibold">
                {client.fullName.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{client.fullName}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-mono text-gray-500">{client.clientId}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[client.status]}`}>
                    {client.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/clients/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <Edit2 className="h-4 w-4" /> Edit
          </Link>
          <button
            onClick={() => { if (confirm('Delete this client?')) deleteMutation.mutate(undefined as never); }}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Contact Information</h3>
            {[
              { icon: Mail, label: 'Email', value: client.email },
              { icon: Phone, label: 'Phone', value: client.phone },
              { icon: Phone, label: 'Alt. Phone', value: client.alternatePhone || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Personal Details</h3>
            {[
              { icon: Calendar, label: 'Date of Birth', value: client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : '—' },
              { icon: Flag, label: 'Nationality', value: client.nationality || '—' },
              { icon: MapPin, label: 'Country', value: client.country || '—' },
              { icon: MapPin, label: 'Address', value: client.address || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
          {client.notes && (
            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowDocForm(!showDocForm)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </button>
          </div>

          {showDocForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Upload New Document</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Document Name *</label>
                  <input
                    value={docForm.documentName}
                    onChange={(e) => setDocForm({ ...docForm, documentName: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. International Passport"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select
                    value={docForm.category}
                    onChange={(e) => setDocForm({ ...docForm, category: e.target.value as DocumentCategory })}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none"
                  >
                    {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">File *</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setPicking(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Upload className="h-4 w-4" />{docForm.fileUrl ? 'Change file' : 'Choose from MaxHub Files or computer'}
                  </button>
                  {docForm.fileUrl && <span className="text-sm text-emerald-700 dark:text-emerald-400 truncate max-w-[260px]">✓ {pickedName || 'File attached'}</span>}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Also saved in Files › {({ VM: 'VisaMax', VMX: 'VisaMax', KS: 'Kurios SAT', BM: 'BeadMax', MF: 'Maxfood Farm' } as Record<string, string>)[String(byDepartmentId((client as any)?.departmentId)?.code || '').split('-')[0]] || 'Shared'} › {client?.fullName}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input
                  value={docForm.description}
                  onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none"
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDocForm(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button
                  disabled={!docForm.documentName || !docForm.fileUrl || uploadDocMutation.isPending}
                  onClick={() => uploadDocMutation.mutate(docForm)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-60 hover:bg-indigo-700"
                >
                  {uploadDocMutation.isPending ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          )}

          {picking && client && (
            <ClientFilePicker
              brand={(byDepartmentId((client as any).departmentId) as any)?.code || ''}
              client={client.fullName}
              multiple={false}
              title="Attach a client document"
              onClose={() => setPicking(false)}
              onPicked={(f) => { if (f[0]) { setPickedName(f[0].name); setDocForm((d) => ({ ...d, fileUrl: f[0].url, documentName: d.documentName || f[0].name.replace(/\.[^.]+$/, '') })); } }}
            />
          )}

          {!documents?.length ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <FileText className="h-8 w-8" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{doc.documentName}</p>
                      <p className="text-xs text-gray-400">{doc.category} • Version {doc.version}</p>
                      {doc.description && <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" title="Download" onClick={() => saveFileToComputer(doc.fileUrl, doc.documentName)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                      <Download className="h-4 w-4" />
                    </button>
                    <button onClick={() => { if (confirm('Delete document?')) deleteDocMutation.mutate(doc.id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <textarea
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this client..."
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                disabled={!newNote.trim() || addNoteMutation.isPending}
                onClick={() => addNoteMutation.mutate(newNote)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                <Plus className="h-4 w-4" />
                Add Note
              </button>
            </div>
          </div>

          {!notes?.length ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
              <StickyNote className="h-6 w-6" />
              <p className="text-sm">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
                  <StickyNote className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.note}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(note.createdAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => { if (confirm('Delete note?')) deleteNoteMutation.mutate(note.id); }} className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
