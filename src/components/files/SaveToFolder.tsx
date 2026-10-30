import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Folder, FolderPlus, Lock, Loader2, X, Check, Download } from 'lucide-react';
import { toast } from '@components/ui/toaster';
import { apiClient } from '@services/apiClient';
import { saveFileToComputer } from '@services/downloadFile';
import { cn } from '@utils/cn';

export interface SaveTarget { url: string; name?: string; mimeType?: string; size?: number }

/** Opens the "Save to folder" picker from anywhere. */
export function openSaveToFolder(target: SaveTarget) {
  window.dispatchEvent(new CustomEvent('maxhub:save-to-folder', { detail: target }));
}

export function downloadToComputer(url: string, name?: string) {
  return saveFileToComputer(url, name);
}

interface FolderRow { uuid: string; name: string; icon?: string; folderType?: string | null }

/** Mount once (in the app layout). Lets people pick a MaxHub folder for a chat file. */
export function SaveToFolderHost() {
  const [target, setTarget] = useState<SaveTarget | null>(null);
  useEffect(() => {
    const h = (e: Event) => setTarget((e as CustomEvent).detail);
    window.addEventListener('maxhub:save-to-folder', h);
    return () => window.removeEventListener('maxhub:save-to-folder', h);
  }, []);
  if (!target) return null;
  return createPortal(<Picker target={target} onClose={() => setTarget(null)} />, document.body);
}

function Picker({ target, onClose }: { target: SaveTarget; onClose: () => void }) {
  const qc = useQueryClient();
  const [path, setPath] = useState<FolderRow[]>([]);
  const [alsoDownload, setAlsoDownload] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [newName, setNewName] = useState<string | null>(null);
  const current = path[path.length - 1];

  const { data: folders = [], isLoading, refetch } = useQuery({
    queryKey: ['folder-picker', current?.uuid || 'root'],
    queryFn: () => apiClient.get<FolderRow[]>('/files/folders', current ? { parentId: current.uuid } : undefined),
  });

  const createFolder = async () => {
    if (!current || !newName?.trim()) return;
    try {
      const f = await apiClient.post<FolderRow>('/files/folders', { name: newName.trim(), parentId: current.uuid });
      setNewName(null);
      await refetch();
      setPath((p) => [...p, f]);
    } catch (e: any) { toast.error(e?.message || 'Could not create the folder'); }
  };

  const save = async () => {
    if (!current) return;
    setSaving(true);
    try {
      await apiClient.post('/files/upload', { url: target.url, name: target.name || target.url.split('/').pop(), mimeType: target.mimeType, size: target.size, folderId: current.uuid });
      qc.invalidateQueries({ queryKey: ['files'] });
      toast.success(`Saved to ${path.map((p) => p.name).join(' › ')}`);
      if (alsoDownload) await downloadToComputer(target.url, target.name);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the file');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[88vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Save to a folder</h2>
            <p className="text-xs text-gray-500 truncate">{target.name || 'File'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="flex items-center gap-1 px-5 py-2 text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800 overflow-x-auto whitespace-nowrap">
          <button onClick={() => setPath([])} className={cn('hover:text-indigo-600', !path.length && 'font-semibold text-gray-900 dark:text-white')}>Folders</button>
          {path.map((p, i) => (
            <span key={p.uuid} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <button onClick={() => setPath(path.slice(0, i + 1))} className={cn('hover:text-indigo-600', i === path.length - 1 && 'font-semibold text-gray-900 dark:text-white')}>{p.name}</button>
            </span>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-2 min-h-[220px]">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto my-10" /> : (
            <>
              {!folders.length && <p className="text-center text-sm text-gray-400 py-10">{current ? 'No sub-folders — save it here, or create one.' : 'No folders available'}</p>}
              {folders.map((f) => (
                <button key={f.uuid} onClick={() => setPath((p) => [...p, f])} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                  <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-lg">{f.icon && f.icon.length <= 2 ? f.icon : <Folder className="h-4 w-4 text-amber-500" />}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{f.name}</span>
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">{f.folderType === 'Personal' ? <><Lock className="h-3 w-3" />Only you</> : 'Shared with staff'}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </>
          )}
        </div>
        {current && (
          <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-800">
            {newName === null ? (
              <button onClick={() => setNewName('')} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"><FolderPlus className="h-4 w-4" />New folder here</button>
            ) : (
              <div className="flex items-center gap-2">
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFolder()} placeholder="Folder name"
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white" />
                <button onClick={createFolder} className="p-1.5 rounded-lg bg-indigo-600 text-white"><Check className="h-4 w-4" /></button>
                <button onClick={() => setNewName(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        )}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={alsoDownload} onChange={(e) => setAlsoDownload(e.target.checked)} className="rounded text-indigo-600" />
            <Download className="h-4 w-4 text-gray-400" /> Also download to my computer
          </label>
          <div className="flex items-center gap-2 ml-auto">
          <button disabled={downloading} onClick={async () => { setDownloading(true); const ok = await downloadToComputer(target.url, target.name); setDownloading(false); if (ok) onClose(); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">{downloading && <Loader2 className="h-4 w-4 animate-spin" />}Download only</button>
          <button onClick={save} disabled={!current || saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{current ? `Save in ${current.name}` : 'Choose a folder'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
