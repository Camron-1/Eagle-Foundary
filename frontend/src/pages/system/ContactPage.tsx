import { Link, useNavigate } from 'react-router-dom';
import { Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ContactPage(): JSX.Element {
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
            <MessageCircle size={24} className="text-zinc-300" />
          </div>
          <h1 className="ef-heading-gradient text-3xl font-semibold md:text-4xl">Contact Us</h1>
          <p className="mt-3 text-zinc-400">
            Have questions or feedback? We&apos;d love to hear from you. Reach out through any of the channels below.
          </p>

          <div className="mt-10 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-white">General Inquiries</h2>
              <a
                href="mailto:contact@eagle-foundry.example"
                className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                <Mail size={16} />
                contact@eagle-foundry.example
              </a>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white">Sales & Partnerships</h2>
              <a
                href="mailto:sales@eagle-foundry.example"
                className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                <Mail size={16} />
                sales@eagle-foundry.example
              </a>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white">Support</h2>
              <p className="mt-2 text-sm text-zinc-400">
                For technical support or account issues, please email{' '}
                <a href="mailto:support@eagle-foundry.example" className="text-zinc-400 transition-colors hover:text-white underline underline-offset-2">support@eagle-foundry.example</a>.
                We typically respond within 24–48 hours.
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 border-t border-white/10 pt-8">
            <Button withBorderEffect={false} onClick={() => window.location.href = 'mailto:contact@eagle-foundry.example'}>
              Email Us
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
