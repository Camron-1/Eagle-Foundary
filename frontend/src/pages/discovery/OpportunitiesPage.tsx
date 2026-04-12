import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Opportunity, OpportunityStatus } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/skeleton';

interface OpportunityWithOrg extends Opportunity {
  org?: { id: string; name: string };
}

const LIMIT = 20;

export default function OpportunitiesPage(): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);

  const cursor = cursorStack[page - 1];

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', 'list', search, cursor],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = {
        limit: LIMIT,
        search: search || undefined,
      };
      if (cursor) params.cursor = cursor;
      const res = await api.get<{
        data?: OpportunityWithOrg[];
        meta?: { pagination?: { nextCursor?: string | null; hasMore?: boolean } };
      }>(endpoints.opportunities.list, { params });
      const items = res.data?.data ?? [];
      const nextCursor = res.data?.meta?.pagination?.nextCursor ?? null;
      const hasMore = res.data?.meta?.pagination?.hasMore ?? false;
      return { items, nextCursor, hasMore };
    },
  });

  useEffect(() => {
    if (data?.nextCursor != null && cursorStack.length <= page) {
      setCursorStack((prev) => {
        const next = [...prev];
        next[page] = data.nextCursor ?? undefined;
        return next;
      });
    }
  }, [data?.nextCursor, page, cursorStack.length]);

  const opportunities = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;
  const totalPages = hasMore ? page + 1 : page;

  const columns: Column<OpportunityWithOrg & Record<string, unknown>>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => <span className="font-medium text-fg">{row.title}</span>,
    },
    {
      key: 'org',
      header: 'Organization',
      render: (row) => (
        <span className="text-fg-muted">{row.org?.name ?? '—'}</span>
      ),
    },
    {
      key: 'budgetType',
      header: 'Budget Type',
      render: (row) => (
        <Badge>{row.budgetType || '—'}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status as OpportunityStatus}</Badge>,
    },
  ];

  const tableData = opportunities.map((o) => ({ ...o } as OpportunityWithOrg & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Discovery</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Opportunities
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Browse company opportunities and find your next role.
        </p>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
          setCursorStack([undefined]);
        }}
        searchPlaceholder="Search opportunities..."
      />

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities found"
          description="Try a different search or check back later."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={tableData}
            onRowClick={(row) => navigate(`/opportunities/${row.id}`)}
            emptyMessage="No opportunities found"
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              if (p > page && data?.nextCursor != null) {
                setCursorStack((prev) => {
                  const next = [...prev];
                  next[p] = data.nextCursor ?? undefined;
                  return next;
                });
              }
              setPage(p);
            }}
          />
        </>
      )}
    </div>
  );
}
