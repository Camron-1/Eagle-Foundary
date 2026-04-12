import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Application, ApplicationStatus } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface ApplicationWithProfile extends Application {
  profile?: {
    id: string;
    firstName?: string;
    lastName?: string;
    major?: string | null;
  };
}

export default function OpportunityApplicationsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: opportunity, isLoading: oppLoading } = useQuery({
    queryKey: ['opportunities', id],
    queryFn: async () => {
      const res = await api.get(endpoints.opportunities.detail(id!));
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) as { id: string; title: string };
    },
    enabled: !!id,
  });

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['opportunities', id, 'applications'],
    queryFn: async () => {
      const res = await api.get<{ data?: ApplicationWithProfile[] } | ApplicationWithProfile[]>(
        endpoints.opportunities.applications(id!)
      );
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
    enabled: !!id,
  });

  const isLoading = oppLoading || appsLoading;

  const columns: Column<ApplicationWithProfile & Record<string, unknown>>[] = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (row) => {
        const p = row.profile;
        const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '—' : '—';
        const profileId = p?.id;
        return profileId ? (
          <button
            type="button"
            className="text-fg-muted underline underline-offset-2 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/students/${profileId}`);
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
      key: 'submitted',
      header: 'Submitted',
      render: (row) => {
        const d = row.createdAt ? new Date(row.createdAt) : null;
        return (
          <span className="text-fg-muted">
            {d && !isNaN(d.getTime()) ? format(d, 'MMM d, yyyy') : '—'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status as ApplicationStatus}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          type="button"
          className="text-xs text-fg-muted underline underline-offset-2 hover:text-fg"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/company/opportunities/applications/${row.id}`);
          }}
        >
          Review
        </button>
      ),
    },
  ];

  const tableData = applications.map((a) => ({ ...a } as ApplicationWithProfile & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Company</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Applications
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          {opportunity?.title ? `Applications for ${opportunity.title}` : 'Loading...'}
        </p>
      </header>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications"
          description="No one has applied to this opportunity yet."
        />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No applications" />
      )}
    </div>
  );
}
