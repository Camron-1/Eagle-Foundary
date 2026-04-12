import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Building2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const roles = [
  {
    key: 'student',
    label: 'Student',
    icon: GraduationCap,
    desc: 'Launch startups, build your portfolio, and join teams.',
    to: '/sign-up/student',
  },
  {
    key: 'company',
    label: 'Company',
    icon: Building2,
    desc: 'Post opportunities, discover talent, and invest in projects.',
    to: '/sign-up/company',
  },
  {
    key: 'admin',
    label: 'University Admin',
    icon: Shield,
    desc: 'Manage the platform, review submissions, and moderate content.',
    to: '/login',
  },
] as const;

export default function SignupRolePage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Get Started</p>
        <h1 className="ef-heading-gradient mt-2 text-3xl font-semibold md:text-4xl">Choose your role</h1>
        <p className="mt-2 text-sm text-fg-muted">Start as a student builder, company partner, or university admin.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {roles.map((role, i) => (
          <motion.button
            key={role.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35 }}
            onClick={() => navigate(role.to)}
            className="ef-card group rounded-2xl border border-border-subtle bg-surface p-8 text-left transition-colors hover:border-border-strong"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-tint">
              <role.icon size={28} className="text-fg-muted" />
            </div>
            <h3 className="text-xl font-semibold text-fg">{role.label}</h3>
            <p className="mt-3 text-base text-fg-muted">{role.desc}</p>
            <span className="ef-button ef-button-ghost inline-flex items-center justify-center rounded-full px-5 py-3 text-base font-medium mt-6 w-full text-fg">
              Continue as {role.label}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-sm text-fg-muted">
        <Link to="/login" className="underline underline-offset-4 hover:text-fg">Already have an account</Link>
        <Link to="/" className="underline underline-offset-4 hover:text-fg">Back to landing</Link>
      </div>
    </div>
  );
}
