import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, UserPlus, Lightbulb, Users, TrendingUp, Building2, Search, Handshake, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicNavbar from '@/components/public/PublicNavbar';
import SectionShell from '@/components/public/SectionShell';
import useCardSpotlight from '@/components/public/useCardSpotlight';

// ─── Step card ────────────────────────────────────────────────────────────────
function StepCard({
  number, icon: Icon, title, description, delay,
}: {
  number: string; icon: React.ElementType; title: string; description: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className="ef-card glass-card relative rounded-2xl p-7"
    >
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-subtle bg-surface-tint">
          <Icon size={20} className="text-fg-muted" />
        </div>
        <span className="select-none text-4xl font-bold text-fg opacity-[0.06]">{number}</span>
      </div>
      <h3 className="mb-2 text-base font-semibold text-fg">{title}</h3>
      <p className="text-sm leading-relaxed text-fg-muted">{description}</p>
    </motion.div>
  );
}

// ─── Track section ────────────────────────────────────────────────────────────
function Track({
  badge, badgeColor, title, description, steps, delay,
}: {
  badge: string; badgeColor: string; title: string; description: string;
  steps: { icon: React.ElementType; title: string; description: string }[]; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <div className="mb-8">
        <span className={`mb-4 inline-block rounded-full border px-3 py-1 text-xs font-medium ${badgeColor}`}>
          {badge}
        </span>
        <h2 className="ef-heading-gradient mb-3 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="max-w-lg text-sm leading-relaxed text-fg-muted">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <StepCard
            key={step.title}
            number={String(i + 1).padStart(2, '0')}
            icon={step.icon}
            title={step.title}
            description={step.description}
            delay={delay + i * 0.08}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HowItWorksPage(): JSX.Element {
  const { rootRef, handlePointerMove } = useCardSpotlight();
  const navigate = useNavigate();

  const studentSteps = [
    { icon: UserPlus, title: 'Create your profile', description: 'Sign up as a student and build your profile showcasing your skills, university, and interests.' },
    { icon: Lightbulb, title: 'Launch a project', description: 'Submit your startup idea or research project for review. Our admin team fast-tracks promising ones.' },
    { icon: Users, title: 'Build your team', description: 'Recruit co-founders and collaborators from the Eagle-Foundry student network.' },
    { icon: TrendingUp, title: 'Raise & grow', description: 'Pitch to companies and investors directly on the platform. Get funded and scale your idea.' },
  ];

  const companySteps = [
    { icon: Building2, title: 'Register your org', description: 'Create your company profile. Admins verify your organisation before you go live.' },
    { icon: Search, title: 'Discover talent', description: 'Browse vetted student startups and founder profiles across disciplines and universities.' },
    { icon: Handshake, title: 'Post opportunities', description: 'Publish internships, outsource projects, or strategic roles and receive curated applications.' },
    { icon: BarChart3, title: 'Invest early', description: 'Back high-conviction student ventures before they hit the open market.' },
  ];

  return (
    <main ref={rootRef} onPointerMove={handlePointerMove} className="relative overflow-hidden bg-page text-fg">
      {/* Background effects */}
      <div
        className="pointer-events-none absolute inset-0 landing-grid"
        style={{ opacity: 'var(--landing-grid-opacity)' }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-[-30rem] mx-auto h-[52rem] w-[52rem] rounded-full bg-surface-tint-strong blur-[220px]" />
      <div className="pointer-events-none absolute right-[-24rem] top-[20rem] h-[35rem] w-[35rem] rounded-full bg-blue-500/20 blur-[180px]" />

      <div className="relative z-10">
        <PublicNavbar />

        {/* Hero */}
        <SectionShell className="pt-16 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-2xl"
          >
            <span className="mb-6 inline-block rounded-full border border-border-subtle bg-surface-tint px-4 py-1.5 text-xs text-fg-muted">
              Platform Overview
            </span>
            <h1 className="ef-heading-gradient mb-5 text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
              How Eagle-Foundry works
            </h1>
            <p className="text-sm leading-relaxed text-fg-muted md:text-base">
              Two paths. One platform. Students build ventures and get funded.
              Companies discover talent and invest early. Here's how it all connects.
            </p>
          </motion.div>
        </SectionShell>

        {/* Divider */}
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <hr className="muted-divider" />
        </div>

        {/* Student track */}
        <SectionShell>
          <Track
            badge="For Students"
            badgeColor="border-blue-500/30 bg-blue-500/10 text-blue-300"
            title="From idea to funded venture"
            description="Eagle-Foundry gives students the infrastructure to launch, recruit, and raise — all within a trusted academic network."
            steps={studentSteps}
            delay={0.1}
          />
        </SectionShell>

        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <hr className="muted-divider" />
        </div>

        {/* Company track */}
        <SectionShell>
          <Track
            badge="For Companies"
            badgeColor="border-border-subtle bg-surface-tint text-fg-muted"
            title="Discover, hire, and invest early"
            description="Access a curated pipeline of ambitious student founders and emerging startups before they raise anywhere else."
            steps={companySteps}
            delay={0.15}
          />
        </SectionShell>

        {/* CTA */}
        <SectionShell className="pt-4 pb-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="glass-card mx-auto max-w-xl rounded-3xl p-10"
          >
            <h2 className="ef-heading-gradient mb-4 text-3xl font-semibold">Ready to get started?</h2>
            <p className="mb-8 text-sm text-fg-muted">Join the network where ambition meets opportunity.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button withBorderEffect={false} className="gap-2 px-6" onClick={() => navigate('/sign-up')}>
                Create your account <ArrowRight size={14} />
              </Button>
              <Button variant="ghost" onClick={() => navigate('/contact')}>Talk to us</Button>
            </div>
          </motion.div>
        </SectionShell>
      </div>
    </main>
  );
}
