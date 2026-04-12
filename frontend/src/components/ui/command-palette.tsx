import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Rocket, Briefcase, Building2, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { SearchResult } from '@/lib/api/types';
import { cn } from '@/lib/cn';

const typeIcons = { startup: Rocket, opportunity: Briefcase, organization: Building2, student: User };
const typeRoutes: Record<string, (id: string) => string> = {
  startup: (id) => `/startups/${id}`,
  opportunity: (id) => `/opportunities/${id}`,
  organization: (id) => `/organizations/${id}`,
  student: (id) => `/students/${id}`,
};

export function CommandPalette(): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { data: results } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const res = await api.get<{ data: SearchResult[] }>(endpoints.search, { params: { q: query, limit: 8 } });
      const payload = res.data;
      if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data)) {
        return payload.data as SearchResult[];
      }
      if (Array.isArray(payload)) return payload as SearchResult[];
      return [];
    },
    enabled: open && query.length >= 2,
  });

  const handleSelect = useCallback(
    (r: SearchResult) => {
      const route = typeRoutes[r.type]?.(r.id);
      if (route) navigate(route);
      setOpen(false);
      setQuery('');
    },
    [navigate],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]" onClick={() => { setOpen(false); setQuery(''); }}>
      <div className="absolute inset-0 bg-overlay-heavy backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border-subtle bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
          <Search size={18} className="text-fg-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search startups, opportunities, organizations..."
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <kbd className="rounded border border-border-subtle bg-surface-tint px-1.5 py-0.5 text-[10px] text-fg-subtle">ESC</kbd>
        </div>

        {(results?.length ?? 0) > 0 && (
          <ul className="max-h-72 overflow-y-auto p-2">
            {results!.map((r) => {
              const Icon = typeIcons[r.type] ?? Rocket;
              return (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    onClick={() => handleSelect(r)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-surface-tint hover:text-fg"
                  >
                    <Icon size={16} className="shrink-0 text-fg-subtle" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.title}</p>
                      {r.subtitle && <p className="truncate text-xs text-fg-subtle">{r.subtitle}</p>}
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-fg-subtle">{r.type}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {query.length >= 2 && results?.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-fg-subtle">No results found</p>
        )}
      </div>
    </div>
  );
}
