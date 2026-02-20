import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/section-heading';
import { SectionShell } from '@/features/landing/components/section-shell';

const reactSnippet = `export function OpportunityInvite() {
  return (
    <Panel>
      <Title>Application shortlisted</Title>
      <Text>NeuroByte invited you to a founder interview.</Text>
      <Button href="https://eaglefoundry.com/messages/thread-01">
        Open thread
      </Button>
    </Panel>
  );
}`;

export function ReactEmailSection(): JSX.Element {
  return (
    <SectionShell>
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading
          centered
          title="Build product experiences with Eagle-Foundry"
          description="As a company, you can upload projects that you are looking to outsource to out student builders and upload full-time opportunities for students to apply to as well."
        />
        <div className="mt-6">
          <Button className="px-6">View integration guide</Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7 }}
        className="ef-card mt-10 grid rounded-2xl border border-white/15 bg-zinc-950 md:grid-cols-[1.15fr_1fr]"
      >
        <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-400">Code editor</p>
          <pre className="overflow-x-auto text-xs leading-6 text-zinc-200 md:text-sm">
            <code>{reactSnippet}</code>
          </pre>
        </div>

        <div className="p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-400">Live preview</p>
          <div className="ef-card rounded-xl border border-cyan-300/25 bg-cyan-400/10 p-5">
            <div className="mb-3 h-10 w-10 rounded-full border border-cyan-200/60 bg-cyan-300/30" />
            <p className="text-xl font-semibold">Interview request received</p>
            <p className="mt-2 text-sm text-zinc-300">Helio Labs moved your application to INTERVIEW.</p>
            <Button withBorderEffect={false} className="mt-5 rounded-md bg-cyan-400 text-black hover:bg-cyan-300">
              Review update
            </Button>
          </div>
        </div>
      </motion.div>
    </SectionShell>
  );
}
