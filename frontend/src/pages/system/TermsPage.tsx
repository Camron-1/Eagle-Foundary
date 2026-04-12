import { Link, useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { AppLogo } from '@/components/brand/AppLogo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function TermsPage(): JSX.Element {
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
            <Scale size={24} className="text-fg-muted" />
          </div>
          <h1 className="ef-heading-gradient text-3xl font-semibold md:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-fg-muted">Last updated: February 2025</p>

          <div className="mt-10 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-fg">Acceptance of Terms</h2>
              <p className="mt-2 text-sm text-fg-muted">
                By accessing or using Eagle-Foundry, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-fg">Use of the Platform</h2>
              <p className="mt-2 text-sm text-fg-muted">
                You agree to use Eagle-Foundry only for lawful purposes. You may not misuse the platform, harass other users, post false information, or violate any applicable laws or regulations.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-fg">User Accounts</h2>
              <p className="mt-2 text-sm text-fg-muted">
                You are responsible for maintaining the confidentiality of your account and password. You are responsible for all activities that occur under your account.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-fg">Intellectual Property</h2>
              <p className="mt-2 text-sm text-fg-muted">
                Content you create on the platform remains yours. By posting content, you grant Eagle-Foundry a license to display and share it as necessary to operate the platform.
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 border-t border-border-subtle pt-8">
            <Button withBorderEffect={false} onClick={() => navigate('/privacy')}>
              Privacy Policy
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
