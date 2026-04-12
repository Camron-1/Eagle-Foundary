import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentProfile, PortfolioItem } from '@/lib/api/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

interface PublicProfile extends Pick<StudentProfile, 'id' | 'firstName' | 'lastName' | 'major' | 'gradYear' | 'bio' | 'skills' | 'linkedinUrl' | 'githubUrl'> {
  resumeUrl?: string | null;
  portfolio?: PortfolioItem[];
  startups?: unknown[];
}

export default function StudentPublicProfilePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('Portfolio');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['students', id, 'public'],
    queryFn: async () => {
      const res = await api.get<{ data?: PublicProfile } | PublicProfile>(
        endpoints.students.publicProfile(id!),
      );
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? null;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        <h1 className="ef-heading-gradient text-4xl font-semibold">Profile not found</h1>
      </div>
    );
  }

  const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || '—';

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start gap-6">
        <Avatar name={fullName} size="lg" />
        <div className="flex-1 min-w-0">
          <h1 className="ef-heading-gradient text-4xl font-semibold leading-tight md:text-5xl">
            {fullName}
          </h1>
          {(profile.major || profile.gradYear) && (
            <p className="mt-2 text-fg-muted">
              {[profile.major, profile.gradYear ? `Class of ${profile.gradYear}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-fg-muted underline underline-offset-2 hover:text-fg"
              >
                LinkedIn
              </a>
            )}
            {profile.githubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-fg-muted underline underline-offset-2 hover:text-fg"
              >
                GitHub
              </a>
            )}
            {'resumeUrl' in profile && profile.resumeUrl && (
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-fg-muted underline underline-offset-2 hover:text-fg"
              >
                Resume
              </a>
            )}
          </div>
        </div>
      </header>

      {profile.bio && (
        <p className="text-sm text-fg-muted whitespace-pre-wrap max-w-3xl">{profile.bio}</p>
      )}

      {profile.skills?.length ? (
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill, i) => (
            <Badge key={`${skill}-${i}`}>{skill}</Badge>
          ))}
        </div>
      ) : null}

      <Tabs
        tabs={['Portfolio', 'Startups']}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'Portfolio' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile.portfolio?.length ? (
            profile.portfolio.map((item) => (
              <Card key={item.id} interactive>
                <h3 className="text-lg font-semibold text-fg">{item.title}</h3>
                {item.description && (
                  <p className="mt-2 text-sm text-fg-muted line-clamp-3">{item.description}</p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-fg-muted underline hover:text-fg"
                  >
                    View project
                  </a>
                )}
              </Card>
            ))
          ) : (
            <p className="col-span-full text-sm text-fg-subtle">No portfolio items yet.</p>
          )}
        </div>
      )}

      {activeTab === 'Startups' && (
        <div className="space-y-4">
          {profile.startups?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(profile.startups as { id?: string; name?: string }[]).map((s, i) => (
                <Card key={s.id ?? `startup-${i}`} interactive>
                  <h3 className="text-lg font-semibold text-fg">{s.name ?? 'Startup'}</h3>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-fg-subtle">No startups linked yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
