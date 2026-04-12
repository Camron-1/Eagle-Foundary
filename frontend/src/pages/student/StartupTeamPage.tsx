import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StartupMember } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function StartupTeamPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: team = [], isLoading } = useQuery({
    queryKey: ['startups', id, 'team'],
    queryFn: async () => {
      if (!id) return [];
      const res = await api.get<{ data?: StartupMember[] } | StartupMember[]>(
        endpoints.startups.team(id),
      );
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) as StartupMember[];
    },
    enabled: !!id,
  });

  const columns: Column<StartupMember & Record<string, unknown>>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (row) => {
        const p = row.profile;
        const name = p ? `${p.firstName} ${p.lastName}`.trim() || '—' : '—';
        return <span className="text-fg-muted">{name}</span>;
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge>{row.role}</Badge>,
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (row) => {
        const d = row.joinedAt ? new Date(row.joinedAt) : null;
        return <span className="text-fg-muted">{d && !isNaN(d.getTime()) ? format(d, 'MMM d, yyyy') : '—'}</span>;
      },
    },
  ];

  const tableData = team.map((m) => ({ ...m } as StartupMember & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Student</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Startup Team
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          View and manage your startup team members.
        </p>
      </header>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={() => id && navigate(`/student/startups/${id}/join-requests`)}
        >
          View Join Requests
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : team.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description="Invite members or accept join requests to build your team."
          action={
            id && (
              <Button
                variant="primary"
                withBorderEffect={false}
                onClick={() => navigate(`/student/startups/${id}/join-requests`)}
              >
                View Join Requests
              </Button>
            )
          }
        />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No team members" />
      )}
    </div>
  );
}
