import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLogo } from '@/components/brand/AppLogo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navLinks = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'For Students', href: '/for-students' },
  { label: 'For Companies', href: '/for-companies' },
  { label: 'Funding', href: '/funding' },
  { label: 'Contact', href: '/contact' },
];

export default function PublicNavbar(): JSX.Element {
  const navigate = useNavigate();

  return (
    <header className="flex flex-col gap-4 px-6 pt-8 md:flex-row md:items-center md:justify-between md:px-10">
      <Link to="/" className="inline-flex items-center gap-3">
        <AppLogo className="h-8 w-8 rounded-full object-cover" />
        <span className="text-sm font-semibold tracking-wide text-fg">Eagle-Foundry</span>
      </Link>
      <nav className="flex w-full flex-wrap items-center gap-4 text-xs text-fg-muted md:w-auto md:gap-7">
        {navLinks.map((item) => (
          <Link key={item.href} to={item.href} className="transition-colors hover:text-fg">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3 self-start md:self-auto">
        <ThemeToggle />
        <Button variant="ghost" onClick={() => navigate('/login')}>Sign In</Button>
        <Button withBorderEffect={false} className="gap-2" onClick={() => navigate('/sign-up')}>
          Get Started <ArrowRight size={14} />
        </Button>
      </div>
    </header>
  );
}
