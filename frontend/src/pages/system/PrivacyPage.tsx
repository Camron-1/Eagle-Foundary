import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-0 landing-grid opacity-[0.06]" />
      <div className="pointer-events-none absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/10 blur-[180px]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <header className="mb-12 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src="/assets/brand/logo-dark-512.png" alt="Eagle-Foundry" className="h-8 w-8 rounded-full" />
            <span className="text-sm font-semibold tracking-wide text-zinc-100">Eagle-Foundry</span>
          </Link>
        </header>

        <div className="ef-card rounded-2xl border border-white/10 bg-zinc-950/80 p-8 backdrop-blur-lg md:p-12">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
            <Shield size={24} className="text-zinc-300" />
          </div>
          <h1 className="ef-heading-gradient text-3xl font-semibold md:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-zinc-400">Last updated: February 2025</p>

          <div className="mt-10 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-white">Information We Collect</h2>
              <p className="mt-2 text-sm text-zinc-400">
                We collect information you provide when registering, creating a profile, applying to opportunities, or communicating with other users. This includes your name, email, university affiliation, portfolio content, and application materials.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white">How We Use Your Information</h2>
              <p className="mt-2 text-sm text-zinc-400">
                We use your information to operate the platform, match students with opportunities, enable collaboration, and improve our services. We may share information with university partners and companies as necessary for the platform to function.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white">Data Security</h2>
              <p className="mt-2 text-sm text-zinc-400">
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white">Your Rights</h2>
              <p className="mt-2 text-sm text-zinc-400">
                You have the right to access, correct, or delete your personal data. Contact us if you wish to exercise these rights or have questions about our privacy practices.
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 border-t border-white/10 pt-8">
            <Button withBorderEffect={false} onClick={() => navigate('/contact')}>
              Contact Us
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
