import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { AppLogo } from '@/components/brand/AppLogo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function PrivacyPage(): JSX.Element {
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
            <Shield size={24} className="text-fg-muted" />
          </div>
          <h1 className="ef-heading-gradient text-3xl font-semibold md:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-fg-muted">Last updated: February 2025</p>

          <div className="mt-10 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-fg">Information We Collect</h2>
              <p className="mt-2 text-sm text-fg-muted">
                We collect information you provide when registering, creating a profile, applying to opportunities, or communicating with other users. This includes your name, email, university affiliation, portfolio content, and application materials.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-fg">How We Use Your Information</h2>
              <p className="mt-2 text-sm text-fg-muted">
                We use your information to operate the platform, match students with opportunities, enable collaboration, and improve our services. We may share information with university partners and companies as necessary for the platform to function.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-fg">Data Security</h2>
              <p className="mt-2 text-sm text-fg-muted">
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-fg">Your Rights</h2>
              <p className="mt-2 text-sm text-fg-muted">
                You have the right to access, correct, or delete your personal data. Contact us if you wish to exercise these rights or have questions about our privacy practices.
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 border-t border-border-subtle pt-8">
            <Button withBorderEffect={false} onClick={() => navigate('/contact')}>
              Contact Us
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
