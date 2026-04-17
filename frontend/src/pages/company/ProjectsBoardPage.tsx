import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Project, ProjectStatus } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';

interface ProjectWithCount extends Project {
  _count?: { submissions: number };
}

export default function ProjectsBoardPage(): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', 'org', 'me', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const url = `${endpoints.projects.orgMe}${params.toString() ? `?${params}` : ''}`;
      const res = await api.get<{ data?: ProjectWithCount[] } | ProjectWithCount[]>(url);
      const body = res.data;
      const items = (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }, [projects, search]);

  const columns: Column<ProjectWithCount & Record<string, unknown>>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => <span className="font-medium text-fg">{row.title}</span>,
    },
    {
      key: 'budgetType',
      header: 'Budget Type',
      render: (row) => <Badge>{row.budgetType || '—'}</Badge>,
    },
    {
      key: 'submissions',
      header: 'Submissions',
      render: (row) => <span className="text-fg-muted">{row._count?.submissions ?? 0}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status ?? '—'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            withBorderEffect={false}
            className="h-8 px-3 py-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/projects/${row.id}`);
            }}
          >
            View
          </Button>
          <Button
            variant="ghost"
            withBorderEffect={false}
            className="h-8 px-3 py-1 text-xs bg-surface-faint hover:bg-surface-faint border border-border-subtle"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/company/projects/${row.id}/edit`);
            }}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const tableData = filtered.map((p) => ({ ...p } as ProjectWithCount & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Company</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="ef-heading-gradient text-4xl font-semibold leading-tight md:text-5xl">Company Projects</h1>
          <Button variant="primary" withBorderEffect={false} onClick={() => navigate('/company/projects/new')}>
            New Project
          </Button>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Create and manage outsourced projects for students.
        </p>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search projects..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: '', label: 'All' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'CLOSED', label: 'Closed' },
            ],
          },
        ]}
      />

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-surface-tint" />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects"
          description="Create your first outsourced project to start receiving student submissions."
          action={
            <Button variant="primary" withBorderEffect={false} onClick={() => navigate('/company/projects/new')}>
              New Project
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No results" description="No projects match your filters." />
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
        />
      )}
    </div>
  );
}
