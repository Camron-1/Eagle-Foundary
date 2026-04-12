import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { BudgetType, Project, ProjectSubmission } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';
import { useAuth } from '@/store/authStore';

interface CustomQuestion {
  id: string;
  question: string;
  required?: boolean;
}

interface ProjectWithOrg extends Omit<Project, 'org'> {
  org?: { id: string; name: string };
  customQuestions?: CustomQuestion[] | null;
}

export default function ProjectDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { isUniversityAdmin, isStudent } = useAuth();

  const [activeTab, setActiveTab] = useState('Overview');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formResumeUrl, setFormResumeUrl] = useState('');
  const [formCoverLetter, setFormCoverLetter] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const res = await api.get<{ data?: ProjectWithOrg } | ProjectWithOrg>(endpoints.projects.detail(id!));
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) as ProjectWithOrg | null;
    },
    enabled: !!id,
  });

  const customQuestions: CustomQuestion[] = useMemo(() => {
    const qs = project?.customQuestions;
    return Array.isArray(qs) ? qs : [];
  }, [project]);

  const { data: mySubmissions = [] } = useQuery({
    queryKey: ['project-submissions', 'me'],
    queryFn: async () => {
      const res = await api.get<{ data?: ProjectSubmission[] } | ProjectSubmission[]>(endpoints.projectSubmissions.me);
      const body = res.data;
      if (body && typeof body === 'object' && 'data' in body) return body.data ?? [];
      if (Array.isArray(body)) return body;
      return [];
    },
    enabled: isStudent,
  });

  const alreadySubmitted = useMemo(() => {
    if (!id || !mySubmissions || !Array.isArray(mySubmissions)) return false;
    return mySubmissions.some((s) => s.projectId === id && s.status !== 'WITHDRAWN');
  }, [mySubmissions, id]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formAnswers = {
        firstName: formFirstName,
        lastName: formLastName,
        address: formAddress,
        resumeUrl: formResumeUrl,
        coverLetter: formCoverLetter,
        customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
      };

      await api.post(endpoints.projects.createSubmission(id!), {
        coverLetter: formCoverLetter || undefined,
        resumeUrl: formResumeUrl || undefined,
        formAnswers,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['project-submissions', 'me'] });
      toast.success('Submission sent');
      setFormFirstName('');
      setFormLastName('');
      setFormAddress('');
      setFormResumeUrl('');
      setFormCoverLetter('');
      setCustomAnswers({});
    },
    onError: (err: unknown) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      if (apiErr.status === 409 || apiErr.body?.message?.toLowerCase().includes('already')) {
        queryClient.invalidateQueries({ queryKey: ['project-submissions', 'me'] });
        toast.error('You have already submitted for this project');
      } else {
        toast.error(apiErr.message ?? 'Failed to submit');
      }
    },
  });

  const showSubmitTab = isStudent && !isUniversityAdmin;
  const tabs = showSubmitTab ? ['Overview', 'Requirements', 'Submit'] : ['Overview', 'Requirements'];

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

  if (!project) {
    return (
      <div className="space-y-8">
        <h1 className="ef-heading-gradient text-4xl font-semibold">Project not found</h1>
        <Link to="/projects" className="text-sm text-fg-muted underline hover:text-fg">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Discovery</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">{project.title}</h1>
        {project.org && (
          <p className="mt-2 text-lg text-fg-muted">
            <Link to={`/organizations/${project.org.id}`} className="text-fg-muted underline underline-offset-2 hover:text-fg">
              {project.org.name}
            </Link>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {project.budgetType && <Badge>{project.budgetType as BudgetType}</Badge>}
          {project.estimatedDuration && <Badge>{project.estimatedDuration}</Badge>}
          <Badge>{project.status}</Badge>
          {alreadySubmitted && <Badge variant="success">Submitted</Badge>}
        </div>
      </header>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Overview' && (
        <div className="space-y-4">
          {project.description && <p className="whitespace-pre-wrap text-sm text-fg-muted">{project.description}</p>}
        </div>
      )}

      {activeTab === 'Requirements' && (
        <div className="space-y-4">
          {project.requirements ? (
            <p className="whitespace-pre-wrap text-sm text-fg-muted">{project.requirements}</p>
          ) : (
            <p className="text-sm text-fg-subtle">No requirements specified.</p>
          )}
        </div>
      )}

      {activeTab === 'Submit' && (
        <div className="max-w-2xl space-y-6">
          {alreadySubmitted ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm font-medium text-emerald-400">✓ You have already submitted for this project</p>
              <p className="mt-1 text-xs text-fg-muted">Check your applications page to track submission status.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-wide text-fg-subtle">Required Information</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="First Name" placeholder="Your first name" value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} />
                  <Input label="Last Name" placeholder="Your last name" value={formLastName} onChange={(e) => setFormLastName(e.target.value)} />
                </div>
                <Input label="Address" placeholder="City, State or full address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
                <Input
                  label="Resume URL (Google Drive, LinkedIn, etc.)"
                  type="url"
                  placeholder="https://..."
                  value={formResumeUrl}
                  onChange={(e) => setFormResumeUrl(e.target.value)}
                />
                <Textarea
                  label="Cover Letter"
                  placeholder="Share how you will execute this project..."
                  value={formCoverLetter}
                  onChange={(e) => setFormCoverLetter(e.target.value)}
                  rows={6}
                />
              </div>

              {customQuestions.length > 0 && (
                <div className="space-y-4 border-t border-border-subtle pt-6">
                  <p className="text-xs uppercase tracking-wide text-fg-subtle">Questions from the Organization</p>
                  {customQuestions.map((q) => (
                    <Textarea
                      key={q.id}
                      label={q.question + (q.required ? ' *' : '')}
                      placeholder="Your answer..."
                      value={customAnswers[q.id] ?? ''}
                      onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      rows={3}
                    />
                  ))}
                </div>
              )}

              <Button
                variant="primary"
                withBorderEffect={false}
                disabled={
                  submitMutation.isPending ||
                  !formFirstName.trim() ||
                  !formLastName.trim() ||
                  !formAddress.trim() ||
                  customQuestions.some((q) => q.required && !customAnswers[q.id]?.trim())
                }
                onClick={() => {
                  if (formResumeUrl.trim()) {
                    try {
                      new URL(formResumeUrl);
                    } catch {
                      toast.error('Please enter a valid resume URL');
                      return;
                    }
                  }
                  submitMutation.mutate();
                }}
                className="w-full sm:w-auto"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Proposal'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
