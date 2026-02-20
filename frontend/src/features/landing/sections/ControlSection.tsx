import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/ui/section-heading';
import { SectionShell } from '@/features/landing/components/section-shell';

const bars = [28, 36, 41, 45, 53, 38, 47, 61, 52, 69, 58, 74, 62, 78];

export function ControlSection(): JSX.Element {
  return (
    <SectionShell>
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading
          centered
          title="Operate from one decision console"
          description="Monitor submissions, applications, interviews, and messaging activity with a unified real-time operations view."
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7 }}
        className="ef-card mt-10 rounded-2xl border border-white/15 bg-zinc-950"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-xs text-zinc-400">
          <span>Platform analytics · Monthly venture activity</span>
          <span>Updated 2m ago</span>
        </div>
        <div className="h-[340px] p-6">
          <div className="ef-card ef-card-soft flex h-full items-end justify-between gap-2 rounded-xl border border-white/10 bg-black/45 p-4">
            {bars.map((height, index) => (
              <div key={index} className="flex h-full items-end">
                <div
                  className="w-3 rounded-t-md bg-gradient-to-b from-cyan-300 via-cyan-400 to-blue-500 md:w-5"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </SectionShell>
  );
}
