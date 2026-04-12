import { Link, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { AppLogo } from '@/components/brand/AppLogo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function DocsPage(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-page text-fg">
      <div
        className="pointer-events-none absolute inset-0 landing-grid"
        style={{ opacity: 'var(--landing-grid-opacity)' }}
      />
      <div className="pointer-events-none absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-surface-tint-strong blur-[180px]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <header className="mb-12 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <AppLogo className="h-8 w-8 rounded-full" />
            <span className="text-sm font-semibold tracking-wide text-fg">Eagle-Foundry</span>
          </Link>
          <ThemeToggle />
        </header>

        <div className="ef-card rounded-2xl border border-border-subtle bg-panel p-8 backdrop-blur-lg md:p-12">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-tint">
            <FileText size={24} className="text-fg-muted" />
          </div>
          <h1 className="ef-heading-gradient text-3xl font-semibold md:text-4xl">Documentation</h1>
          <p className="mt-3 text-fg-muted">
            Welcome to Eagle-Foundry documentation. Here you&apos;ll find guides and references for students, companies, and university admins.
          </p>

          <div className="mt-10 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-fg">For Students</h2>
              <p className="mt-2 text-sm text-fg-muted">
                Learn how to create and manage your startup profile, apply to opportunities, and collaborate with companies. Explore the student dashboard and portfolio features.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-fg">For Companies</h2>
              <p className="mt-2 text-sm text-fg-muted">
                Post opportunities, review applications, and manage your organization. Find out how to discover and work with student founders on the platform.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-fg">For University Admins</h2>
              <p className="mt-2 text-sm text-fg-muted">
                Moderate startups, manage users, and maintain platform quality. Access admin workflows for reviews, reports, and audit logs.
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 border-t border-border-subtle pt-8">
            <Button withBorderEffect={false} onClick={() => navigate('/sign-up')}>
              Get Started
            </Button>
            <Button variant="ghost" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
