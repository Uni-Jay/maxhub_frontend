import { useAuthStore } from '@store/authStore';
import { API_BASE_URL } from '@services/apiClient';
import { toast } from '@components/ui/toaster';

function saveBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

function nameFrom(url: string, name?: string) {
  if (name && name.trim()) return name.trim();
  try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'download'); } catch { return 'download'; }
}

/**
 * Really saves a file to the computer (Downloads folder) with its proper name.
 *
 * Opening the link in a new tab — what this used to do — gets blocked by
 * browsers when it doesn't come straight from a click, and some files just
 * opened instead of saving. Here the file is fetched first, then saved; if the
 * storage service refuses a direct fetch, MaxHub's server fetches it instead.
 */
export async function saveFileToComputer(url: string, name?: string): Promise<boolean> {
  if (!url) return false;
  const filename = nameFrom(url, name);
  const absolute = /^https?:\/\//i.test(url) ? url : `${API_BASE_URL.replace(/\/api\/?$/, '')}${url}`;
  const done = () => { toast.success('Downloaded', `${filename} is in your Downloads folder.`); return true; };
  try {
    const r = await fetch(absolute, { mode: 'cors' });
    if (!r.ok) throw new Error(String(r.status));
    saveBlob(await r.blob(), filename);
    return done();
  } catch { /* fall through to the server */ }
  try {
    const token = useAuthStore.getState().tokens?.accessToken;
    const r = await fetch(`${API_BASE_URL}/files/fetch?url=${encodeURIComponent(absolute)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) throw new Error(String(r.status));
    saveBlob(await r.blob(), filename);
    return done();
  } catch {
    toast.error('Could not download that file', 'It opened in a new tab instead — use your browser’s Save option there.');
    window.open(absolute, '_blank', 'noopener');
    return false;
  }
}
