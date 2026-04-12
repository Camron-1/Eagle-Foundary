import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDashboardStats } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { CardSkeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage(): JSX.Element {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<{
        data?: {
          users?: { active?: number };
          orgs?: { active?: number };
          startups?: { pending?: number };
          reports?: { pending?: number };
        };
      }>(endpoints.admin.dashboard);
      const raw = res.data?.data ?? res.data;
      return {
        activeUsers: raw?.users?.active ?? 0,
        organizations: raw?.orgs?.active ?? 0,
        pendingStartups: raw?.startups?.pending ?? 0,
        openReports: raw?.reports?.pending ?? 0,
      } as AdminDashboardStats;
    },
  });

  const s = stats;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Admin</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Admin Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Overview of platform activity, pending reviews, and moderation.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active Users" value={s?.activeUsers ?? 0} />
          <MetricCard label="Organizations" value={s?.organizations ?? 0} />
          <MetricCard label="Pending Startups" value={s?.pendingStartups ?? 0} />
          <MetricCard label="Open Reports" value={s?.openReports ?? 0} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          withBorderEffect={false}
          onClick={() => navigate('/admin/startups/reviews')}
        >
          Review Startups
        </Button>
        <Button variant="ghost" onClick={() => navigate('/admin/users')}>
          Manage Users
        </Button>
        <Button variant="ghost" onClick={() => navigate('/admin/reports')}>
          View Reports
        </Button>
      </div>
    </div>
  );
}
