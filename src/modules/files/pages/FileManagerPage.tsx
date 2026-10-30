import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@components/ui/toaster';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FileText, Image, Archive, File, Video,
  Upload, Search, Grid3X3, List, Download,
  Share2, Trash2, Edit3, ChevronRight, Home,
  X, Check, AlertCircle, Lock,
  Eye, Copy, FolderUp, FolderDown, Loader2,
} from 'lucide-react';
import { apiClient, API_BASE_URL } from '@services/apiClient';
import { uploadToCloudinary, withForcedDownload } from '@services/cloudinaryService';
import FilePreviewModal, { type FilePreviewTarget } from '@components/ui/FilePreviewModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileFolder {
  id: string;
  uuid: string;
  name: string;
  parentId: string | null;
  folderType?: 'Personal' | 'General';
  itemCount?: number;
  children?: FileFolder[];
}

interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folderId: string;
  uploadedAt: string;
  owner?: string;
  url?: string;
}

type ViewMode = 'grid' | 'list';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(mimeType: string) {
  if (!mimeType) return { Icon: File, color: 'text-gray-400', bg: 'bg-gray-100' };
  if (mimeType.includes('pdf')) return { Icon: FileText, color: 'text-red-600', bg: 'bg-red-50' };
  if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('msword'))
    return { Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' };
  if (mimeType.includes('image')) return { Icon: Image, color: 'text-green-600', bg: 'bg-green-50' };
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('tar'))
    return { Icon: Archive, color: 'text-gray-600', bg: 'bg-gray-100' };
  if (mimeType.includes('video')) return { Icon: Video, color: 'text-violet-600', bg: 'bg-violet-50' };
  return { Icon: File, color: 'text-gray-500', bg: 'bg-gray-50' };
}

function formatBytes(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number;
  y: number;
  file: FileItem;
  onClose: () => void;
  onRename: (f: FileItem) => void;
  onDelete: (f: FileItem) => void;
  onShare: (f: FileItem) => void;
  onDownload: (f: FileItem) => void;
  onPreview: (f: FileItem) => void;
}

