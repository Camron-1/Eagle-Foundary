import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  Application,
  ApplicationStatus,
  ApplicationStatusHistoryEntry,
  StudentProfile,
  UpdateApplicationStatusPayload,
} from '@/lib/api/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { format } from 'date-fns';
import { ApiError, parseApiError } from '@/lib/api/errors';

const statusSchema = z.object({
  status: z.enum(['SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED']),
  note: z.string().max(500).optional().nullable(),
});

type StatusFormValues = z.infer<typeof statusSchema>;

const STATUS_OPTIONS = [
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'SELECTED', label: 'Selected' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function ApplicationReviewPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Profile');

  const { data: application, isLoading } = useQuery({
    queryKey: ['applications', id],
    queryFn: async () => {
      const res = await api.get<{ data?: Application } | Application>(endpoints.applications.detail(id!));
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) as Application;
    },
    enabled: !!id,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: { status: 'SHORTLISTED', note: '' },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: UpdateApplicationStatusPayload) => {
      await api.patch(endpoints.applications.updateStatus(id!), payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Status updated');
      navigate(-1);
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const onStatusSubmit = (values: StatusFormValues) => {
    updateStatusMutation.mutate({
      status: values.status as UpdateApplicationStatusPayload['status'],
      note: values.note || null,
    });
  };

  const profile = application?.profile as StudentProfile | undefined;
  const statusHistory = application?.statusHistory ?? [];
  const opportunity = application?.opportunity;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="ef-heading-gradient text-4xl font-semibold">Application Review</h1>
        </header>
        <div className="h-64 animate-pulse rounded-2xl bg-surface-tint" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="ef-heading-gradient text-4xl font-semibold">Application Review</h1>
        </header>
        <p className="text-fg-muted">Application not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Company</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Application Review
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Review application for {opportunity?.title ?? 'this opportunity'}
        </p>
      </header>

      <Tabs
        tabs={['Profile', 'Application Form', 'Cover Letter', 'Status History']}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'Profile' && profile && (
        <Card>
          <div className="flex flex-wrap items-start gap-6">
            <Avatar
              name={`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()}
              size="lg"
            />
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-semibold text-fg">
                {`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || '—'}
              </h3>
              {profile.major && (
                <p className="text-sm text-fg-muted">{profile.major}</p>
              )}
              {profile.skills?.length ? (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {profile.skills.map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-4 pt-2 text-sm text-fg-muted">
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-fg"
                  >
                    LinkedIn
                  </a>
                )}
                {profile.githubUrl && (
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-fg"
                  >
                    GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'Application Form' && (
        <Card>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-fg-muted">
            Application Details
          </h3>
          {!application.formAnswers || Object.keys(application.formAnswers).length === 0 ? (
            <p className="text-sm text-fg-subtle">No application form data provided.</p>
          ) : (
            <dl className="space-y-4 text-sm">
              {application.formAnswers.firstName && (
                <div>
                  <dt className="text-fg-subtle">First Name</dt>
                  <dd className="text-fg-muted mt-1">{application.formAnswers.firstName}</dd>
                </div>
              )}
              {application.formAnswers.lastName && (
                <div>
                  <dt className="text-fg-subtle">Last Name</dt>
                  <dd className="text-fg-muted mt-1">{application.formAnswers.lastName}</dd>
                </div>
              )}
              {application.formAnswers.address && (
                <div>
                  <dt className="text-fg-subtle">Address</dt>
                  <dd className="text-fg-muted mt-1">{application.formAnswers.address}</dd>
                </div>
              )}
              {application.formAnswers.resumeUrl && (
                <div>
                  <dt className="text-fg-subtle">Resume Link</dt>
                  <dd className="mt-1 text-blue-400 hover:underline">
                    <a href={application.formAnswers.resumeUrl as string} target="_blank" rel="noopener noreferrer">
                      {application.formAnswers.resumeUrl}
                    </a>
                  </dd>
                </div>
              )}

              {/* Custom answers */}
              {application.formAnswers.customAnswers &&
                typeof application.formAnswers.customAnswers === 'object' &&
                Object.keys(application.formAnswers.customAnswers).length > 0 && (
                  <div className="pt-4 border-t border-border-subtle mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle mb-3">Custom Questions</h4>
                    <div className="space-y-4">
                      {Object.entries(application.formAnswers.customAnswers).map(([qId, answer]) => (
                        <div key={qId}>
                          <dt className="text-fg-muted text-xs mb-1">Answer to custom question:</dt>
                          <dd className="text-fg-muted bg-surface-tint p-3 rounded-lg whitespace-pre-wrap border border-border-subtle">
                            {String(answer)}
                          </dd>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </dl>
          )}
        </Card>
      )}

      {activeTab === 'Cover Letter' && (
        <Card>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.12em] text-fg-muted">
            Cover Letter
          </h3>
          <p className="whitespace-pre-wrap text-sm text-fg-muted">
            {application.coverLetter || 'No cover letter provided.'}
          </p>
          {application.resumeUrl && (
            <div className="mt-4">
              <a
                href={application.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-fg-muted underline hover:text-fg"
              >
                Download resume
              </a>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'Status History' && (
        <Card>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-fg-muted">
            Status History
          </h3>
          <div className="space-y-3">
            {statusHistory.length === 0 ? (
              <p className="text-sm text-fg-subtle">No status changes yet.</p>
            ) : (
              statusHistory.map((entry: ApplicationStatusHistoryEntry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-start gap-3 border-b border-border-subtle pb-3 last:border-0 last:pb-0"
                >
                  <Badge>{entry.toStatus}</Badge>
                  <span className="text-xs text-fg-subtle">
                    {(() => {
                      const d = entry.createdAt ? new Date(entry.createdAt) : null;
                      return d && !isNaN(d.getTime()) ? format(d, 'MMM d, yyyy HH:mm') : '—';
                    })()}
                  </span>
                  {entry.note && (
                    <p className="w-full text-sm text-fg-muted">{entry.note}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-fg-muted">
          Update Status
        </h3>
        <form onSubmit={handleSubmit(onStatusSubmit)} className="space-y-4">
          <Select
            label="Decision"
            options={STATUS_OPTIONS}
            {...register('status')}
            error={errors.status?.message}
          />
          <Textarea
            label="Note (optional)"
            placeholder="Add a note for this status change..."
            maxLength={500}
            {...register('note')}
            error={errors.note?.message}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              withBorderEffect={false}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
