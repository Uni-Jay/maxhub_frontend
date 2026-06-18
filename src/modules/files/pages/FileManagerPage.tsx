import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FileText, Image, Archive, File, Video,
  Upload, Search, Grid3X3, List, Download,
  Share2, Trash2, Edit3, ChevronRight, Home,
  X, Check, AlertCircle, Lock,
  Eye, Copy,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileFolder {
  id: string;
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

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res((reader.result as string).split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
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
}

function ContextMenu({ x, y, file, onClose, onRename, onDelete, onShare, onDownload }: ContextMenuProps) {
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  const items = [
    { icon: Eye, label: 'Open', action: () => file.url && window.open(file.url, '_blank') },
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md"
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

// ─── Upload Zone ──────────────────────────────────────────────────────────────

interface UploadZoneProps {
  folderId: string | null;
  onClose: () => void;
  onUploaded: () => void;
}

function UploadZone({ folderId, onClose, onUploaded }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, 'pending' | 'done' | 'error'>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const base64Content = await toBase64(file);
        await apiClient.post('/files/upload', {
          name: file.name,
          base64Content,
          folderId: folderId || undefined,
          mimeType: file.type,
        });
        setProgress(p => ({ ...p, [file.name]: 'done' }));
      } catch {
        setProgress(p => ({ ...p, [file.name]: 'error' }));
      }
    }
    setUploading(false);
    onUploaded();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Upload Files</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 dark:border-gray-600 hover:border-indigo-400'
            }`}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag & drop files here, or <span className="text-indigo-600 font-medium">click to browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Any file type supported</p>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))} />
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map(f => {
                const status = progress[f.name];
                return (
                  <div key={f.name} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-white truncate">{f.name}</p>
                      <p className="text-xs text-gray-400">{formatBytes(f.size)}</p>
                    </div>
                    {status === 'done' && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    {!status && (
                      <button onClick={() => setFiles(prev => prev.filter(x => x !== f))}>
                        <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {uploading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Upload {files.length > 0 ? `(${files.length})` : ''}
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
  const [selectedFolderName, setSelectedFolderName] = useState<string>('All Files');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [renameFile, setRenameFile] = useState<FileItem | null>(null);
  const [renameName, setRenameName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const [breadcrumbs] = useState([{ id: null, name: 'My Files' }]);

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
    if (file.url) window.open(file.url, '_blank');
  };

  const handleDelete = (file: FileItem) => {
    if (window.confirm(`Delete "${file.name}"?`)) {
      deleteMutation.mutate(file.id);
    }
  };

  const myFolder = folders.find(f => f.folderType === 'Personal');
  const uploadTargetFolderId = selectedFolderId ?? myFolder?.id ?? null;

  return (
    <div className="flex h-full min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 p-4 space-y-1">
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <Folder className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-gray-900 dark:text-white text-sm">File Manager</span>
        </div>

        <button
          onClick={() => { setSelectedFolderId(null); setSelectedFolderName('All Files'); }}
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
                onClick={() => { setSelectedFolderId(folder.id); setSelectedFolderName(folder.name); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  selectedFolderId === folder.id
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {isPersonal
                  ? <Lock className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  : <Folder className="w-4 h-4 flex-shrink-0 text-blue-500" />}
                <span className="truncate">{folder.name}</span>
                {isPersonal && <span className="ml-auto text-[10px] text-gray-400">Private</span>}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-3 flex items-center gap-4">
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
            {selectedFolderId && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-800 dark:text-white font-medium">{selectedFolderName}</span>
              </>
            )}
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

          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        </div>

        {/* File area */}
        <div className="flex-1 overflow-y-auto p-6">
          {filesLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Folder className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No files yet</p>
              <p className="text-sm mt-1">Upload files or create a folder to get started</p>
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Files
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {files.map((file, i) => {
                const { Icon, color, bg } = getFileIcon(file.mimeType);
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onContextMenu={e => handleRightClick(e, file)}
                    className="group relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:shadow-md transition cursor-pointer"
                  >
                    <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-3 mx-auto`}>
                      <Icon className={`w-6 h-6 ${color}`} />
                    </div>
                    <p className="text-xs font-medium text-gray-800 dark:text-white text-center truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 text-center mt-0.5">{formatBytes(file.size)}</p>

                    {/* Hover actions */}
                    <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-b-xl flex items-center justify-around p-1.5">
                      <button onClick={() => handleDownload(file)} title="Download" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <Download className="w-3 h-3 text-gray-500" />
                      </button>
                      <button onClick={() => setShareFile(file)} title="Share" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <Share2 className="w-3 h-3 text-gray-500" />
                      </button>
                      <button onClick={() => { setRenameFile(file); setRenameName(file.name); }} title="Rename" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <Edit3 className="w-3 h-3 text-gray-500" />
                      </button>
                      <button onClick={() => handleDelete(file)} title="Delete" className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
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
                    return (
                      <motion.tr
                        key={file.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onContextMenu={e => handleRightClick(e, file)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/40 group cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-xs">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatBytes(file.size)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{file.owner || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(file.uploadedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => handleDownload(file)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Download className="w-3.5 h-3.5 text-gray-500" /></button>
                            <button onClick={() => setShareFile(file)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Share2 className="w-3.5 h-3.5 text-gray-500" /></button>
                            <button onClick={() => { setRenameFile(file); setRenameName(file.name); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Edit3 className="w-3.5 h-3.5 text-gray-500" /></button>
                            <button onClick={() => handleDelete(file)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
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
            onClose={() => setShowUpload(false)}
            onUploaded={() => { qc.invalidateQueries({ queryKey: ['files'] }); setShowUpload(false); }}
          />
        )}

        {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}

        {renameFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
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
        />
      )}
    </div>
  );
}
