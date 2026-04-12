import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, DollarSign, Target, CheckCircle2, FileText, Users, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicNavbar from '@/components/public/PublicNavbar';
import SectionShell from '@/components/public/SectionShell';
import useCardSpotlight from '@/components/public/useCardSpotlight';

const fundingTypes = [
  {
    icon: DollarSign,
    name: 'Company Micro-Grants',
    range: '€1K – €10K',
    description: 'Partner companies sponsor promising student projects directly. No equity taken. Great for early validation and proof-of-concept funding.',
    badge: 'Non-dilutive',
    badgeColor: 'border-green-500/30 bg-green-500/10 text-green-300',
  },
  {
    icon: Target,
    name: 'Accelerator Access',
    range: '€15K – €50K',
    description: 'Eagle-Foundry alumni gain priority access to affiliated accelerator programs with pre-negotiated terms and mentorship packages.',
    badge: 'Structured',
    badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  },
  {
    icon: TrendingUp,
    name: 'Investor Deal Flow',
    range: '€50K – €500K',
    description: 'High-conviction startups get featured in our quarterly investor digest, read by 200+ angels and early-stage VCs across Europe.',
    badge: 'Equity',
    badgeColor: 'border-border-subtle bg-surface-tint text-fg-muted',
  },
];

const eligibility = [
  'Your startup must be registered and approved on Eagle-Foundry',
  'At least one active student founder on the team',
  'Startup in idea, MVP, or early traction stage',
  'University affiliation verified by admin',
  'Pitch deck or project summary uploaded to your profile',
];

const process = [
  { icon: FileText, step: '01', title: 'Submit your startup', description: 'Create and get your project approved on Eagle-Foundry. This is your base profile for all funding conversations.' },
  { icon: Users, step: '02', title: 'Get matched', description: 'Our team reviews your profile and matches you with relevant funding opportunities based on stage and domain.' },
  { icon: CheckCircle2, step: '03', title: 'Pitch & close', description: 'Meet your matches directly through the platform. All communication, documents, and decisions happen in one place.' },
];

export default function FundingPage(): JSX.Element {
  const { rootRef, handlePointerMove } = useCardSpotlight();
  const navigate = useNavigate();

  return (
    <main ref={rootRef} onPointerMove={handlePointerMove} className="relative overflow-hidden bg-page text-fg">
      <div
        className="pointer-events-none absolute inset-0 landing-grid"
        style={{ opacity: 'var(--landing-grid-opacity)' }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-[-30rem] mx-auto h-[52rem] w-[52rem] rounded-full bg-surface-tint-strong blur-[220px]" />
      <div className="pointer-events-none absolute right-[-20rem] top-[40rem] h-[35rem] w-[35rem] rounded-full bg-blue-500/15 blur-[180px]" />

      <div className="relative z-10">
        <PublicNavbar />

        {/* Hero */}
        <SectionShell className="pb-8 pt-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-2xl"
          >
            <span className="mb-6 inline-block rounded-full border border-border-subtle bg-surface-tint px-4 py-1.5 text-xs text-fg-muted">
              Funding
            </span>
            <h1 className="ef-heading-gradient mb-5 text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
              Capital for student ventures.
            </h1>
            <p className="mb-8 text-sm leading-relaxed text-fg-muted md:text-base">
              Eagle-Foundry connects student startups to grants, accelerators, and investors —
              structured around the academic journey, not despite it.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button withBorderEffect={false} className="gap-2 px-6" onClick={() => navigate('/sign-up')}>
                Apply for funding <ArrowRight size={14} />
              </Button>
              <Button variant="ghost" onClick={() => navigate('/contact')}>Talk to our team</Button>
            </div>
          </motion.div>
        </SectionShell>

        {/* Stats bar */}
        <SectionShell className="py-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-card grid grid-cols-2 divide-y divide-border-subtle rounded-2xl md:grid-cols-4 md:divide-x md:divide-y-0"
          >
            {[
              { value: '€4.2M', label: 'Total raised' },
              { value: '380+', label: 'Funded startups' },
              { value: '200+', label: 'Investor network' },
              { value: '3 mo', label: 'Avg. time to first check' },
            ].map((stat) => (
              <div key={stat.label} className="px-8 py-7 text-center">
                <div className="mb-1 text-2xl font-bold text-fg">{stat.value}</div>
                <div className="text-xs text-fg-muted">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </SectionShell>

        <div className="mx-auto max-w-6xl px-6 md:px-10"><hr className="muted-divider" /></div>

        {/* Funding types */}
        <SectionShell>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-12"
          >
            <h2 className="ef-heading-gradient mb-4 text-3xl font-semibold tracking-tight">Funding pathways</h2>
            <p className="max-w-lg text-sm text-fg-muted">Three routes to capital, each designed for a different stage and risk tolerance.</p>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-3">
            {fundingTypes.map((type, i) => (
              <motion.div
                key={type.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="ef-card glass-card flex flex-col rounded-2xl p-7"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-subtle bg-surface-tint">
                    <type.icon size={20} className="text-fg-muted" />
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${type.badgeColor}`}>
                    {type.badge}
                  </span>
                </div>
                <h3 className="mb-1 text-base font-semibold text-fg">{type.name}</h3>
                <div className="mb-3 text-xl font-bold text-fg">{type.range}</div>
                <p className="text-xs leading-relaxed text-fg-muted">{type.description}</p>
              </motion.div>
            ))}
          </div>
        </SectionShell>

        <div className="mx-auto max-w-6xl px-6 md:px-10"><hr className="muted-divider" /></div>

        {/* Process */}
        <SectionShell>
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="ef-heading-gradient mb-4 text-3xl font-semibold tracking-tight">How to get funded</h2>
              <p className="mb-8 text-sm text-fg-muted">Three steps from profile to first check.</p>
              <div className="space-y-6">
                {process.map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex gap-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-tint">
                      <item.icon size={16} className="text-fg-muted" />
                    </div>
                    <div>
                      <div className="mb-0.5 text-[10px] font-medium text-fg-subtle">{item.step}</div>
                      <div className="mb-1 text-sm font-semibold text-fg">{item.title}</div>
                      <p className="text-xs leading-relaxed text-fg-muted">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Eligibility */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="ef-card glass-card rounded-2xl p-8"
            >
              <h3 className="mb-6 text-base font-semibold text-fg">Eligibility criteria</h3>
              <ul className="space-y-4">
                {eligibility.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-xs leading-relaxed text-fg-muted">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-fg-subtle" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button withBorderEffect={false} className="w-full justify-center gap-2" onClick={() => navigate('/sign-up')}>
                  Start your application <ArrowRight size={13} />
                </Button>
              </div>
            </motion.div>
          </div>
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
            <h2 className="ef-heading-gradient mb-4 text-3xl font-semibold">Ready to raise?</h2>
            <p className="mb-8 text-sm text-fg-muted">Create your profile and get matched with the right funding pathway.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button withBorderEffect={false} className="gap-2 px-6" onClick={() => navigate('/sign-up')}>
                Apply now <ArrowRight size={14} />
              </Button>
              <Button variant="ghost" onClick={() => navigate('/contact')}>Speak to the team</Button>
            </div>
          </motion.div>
        </SectionShell>
      </div>
    </main>
  );
}
