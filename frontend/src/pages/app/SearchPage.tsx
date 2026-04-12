import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { SearchResult } from '@/lib/api/types';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';

const SEARCH_TABS = ['All', 'Startups', 'Opportunities', 'Projects', 'Students', 'Organizations'] as const;
const TYPE_MAP: Record<string, string> = {
  All: 'all',
  Startups: 'startups',
  Opportunities: 'opportunities',
  Projects: 'projects',
  Students: 'students',
  Organizations: 'orgs',
};

interface SearchResponse {
  data?: {
    startups?: SearchResult[];
    opportunities?: SearchResult[];
    projects?: SearchResult[];
    students?: SearchResult[];
    orgs?: SearchResult[];
    organizations?: SearchResult[];
  };
}

function getDetailPath(item: SearchResult): string {
  switch (item.type) {
    case 'startup':
      return `/startups/${item.id}`;
    case 'opportunity':
      return `/opportunities/${item.id}`;
    case 'project':
      return `/projects/${item.id}`;
    case 'student':
      return `/students/${item.id}`;
    case 'organization':
      return `/orgs/${item.id}`;
    default:
      return '#';
  }
}

export default function SearchPage(): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('All');
  const debouncedSearch = useDebounce(search, 300);
  const typeParam = TYPE_MAP[activeTab] ?? 'all';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', debouncedSearch, typeParam],
    queryFn: async () => {
      const res = await api.get<SearchResponse>(endpoints.search, {
        params: { q: debouncedSearch, type: typeParam, limit: 20 },
      });
      return res.data;
    },
    enabled: debouncedSearch.trim().length >= 1,
  });

  const body = data?.data ?? data;
  const startups = (body as Record<string, unknown>)?.startups ?? [];
  const opportunities = (body as Record<string, unknown>)?.opportunities ?? [];
  const projects = (body as Record<string, unknown>)?.projects ?? [];
  const students = (body as Record<string, unknown>)?.students ?? [];
  const orgs = (body as Record<string, unknown>)?.orgs ?? (body as Record<string, unknown>)?.organizations ?? [];

  const allResults: SearchResult[] = [
    ...(Array.isArray(startups) ? startups : []),
    ...(Array.isArray(opportunities) ? opportunities : []),
    ...(Array.isArray(projects) ? projects : []),
    ...(Array.isArray(students) ? students : []),
    ...(Array.isArray(orgs) ? orgs : []),
  ];

  const hasSearched = debouncedSearch.trim().length >= 1;
  const hasResults = allResults.length > 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="ef-heading-gradient text-4xl font-semibold leading-tight md:text-5xl">
          Search
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-fg-muted">
          Search across startups, opportunities, projects, students, and organizations.
        </p>
      </header>

      <div className="space-y-4">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xl text-base"
        />
        <Tabs tabs={[...SEARCH_TABS]} active={activeTab} onChange={setActiveTab} />
      </div>

      {isError ? (
        <EmptyState title="Search failed" description={error?.message ?? 'An error occurred while searching.'} />
      ) : isLoading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : !hasSearched ? (
        <EmptyState
          title="Start searching"
          description="Enter a query to find startups, opportunities, projects, students, or organizations."
        />
      ) : !hasResults ? (
        <EmptyState
          title="No results found"
          description="Try a different search term or filter."
        />
      ) : (
        <div className="space-y-6">
          {(activeTab === 'All' || activeTab === 'Startups') && (Array.isArray(startups) ? startups : []).length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-fg-subtle">
                Startups
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Array.isArray(startups) ? startups : []).map((item: SearchResult) => (
                  <div
                    key={`startup-${item.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(getDetailPath(item))}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(getDetailPath(item))}
                  >
                    <Card interactive className="cursor-pointer">
                      <p className="font-medium text-fg">{item.title}</p>
                      {item.subtitle && (
                        <p className="mt-1 text-sm text-fg-subtle">{item.subtitle}</p>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          )}
          {(activeTab === 'All' || activeTab === 'Opportunities') && (Array.isArray(opportunities) ? opportunities : []).length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-fg-subtle">
                Opportunities
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Array.isArray(opportunities) ? opportunities : []).map((item: SearchResult) => (
                  <div
                    key={`opportunity-${item.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(getDetailPath(item))}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(getDetailPath(item))}
                  >
                    <Card interactive className="cursor-pointer">
                      <p className="font-medium text-fg">{item.title}</p>
                      {item.subtitle && (
                        <p className="mt-1 text-sm text-fg-subtle">{item.subtitle}</p>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          )}
          {(activeTab === 'All' || activeTab === 'Projects') && (Array.isArray(projects) ? projects : []).length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-fg-subtle">
                Projects
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Array.isArray(projects) ? projects : []).map((item: SearchResult) => (
                  <div
                    key={`project-${item.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(getDetailPath(item))}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(getDetailPath(item))}
                  >
                    <Card interactive className="cursor-pointer">
                      <p className="font-medium text-fg">{item.title}</p>
                      {item.subtitle && (
                        <p className="mt-1 text-sm text-fg-subtle">{item.subtitle}</p>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          )}
          {(activeTab === 'All' || activeTab === 'Students') && (Array.isArray(students) ? students : []).length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-fg-subtle">
                Students
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Array.isArray(students) ? students : []).map((item: SearchResult) => (
                  <div
                    key={`student-${item.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(getDetailPath(item))}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(getDetailPath(item))}
                  >
                    <Card interactive className="cursor-pointer">
                      <p className="font-medium text-fg">{item.title}</p>
                      {item.subtitle && (
                        <p className="mt-1 text-sm text-fg-subtle">{item.subtitle}</p>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          )}
          {(activeTab === 'All' || activeTab === 'Organizations') && (Array.isArray(orgs) ? orgs : []).length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-fg-subtle">
                Organizations
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Array.isArray(orgs) ? orgs : []).map((item: SearchResult) => (
                  <div
                    key={`org-${item.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(getDetailPath(item))}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(getDetailPath(item))}
                  >
                    <Card interactive className="cursor-pointer">
                      <p className="font-medium text-fg">{item.title}</p>
                      {item.subtitle && (
                        <p className="mt-1 text-sm text-fg-subtle">{item.subtitle}</p>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
