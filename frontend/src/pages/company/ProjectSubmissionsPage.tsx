import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ApiError, parseApiError } from '@/lib/api/errors';
import type { ApplicationStatus, ProjectSubmission } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface ProjectSubmissionWithProfile extends ProjectSubmission {
  profile?: {
    id: string;
    firstName?: string;
    lastName?: string;
    major?: string | null;
  };
}

export default function ProjectSubmissionsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: projectLoading, isError: projectError, error: projectFetchError } = useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const res = await api.get(endpoints.projects.detail(id!));
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) as { id: string; title: string };
    },
    enabled: !!id,
  });

  const { data: submissions = [], isLoading: submissionsLoading, isError: submissionsError, error: submissionsFetchError } = useQuery({
    queryKey: ['projects', id, 'submissions'],
    queryFn: async () => {
      const res = await api.get<{ data?: ProjectSubmissionWithProfile[] } | ProjectSubmissionWithProfile[]>(
        endpoints.projects.submissions(id!),
      );
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
    enabled: !!id,
  });

  const isLoading = projectLoading || submissionsLoading;
  const hasError = projectError || submissionsError;

  const columns: Column<ProjectSubmissionWithProfile & Record<string, unknown>>[] = [
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
            className="text-zinc-300 underline underline-offset-2 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/students/${profileId}`);
            }}
          >
            {name}
          </button>
        ) : (
          <span className="text-zinc-400">{name}</span>
        );
      },
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (row) => {
        const d = row.createdAt ? new Date(row.createdAt) : null;
        return <span className="text-zinc-400">{d && !isNaN(d.getTime()) ? format(d, 'MMM d, yyyy') : '—'}</span>;
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
          className="text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/company/projects/submissions/${row.id}`);
          }}
        >
          Review
        </button>
      ),
    },
  ];

  const tableData = submissions.map((s) => ({ ...s } as ProjectSubmissionWithProfile & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Company</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">Project Submissions</h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-300 md:text-base">
          {project?.title ? `Submissions for ${project.title}` : 'Loading...'}
        </p>
      </header>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : hasError ? (
        <Card>
          <p className="text-red-400">
            {projectError
              ? `Failed to load project: ${(projectFetchError instanceof ApiError ? projectFetchError : parseApiError(projectFetchError)).message}`
              : `Failed to load submissions: ${(submissionsFetchError instanceof ApiError ? submissionsFetchError : parseApiError(submissionsFetchError)).message}`}
          </p>
        </Card>
      ) : submissions.length === 0 ? (
        <EmptyState title="No submissions" description="No student has submitted for this project yet." />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No submissions" />
      )}
    </div>
  );
}
