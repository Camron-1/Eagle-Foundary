import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Opportunity, Application, BudgetType } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, parseApiError } from '@/lib/api/errors';
import { useAuth } from '@/store/authStore';

interface CustomQuestion {
  id: string;
  question: string;
  required?: boolean;
}

interface OpportunityWithOrg extends Omit<Opportunity, 'org'> {
  org?: { id: string; name: string };
  customQuestions?: CustomQuestion[] | null;
}

export default function OpportunityDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { isUniversityAdmin, isStudent } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');

  // Application form state
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formResumeUrl, setFormResumeUrl] = useState('');
  const [formCoverLetter, setFormCoverLetter] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ['opportunities', id],
    queryFn: async () => {
      const res = await api.get<{ data?: OpportunityWithOrg } | OpportunityWithOrg>(
        endpoints.opportunities.detail(id!),
      );
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) as OpportunityWithOrg | null;
    },
    enabled: !!id,
  });

  const customQuestions: CustomQuestion[] = useMemo(() => {
    const qs = opportunity?.customQuestions;
    return Array.isArray(qs) ? qs : [];
  }, [opportunity]);

  const { data: myApplications = [] } = useQuery({
    queryKey: ['applications', 'me'],
    queryFn: async () => {
      const res = await api.get<{ data?: Application[] }>(endpoints.applications.me);
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
    enabled: isStudent,
  });

  const alreadyApplied = useMemo(() => {
    if (!id || !myApplications || !Array.isArray(myApplications)) return false;
    return myApplications.some(
      (app: Application) =>
        app.opportunityId === id && app.status !== 'WITHDRAWN',
    );
  }, [myApplications, id]);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const formAnswers = {
        firstName: formFirstName,
        lastName: formLastName,
        address: formAddress,
        resumeUrl: formResumeUrl,
        coverLetter: formCoverLetter,
        customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
      };

      await api.post(endpoints.opportunities.createApplication(id!), {
        coverLetter: formCoverLetter || undefined,
        resumeUrl: formResumeUrl || undefined,
        formAnswers,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', id] });
      queryClient.invalidateQueries({ queryKey: ['applications', 'me'] });
      toast.success('Application submitted');
      // Reset form
      setFormFirstName('');
      setFormLastName('');
      setFormAddress('');
      setFormResumeUrl('');
      setFormCoverLetter('');
      setCustomAnswers({});
    },
    onError: (err: unknown) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      if (apiErr.status === 409 || apiErr.body?.message?.toLowerCase().includes('already applied')) {
        queryClient.invalidateQueries({ queryKey: ['applications', 'me'] });
        toast.error('You have already applied to this opportunity');
      } else {
        toast.error(apiErr.message ?? 'Failed to submit application');
      }
    },
  });

  const showApplyTab = isStudent && !isUniversityAdmin;
  const tabs = showApplyTab
    ? ['Overview', 'Requirements', 'Apply']
    : ['Overview', 'Requirements'];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="space-y-8">
        <h1 className="ef-heading-gradient text-4xl font-semibold">Opportunity not found</h1>
        <Link to="/opportunities" className="text-sm text-fg-muted underline hover:text-fg">
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
          {opportunity.title}
        </h1>
        {opportunity.org && (
          <p className="mt-2 text-lg text-fg-muted">
            <Link
              to={`/organizations/${opportunity.org.id}`}
              className="text-fg-muted underline underline-offset-2 hover:text-fg"
            >
              {opportunity.org.name}
            </Link>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {opportunity.budgetType && (
            <Badge>{opportunity.budgetType as BudgetType}</Badge>
          )}
          <Badge>{opportunity.status}</Badge>
          {alreadyApplied && <Badge variant="success">Applied</Badge>}
        </div>
      </header>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Overview' && (
        <div className="space-y-4">
          {opportunity.description && (
            <p className="text-sm text-fg-muted whitespace-pre-wrap">{opportunity.description}</p>
          )}
        </div>
      )}

      {activeTab === 'Requirements' && (
        <div className="space-y-4">
          {opportunity.requirements ? (
            <p className="text-sm text-fg-muted whitespace-pre-wrap">{opportunity.requirements}</p>
          ) : (
            <p className="text-sm text-fg-subtle">No requirements specified.</p>
          )}
        </div>
      )}

      {activeTab === 'Apply' && (
        <div className="space-y-6 max-w-2xl">
          {alreadyApplied ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-400 font-medium">
                ✓ You have already applied to this opportunity
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                Check your applications page to track the status of your application.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-xs text-fg-subtle uppercase tracking-wide">Required Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    placeholder="Your first name"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                  />
                  <Input
                    label="Last Name"
                    placeholder="Your last name"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                  />
                </div>
                <Input
                  label="Address"
                  placeholder="City, State or full address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
                <Input
                  label="Resume URL (Google Drive, LinkedIn, etc.)"
                  type="url"
                  placeholder="https://..."
                  value={formResumeUrl}
                  onChange={(e) => setFormResumeUrl(e.target.value)}
                />
                <Textarea
                  label="Cover Letter"
                  placeholder="Introduce yourself and explain why you're a good fit..."
                  value={formCoverLetter}
                  onChange={(e) => setFormCoverLetter(e.target.value)}
                  rows={6}
                />
              </div>

              {customQuestions.length > 0 && (
                <div className="space-y-4 border-t border-border-subtle pt-6">
                  <p className="text-xs text-fg-subtle uppercase tracking-wide">Questions from the Organization</p>
                  {customQuestions.map((q) => (
                    <Textarea
                      key={q.id}
                      label={q.question + (q.required ? ' *' : '')}
                      placeholder="Your answer..."
                      value={customAnswers[q.id] ?? ''}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      rows={3}
                    />
                  ))}
                </div>
              )}

              <Button
                variant="primary"
                withBorderEffect={false}
                disabled={
                  applyMutation.isPending ||
                  !formFirstName.trim() ||
                  !formLastName.trim() ||
                  customQuestions.some((q) => q.required && !customAnswers[q.id]?.trim())
                }
                onClick={() => {
                  if (formResumeUrl.trim()) {
                    try { new URL(formResumeUrl); } catch {
                      toast.error('Please enter a valid resume URL');
                      return;
                    }
                  }
                  applyMutation.mutate();
                }}
                className="w-full sm:w-auto"
              >
                {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
