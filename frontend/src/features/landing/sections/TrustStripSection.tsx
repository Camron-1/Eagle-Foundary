import { SectionShell } from '@/features/landing/components/section-shell';
import { trustNames } from '@/features/landing/data/content';

export function TrustStripSection(): JSX.Element {
  return (
    <SectionShell className="pt-6 md:pt-8">
      <div className="ef-card rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-zinc-400">
          Trusted by universities, student founders, and company innovation teams
        </p>
        <div className="mt-7 grid grid-cols-2 gap-5 text-center text-xs tracking-[0.2em] text-zinc-300 sm:grid-cols-3 md:grid-cols-5">
          {trustNames.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
