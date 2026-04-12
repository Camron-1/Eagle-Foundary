import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, isAfter, subDays, subMonths } from 'date-fns';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Application, ApplicationStatus, ProjectSubmission } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';

interface ApplicationWithMeta extends Application {
  opportunity?: {
    id: string;
    title: string;
    status: string;
    budgetType?: string | null;
    budgetRange?: string | null;
    tags?: string[];
    publishedAt?: string | null;
    closedAt?: string | null;
    org?: { id: string; name: string } | null;
    _count?: { applications?: number };
  };
}

interface ProjectSubmissionWithMeta extends ProjectSubmission {
  project?: {
    id: string;
    title: string;
    status: string;
    budgetType?: string | null;
    budgetRange?: string | null;
    tags?: string[];
    publishedAt?: string | null;
    closedAt?: string | null;
    estimatedDuration?: string | null;
    deadline?: string | null;
    org?: { id: string; name: string } | null;
    _count?: { submissions?: number };
  };
}

type DateFilter = '' | '7d' | '30d' | '90d';

type UnifiedItem = {
  id: string;
  type: 'OPPORTUNITY' | 'PROJECT';
  status: ApplicationStatus;
  createdAt: string;
  title: string;
  listingId: string;
  listingStatus?: string;
  org?: { id: string; name: string } | null;
  totalCount?: number;
};

