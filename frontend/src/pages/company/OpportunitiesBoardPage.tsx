import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Opportunity, OpportunityStatus } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';

interface OpportunityWithCount extends Opportunity {
  _count?: { applications: number };
}

export default function OpportunitiesBoardPage(): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['opportunities', 'org', 'me', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const url = `${endpoints.opportunities.orgMe}${params.toString() ? `?${params}` : ''}`;
      const res = await api.get<{ data?: OpportunityWithCount[] } | OpportunityWithCount[]>(url);
      const body = res.data;
      const items = (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return opportunities;
    const q = search.toLowerCase();
    return opportunities.filter(
      (o) =>
        o.title?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q)
    );
  }, [opportunities, search]);

  const columns: Column<OpportunityWithCount & Record<string, unknown>>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => <span className="text-fg font-medium">{row.title}</span>,
    },
    {
      key: 'budgetType',
      header: 'Budget Type',
      render: (row) => (
        <Badge>{row.budgetType || '—'}</Badge>
      ),
    },
    {
      key: 'applications',
      header: 'Applications',
      render: (row) => (
        <span className="text-fg-muted">
          {row._count?.applications ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status as OpportunityStatus}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <span className="text-xs text-fg-subtle">View / Edit</span>
      ),
    },
  ];

  const tableData = filtered.map((o) => ({ ...o } as OpportunityWithCount & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Company</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="ef-heading-gradient text-4xl font-semibold leading-tight md:text-5xl">
            Company Opportunities
          </h1>
          <Button
            variant="primary"
            withBorderEffect={false}
            onClick={() => navigate('/company/opportunities/new')}
          >
            New Opportunity
          </Button>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Create and manage opportunities for students.
        </p>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search opportunities..."
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
      ) : opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities"
          description="Create your first opportunity to attract students."
          action={
            <Button
              variant="primary"
              withBorderEffect={false}
              onClick={() => navigate('/company/opportunities/new')}
            >
              New Opportunity
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No results"
          description="No opportunities match your filters."
        />
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
          onRowClick={(row) => navigate(`/company/opportunities/${row.id}/edit`)}
        />
      )}
    </div>
  );
}
