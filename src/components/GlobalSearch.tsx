import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, Briefcase, ListTodo, UserCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@services/apiClient';

interface ResultGroup {
  label: string;
  icon: React.ComponentType<any>;
  items: { id: string | number; title: string; subtitle?: string; path: string }[];
}

async function searchAll(query: string): Promise<ResultGroup[]> {
  const [staff, clients, projects, tasks] = await Promise.allSettled([
    apiClient.getRaw('/staff', { search: query, limit: 5 }),
    apiClient.getRaw('/clients', { search: query, limit: 5 }),
    apiClient.getRaw('/projects', { search: query, limit: 5 }),
    apiClient.getRaw('/tasks', { search: query, limit: 5 }),
  ]);

  const groups: ResultGroup[] = [];

  if (staff.status === 'fulfilled') {
    const rows = staff.value?.data ?? [];
    if (rows.length) groups.push({
      label: 'Staff', icon: Users,
      items: rows.map((s: any) => ({ id: s.id, title: `${s.firstName} ${s.lastName}`, subtitle: s.position || s.email, path: `/staff/${s.uuid ?? s.id}` })),
    });
  }
  if (clients.status === 'fulfilled') {
    const rows = clients.value?.data ?? [];
    if (rows.length) groups.push({
      label: 'Clients', icon: UserCircle,
      items: rows.map((c: any) => ({ id: c.id, title: c.fullName, subtitle: c.email, path: `/clients/${c.uuid ?? c.id}` })),
    });
  }
  if (projects.status === 'fulfilled') {
    const rows = projects.value?.data ?? [];
    if (rows.length) groups.push({
      label: 'Projects', icon: Briefcase,
      items: rows.map((p: any) => ({ id: p.id, title: p.name, subtitle: p.projectCode, path: `/projects/${p.uuid ?? p.id}` })),
    });
  }
  if (tasks.status === 'fulfilled') {
    const rows = tasks.value?.data ?? [];
    if (rows.length) groups.push({
      label: 'Tasks', icon: ListTodo,
      items: rows.map((t: any) => ({ id: t.id, title: t.title, subtitle: t.status, path: `/tasks/${t.uuid ?? t.id}` })),
    });
  }

  return groups;
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setQuery('');
      setGroups([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchAll(q.trim());
        setGroups(results);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    runSearch(query);
  }, [query, runSearch]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const totalResults = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff, clients, projects, tasks..."
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          {loading && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Type at least 2 characters to search</p>
          ) : !loading && totalResults === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">No results for "{query}"</p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="py-2">
                <p className="px-4 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <group.icon className="h-3 w-3" /> {group.label}
                </p>
                {group.items.map((item) => (
                  <button
                    key={`${group.label}-${item.id}`}
                    onClick={() => { navigate(item.path); onClose(); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition flex flex-col"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</span>
                    {item.subtitle && <span className="text-xs text-gray-400 truncate">{item.subtitle}</span>}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalSearch;
