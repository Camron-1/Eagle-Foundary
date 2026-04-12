import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function UnauthorizedPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-page px-4 text-fg">
      <div className="pointer-events-none absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div
        className="pointer-events-none absolute inset-0 landing-grid"
        style={{ opacity: 'var(--landing-grid-opacity)' }}
      />
      <div className="pointer-events-none absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-surface-tint-strong blur-[180px]" />

      <div className="relative z-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5">
          <ShieldX size={32} className="text-red-400" />
        </div>
        <h1 className="ef-heading-gradient text-2xl font-semibold md:text-3xl">Unauthorized</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-fg-muted">
          You do not have permission to access this page. If you believe this is an error, please contact an administrator.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="primary" withBorderEffect={false} onClick={() => navigate('/login')}>
            Go to login
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Back to landing
          </Button>
        </div>
      </div>
    </div>
  );
}
