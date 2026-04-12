import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { AppLogo } from '@/components/brand/AppLogo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { navItems } from '@/features/landing/data/content';
import { SectionShell } from '@/features/landing/components/section-shell';

function HeroCube(): JSX.Element {
  const faces = [
    { key: 'front', transform: 'translateZ(var(--cube-half))' },
    { key: 'back', transform: 'rotateY(180deg) translateZ(var(--cube-half))' },
    { key: 'right', transform: 'rotateY(90deg) translateZ(var(--cube-half))' },
    { key: 'left', transform: 'rotateY(-90deg) translateZ(var(--cube-half))' },
    { key: 'top', transform: 'rotateX(90deg) translateZ(var(--cube-half))' },
    { key: 'bottom', transform: 'rotateX(-90deg) translateZ(var(--cube-half))' },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
      className="relative mx-auto h-[340px] w-[340px] md:h-[460px] md:w-[460px]"
    >
      <div className="hero-cube-reflection main" />
      <div className="hero-cube-reflection secondary" />
      <div className="hero-cube-reflection toward-copy" />
      <div className="hero-rim absolute inset-0 m-auto h-56 w-56 rounded-[2.2rem] blur-3xl md:h-72 md:w-72" />
      <div className="hero-cube-stage absolute inset-0 flex items-center justify-center">
        <div className="hero-cube">
          {faces.map((face) => (
            <div key={face.key} className="hero-cube-face" style={{ transform: face.transform }}>
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={`${face.key}-${index}`} className="hero-cube-tile" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function HeroSection(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden">
      <SectionShell className="pt-8 md:pt-10">
        <header className="mb-16 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <AppLogo className="h-8 w-8 rounded-full object-cover" />
            <span className="text-sm font-semibold tracking-wide text-fg">Eagle-Foundry</span>
          </Link>

          <nav className="hidden items-center gap-7 text-xs text-fg-muted md:flex">
            {navItems.map((item) => (
              <Link
                key={item}
                to={(() => {
                  const slug = item.toLowerCase().replace(/\s+/g, '-');
                  return slug === 'contact' ? '/contact' : `/${slug}`;
                })()}
                className="transition-colors hover:text-fg"
              >
                {item}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" className="hidden md:inline-flex" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button withBorderEffect={false} className="gap-2" onClick={() => navigate('/sign-up')}>
              Get Started
              <ArrowRight size={14} />
            </Button>
          </div>
        </header>

        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="space-y-7"
          >
            <h1 className="ef-heading-gradient max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              The venture network where students and companies build together.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-fg-muted md:text-base">
              Students launch ideas, recruit co-founders, and raise support. Companies outsource strategic work, discover
              founder-ready talent, and invest early in high-conviction projects.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button withBorderEffect={false} className="px-6 py-2.5" onClick={() => navigate('/sign-up')}>
                Create a Project
              </Button>
              <Link to="/sign-up" className="text-sm text-fg-muted transition-colors hover:text-fg">
                Explore the platform
              </Link>
            </div>
          </motion.div>

          <HeroCube />
        </div>
      </SectionShell>
    </div>
  );
}
