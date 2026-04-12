import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/ui/section-heading';
import { deliverabilityItems } from '@/features/landing/data/content';
import { SectionShell } from '@/features/landing/components/section-shell';

export function DeliverabilitySection(): JSX.Element {
  return (
    <SectionShell>
      <SectionHeading
        title="Find aligned collaborators faster"
        description="Everything is optimized for high-signal matches between student founders, hiring teams, and early-stage capital."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deliverabilityItems.map((item, index) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.55, delay: index * 0.04 }}
            className="ef-card rounded-xl border border-border-strong bg-surface-faint p-5"
          >
            <h3 className="text-base font-semibold text-fg">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{item.body}</p>
          </motion.article>
        ))}
      </div>
    </SectionShell>
  );
}
