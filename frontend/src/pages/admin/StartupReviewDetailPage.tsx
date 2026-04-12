import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Startup, StartupMember, StudentProfile } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';

interface StartupWithTeam extends Startup {
  members?: Array<StartupMember & { profile?: StudentProfile }>;
}

export default function StartupReviewDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Overview');
  const [decision, setDecision] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'>('APPROVE');
  const [feedback, setFeedback] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: startup, isLoading } = useQuery({
    queryKey: ['startups', id],
    queryFn: async () => {
      const res = await api.get<{ data?: StartupWithTeam }>(endpoints.startups.detail(id!));
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });

  const { data: team = [] } = useQuery({
    queryKey: ['startups', id, 'team'],
    queryFn: async () => {
      const res = await api.get<{ data?: Array<StartupMember & { profile?: StudentProfile }> }>(
        endpoints.startups.team(id!)
      );
      const body = res.data;
      const items = body?.data ?? (Array.isArray(body) ? body : []);
      return Array.isArray(items) ? items : [];
    },
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await api.post(endpoints.admin.reviewStartup(id!), {
        action: decision,
        feedback: feedback.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'startups', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['startups', id] });
      toast.success('Startup reviewed successfully');
      navigate('/admin/startups/reviews');
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to submit review');
    },
  });

  const handleSubmit = () => {
    setConfirmOpen(false);
    reviewMutation.mutate();
  };

  const teamColumns: Column<StartupMember & { profile?: StudentProfile } & Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => {
        const p = row.profile;
        const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '—';
        return <span className="text-fg">{name || '—'}</span>;
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <span className="text-fg-muted capitalize">{row.role}</span>,
    },
  ];

  const teamData = team.map((t) => ({ ...t } as StartupMember & { profile?: StudentProfile } & Record<string, unknown>));

  if (!id) {
    return (
      <div className="space-y-8">
        <h1 className="ef-heading-gradient text-4xl font-semibold">Invalid startup</h1>
        <Button variant="ghost" onClick={() => navigate('/admin/startups/reviews')}>
          Back to Reviews
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-tint" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-tint" />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="space-y-8">
        <h1 className="ef-heading-gradient text-4xl font-semibold">Startup not found</h1>
        <p className="text-sm text-fg-muted">The startup you're looking for doesn't exist or has been removed.</p>
        <Button variant="ghost" onClick={() => navigate('/admin/startups/reviews')}>
          Back to Reviews
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Admin</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          {startup.name}
        </h1>
      </header>

      <Tabs tabs={['Overview', 'Team']} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Overview' && (
        <Card>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-fg-subtle">Name</p>
              <p className="mt-1 text-fg">{startup.name}</p>
            </div>
            {startup.tagline && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-fg-subtle">Tagline</p>
                <p className="mt-1 text-fg">{startup.tagline}</p>
              </div>
            )}
            {startup.description && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-fg-subtle">Description</p>
                <p className="mt-1 text-sm text-fg-muted">{startup.description}</p>
              </div>
            )}
            {startup.tags?.length ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-fg-subtle">Tags</p>
                <p className="mt-1 text-fg-muted">{startup.tags.join(', ')}</p>
              </div>
            ) : null}
            {startup.stage && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-fg-subtle">Stage</p>
                <p className="mt-1 text-fg-muted">{startup.stage}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'Team' && (
        <DataTable columns={teamColumns} data={teamData} emptyMessage="No team members" />
      )}

      <Card>
        <h2 className="text-lg font-semibold text-fg">Decision</h2>
        <p className="mt-1 text-sm text-fg-muted">Approve, request changes, or reject this startup.</p>
        <div className="mt-4 space-y-4">
          <Select
            label="Decision"
            options={[
              { value: 'APPROVE', label: 'Approve' },
              { value: 'REQUEST_CHANGES', label: 'Request Changes' },
              { value: 'REJECT', label: 'Reject' },
            ]}
            value={decision}
            onChange={(e) => setDecision(e.target.value as 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT')}
          />
          <Textarea
            label="Feedback (optional for Approve)"
            placeholder="Provide feedback for the founder..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
          <Button
            variant="primary"
            withBorderEffect={false}
            onClick={() => setConfirmOpen(true)}
            disabled={reviewMutation.isPending}
          >
            Submit Review
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSubmit}
        title="Confirm review"
        description={`Are you sure you want to ${decision.replace('_', ' ').toLowerCase()} this startup?`}
        confirmLabel="Submit"
        loading={reviewMutation.isPending}
      />
    </div>
  );
}
