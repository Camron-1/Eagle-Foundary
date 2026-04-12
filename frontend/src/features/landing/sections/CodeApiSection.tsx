import { motion } from 'framer-motion';
import { TerminalSquare } from 'lucide-react';
import { SectionHeading } from '@/components/ui/section-heading';
import { SectionShell } from '@/features/landing/components/section-shell';

const codeSnippet = `const startup = await eagle.startups.create({
  name: 'CampusCart',
  stage: 'prototype',
  tags: ['logistics', 'marketplace']
});

await eagle.startups.submit(startup.id);

await eagle.joinRequests.create(startup.id, {
  message: 'Looking for a growth-focused co-founder.'
});`;

export function CodeApiSection(): JSX.Element {
  return (
    <SectionShell>
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border-strong bg-surface-faint">
          <TerminalSquare size={20} />
        </div>
        <SectionHeading
          centered
          title="Launch products faster"
          description="From startup creation to join requests and opportunity applications, Eagle-Foundry makes collaboration automation straightforward."
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7 }}
        className="ef-card mt-10 rounded-2xl border border-border-strong bg-panel"
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-5 py-3 text-xs text-fg-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3">eagle-foundry.ts</span>
        </div>
        <pre className="overflow-x-auto p-5 text-xs leading-6 text-fg md:text-sm">
          <code>{codeSnippet}</code>
        </pre>
      </motion.div>
    </SectionShell>
  );
}
