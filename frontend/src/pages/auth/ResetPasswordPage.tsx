import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ApiError, parseApiError } from '@/lib/api/errors';

const schema = z.object({
  email: z.string().email('Invalid email'),
  code: z.string().length(6, 'Must be 6 digits').regex(/^\d+$/, 'Numbers only'),
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .max(128)
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillEmail = (location.state as { email?: string })?.email ?? '';
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefillEmail },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await api.post(endpoints.auth.resetPassword, values);
      toast.success('Password updated. You can now sign in.');
      navigate('/login');
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
      <h1 className="ef-heading-gradient mt-2 text-2xl font-semibold md:text-3xl">Reset password</h1>
      <p className="mt-2 text-sm text-fg-muted">Use the code from your email to set a new password.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        <Input label="Reset code" placeholder="000000" maxLength={6} {...register('code')} error={errors.code?.message} />
        <Input label="New password" type="password" {...register('newPassword')} error={errors.newPassword?.message} hint="Min 8 chars, uppercase, lowercase, number" />
        <Button type="submit" variant="primary" withBorderEffect={false} className="w-full" disabled={loading}>
          {loading ? 'Updating...' : 'Update password'}
        </Button>
      </form>

      <div className="mt-5 text-sm text-fg-muted">
        <Link to="/login" className="underline underline-offset-4 hover:text-fg">Back to login</Link>
      </div>
    </div>
  );
}
