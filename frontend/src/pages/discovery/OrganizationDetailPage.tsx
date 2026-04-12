import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Org } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrganizationDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();

  const { data: org, isLoading, isError } = useQuery({
    queryKey: ['orgs', id],
    queryFn: async () => {
      const res = await api.get<{ data?: Org } | Org>(endpoints.orgs.detail(id!));
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? null;
    },
    enabled: !!id,
  });

  if (isError) {
    return (
      <div className="space-y-8">
        <h1 className="ef-heading-gradient text-4xl font-semibold">Failed to load organization</h1>
        <Link to="/organizations" className="text-sm text-fg-muted underline hover:text-fg">
          Back to discovery
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-5 w-32" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-8">
        <h1 className="ef-heading-gradient text-4xl font-semibold">Organization not found</h1>
        <Link to="/organizations" className="text-sm text-fg-muted underline hover:text-fg">
          Back to discovery
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Discovery</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          {org.name}
        </h1>
        {org.website && (
          <a
            href={org.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-fg-muted underline underline-offset-2 hover:text-fg"
          >
            {org.website}
          </a>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {org.isVerifiedBadge ? (
            <Badge variant="success">Verified</Badge>
          ) : (
            <Badge variant="warning">Verification Pending</Badge>
          )}
        </div>
      </header>

      {org.description && (
        <p className="text-sm text-fg-muted whitespace-pre-wrap max-w-3xl">{org.description}</p>
      )}
    </div>
  );
}

