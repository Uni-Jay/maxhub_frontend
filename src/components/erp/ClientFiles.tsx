import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Folder, FolderOpen, Lock, Loader2, X, Search, Upload, HardDrive, FileText, Image as ImageIcon, Download, Eye, Check } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { uploadToCloudinary } from '@services/cloudinaryService';
import { saveFileToComputer } from '@services/downloadFile';
import { toast } from '@components/ui/toaster';
import FilePreviewModal, { type FilePreviewTarget } from '@components/ui/FilePreviewModal';
import { cn } from '@utils/cn';

export interface PickedFile { id?: string; url: string; name: string; mimeType?: string; size?: number }
interface FolderRow { uuid: string; name: string; icon?: string; folderType?: string | null }
interface FileRow { id: string; uuid: string; name: string; url?: string; mimeType?: string; size?: number; createdAt?: string; uploadedByName?: string }

const fmtSize = (b?: number) => (!b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const iconFor = (m?: string) => (m?.startsWith('image/') ? ImageIcon : FileText);

/** Makes sure "<Brand> › <Client>" exists in Files and returns it. */
async function ensureClientFolder(brand: string, client: string) {
  return apiClient.post<{ uuid: string; name: string; path: string }>('/files/client-folder', { brand, client });
}

/** Uploads files from the computer straight into the client's folder. */
export async function uploadToClientFolder(brand: string, client: string, files: File[], onEach?: (f: PickedFile) => void): Promise<PickedFile[]> {
  const folder = await ensureClientFolder(brand, client);
  const out: PickedFile[] = [];
  for (const file of files) {
    const up = await uploadToCloudinary(file, 'maxhub-files');
    const rec: any = await apiClient.post('/files/upload', { name: file.name, url: up.url, folderId: folder.uuid, mimeType: file.type, size: file.size });
    const p = { id: rec?.id, url: rec?.url || up.url, name: file.name, mimeType: file.type, size: file.size };
    out.push(p); onEach?.(p);
  }
  return out;
}

/**
 * Pick a document for a client: from MaxHub Files (no re-upload) or from the
 * computer. Either way it ends up in Files › <Brand> › <Client name>.
 */
export function ClientFilePicker({ brand, client, title = 'Add a document', multiple = true, onClose, onPicked }: {
  brand: string; client: string; title?: string; multiple?: boolean; onClose: () => void; onPicked: (files: PickedFile[]) => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'files' | 'computer'>('files');
  const [path, setPath] = useState<FolderRow[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<FileRow[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const current = path[path.length - 1];
  const searching = q.trim().length >= 2;

  const foldersQ = useQuery({
    queryKey: ['client-picker-folders', current?.uuid || 'root'],
    queryFn: () => apiClient.get<FolderRow[]>('/files/folders', current ? { parentId: current.uuid } : undefined),
    enabled: tab === 'files' && !searching,
  });
  const filesQ = useQuery({
    queryKey: ['client-picker-files', current?.uuid || 'root', searching ? q.trim() : ''],
    queryFn: () => apiClient.get<FileRow[]>('/files', searching ? { search: q.trim(), everywhere: '1' } : { folderId: current!.uuid }),
    enabled: tab === 'files' && (searching || !!current),
  });
  const folders: FolderRow[] = searching ? [] : ((foldersQ.data as any) || []);
  const files: FileRow[] = (filesQ.data as any) || [];

  const toggle = (f: FileRow) => setPicked((p) => (p.some((x) => x.id === f.id) ? p.filter((x) => x.id !== f.id) : multiple ? [...p, f] : [f]));

  const attach = async () => {
    if (!picked.length) return;
    setBusy(true);
    try {
      const out: PickedFile[] = [];
      for (const f of picked) {
        const rec: any = await apiClient.post('/files/client-folder/attach', { brand, client, fileId: f.id });
        out.push({ id: rec?.id, url: rec?.url || f.url || '', name: f.name, mimeType: f.mimeType, size: f.size });
      }
      qc.invalidateQueries({ queryKey: ['client-files'] }); qc.invalidateQueries({ queryKey: ['files'] });
      toast.success(out.length === 1 ? 'Document added' : `${out.length} documents added`, `Also filed in Files › ${client}`);
      onPicked(out); onClose();
    } catch (e) { toast.fromError(e, 'Could not add the document'); } finally { setBusy(false); }
  };

  const upload = async (list: File[]) => {
    if (!list.length) return;
    setBusy(true);
    try {
      const out = await uploadToClientFolder(brand, client, multiple ? list : list.slice(0, 1));
      qc.invalidateQueries({ queryKey: ['client-files'] }); qc.invalidateQueries({ queryKey: ['files'] });
      toast.success(out.length === 1 ? 'Uploaded' : `${out.length} files uploaded`, `Saved in Files › ${client}`);
      onPicked(out); onClose();
    } catch (e) { toast.fromError(e, 'Upload failed'); } finally { setBusy(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={busy ? undefined : onClose}>
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-xs text-gray-500 truncate">For {client} · saved in their folder in Files</p>
          </div>
          <button onClick={onClose} disabled={busy} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 m-3 mb-0 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm">
          {([['files', 'From MaxHub Files', FolderOpen], ['computer', 'From my computer', HardDrive]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={cn('inline-flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium', tab === k ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400')}><I className="h-4 w-4" />{l}</button>
          ))}
        </div>

        {tab === 'files' ? (
          <>
            <div className="px-5 pt-3 space-y-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all files by name…" className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              {!searching && (
                <div className="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto whitespace-nowrap">
                  <button onClick={() => setPath([])} className={cn('hover:text-indigo-600', !path.length && 'font-semibold text-gray-900 dark:text-white')}>All folders</button>
                  {path.map((p, i) => (
                    <span key={p.uuid} className="flex items-center gap-1"><ChevronRight className="h-3 w-3" />
                      <button onClick={() => setPath(path.slice(0, i + 1))} className={cn('hover:text-indigo-600', i === path.length - 1 && 'font-semibold text-gray-900 dark:text-white')}>{p.name}</button></span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 min-h-[260px]">
              {(foldersQ.isLoading || filesQ.isLoading) && <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto my-10" />}
              {folders.map((f) => (
                <button key={f.uuid} onClick={() => setPath((p) => [...p, f])} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                  <span className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">{f.folderType === 'Personal' ? <Lock className="h-4 w-4 text-amber-500" /> : <Folder className="h-4 w-4 text-amber-500" />}</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{f.name}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
              {files.map((f) => {
                const I = iconFor(f.mimeType); const on = picked.some((x) => x.id === f.id);
                return (
                  <button key={f.id} onClick={() => toggle(f)} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left border', on ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800')}>
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">{f.mimeType?.startsWith('image/') && f.url ? <img src={f.url} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <I className="h-4 w-4 text-indigo-500" />}</span>
                    <span className="flex-1 min-w-0"><span className="block text-sm text-gray-900 dark:text-white truncate">{f.name}</span><span className="text-[11px] text-gray-500">{[fmtSize(f.size), f.uploadedByName].filter(Boolean).join(' · ')}</span></span>
                    <span className={cn('h-5 w-5 rounded-full border flex items-center justify-center', on ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600')}>{on && <Check className="h-3 w-3 text-white" />}</span>
                  </button>
                );
              })}
              {!foldersQ.isLoading && !filesQ.isLoading && !folders.length && !files.length && (
                <p className="text-center text-sm text-gray-400 py-10">{searching ? `No files named like “${q}”.` : current ? 'This folder is empty.' : 'No folders.'}<br />
                  <button onClick={() => setTab('computer')} className="mt-2 text-indigo-600 hover:underline">Upload from your computer instead</button></p>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">{picked.length ? `${picked.length} selected` : multiple ? 'Tap files to select them' : 'Tap a file to select it'}</p>
              <button onClick={attach} disabled={!picked.length || busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Add {picked.length > 1 ? `${picked.length} files` : 'file'}</button>
            </div>
          </>
        ) : (
          <div className="p-5">
            <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(Array.from(e.dataTransfer.files)); }}
              onClick={() => !busy && input.current?.click()}
              className={cn('border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition', drag ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400')}>
              {busy ? <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-3" /> : <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />}
              <p className="text-sm text-gray-700 dark:text-gray-300">{busy ? 'Uploading…' : <>Drag {multiple ? 'files' : 'a file'} here, or <span className="text-indigo-600 font-medium">click to choose</span></>}</p>
              <p className="text-xs text-gray-500 mt-1">Saved to Files › {client} (made automatically if it doesn’t exist yet)</p>
              <input ref={input} type="file" multiple={multiple} className="hidden" onChange={(e) => { upload(Array.from(e.target.files || [])); e.target.value = ''; }} />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** "Files" tab on a client record: everything in Files › <Brand> › <Client>. */
export function ClientFilesTab({ brand, client }: { brand: string; client: string }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null);
  const q = useQuery({
    queryKey: ['client-files', brand, client],
    queryFn: () => apiClient.get<{ folder: { uuid: string; path: string } | null; path: string; files: FileRow[] }>('/files/client-folder', { brand, client }),
    enabled: !!brand && !!client,
  });
  useEffect(() => { if (q.error) toast.fromError(q.error); }, [q.error]);
  const data: any = q.data || {};
  const files: FileRow[] = data.files || [];

  if (!client) return <p className="text-sm text-gray-500">Add the client’s name first — their documents are filed in a folder with that name.</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 min-w-[160px] text-xs text-gray-500 flex items-center gap-1.5"><Folder className="h-3.5 w-3.5 text-amber-500" />Files › {data.folder?.path || data.path || client}{!data.folder && !q.isLoading && ' (made on first upload)'}</p>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl brand-bg text-sm font-medium"><Upload className="h-4 w-4" />Add document</button>
      </div>
      {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto my-6" /> : !files.length ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-500">No documents yet. Add one from MaxHub Files or your computer.</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
          {files.map((f) => {
            const I = iconFor(f.mimeType);
            return (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                <I className="h-4 w-4 text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm text-gray-900 dark:text-white truncate">{f.name}</p><p className="text-[11px] text-gray-500">{[fmtSize(f.size), f.uploadedByName, f.createdAt && new Date(f.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).join(' · ')}</p></div>
                {f.url && <button title="Preview" onClick={() => setPreview({ url: f.url!, name: f.name, mimeType: f.mimeType || '' } as any)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><Eye className="h-4 w-4 text-gray-500" /></button>}
                {f.url && <button title="Download" onClick={() => saveFileToComputer(f.url!, f.name)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><Download className="h-4 w-4 text-gray-500" /></button>}
              </li>
            );
          })}
        </ul>
      )}
      {open && <ClientFilePicker brand={brand} client={client} onClose={() => setOpen(false)} onPicked={() => q.refetch()} />}
      <FilePreviewModal target={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
