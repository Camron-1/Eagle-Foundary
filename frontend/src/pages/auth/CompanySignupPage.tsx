import { useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api, unwrapApiData } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CompanyDocUploadResponse } from '@/lib/api/types';
import { ApiError, parseApiError } from '@/lib/api/errors';

const BLOCKED_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me'];
const MAX_DOCS = 5;
const MAX_DOC_SIZE = 10 * 1024 * 1024;

const schema = z.object({
  companyName: z.string().min(1, 'Required').max(200),
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  email: z
    .string()
    .email('Invalid email')
    .refine(
      (e) => !BLOCKED_DOMAINS.some((d) => e.toLowerCase().endsWith(`@${d}`)),
      'Please use a company email — consumer email providers are not allowed',
    ),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .max(128)
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

type FormValues = z.infer<typeof schema>;

function validateDocument(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return `${file.name}: only PDF documents are accepted`;
  }

  if (file.size <= 0 || file.size > MAX_DOC_SIZE) {
    return `${file.name}: file must be smaller than 10MB`;
  }

  return null;
}

export default function CompanySignupPage(): JSX.Element {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit, formState: { errors }, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;

    const validationError = picked.map(validateDocument).find(Boolean);
    if (validationError) {
      toast.error(validationError);
      event.target.value = '';
      return;
    }

    setDocuments((previous) => {
      const merged = [...previous, ...picked];
      const deduped = merged.filter(
        (doc, index, arr) =>
          arr.findIndex((other) => (
            other.name === doc.name &&
            other.size === doc.size &&
            other.lastModified === doc.lastModified
          )) === index,
      );

      if (deduped.length > MAX_DOCS) {
        toast.error(`You can upload up to ${MAX_DOCS} verification documents.`);
        return deduped.slice(0, MAX_DOCS);
      }

      return deduped;
    });

    event.target.value = '';
  };

  const removeDocument = (index: number) => {
    setDocuments((previous) => previous.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    if (documents.length === 0) {
      toast.error('Upload at least one organization verification document.');
      return;
    }

    setLoading(true);
    try {
      const verificationDocumentKeys: string[] = [];

      for (const file of documents) {
        const presignRes = await api.post(endpoints.auth.companySignupDocumentUploadUrl, {
          filename: file.name,
          mimeType: 'application/pdf',
          sizeBytes: file.size,
        });

        const { uploadUrl, key } = unwrapApiData<CompanyDocUploadResponse>(presignRes.data);
        await axios.put(uploadUrl, file, {
          headers: { 'Content-Type': 'application/pdf' },
        });

        verificationDocumentKeys.push(key);
      }

      await api.post(endpoints.auth.companySignup, {
        ...values,
        verificationDocumentKeys,
      });

      toast.success('Organization created. Check your email for a verification code.');
      navigate('/verify-otp', { state: { email: values.email } });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      if (apiErr.isValidation && Object.keys(apiErr.fieldErrors).length > 0) {
        for (const [field, messages] of Object.entries(apiErr.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof FormValues, { message: messages[0] });
          }
        }
      } else {
        toast.error(apiErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Company</p>
      <h1 className="ef-heading-gradient mt-2 text-2xl font-semibold md:text-3xl">Create organization</h1>
      <p className="mt-2 text-sm text-zinc-400">Post opportunities and discover student talent.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input label="Company name" {...register('companyName')} error={errors.companyName?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Your first name" {...register('firstName')} error={errors.firstName?.message} />
          <Input label="Your last name" {...register('lastName')} error={errors.lastName?.message} />
        </div>
        <Input
          label="Work email"
          type="email"
          placeholder="you@company.com"
          {...register('email')}
          error={errors.email?.message}
          hint="Consumer email providers (Gmail, Yahoo, etc.) are not accepted"
        />
        <Input
          label="Password"
          type="password"
          {...register('password')}
          error={errors.password?.message}
          hint="Min 8 chars, uppercase, lowercase, number"
        />

        <div className="space-y-2 rounded-xl border border-white/12 bg-black/45 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
            Verification documents (PDF only)
          </p>
          <p className="text-xs text-zinc-500">Upload 1-5 files, maximum 10MB each.</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFilesSelected}
            className="block w-full text-xs text-zinc-300 file:mr-3 file:rounded-full file:border file:border-white/20 file:bg-white/5 file:px-3 file:py-1.5 file:text-xs file:text-zinc-200 hover:file:bg-white/10"
          />

          {documents.length > 0 && (
            <ul className="space-y-1.5 text-xs text-zinc-300">
              {documents.map((doc, index) => (
                <li key={`${doc.name}-${doc.lastModified}`} className="flex items-center justify-between gap-2 rounded bg-white/5 px-2 py-1.5">
                  <span className="truncate">
                    {doc.name} ({Math.ceil(doc.size / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    className="text-zinc-400 underline underline-offset-2 hover:text-white"
                    onClick={() => removeDocument(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" variant="primary" withBorderEffect={false} className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap gap-4 text-sm text-zinc-400">
        <Link to="/login" className="underline underline-offset-4 hover:text-white">Already have an account?</Link>
        <Link to="/sign-up" className="underline underline-offset-4 hover:text-white">Choose a different role</Link>
      </div>
    </div>
  );
}