export default function MyApplicationsPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [withdrawTarget, setWithdrawTarget] = useState<{ id: string; title: string; type: 'OPPORTUNITY' | 'PROJECT' } | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('');
  const [search, setSearch] = useState('');

  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ['applications', 'me'],
    queryFn: async () => {
      const res = await api.get<{ data?: ApplicationWithMeta[] }>(endpoints.applications.me, { params: { limit: 100 } });
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
  });

  const { data: projectSubmissions = [], isLoading: projectSubmissionsLoading } = useQuery({
    queryKey: ['project-submissions', 'me'],
    queryFn: async () => {
      const res = await api.get<{ data?: ProjectSubmissionWithMeta[] }>(endpoints.projectSubmissions.me, { params: { limit: 100 } });
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
  });

  const unifiedList = useMemo<UnifiedItem[]>(() => {
    const opportunityItems: UnifiedItem[] = (applications as ApplicationWithMeta[]).map((a) => ({
      id: a.id,
      type: 'OPPORTUNITY',
      status: a.status,
      createdAt: a.createdAt,
      title: a.opportunity?.title ?? '—',
      listingId: a.opportunityId ?? a.opportunity?.id ?? '',
      listingStatus: a.opportunity?.status,
      org: a.opportunity?.org,
      totalCount: a.opportunity?._count?.applications,
    }));

    const projectItems: UnifiedItem[] = (projectSubmissions as ProjectSubmissionWithMeta[]).map((s) => ({
      id: s.id,
      type: 'PROJECT',
      status: s.status,
      createdAt: s.createdAt,
      title: s.project?.title ?? '—',
      listingId: s.projectId ?? s.project?.id ?? '',
      listingStatus: s.project?.status,
      org: s.project?.org,
      totalCount: s.project?._count?.submissions,
    }));

    return [...opportunityItems, ...projectItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [applications, projectSubmissions]);

  const filtered = useMemo(() => {
    let list = unifiedList;

    if (statusFilter) {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (typeFilter) {
      list = list.filter((a) => a.type === typeFilter);
    }

    if (dateFilter) {
      const now = new Date();
      const cutoff =
        dateFilter === '7d' ? subDays(now, 7) : dateFilter === '30d' ? subDays(now, 30) : subMonths(now, 3);
      list = list.filter((a) => isAfter(new Date(a.createdAt), cutoff));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.org?.name?.toLowerCase().includes(q));
    }

    return list;
  }, [unifiedList, statusFilter, typeFilter, dateFilter, search]);

  const withdrawMutation = useMutation({
    mutationFn: async (target: { id: string; type: 'OPPORTUNITY' | 'PROJECT' }) => {
      if (target.type === 'PROJECT') {
        await api.post(endpoints.projectSubmissions.withdraw(target.id));
      } else {
        await api.post(endpoints.applications.withdraw(target.id));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['project-submissions', 'me'] });
      setWithdrawTarget(null);
      toast.success('Submission withdrawn');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to withdraw');
    },
  });

  const columns: Column<UnifiedItem & Record<string, unknown>>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Badge>{row.type}</Badge>,
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) =>
        row.listingId ? (
          <button
            type="button"
            className="text-left text-fg-muted underline underline-offset-2 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              navigate(row.type === 'PROJECT' ? `/projects/${row.listingId}` : `/opportunities/${row.listingId}`);
            }}
          >
            {row.title}
          </button>
        ) : (
          <span className="text-fg-muted">{row.title}</span>
        ),
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (row) => {
        const org = row.org;
        return org ? (
          <button
            type="button"
            className="text-fg-muted underline underline-offset-2 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/organizations/${org.id}`);
            }}
          >
            {org.name}
          </button>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status as ApplicationStatus}</Badge>,
    },
    {
      key: 'count',
      header: rowCountHeader(typeFilter),
      render: (row) => <span className="text-fg-muted">{row.totalCount ?? '—'}</span>,
    },
    {
      key: 'applied',
      header: 'Applied',
      render: (row) => <span className="text-fg-muted">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>,
    },
    {
      key: 'listingStatus',
      header: 'Listing Status',
      render: (row) => (row.listingStatus ? <Badge>{row.listingStatus}</Badge> : <span className="text-fg-subtle">—</span>),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.status === 'SUBMITTED' ? (
          <Button
            variant="ghost"
            className="text-xs text-red-400 hover:text-red-300"
            onClick={(e) => {
              e.stopPropagation();
              setWithdrawTarget({ id: row.id, title: row.title, type: row.type });
            }}
          >
            Withdraw
          </Button>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
  ];

  const tableData = filtered.map((a) => ({ ...a } as UnifiedItem & Record<string, unknown>));
  const isLoading = applicationsLoading || projectSubmissionsLoading;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Student</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">My Applications</h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Track your opportunity applications and project submissions in one place.
        </p>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title or organization..."
        filters={[
          {
            key: 'type',
            label: 'Type',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: '', label: 'All' },
              { value: 'OPPORTUNITY', label: 'Opportunity' },
              { value: 'PROJECT', label: 'Project' },
            ],
          },
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'SUBMITTED', label: 'Submitted' },
              { value: 'SHORTLISTED', label: 'Shortlisted' },
              { value: 'INTERVIEW', label: 'Interview' },
              { value: 'SELECTED', label: 'Selected' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'WITHDRAWN', label: 'Withdrawn' },
            ],
          },
          {
            key: 'date',
            label: 'Applied',
            value: dateFilter,
            onChange: (v: string) => setDateFilter(v as DateFilter),
            options: [
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 3 months' },
            ],
          },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={5} cols={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={unifiedList.length === 0 ? 'No applications yet' : 'No matching results'}
          description={
            unifiedList.length === 0
              ? "You haven't applied to any opportunities or projects yet."
              : 'Try adjusting your filters.'
          }
        />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No applications" />
      )}

      <ConfirmDialog
        open={!!withdrawTarget}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={() =>
          withdrawTarget && withdrawMutation.mutate({ id: withdrawTarget.id, type: withdrawTarget.type })
        }
        title={`Withdraw from ${withdrawTarget?.title ?? 'this item'}?`}
        description="This action cannot be undone. You may be able to apply again if the listing is still open."
        confirmLabel="Withdraw"
        loading={withdrawMutation.isPending}
      />
    </div>
  );
}

function rowCountHeader(typeFilter: string): string {
  if (typeFilter === 'PROJECT') return 'Submissions';
  if (typeFilter === 'OPPORTUNITY') return 'Applicants';
  return 'Applicants/Submissions';
}
