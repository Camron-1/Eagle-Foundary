import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ApiError, parseApiError } from '@/lib/api/errors';

const schema = z.object({ email: z.string().email('Invalid email') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await api.post(endpoints.auth.forgotPassword, values);
      toast.success('Reset code sent to your email.');
      navigate('/reset-password', { state: { email: values.email } });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Account recovery</p>
      <h1 className="ef-heading-gradient mt-2 text-2xl font-semibold md:text-3xl">Forgot password</h1>
      <p className="mt-2 text-sm text-fg-muted">Enter your email to receive a password reset code.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input label="Email" type="email" placeholder="you@example.com" {...register('email')} error={errors.email?.message} />
        <Button type="submit" variant="primary" withBorderEffect={false} className="w-full" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset code'}
        </Button>
      </form>

      <div className="mt-5 text-sm text-fg-muted">
        <Link to="/login" className="underline underline-offset-4 hover:text-fg">Back to login</Link>
      </div>
    </div>
  );
}
