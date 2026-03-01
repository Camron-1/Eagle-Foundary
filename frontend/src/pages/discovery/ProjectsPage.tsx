import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ApiError, parseApiError } from '@/lib/api/errors';
import type { Project, ProjectStatus } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/skeleton';

interface ProjectWithOrg extends Project {
  org?: { id: string; name: string };
}

const LIMIT = 20;

export default function ProjectsPage(): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);

  const cursor = cursorStack[page - 1];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['projects', 'list', search, cursor],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = {
        limit: LIMIT,
        search: search || undefined,
      };
      if (cursor) params.cursor = cursor;
      const res = await api.get<{
        data?: ProjectWithOrg[];
        meta?: { pagination?: { nextCursor?: string | null; hasMore?: boolean } };
      }>(endpoints.projects.list, { params });
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

  const projects = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;
  const totalPages = hasMore ? page + 1 : page;

  const columns: Column<ProjectWithOrg & Record<string, unknown>>[] = [
    {
      key: 'title',
      header: 'Project',
      render: (row) => <span className="font-medium text-zinc-200">{row.title}</span>,
    },
    {
      key: 'org',
      header: 'Organization',
      render: (row) => <span className="text-zinc-400">{row.org?.name ?? '—'}</span>,
    },
    {
      key: 'budgetType',
      header: 'Budget',
      render: (row) => <Badge>{row.budgetType || '—'}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status as ProjectStatus}</Badge>,
    },
  ];

  const tableData = projects.map((p) => ({ ...p } as ProjectWithOrg & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Discovery</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">Projects</h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-300 md:text-base">
          Browse company outsourced projects and submit your proposal.
        </p>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
          setCursorStack([undefined]);
        }}
        searchPlaceholder="Search projects..."
      />

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : isError ? (
        <Card>
          <p className="text-red-400">
            Failed to load projects: {(error instanceof ApiError ? error : parseApiError(error)).message}
          </p>
        </Card>
      ) : projects.length === 0 ? (
        <EmptyState title="No projects found" description="Try a different search or check back later." />
      ) : (
        <>
          <DataTable columns={columns} data={tableData} onRowClick={(row) => navigate(`/projects/${row.id}`)} emptyMessage="No projects found" />
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
