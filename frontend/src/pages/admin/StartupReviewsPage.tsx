import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Startup } from '@/lib/api/types';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface PendingStartup extends Startup {
  members?: Array<{
    role: string;
    profile?: { firstName?: string; lastName?: string };
  }>;
}

export default function StartupReviewsPage(): JSX.Element {
  const navigate = useNavigate();

  const { data: startups = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'startups', 'pending'],
    queryFn: async () => {
      const res = await api.get<{ data?: PendingStartup[] }>(endpoints.admin.pendingStartups, {
        params: { limit: 100 },
      });
      const body = res.data;
      const items = body?.data ?? (Array.isArray(body) ? body : []);
      return Array.isArray(items) ? items : [];
    },
  });

  const columns: Column<PendingStartup & Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Startup',
      render: (row) => <span className="font-medium text-fg">{row.name}</span>,
    },
    {
      key: 'founder',
      header: 'Founder',
      render: (row) => {
        const founder = (row.members as PendingStartup['members'])?.find((m) => m.role === 'founder');
        const p = founder?.profile;
        const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '—';
        return <span className="text-fg-muted">{name || '—'}</span>;
      },
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      render: (row) => {
        const d = row.createdAt ? new Date(row.createdAt as string) : null;
        return <span className="text-fg-muted">{d && !isNaN(d.getTime()) ? format(d, 'MMM d, yyyy') : '—'}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button
          variant="ghost"
          className="h-8 px-3 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/startups/${row.id}/review`);
          }}
        >
          Review
        </Button>
      ),
    },
  ];

  const tableData = startups.map((s) => ({ ...s } as PendingStartup & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Admin</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Pending Startup Reviews
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Review and approve or reject submitted startups.
        </p>
      </header>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : isError ? (
        <EmptyState
          title="Failed to load startups"
          description={(error as { message?: string })?.message ?? 'An unexpected error occurred.'}
        />
      ) : startups.length === 0 ? (
        <EmptyState
          title="No pending startups"
          description="All submitted startups have been reviewed."
          action={
            <Button variant="ghost" onClick={() => navigate('/admin')}>
              Back to Dashboard
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No pending startups" />
      )}
    </div>
  );
}
