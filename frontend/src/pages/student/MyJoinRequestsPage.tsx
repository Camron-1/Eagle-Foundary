import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { JoinRequest } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { format } from 'date-fns';

function truncate(str: string | null | undefined, max = 60): string {
  if (!str) return '—';
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export default function MyJoinRequestsPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['join-requests', 'me'],
    queryFn: async () => {
      const res = await api.get<{ data?: JoinRequest[] } | JoinRequest[]>(
        endpoints.joinRequests.me,
      );
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await api.post(endpoints.joinRequests.cancel(requestId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', 'me'] });
      setCancelTarget(null);
      toast.success('Join request cancelled');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to cancel join request');
    },
  });

  const columns: Column<JoinRequest & Record<string, unknown>>[] = [
    {
      key: 'startup',
      header: 'Startup',
      render: (row) => {
        const startup = row.startup;
        const name = startup?.name ?? '—';
        const startupId = row.startupId ?? startup?.id;
        return startupId ? (
          <button
            type="button"
            className="text-fg-muted underline underline-offset-2 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/startups/${startupId}`);
            }}
          >
            {name}
          </button>
        ) : (
          <span className="text-fg-muted">{name}</span>
        );
      },
    },
    {
      key: 'message',
      header: 'Message',
      render: (row) => (
        <span className="max-w-[200px] truncate text-fg-muted" title={row.message ?? undefined}>
          {truncate(row.message, 50)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status}</Badge>,
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (row) => {
        const d = row.updatedAt ? new Date(row.updatedAt) : null;
        return <span className="text-fg-muted">{d && !isNaN(d.getTime()) ? format(d, 'MMM d, yyyy') : '—'}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.status === 'PENDING' ? (
          <Button
            variant="ghost"
            className="text-xs text-red-400 hover:text-red-300"
            onClick={(e) => {
              e.stopPropagation();
              const name = row.startup?.name ?? 'this startup';
              setCancelTarget({ id: row.id, name });
            }}
          >
            Cancel
          </Button>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
  ];

  const tableData = requests.map((r) => ({ ...r } as JoinRequest & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Student</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          My Join Requests
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Track your requests to join startups.
        </p>
      </header>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : requests.length === 0 ? (
        <EmptyState
          title="No join requests"
          description="You haven't requested to join any startups yet."
        />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No join requests" />
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        title={`Cancel request to ${cancelTarget?.name ?? 'this startup'}?`}
        description="This action cannot be undone. You can submit a new request later if needed."
        confirmLabel="Cancel Request"
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
