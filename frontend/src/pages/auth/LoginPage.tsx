import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useAuth, useAuthStore } from '@/store/authStore';
import { ApiError, parseApiError } from '@/lib/api/errors';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

const dashboardByRole: Record<string, string> = {
  STUDENT: '/student/dashboard',
  COMPANY_ADMIN: '/company/org',
  COMPANY_MEMBER: '/company/org',
  UNIVERSITY_ADMIN: '/admin',
};

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: string })?.from;

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const result = await login(values);
      if (result.nextStep && result.challengeToken) {
        const route = result.nextStep === 'MFA_SETUP' ? '/mfa/setup' : '/mfa/challenge';
        navigate(route, {
          replace: true,
          state: {
            challengeToken: result.challengeToken,
            from,
          },
        });
        return;
      }

      const user = useAuthStore.getState().user;
      const dest = from ?? dashboardByRole[user?.role ?? ''] ?? '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Welcome back</p>
      <h1 className="ef-heading-gradient mt-2 text-2xl font-semibold md:text-3xl">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-400">Continue your journey on Eagle-Foundry.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input label="Email" type="email" placeholder="you@example.com" {...register('email')} error={errors.email?.message} />
        <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />

        <Button type="submit" variant="primary" withBorderEffect={false} className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap gap-4 text-sm text-zinc-400">
        <Link to="/forgot-password" className="underline underline-offset-4 hover:text-white">Forgot password</Link>
        <Link to="/sign-up" className="underline underline-offset-4 hover:text-white">Create account</Link>
      </div>
    </div>
  );
}