function ContextMenu({ x, y, file, onClose, onRename, onDelete, onShare, onDownload, onPreview }: ContextMenuProps) {
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  const items = [
    { icon: Eye, label: 'Preview', action: () => onPreview(file) },
    { icon: Edit3, label: 'Rename', action: () => onRename(file) },
    { icon: Download, label: 'Download', action: () => onDownload(file) },
    { icon: Share2, label: 'Share', action: () => onShare(file) },
    { icon: Copy, label: 'Copy link', action: () => navigator.clipboard.writeText(file.url || '') },
    { icon: Trash2, label: 'Delete', action: () => onDelete(file), danger: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 w-44"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
    >
      {items.map(({ icon: Icon, label, action, danger }) => (
        <button
          key={label}
          onClick={() => { action(); onClose(); }}
          className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
            danger ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          <Icon className="w-3.5 h-3.5" /> {label}
        </button>
      ))}
    </motion.div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const addEmail = () => {
    if (email && !emails.includes(email)) {
      setEmails(prev => [...prev, email]);
      setEmail('');
    }
  };

  const handleShare = async () => {
    setSending(true);
    try {
      await apiClient.post(`/files/${file.id}/share`, { emails });
      setDone(true);
    } catch {
      // best effort
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Share File</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{file.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {done ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">Shared successfully!</p>
            <button onClick={onClose} className="text-sm text-indigo-600 hover:underline">Close</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEmail()}
                placeholder="Enter email address"
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:text-white"
              />
              <button
                onClick={addEmail}
                className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100"
              >
                Add
              </button>
            </div>

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emails.map(e => (
                  <span key={e} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                    {e}
                    <button onClick={() => setEmails(prev => prev.filter(x => x !== e))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={handleShare}
                disabled={sending || emails.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Share
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Pending file row (with thumbnail) for the upload modal ───────────────────

function PendingFileRow({ file, label, status, onRemove }: { file: File; label?: string; status?: 'pending' | 'done' | 'error'; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/') && file.size < 8_000_000;
  const localUrl = useMemo(() => (isImage ? URL.createObjectURL(file) : null), [file, isImage]);
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  return (
    <div className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {localUrl ? (
        <img src={localUrl} alt={file.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
      ) : (
        <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 dark:text-white truncate" title={label || file.name}>{label || file.name}</p>
        <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
      </div>
      {status === 'done' && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
      {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
      {!status && (
        <button onClick={onRemove}>
          <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
        </button>
      )}
    </div>
  );
}

// ─── Folder picking helpers ─────────────────────────────────────────────────

/** A file plus where it sits inside the folder that was chosen ("" = loose file). */
interface Picked { file: File; rel: string }
const JUNK = /^(\.DS_Store|Thumbs\.db|desktop\.ini|\._.*)$/i;
const dirOf = (rel: string) => rel.split('/').slice(0, -1).join('/');

/** Reads a dropped folder (and everything inside it) using the browser's entry API. */
async function readEntry(entry: any, prefix = ''): Promise<Picked[]> {
  if (!entry) return [];
  if (entry.isFile) {
    const file: File = await new Promise((ok, bad) => entry.file(ok, bad));
    return JUNK.test(file.name) ? [] : [{ file, rel: prefix + file.name }];
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const kids: any[] = [];
    // readEntries returns at most ~100 at a time — keep reading until empty.
    for (;;) { const batch: any[] = await new Promise((ok, bad) => reader.readEntries(ok, bad)); if (!batch.length) break; kids.push(...batch); }
    const out: Picked[] = [];
    for (const k of kids) out.push(...(await readEntry(k, `${prefix}${entry.name}/`)));
    return out;
  }
  return [];
}

/** Asks the server for a one-time link and lets the browser download the ZIP. */
export async function downloadFolderZip(uuid: string, name: string) {
  try {
    const r: any = await apiClient.post(`/files/folders/${uuid}/zip-link`, {});
    const info = r?.token ? r : r?.data;
    toast.success(`Preparing "${name}.zip"`, `${info.files} file(s) in ${info.folders + 1} folder(s), about ${formatBytes(info.totalSize)}. The download will start in a moment.`);
    const a = document.createElement('a');
    a.href = `${API_BASE_URL}/files/zip/${info.token}`;
    a.rel = 'noopener';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  } catch (e) {
    toast.fromError(e, 'Could not download the folder');
  }
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

interface UploadZoneProps {
  folderId: string | null;
  onClose: () => void;
  onUploaded: () => void;
}

function UploadZone({ folderId, onClose, onUploaded }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<Picked[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<Record<string, 'pending' | 'done' | 'error'>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Chrome, Edge, Firefox and Safari all support picking a whole folder this way.
    folderRef.current?.setAttribute('webkitdirectory', '');
    folderRef.current?.setAttribute('directory', '');
  }, []);

  const add = (more: Picked[]) => setItems(prev => {
    const seen = new Set(prev.map(p => p.rel));
    return [...prev, ...more.filter(p => !seen.has(p.rel))];
  });

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const entries = Array.from(e.dataTransfer.items || []).map((it: any) => it.webkitGetAsEntry?.()).filter(Boolean);
    if (entries.length) {
      setReading(true);
      try { const all: Picked[] = []; for (const en of entries) all.push(...(await readEntry(en))); add(all); } finally { setReading(false); }
    } else {
      add(Array.from(e.dataTransfer.files).map(file => ({ file, rel: file.name })));
    }
  };

  const folderCount = useMemo(() => new Set(items.map(i => dirOf(i.rel)).filter(Boolean)).size, [items]);
  const totalSize = useMemo(() => items.reduce((n, i) => n + i.file.size, 0), [items]);
  const doneCount = Object.values(progress).filter(v => v === 'done').length;
  const failCount = Object.values(progress).filter(v => v === 'error').length;

  const handleUpload = async () => {
    if (!items.length) return;
    if (!folderId) { toast.error('Open a folder first', 'Choose where the files should go, then upload.'); return; }
    setUploading(true);
    try {
      // 1) Re-create the folder structure (existing folders with the same name are re-used).
      const dirs = [...new Set(items.map(i => dirOf(i.rel)).filter(Boolean))];
      let map: Record<string, string> = { '': folderId };
      if (dirs.length) {
        const r: any = await apiClient.post('/files/folders/tree', { parentId: folderId, paths: dirs });
        map = { ...map, ...(r?.data && typeof r.data === 'object' && !r[''] ? r.data : r) };
      }
      // 2) Upload the files, a few at a time.
      const queue = [...items];
      let failedHere = 0;
      const worker = async () => {
        for (let it = queue.shift(); it; it = queue.shift()) {
          const { file, rel } = it;
          try {
            // Files go straight to Cloudinary (same as chat attachments and
            // staff documents); the backend call just records the permanent URL.
            const uploaded = await uploadToCloudinary(file, 'maxhub-files');
            await apiClient.post('/files/upload', {
              name: file.name, url: uploaded.url, folderId: map[dirOf(rel)] || folderId,
              mimeType: file.type, size: file.size,
            });
            setProgress(p => ({ ...p, [rel]: 'done' }));
          } catch {
            failedHere++;
            setProgress(p => ({ ...p, [rel]: 'error' }));
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, items.length) }, worker));
      if (failedHere) {
        setUploading(false);
        toast.error(`${failedHere} file(s) did not upload`, 'They are marked with a red sign. Remove them or close and try them again.');
        return;
      }
    } catch (e) {
      toast.fromError(e, 'Could not create the folders');
      setUploading(false);
      return;
    }
    setUploading(false);
    onUploaded();
  };

  const shown = items.slice(0, 150);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Upload files or folders</h2>
          <button onClick={onClose} disabled={uploading} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition ${
              dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 dark:border-gray-600'
            }`}
          >
            {reading ? <Loader2 className="w-8 h-8 text-indigo-500 mx-auto mb-3 animate-spin" /> : <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />}
            <p className="text-sm text-gray-600 dark:text-gray-400">{reading ? 'Reading the folder…' : 'Drag & drop files or whole folders here'}</p>
            <p className="text-xs text-gray-400 mt-1">Folders keep their sub-folders, exactly as on your computer</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                <File className="w-4 h-4" /> Choose files
              </button>
              <button type="button" onClick={() => folderRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100">
                <FolderUp className="w-4 h-4" /> Choose a folder
              </button>
            </div>
            <input ref={inputRef} type="file" multiple className="hidden"
              onChange={e => { add(Array.from(e.target.files || []).map(file => ({ file, rel: file.name }))); e.target.value = ''; }} />
            <input ref={folderRef} type="file" multiple className="hidden"
              onChange={e => { add(Array.from(e.target.files || []).filter(f => !JUNK.test(f.name)).map(file => ({ file, rel: (file as any).webkitRelativePath || file.name }))); e.target.value = ''; }} />
          </div>

          {items.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{items.length} file(s){folderCount ? ` in ${folderCount} folder(s)` : ''} · {formatBytes(totalSize)}</span>
                {!uploading && !doneCount && <button onClick={() => { setItems([]); setProgress({}); }} className="text-red-500 hover:underline">Clear</button>}
              </div>
              {(uploading || doneCount > 0) && (
                <div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${Math.round(((doneCount + failCount) / items.length) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Uploaded {doneCount} of {items.length}{failCount ? ` · ${failCount} failed` : ''}{uploading ? ' — keep this window open' : ''}</p>
                </div>
              )}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shown.map(p => (
                  <PendingFileRow key={p.rel} file={p.file} label={p.rel} status={progress[p.rel]} onRemove={() => setItems(prev => prev.filter(x => x !== p))} />
                ))}
                {items.length > shown.length && <p className="text-xs text-gray-400 text-center py-1">…and {items.length - shown.length} more</p>}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} disabled={uploading} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button
              onClick={handleUpload}
              disabled={uploading || reading || items.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {uploading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Upload {items.length > 0 ? `(${items.length})` : ''}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FileManagerPage() {
  const qc = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [, setSelectedFolderName] = useState<string>('All Files');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [renameFile, setRenameFile] = useState<FileItem | null>(null);
  const [renameName, setRenameName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const [breadcrumbs] = useState([{ id: null, name: 'My Files' }]);
  // Path inside the selected top-level folder (sub-folders inherit its privacy).
  const [trail, setTrail] = useState<{ uuid: string; name: string }[]>([]);
  const openFolder = (f: { uuid: string; name: string }, reset = false) => {
    const next = reset ? [f] : [...trail, f];
    setTrail(next); setSelectedFolderId(f.uuid); setSelectedFolderName(f.name);
  };
  const { data: subFoldersRaw } = useQuery({
    queryKey: ['file-subfolders', selectedFolderId],
    queryFn: () => apiClient.get('/files/folders', { parentId: selectedFolderId }),
    enabled: !!selectedFolderId,
  });
  const subFolders: FileFolder[] = (subFoldersRaw as any)?.data || (subFoldersRaw as any) || [];
  const createFolder = useMutation({
    mutationFn: (name: string) => apiClient.post('/files/folders', { name, parentId: selectedFolderId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['file-subfolders'] }); toast.success('Folder created'); },
    onError: (e) => toast.fromError(e, 'Could not create folder'),
  });
  const deleteFolder = useMutation({
    mutationFn: (uuid: string) => apiClient.delete(`/files/folders/${uuid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['file-subfolders'] }); toast.success('Folder deleted'); },
    onError: (e) => toast.fromError(e, 'Could not delete folder'),
  });
  const [previewFile, setPreviewFile] = useState<FilePreviewTarget | null>(null);
  const [zipping, setZipping] = useState(false);

  // Fetch folders
  const { data: foldersRaw } = useQuery({
    queryKey: ['file-folders'],
    queryFn: () => apiClient.get('/files/folders'),
    retry: false,
  });

  // Fetch files
  const { data: filesRaw, isLoading: filesLoading } = useQuery({
    queryKey: ['files', selectedFolderId, search],
    queryFn: () => apiClient.get('/files', { folderId: selectedFolderId, search: search || undefined }),
    retry: false,
  });

  const folders: FileFolder[] = (foldersRaw as any)?.data || (foldersRaw as any) || [];
  const files: FileItem[] = (filesRaw as any)?.data || (filesRaw as any) || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/files/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });

  const handleRightClick = useCallback((e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }, []);

  const handleDownload = (file: FileItem) => {
    if (!file.url) return;
    // The HTML `download` attribute is ignored by browsers for cross-origin
    // URLs like Cloudinary's — window.open or a plain <a> just opens the
    // file inline instead of saving it. withForcedDownload appends
    // Cloudinary's fl_attachment flag, which makes Cloudinary itself send
    // Content-Disposition: attachment, the only thing that reliably forces
    // a real download cross-origin.
    const a = document.createElement('a');
    a.href = withForcedDownload(file.url);
    a.download = file.name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = (file: FileItem) => {
    if (window.confirm(`Delete "${file.name}"?`)) {
      deleteMutation.mutate(file.id);
    }
  };

  const myFolder = folders.find(f => f.folderType === 'Personal');
  // The backend's folder lookups filter by FileRecord.uuid (a real UUID
  // column) — folder.id is the numeric primary key, which was being sent
  // instead and threw "invalid input syntax for type uuid" on every folder
  // navigation/upload.
  const uploadTargetFolderId = selectedFolderId ?? myFolder?.uuid ?? null;

  return (
    <div className="flex h-full min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 p-4 space-y-1">
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <Folder className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-gray-900 dark:text-white text-sm">File Manager</span>
        </div>

        <button
          onClick={() => { setSelectedFolderId(null); setSelectedFolderName('All Files'); setTrail([]); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
            selectedFolderId === null ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Home className="w-4 h-4" /> All Files
        </button>

        <div className="pt-2">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Folders</p>
          {folders.map(folder => {
            const isPersonal = folder.folderType === 'Personal';
            return (
              <button
                key={folder.id}
                onClick={() => openFolder({ uuid: folder.uuid, name: folder.name }, true)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  selectedFolderId === folder.uuid
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {isPersonal
                  ? <Lock className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  : <Folder className="w-4 h-4 flex-shrink-0 text-blue-500" />}
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto text-[10px] text-gray-400">{isPersonal ? 'Private' : 'Public'}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-3 flex flex-wrap items-center gap-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-gray-500 mr-auto">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.name} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                <span className="text-gray-400">
                  {crumb.name}
                </span>
              </span>
            ))}
            {trail.map((t, i) => (
              <span key={t.uuid} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5" />
                <button onClick={() => { const next = trail.slice(0, i + 1); setTrail(next); setSelectedFolderId(t.uuid); setSelectedFolderName(t.name); }}
                  className={i === trail.length - 1 ? 'text-gray-800 dark:text-white font-medium' : 'hover:text-indigo-600'}>{t.name}</button>
              </span>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* View toggle */}
          <div className="flex border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            {(['grid', 'list'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`p-1.5 transition ${viewMode === v ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {v === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {selectedFolderId && (
            <button
              onClick={() => { const name = prompt('Folder name'); if (name?.trim()) createFolder.mutate(name.trim()); }}
              className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Folder className="w-3.5 h-3.5" /> New folder
            </button>
          )}
          {selectedFolderId && (
            <button
              onClick={async () => { setZipping(true); await downloadFolderZip(selectedFolderId, trail[trail.length - 1]?.name || 'Folder'); setZipping(false); }}
              disabled={zipping}
              title="Download this folder and everything inside it as one ZIP file"
              className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {zipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderDown className="w-3.5 h-3.5" />} Download folder
            </button>
          )}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        </div>

        {/* File area */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedFolderId && subFolders.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Folders</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {subFolders.map(sf => (
                  <div key={sf.uuid} className="group relative flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 hover:shadow-sm cursor-pointer"
                    onClick={() => openFolder({ uuid: sf.uuid, name: sf.name })}>
                    {sf.folderType === 'Personal' ? <Lock className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-blue-500" />}
                    <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{sf.name}</span>
                    <button title="Download as ZIP" onClick={(e) => { e.stopPropagation(); downloadFolderZip(sf.uuid, sf.name); }}
                      className="ml-auto hidden group-hover:block p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20"><FolderDown className="w-3 h-3 text-indigo-500" /></button>
                    <button title="Delete folder" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete folder "${sf.name}"? It must be empty.`)) deleteFolder.mutate(sf.uuid); }}
                      className="hidden group-hover:block p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-3 h-3 text-red-500" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {filesLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Folder className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No files yet</p>
              <p className="text-sm mt-1">Upload files, or a whole folder from your computer</p>
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
              >
                <Upload className="w-3.5 h-3.5" /> Upload files or a folder
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {files.map((file, i) => {
                const { Icon, color, bg } = getFileIcon(file.mimeType);
                const isImage = file.mimeType?.includes('image') && file.url;
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onContextMenu={e => handleRightClick(e, file)}
                    onClick={() => file.url && setPreviewFile({ url: file.url, name: file.name, mimeType: file.mimeType })}
                    className="group relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:shadow-md transition cursor-pointer"
                  >
                    {isImage ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden mb-3 mx-auto">
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-3 mx-auto`}>
                        <Icon className={`w-6 h-6 ${color}`} />
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-800 dark:text-white text-center truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 text-center mt-0.5">{formatBytes(file.size)}</p>

                    {/* Hover actions */}
                    <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-b-xl flex items-center justify-around p-1.5">
                      <button onClick={e => { e.stopPropagation(); handleDownload(file); }} title="Download" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <Download className="w-3 h-3 text-gray-500" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setShareFile(file); }} title="Share" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <Share2 className="w-3 h-3 text-gray-500" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setRenameFile(file); setRenameName(file.name); }} title="Rename" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <Edit3 className="w-3 h-3 text-gray-500" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(file); }} title="Delete" className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    {['Name', 'Size', 'Owner', 'Date', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {files.map((file, i) => {
                    const { Icon, color, bg } = getFileIcon(file.mimeType);
                    const isImage = file.mimeType?.includes('image') && file.url;
                    return (
                      <motion.tr
                        key={file.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onContextMenu={e => handleRightClick(e, file)}
                        onClick={() => file.url && setPreviewFile({ url: file.url, name: file.name, mimeType: file.mimeType })}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/40 group cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {isImage ? (
                              <img src={file.url} alt={file.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                              </div>
                            )}
                            <span className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-xs">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatBytes(file.size)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{file.owner || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(file.uploadedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={e => { e.stopPropagation(); handleDownload(file); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Download className="w-3.5 h-3.5 text-gray-500" /></button>
                            <button onClick={e => { e.stopPropagation(); setShareFile(file); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Share2 className="w-3.5 h-3.5 text-gray-500" /></button>
                            <button onClick={e => { e.stopPropagation(); setRenameFile(file); setRenameName(file.name); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Edit3 className="w-3.5 h-3.5 text-gray-500" /></button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(file); }} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals & overlays */}
      <AnimatePresence>
        {showUpload && (
          <UploadZone
            folderId={uploadTargetFolderId}
            onClose={() => { setShowUpload(false); qc.invalidateQueries({ queryKey: ['files'] }); qc.invalidateQueries({ queryKey: ['file-subfolders'] }); }}
            onUploaded={() => { qc.invalidateQueries({ queryKey: ['files'] }); qc.invalidateQueries({ queryKey: ['file-subfolders'] }); setShowUpload(false); toast.success('Upload finished'); }}
          />
        )}

        {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}

        {renameFile && (
          <div className="fixed inset-0 overflow-y-auto bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm max-h-[92vh] overflow-y-auto p-6 space-y-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Rename File</h2>
              </div>
              <input
                autoFocus
                value={renameName}
                onChange={e => setRenameName(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:text-white"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setRenameFile(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button
                  onClick={async () => {
                    try {
                      await apiClient.patch(`/files/${renameFile.id}`, { name: renameName });
                      qc.invalidateQueries({ queryKey: ['files'] });
                    } finally {
                      setRenameFile(null);
                    }
                  }}
                  disabled={!renameName}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  Rename
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={() => setContextMenu(null)}
          onRename={f => { setRenameFile(f); setRenameName(f.name); }}
          onDelete={handleDelete}
          onShare={f => setShareFile(f)}
          onDownload={handleDownload}
          onPreview={f => f.url && setPreviewFile({ url: f.url, name: f.name, mimeType: f.mimeType })}
        />
      )}

      <FilePreviewModal target={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
