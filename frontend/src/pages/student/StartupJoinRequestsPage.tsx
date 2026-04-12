import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { JoinRequest, UpdateJoinRequestPayload } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import { Eye } from 'lucide-react';

function truncate(str: string | null | undefined, max = 60): string {
  if (!str) return '—';
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export default function StartupJoinRequestsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    requestId: string;
    action: 'ACCEPT' | 'REJECT';
    applicantName?: string;
  } | null>(null);

  const [viewRequest, setViewRequest] = useState<JoinRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['startups', id, 'join-requests'],
    queryFn: async () => {
      if (!id) return [];
      const res = await api.get<{ data?: JoinRequest[] } | JoinRequest[]>(
        endpoints.startups.joinRequests(id),
      );
      const body = res.data;
      if (body && typeof body === 'object' && 'data' in body && Array.isArray(body.data)) return body.data;
      if (Array.isArray(body)) return body;
      return [];
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: { requestId: string; status: UpdateJoinRequestPayload['status'] }) => {
      await api.patch(endpoints.joinRequests.update(requestId), { status });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['startups', id, 'join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['startups', id, 'team'] });
      setConfirmState(null);
      setViewRequest(null);
      toast.success(status === 'ACCEPTED' ? 'Join request accepted' : 'Join request rejected');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update join request');
    },
  });

  const handleConfirm = () => {
    if (!confirmState) return;
    const status = confirmState.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
    updateMutation.mutate({ requestId: confirmState.requestId, status });
  };

  const columns: Column<JoinRequest & Record<string, unknown>>[] = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (row) => {
        const p = row.profile;
        const name = p ? `${p.firstName} ${p.lastName}`.trim() || '—' : '—';
        const profileId = row.profileId ?? p?.id;
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
      key: 'message',
      header: 'Message',
      render: (row) => (
        <span className="max-w-[150px] truncate text-fg-muted" title={row.message ?? undefined}>
          {truncate(row.message, 40)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status}</Badge>,
    },
    {
      key: 'details',
      header: '',
      render: (row) => (
        <Button
          variant="ghost"
          className="h-8 px-2 text-fg-muted hover:text-fg"
          onClick={(e) => {
            e.stopPropagation();
            setViewRequest(row as JoinRequest);
          }}
        >
          <Eye size={16} className="mr-1.5" />
          View Application
        </Button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.status === 'PENDING' ? (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="text-xs text-emerald-400 hover:text-emerald-300"
              onClick={(e) => {
                e.stopPropagation();
                const name = row.profile
                  ? `${row.profile.firstName} ${row.profile.lastName}`.trim()
                  : undefined;
                setConfirmState({
                  open: true,
                  requestId: row.id,
                  action: 'ACCEPT',
                  applicantName: name,
                });
              }}
            >
              Accept
            </Button>
            <Button
              variant="ghost"
              className="text-xs text-red-400 hover:text-red-300"
              onClick={(e) => {
                e.stopPropagation();
                const name = row.profile
                  ? `${row.profile.firstName} ${row.profile.lastName}`.trim()
                  : undefined;
                setConfirmState({
                  open: true,
                  requestId: row.id,
                  action: 'REJECT',
                  applicantName: name,
                });
              }}
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
  ];

  const tableData = requests.map((r) => ({ ...r } as JoinRequest & Record<string, unknown>));

  const renderFormAnswers = (answers: Record<string, string> | undefined) => {
    if (!answers || Object.keys(answers).length === 0) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-fg">Application Details</h4>
        <dl className="space-y-3 rounded-lg border border-border-subtle bg-surface-tint p-4 text-sm">
          {answers.firstName && (
            <div>
              <dt className="text-fg-subtle">First Name</dt>
              <dd className="text-fg-muted">{answers.firstName}</dd>
            </div>
          )}
          {answers.lastName && (
            <div>
              <dt className="text-fg-subtle">Last Name</dt>
              <dd className="text-fg-muted">{answers.lastName}</dd>
            </div>
          )}
          {answers.address && (
            <div>
              <dt className="text-fg-subtle">Address</dt>
              <dd className="text-fg-muted">{answers.address}</dd>
            </div>
          )}
          {answers.resumeUrl && (
            <div>
              <dt className="text-fg-subtle">Resume Link</dt>
              <dd className="text-fg-muted">
                {/^https?:\/\//i.test(answers.resumeUrl) ? (
                  <a href={answers.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {answers.resumeUrl}
                  </a>
                ) : (
                  <span className="text-fg-muted">{answers.resumeUrl}</span>
                )}
              </dd>
            </div>
          )}

          {/* Custom answers */}
          {answers.customAnswers && typeof answers.customAnswers === 'object' && Object.entries(answers.customAnswers).length > 0 && (
            <div className="pt-2 border-t border-border-subtle">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle mb-2">Custom Questions</h5>
              {Object.entries(answers.customAnswers).map(([questionId, answer]) => (
                <div key={questionId} className="mt-2">
                  <dt className="text-fg-muted whitespace-pre-wrap text-xs mb-1">Q: {
                    // Try to find the original question text from the startup's customQuestions array 
                    // (Note: we don't have the full startup with customQuestions here, so we just show the answer since the ID is a UUID.
                    // But typically a founder knows what they asked, and we could fetch the startup details mapped here.
                    // For now, we will just show the answer under "Custom Answer")
                    "Answer to custom question"
                  }</dt>
                  <dd className="text-fg-muted bg-page/20 p-2 rounded">{String(answer)}</dd>
                </div>
              ))}
            </div>
          )}
        </dl>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Startup</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Join Requests
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Review and respond to students who want to join your startup.
        </p>
      </header>

      <div className="flex justify-start">
        <Button
          variant="ghost"
          withBorderEffect={false}
          onClick={() => id && navigate(`/student/startups/${id}/team`)}
        >
          ← Back to Team
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : requests.length === 0 ? (
        <EmptyState
          title="No join requests"
          description="When students request to join your startup, they will appear here."
        />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No join requests" />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={handleConfirm}
        title={
          confirmState?.action === 'ACCEPT'
            ? `Accept ${confirmState.applicantName ? `${confirmState.applicantName}'s` : 'this'} request?`
            : `Reject ${confirmState?.applicantName ? `${confirmState.applicantName}'s` : 'this'} request?`
        }
        description={
          confirmState?.action === 'ACCEPT'
            ? 'The applicant will be added to your startup team.'
            : 'The applicant will be notified that their request was declined.'
        }
        confirmLabel={confirmState?.action === 'ACCEPT' ? 'Accept' : 'Reject'}
        loading={updateMutation.isPending}
      />

      {/* View Application Modal */}
      <Modal
        open={!!viewRequest}
        onClose={() => setViewRequest(null)}
        title="Application Details"
      >
        {viewRequest && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <h3 className="text-lg font-medium text-fg">
                {viewRequest.profile?.firstName} {viewRequest.profile?.lastName}
              </h3>
              <p className="text-sm text-fg-muted">Status: <Badge>{viewRequest.status}</Badge></p>
            </div>

            {viewRequest.formAnswers ? (
              renderFormAnswers(viewRequest.formAnswers as Record<string, string>)
            ) : (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-fg">Message / Cover Letter</h4>
                <p className="whitespace-pre-wrap text-sm text-fg-muted bg-surface-tint p-4 rounded-lg border border-border-subtle">
                  {viewRequest.message || 'No message provided.'}
                </p>
              </div>
            )}

            {viewRequest.status === 'PENDING' && (
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle mt-6">
                <Button
                  variant="ghost"
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    setViewRequest(null);
                    setConfirmState({
                      open: true,
                      requestId: viewRequest.id,
                      action: 'REJECT',
                      applicantName: viewRequest.profile
                        ? `${viewRequest.profile.firstName} ${viewRequest.profile.lastName}`.trim()
                        : undefined,
                    });
                  }}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  withBorderEffect={false}
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    setViewRequest(null);
                    setConfirmState({
                      open: true,
                      requestId: viewRequest.id,
                      action: 'ACCEPT',
                      applicantName: viewRequest.profile
                        ? `${viewRequest.profile.firstName} ${viewRequest.profile.lastName}`.trim()
                        : undefined,
                    });
                  }}
                >
                  Accept Request
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
}
