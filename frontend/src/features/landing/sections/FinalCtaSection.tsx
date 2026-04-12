import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { AppLogo } from '@/components/brand/AppLogo';
import { Button } from '@/components/ui/button';
import { SectionShell } from '@/features/landing/components/section-shell';

export function FinalCtaSection(): JSX.Element {
  const navigate = useNavigate();
  return (
    <SectionShell className="pb-12">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="ef-heading-gradient text-4xl font-semibold leading-tight md:text-5xl">
          Build the next category-defining venture together.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-fg-muted md:text-base">
          Join the network where student ambition meets company momentum and investment-ready execution.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button withBorderEffect={false} className="gap-2 px-6" onClick={() => navigate('/sign-up')}>
            Join Eagle-Foundry
            <ArrowUpRight size={14} />
          </Button>
          <Button variant="ghost" onClick={() => window.location.href = 'mailto:contact@eagle-foundry.example'}>
            Contact Sales
          </Button>
        </div>
      </div>

      <div className="ef-card mt-16 rounded-2xl border border-border-subtle p-5">
        <p className="text-center text-[clamp(3rem,14vw,10rem)] font-bold uppercase leading-[0.86] tracking-tight text-transparent [text-stroke:1px_var(--stroke-decorative)] [-webkit-text-stroke:1px_var(--stroke-decorative)]">
          <span className="block">Eagle</span>
          <span className="block">Foundry</span>
        </p>
      </div>

      <footer className="mt-10 flex flex-col gap-6 border-t border-border-subtle pt-7 text-sm text-fg-muted md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <AppLogo className="h-7 w-7 rounded-full" />
          <span className="font-semibold tracking-tight text-fg">Eagle-Foundry</span>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <Link to="/docs" className="transition-colors hover:text-fg">Docs</Link>
          <Link to="/privacy" className="transition-colors hover:text-fg">Privacy</Link>
          <Link to="/terms" className="transition-colors hover:text-fg">Terms</Link>
          <Link to="/contact" className="transition-colors hover:text-fg">Contact</Link>
        </div>
      </footer>
    </SectionShell>
  );
}
