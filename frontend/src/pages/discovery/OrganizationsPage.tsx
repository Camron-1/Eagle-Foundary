import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Org } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const LIMIT = 24;

function truncate(str: string | null, len: number): string {
  if (!str) return '—';
  return str.length <= len ? str : `${str.slice(0, len)}…`;
}

export default function OrganizationsPage(): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['orgs', 'list', search, cursor],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = {
        limit: LIMIT,
        search: search || undefined,
      };
      if (cursor) params.cursor = cursor;
      const res = await api.get<{
        data?: Org[];
        meta?: { pagination?: { nextCursor?: string | null; hasMore?: boolean } };
      }>(endpoints.orgs.list, { params });
      const items = res.data?.data ?? [];
      const nextCursor = res.data?.meta?.pagination?.nextCursor ?? null;
      const hasMore = res.data?.meta?.pagination?.hasMore ?? false;
      return { items, nextCursor, hasMore };
    },
  });

  const orgs = data?.items ?? [];

  if (isError) {
    return (
      <div className="space-y-8">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Discovery</p>
          <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
            Organizations
          </h1>
        </header>
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : 'Failed to load organizations. Please try again later.'}
        </p>
      </div>
    );
  }

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
            <Skeleton key={i} className="h-32 rounded-2xl" />
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
          Organizations
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Explore companies and partners active on Eagle-Foundry.
        </p>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCursor(undefined);
        }}
        searchPlaceholder="Search organizations..."
      />

      {orgs.length === 0 ? (
        <EmptyState
          title="No organizations found"
          description="Try a different search or check back later."
        />
      ) : (
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <div
              key={org.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/organizations/${org.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/organizations/${org.id}`)}
              className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-strong focus-visible:ring-offset-2 focus-visible:ring-offset-page rounded-2xl h-full"
            >
              <Card interactive className="h-full flex flex-col">
                <h3 className="text-lg font-semibold text-fg">{org.name}</h3>
                <p className="mt-2 flex-1 text-sm text-fg-muted line-clamp-3">
                  {truncate(org.description, 120)}
                </p>
                <div className="mt-3">
                  <Badge>{org.status}</Badge>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
