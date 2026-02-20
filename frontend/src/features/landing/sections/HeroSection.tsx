import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <div className="hero-rim absolute inset-0 m-auto h-56 w-56 rounded-[2.2rem] bg-white/5 blur-3xl md:h-72 md:w-72" />
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
  return (
    <div className="relative overflow-hidden">
      <SectionShell className="pt-8 md:pt-10">
        <header className="mb-16 flex items-center justify-between gap-4">
          <a href="/" className="inline-flex items-center gap-3">
            <picture>
              <source media="(prefers-color-scheme: light)" srcSet="/assets/brand/logo-light-512.png" />
              <img
                src="/assets/brand/logo-dark-512.png"
                alt="Eagle-Foundry"
                className="h-8 w-8 rounded-full object-cover"
              />
            </picture>
            <span className="text-sm font-semibold tracking-wide text-zinc-100">Eagle-Foundry</span>
          </a>

          <nav className="hidden items-center gap-7 text-xs text-zinc-300 md:flex">
            {navItems.map((item) => (
              <a key={item} href="#" className="transition-colors hover:text-white">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden md:inline-flex">
              Sign in
            </Button>
            <Button withBorderEffect={false} className="gap-2">
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
            <p className="max-w-lg text-sm leading-relaxed text-zinc-300 md:text-base">
              Students launch ideas, recruit co-founders, and raise support. Companies outsource strategic work, discover
              founder-ready talent, and invest early in high-conviction projects.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button withBorderEffect={false} className="px-6 py-2.5">
                Create a Project
              </Button>
              <a href="#" className="text-sm text-zinc-300 transition-colors hover:text-white">
                Explore the platform
              </a>
            </div>
          </motion.div>

          <HeroCube />
        </div>
      </SectionShell>
    </div>
  );
}
