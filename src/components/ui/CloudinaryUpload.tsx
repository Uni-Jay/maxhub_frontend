import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Paperclip, X, CheckCircle2, AlertCircle, Loader2, Download, Eye } from 'lucide-react';
import { cloudinaryService, type CloudinaryUploadResult } from '@services/cloudinaryService';
import { cn } from '@utils/cn';
import FilePreviewModal, { type FilePreviewTarget } from './FilePreviewModal';

interface Props {
  folder?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  onUpload?: (results: CloudinaryUploadResult[]) => void;
  className?: string;
  label?: string;
  compact?: boolean;
}

interface FileState {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  result?: CloudinaryUploadResult;
  error?: string;
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CloudinaryUpload({
  folder = 'maxhub-erp',
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.txt',
  multiple = true,
  maxSizeMB = 10,
  onUpload,
  className,
  label = 'Upload Documents',
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileState[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);

  const processFiles = async (rawFiles: File[]) => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    const newStates: FileState[] = rawFiles.map(f => ({
      file: f,
      status: f.size > maxBytes ? 'error' : 'pending',
      error: f.size > maxBytes ? `File exceeds ${maxSizeMB} MB limit` : undefined,
    }));

    setFiles(prev => [...prev, ...newStates]);

    const toUpload = newStates.filter(s => s.status === 'pending');

    for (const state of toUpload) {
      setFiles(prev =>
        prev.map(s => s.file === state.file ? { ...s, status: 'uploading' } : s)
      );
      try {
        const result = await cloudinaryService.upload(state.file, folder);
        setFiles(prev =>
          prev.map(s => s.file === state.file ? { ...s, status: 'done', result } : s)
        );
      } catch (err: any) {
        setFiles(prev =>
          prev.map(s => s.file === state.file ? { ...s, status: 'error', error: err.message || 'Upload failed' } : s)
        );
      }
    }

    const results = toUpload
      .map(s => {
        const updated = files.find(f => f.file === s.file);
        return updated?.result;
      })
      .filter(Boolean) as CloudinaryUploadResult[];

    if (results.length && onUpload) onUpload(results);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
  };

  const remove = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  if (compact) {
    return (
      <div className={className}>
        <input ref={inputRef} type="file" multiple={multiple} accept={accept} className="hidden" onChange={handleFileInput} />
        <button type="button" onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
          <Paperclip className="h-4 w-4" /> {label}
        </button>
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((f, i) => (
              <FileRow key={i} f={f} onRemove={() => remove(i)} onPreview={setPreviewTarget} />
            ))}
          </div>
        )}
        <FilePreviewModal target={previewTarget} onClose={() => setPreviewTarget(null)} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <input ref={inputRef} type="file" multiple={multiple} accept={accept} className="hidden" onChange={handleFileInput} />

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors',
          dragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        )}
      >
        <Upload className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        <p className="text-xs text-gray-400 mt-1">
          {dragOver ? 'Drop files here' : `Drag & drop or click — max ${maxSizeMB} MB per file`}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">PDF, Word, Excel, Images supported</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <FileRow key={i} f={f} onRemove={() => remove(i)} onPreview={setPreviewTarget} />
          ))}
        </div>
      )}

      {!cloudinaryService.isConfigured() && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5">
          Cloudinary not configured — files stored locally in demo mode. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env to enable cloud storage.
        </p>
      )}

      <FilePreviewModal target={previewTarget} onClose={() => setPreviewTarget(null)} />
    </div>
  );
}

function FileRow({ f, onRemove, onPreview }: { f: FileState; onRemove: () => void; onPreview: (t: FilePreviewTarget) => void }) {
  const isImage = f.file.type.startsWith('image/');
  const localUrl = useMemo(() => (isImage ? URL.createObjectURL(f.file) : null), [f.file, isImage]);
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  const previewUrl = f.result?.url ?? localUrl;
  const canPreview = f.status === 'done' || (isImage && !!localUrl);

  const openPreview = () => {
    if (!canPreview || !previewUrl) return;
    onPreview({ url: previewUrl, name: f.file.name, mimeType: f.file.type });
  };

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2">
      {isImage && localUrl ? (
        <button type="button" onClick={openPreview} disabled={!canPreview}
          className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700">
          <img src={previewUrl ?? localUrl} alt={f.file.name} className="w-full h-full object-cover" />
        </button>
      ) : (
        <Paperclip className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{f.file.name}</p>
        <p className="text-[10px] text-gray-400">{fmtBytes(f.file.size)}</p>
      </div>
      <div className="flex items-center gap-2">
        {f.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />}
        {f.status === 'done' && (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            {f.result && (
              <>
                <button type="button" onClick={openPreview} className="p-0.5 text-gray-400 hover:text-indigo-600 transition" title="Preview">
                  <Eye className="h-3 w-3" />
                </button>
                <button type="button"
                  onClick={() => cloudinaryService.download(f.result!.url, f.file.name)}
                  className="p-0.5 text-gray-400 hover:text-indigo-600 transition" title="Download">
                  <Download className="h-3 w-3" />
                </button>
              </>
            )}
          </>
        )}
        {f.status === 'error' && (
          <span className="text-[10px] text-red-500 max-w-[100px] truncate" title={f.error}>
            <AlertCircle className="h-3.5 w-3.5 inline mr-0.5" />{f.error}
          </span>
        )}
        {f.status === 'pending' && <span className="text-[10px] text-gray-400">Pending</span>}
        <button type="button" onClick={onRemove} className="p-0.5 text-gray-300 hover:text-red-500 transition">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
