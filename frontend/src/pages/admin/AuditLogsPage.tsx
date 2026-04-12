import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AuditLog } from '@/lib/api/types';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const PAGE_SIZE = 20;

export default function AuditLogsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<Record<number, string | null>>({ 1: null });

  const cursor = cursors[page] ?? (page === 1 ? null : undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', page, cursor],
    enabled: page === 1 || cursor !== undefined,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      if (cursor) params.set('cursor', cursor);
      const url = `${endpoints.admin.auditLogs}?${params}`;
      const res = await api.get<{
        data?: AuditLog[];
        meta?: { pagination?: { nextCursor?: string | null; hasMore?: boolean } };
      }>(url);
      const body = res.data;
      const items = body?.data ?? (Array.isArray(body) ? body : []);
      const pagination = body?.meta?.pagination;
      return {
        items: Array.isArray(items) ? items : [],
        nextCursor: pagination?.nextCursor ?? null,
        hasMore: pagination?.hasMore ?? false,
      };
    },
  });

  useEffect(() => {
    if (data?.nextCursor) {
      setCursors((prev) => ({ ...prev, [page + 1]: data.nextCursor }));
    }
  }, [data?.nextCursor, page]);

  const items = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((log) => log.action?.toLowerCase().includes(q));
  }, [items, search]);

  const totalPages = hasMore ? page + 1 : page;

  const handlePageChange = (p: number) => setPage(p);

  const columns: Column<AuditLog & Record<string, unknown>>[] = [
    {
      key: 'action',
      header: 'Action',
      render: (row) => <span className="font-medium text-fg">{row.action}</span>,
    },
    {
      key: 'userId',
      header: 'Actor',
      render: (row) => <span className="text-fg-muted font-mono text-xs">{row.userId}</span>,
    },
    {
      key: 'targetType',
      header: 'Target Type',
      render: (row) => <span className="text-fg-muted">{row.targetType}</span>,
    },
    {
      key: 'targetId',
      header: 'Target ID',
      render: (row) => (
        <span className="font-mono text-xs text-fg-subtle truncate max-w-[120px] block">
          {row.targetId}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (row) => {
        const d = row.createdAt ? new Date(row.createdAt as string) : null;
        return (
          <span className="text-fg-muted">
            {d && !isNaN(d.getTime()) ? format(d, 'MMM d, yyyy HH:mm') : '—'}
          </span>
        );
      },
    },
  ];

  const tableData = filtered.map((log) => ({ ...log } as AuditLog & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Admin</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Audit Logs
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Immutable record of admin actions across the platform.
        </p>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by action type..."
      />

      {isLoading ? (
        <TableSkeleton rows={10} cols={5} />
      ) : (
        <>
          <DataTable columns={columns} data={tableData} emptyMessage="No audit logs" />
          {(hasMore || page > 1) && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
