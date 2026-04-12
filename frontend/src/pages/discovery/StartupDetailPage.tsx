import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Startup, StartupMember, StudentProfile } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/store/authStore';

interface CustomQuestion {
  id: string;
  question: string;
  required?: boolean;
}

interface StartupWithMembers extends Startup {
  members?: Array<StartupMember & { profile?: StudentProfile }>;
  acceptingJoinRequests?: boolean;
  customQuestions?: CustomQuestion[] | null;
}

export default function StartupDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user, isStudent } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  // Form fields
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formResumeUrl, setFormResumeUrl] = useState('');
  const [formCoverLetter, setFormCoverLetter] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const { data: startup, isLoading } = useQuery({
    queryKey: ['startups', id],
    queryFn: async () => {
      const res = await api.get<{ data?: StartupWithMembers } | StartupWithMembers>(
        endpoints.startups.detail(id!),
      );
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? null;
    },
    enabled: !!id,
  });

  const { data: team = [] } = useQuery({
    queryKey: ['startups', id, 'team'],
    queryFn: async () => {
      const res = await api.get<{ data?: StartupMember[] } | StartupMember[]>(
        endpoints.startups.team(id!),
      );
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
    enabled: !!id && !!startup,
  });

  const isMember = useMemo(() => {
    if (!user || !team || !Array.isArray(team) || team.length === 0) return false;
    return team.some((m: StartupMember) => m.profile?.userId === user.id);
  }, [team, user]);

  const isMemberViaStartup = useMemo(() => {
    if (!user || !startup?.members) return false;
    return startup.members.some((m) => m.profile?.userId === user.id);
  }, [startup, user]);

  const canRequestJoin =
    isStudent &&
    !isMember &&
    !isMemberViaStartup &&
    (startup as StartupWithMembers)?.acceptingJoinRequests === true;

  const customQuestions: CustomQuestion[] = useMemo(() => {
    const qs = (startup as StartupWithMembers)?.customQuestions;
    return Array.isArray(qs) ? qs : [];
  }, [startup]);

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!formFirstName.trim() || !formLastName.trim()) {
        throw new Error('First name and last name are required');
      }
      const missingRequired = customQuestions.filter(
        (q) => q.required && !customAnswers[q.id]?.trim(),
      );
      if (missingRequired.length > 0) {
        throw new Error('Please answer all required questions');
      }
      if (formResumeUrl.trim()) {
        try { new URL(formResumeUrl); } catch {
          throw new Error('Please enter a valid resume URL');
        }
      }
      const formAnswers = {
        firstName: formFirstName,
        lastName: formLastName,
        address: formAddress,
        resumeUrl: formResumeUrl,
        coverLetter: formCoverLetter,
        customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
      };
      await api.post(endpoints.startups.createJoinRequest(id!), {
        message: formCoverLetter || undefined,
        formAnswers,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startups', id] });
      toast.success('Join request sent');
      setJoinModalOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to send join request');
    },
  });

  const resetForm = () => {
    setFormFirstName('');
    setFormLastName('');
    setFormAddress('');
    setFormResumeUrl('');
    setFormCoverLetter('');
    setCustomAnswers({});
  };

  const columns: Column<StartupMember & Record<string, unknown>>[] = [
    {
      key: 'member',
      header: 'Name',
      render: (row) => {
        const p = row.profile;
        const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '—' : '—';
        return <span className="text-fg-muted">{name}</span>;
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge>{row.role}</Badge>,
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      render: (row) => {
        const d = row.joinedAt ? new Date(row.joinedAt) : null;
        return <span className="text-fg-muted">{d && !isNaN(d.getTime()) ? format(d, 'MMM d, yyyy') : '—'}</span>;
      },
    },
  ];

  const tableData = Array.isArray(team)
    ? team.map((m: StartupMember) => ({ ...m }) as StartupMember & Record<string, unknown>)
    : [];

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

  if (!startup) {
    return (
      <div className="space-y-8">
        <h1 className="ef-heading-gradient text-4xl font-semibold">Startup not found</h1>
        <Link to="/startups" className="text-sm text-fg-muted underline hover:text-fg">
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
          {startup.name}
        </h1>
        {startup.tagline && (
          <p className="mt-2 text-lg text-fg-muted">{startup.tagline}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {startup.stage && <Badge>{startup.stage}</Badge>}
          <Badge>{startup.status}</Badge>
          {(isMember || isMemberViaStartup) && (
            <Badge variant="success">Member</Badge>
          )}
        </div>
        {canRequestJoin && (
          <Button
            variant="primary"
            withBorderEffect={false}
            className="mt-4"
            onClick={() => setJoinModalOpen(true)}
          >
            Request to Join
          </Button>
        )}
        {isStudent &&
          !isMember &&
          !isMemberViaStartup &&
          !(startup as StartupWithMembers)?.acceptingJoinRequests && (
            <p className="mt-4 text-sm text-fg-subtle">
              This startup is not currently accepting join requests.
            </p>
          )}
      </header>

      <Tabs
        tabs={['Overview', 'Team']}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'Overview' && (
        <div className="space-y-4">
          {startup.description && (
            <p className="text-sm text-fg-muted whitespace-pre-wrap">{startup.description}</p>
          )}
          {startup.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {startup.tags.map((tag: string) => (
                <Badge key={tag} variant="default">{tag}</Badge>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {activeTab === 'Team' && (
        <DataTable
          columns={columns}
          data={tableData}
          emptyMessage="No team members yet"
        />
      )}

      <Modal
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        title="Request to Join"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <p className="text-xs text-fg-subtle uppercase tracking-wide mb-2">Required Information</p>
          <div className="grid grid-cols-2 gap-3">
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
            label="Resume URL"
            type="url"
            placeholder="https://drive.google.com/..."
            value={formResumeUrl}
            onChange={(e) => setFormResumeUrl(e.target.value)}
          />
          <Textarea
            label="Cover Letter"
            placeholder="Introduce yourself and why you'd like to join..."
            value={formCoverLetter}
            onChange={(e) => setFormCoverLetter(e.target.value)}
            rows={4}
          />

          {customQuestions.length > 0 && (
            <>
              <p className="text-xs text-fg-subtle uppercase tracking-wide mt-4">Additional Questions from Founder</p>
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
            </>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setJoinModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            withBorderEffect={false}
            disabled={joinMutation.isPending || !formFirstName.trim() || !formLastName.trim()}
            onClick={() => joinMutation.mutate()}
          >
            {joinMutation.isPending ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
