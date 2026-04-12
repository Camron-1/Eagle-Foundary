import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Startup, JoinRequest, Application } from '@/lib/api/types';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { data: startupsData, isLoading: startupsLoading } = useQuery({
    queryKey: ['startups', 'list', 'count'],
    queryFn: async () => {
      const res = await api.get<{ data?: Startup[]; meta?: { pagination?: { total?: number } } }>(
        endpoints.startups.list,
        { params: { limit: 100 } },
      );
      const body = res.data;
      const items = body.data ?? (Array.isArray(body) ? body : []);
      return body.meta?.pagination?.total ?? items.length;
    },
  });

  const { data: joinRequestsData, isLoading: joinRequestsLoading } = useQuery({
    queryKey: ['join-requests', 'me', 'count'],
    queryFn: async () => {
      const res = await api.get<{ data?: JoinRequest[]; meta?: { pagination?: { total?: number } } }>(
        endpoints.joinRequests.me,
        { params: { limit: 100 } },
      );
      const body = res.data;
      const items = body.data ?? (Array.isArray(body) ? body : []);
      return body.meta?.pagination?.total ?? items.length;
    },
  });

  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ['applications', 'me', 'count'],
    queryFn: async () => {
      const res = await api.get<{ data?: Application[]; meta?: { pagination?: { total?: number } } }>(
        endpoints.applications.me,
        { params: { limit: 100 } },
      );
      const body = res.data;
      const items = body.data ?? (Array.isArray(body) ? body : []);
      return body.meta?.pagination?.total ?? items.length;
    },
  });

  const { data: unreadCount, isLoading: unreadLoading } = useQuery({
    queryKey: ['notifications', 'unread-count', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<{ data?: { count: number }; count?: number }>(
        endpoints.notifications.unreadCount,
      );
      const body = res.data;
      return body?.data?.count ?? body?.count ?? 0;
    },
  });

  const metricsLoading =
    startupsLoading || joinRequestsLoading || applicationsLoading || unreadLoading;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Student</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Track your startups, join requests, applications, and notifications.
        </p>
      </header>

      {metricsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="My Startups" value={startupsData ?? 0} />
          <MetricCard label="Join Requests" value={joinRequestsData ?? 0} />
          <MetricCard label="Applications" value={applicationsData ?? 0} />
          <MetricCard label="Unread" value={unreadCount ?? 0} />
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-fg">Quick links</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Jump to your startups, opportunities, or messages.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" withBorderEffect={false} onClick={() => navigate('/student/startups')}>
            My Startups
          </Button>
          <Button variant="ghost" onClick={() => navigate('/opportunities')}>
            Opportunities
          </Button>
          <Button variant="ghost" onClick={() => navigate('/messages')}>
            Messages
          </Button>
        </div>
      </Card>
    </div>
  );
}
