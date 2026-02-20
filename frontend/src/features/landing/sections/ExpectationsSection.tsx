import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/ui/section-heading';
import { SectionShell } from '@/features/landing/components/section-shell';
import { testimonials } from '@/features/landing/data/content';

export function ExpectationsSection(): JSX.Element {
  return (
    <SectionShell>
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading
          centered
          title="Real outcomes, not vanity metrics"
          description="Student founders, company leaders, and university programs are already creating measurable collaboration results."
        />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <motion.article
            key={testimonial.by}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, delay: 0.06 * index }}
            className="ef-card rounded-xl border border-white/15 bg-white/[0.02] p-5"
          >
            <p className="text-sm leading-relaxed text-zinc-200">{testimonial.quote}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.12em] text-zinc-400">{testimonial.by}</p>
          </motion.article>
        ))}
      </div>
    </SectionShell>
  );
}
