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

const schema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  email: z
    .string()
    .email('Invalid email')
    .refine((e) => e.endsWith('@ashland.edu'), 'Must be an @ashland.edu email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .max(128)
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

type FormValues = z.infer<typeof schema>;

export default function StudentSignupPage(): JSX.Element {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await api.post(endpoints.auth.studentSignup, values);
      toast.success('Account created! Check your email for a verification code.');
      navigate('/verify-otp', { state: { email: values.email } });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      if (apiErr.isValidation && apiErr.fieldErrors.email) {
        setError('email', { message: apiErr.fieldErrors.email[0] });
      } else {
        toast.error(apiErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Student</p>
      <h1 className="ef-heading-gradient mt-2 text-2xl font-semibold md:text-3xl">Create your account</h1>
      <p className="mt-2 text-sm text-fg-muted">Launch startups and join teams on Eagle-Foundry.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" {...register('firstName')} error={errors.firstName?.message} />
          <Input label="Last name" {...register('lastName')} error={errors.lastName?.message} />
        </div>
        <Input label="University email" type="email" placeholder="you@ashland.edu" {...register('email')} error={errors.email?.message} hint="Must be an @ashland.edu address" />
        <Input label="Password" type="password" {...register('password')} error={errors.password?.message} hint="Min 8 chars, uppercase, lowercase, number" />

        <Button type="submit" variant="primary" withBorderEffect={false} className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap gap-4 text-sm text-fg-muted">
        <Link to="/login" className="underline underline-offset-4 hover:text-fg">Already have an account?</Link>
        <Link to="/sign-up" className="underline underline-offset-4 hover:text-fg">Choose a different role</Link>
      </div>
    </div>
  );
}
