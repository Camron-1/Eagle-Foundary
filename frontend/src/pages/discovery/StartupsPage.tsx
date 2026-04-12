import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Startup } from '@/lib/api/types';
import { FilterBar } from '@/components/ui/filter-bar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const LIMIT = 50;

export default function StartupsPage(): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Fetch approved startups from the startups list endpoint
  const { data: startups = [], isLoading } = useQuery({
    queryKey: ['startups', 'list', 'discovery'],
    queryFn: async () => {
      const res = await api.get<{
        data?: Startup[];
        meta?: { pagination?: { nextCursor?: string | null; hasMore?: boolean } };
      }>(endpoints.startups.list, {
        params: { limit: LIMIT, status: 'APPROVED' },
      });
      const body = res.data;
      const items = body?.data ?? (Array.isArray(body) ? body : []);
      // Discovery page should only show APPROVED startups
      // (the backend may also return the user's own non-approved ones)
      return items.filter((s: Startup) => s.status === 'APPROVED');
    },
  });

  // Client-side search filter for quick feedback
  const filtered = useMemo(() => {
    if (!search.trim()) return startups;
    const q = search.toLowerCase();
    return startups.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.tagline?.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [startups, search]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Discovery</p>
          <Skeleton className="mt-2 h-12 w-64" />
          <Skeleton className="mt-3 h-5 w-96" />
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Discovery</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Startup Discovery
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Explore approved student startups. Click a startup to learn more.
        </p>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter startups by name, tagline, or tag..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={search.trim() ? 'No matching startups' : 'No startups yet'}
          description={
            search.trim()
              ? 'Try a different search term.'
              : 'No approved startups are available at the moment. Check back later!'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((startup) => (
            <div
              key={startup.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/startups/${startup.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/startups/${startup.id}`)}
              className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-strong focus-visible:ring-offset-2 focus-visible:ring-offset-page rounded-2xl"
            >
              <Card interactive>
                <h3 className="text-lg font-semibold text-fg">{startup.name}</h3>
                {startup.tagline && (
                  <p className="mt-1 text-sm text-fg-muted line-clamp-2">{startup.tagline}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {startup.stage && <Badge>{startup.stage}</Badge>}
                  {startup.tags?.slice(0, 3).map((tag: string) => (
                    <Badge key={tag}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
