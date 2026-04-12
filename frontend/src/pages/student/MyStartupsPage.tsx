import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Startup } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';

export default function MyStartupsPage(): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: startups = [], isLoading } = useQuery({
    queryKey: ['startups', 'list', search],
    queryFn: async () => {
      const res = await api.get<{ data?: Startup[] } | Startup[]>(endpoints.startups.list, {
        params: { search: search || undefined, limit: 100 },
      });
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
  });

  const columns: Column<Startup & Record<string, unknown>>[] = [
    { key: 'name', header: 'Name' },
    { key: 'stage', header: 'Stage', render: (row) => row.stage ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button
          variant="ghost"
          className="text-xs"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/student/startups/${row.id}/edit`);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  const tableData = startups.map((s) => ({ ...s } as Startup & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Student</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          My Startups
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Manage all your startup drafts and submissions.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search startups..." />
        <Button variant="primary" withBorderEffect={false} onClick={() => navigate('/student/startups/new')}>
          Create Startup
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : startups.length === 0 ? (
        <EmptyState
          title="No startups yet"
          description="Create your first startup to get started."
          action={
            <Button variant="primary" withBorderEffect={false} onClick={() => navigate('/student/startups/new')}>
              Create Startup
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
          onRowClick={(row) => navigate(`/student/startups/${row.id}/edit`)}
          emptyMessage="No startups found"
        />
      )}
    </div>
  );
}
