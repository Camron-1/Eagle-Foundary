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
        className="ef-card mx-auto max-w-3xl rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.015] px-7 py-10 text-center"
      >
        <p className="text-lg leading-relaxed text-zinc-100 md:text-2xl">
          "Eagle-Foundry gave our student teams immediate exposure to real operators. Two projects moved from classroom concept to funded pilot in one semester."
        </p>
        <footer className="mt-5 text-sm text-zinc-400">Priya R. · Director of Entrepreneurship Programs</footer>
      </motion.blockquote>
    </SectionShell>
  );
}
