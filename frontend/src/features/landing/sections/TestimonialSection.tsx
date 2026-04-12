import { motion } from 'framer-motion';
import { SectionShell } from '@/features/landing/components/section-shell';

export function TestimonialSection(): JSX.Element {
  return (
    <SectionShell className="py-14">
      <motion.blockquote
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7 }}
        className="ef-card mx-auto max-w-3xl rounded-2xl border border-border-strong bg-gradient-to-b from-surface-tint to-surface-faint px-7 py-10 text-center"
      >
        <p className="text-lg leading-relaxed text-fg md:text-2xl">
          "Eagle-Foundry gave our student teams immediate exposure to real operators. Two projects moved from classroom concept to funded pilot in one semester."
        </p>
        <footer className="mt-5 text-sm text-fg-muted">Priya R. · Director of Entrepreneurship Programs</footer>
      </motion.blockquote>
    </SectionShell>
  );
}
