import { Link, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DocsPage(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-0 landing-grid opacity-[0.06]" />
      <div className="pointer-events-none absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/10 blur-[180px]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <header className="mb-12 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src="/assets/brand/logo-dark-512.png" alt="Eagle-Foundry" className="h-8 w-8 rounded-full" />
            <span className="text-sm font-semibold tracking-wide text-zinc-100">Eagle-Foundry</span>
          </Link>
        </header>

        <div className="ef-card rounded-2xl border border-white/10 bg-zinc-950/80 p-8 backdrop-blur-lg md:p-12">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
            <FileText size={24} className="text-zinc-300" />
          </div>
          <h1 className="ef-heading-gradient text-3xl font-semibold md:text-4xl">Documentation</h1>
          <p className="mt-3 text-zinc-400">
            Welcome to Eagle-Foundry documentation. Here you&apos;ll find guides and references for students, companies, and university admins.
          </p>

          <div className="mt-10 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-white">For Students</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Learn how to create and manage your startup profile, apply to opportunities, and collaborate with companies. Explore the student dashboard and portfolio features.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white">For Companies</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Post opportunities, review applications, and manage your organization. Find out how to discover and work with student founders on the platform.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white">For University Admins</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Moderate startups, manage users, and maintain platform quality. Access admin workflows for reviews, reports, and audit logs.
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 border-t border-white/10 pt-8">
            <Button withBorderEffect={false} onClick={() => navigate('/sign-up')}>
              Get Started
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
