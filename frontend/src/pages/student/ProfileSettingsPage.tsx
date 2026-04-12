import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentProfile, UpdateStudentProfilePayload } from '@/lib/api/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  major: z.string().max(200).optional().nullable(),
  gradYear: z.number().int().min(2000).max(2100).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  skillsStr: z.string().optional(),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal('')),
  githubUrl: z.string().url().optional().nullable().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileSettingsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['students', 'me'],
    queryFn: async () => {
      const res = await api.get<{ data?: StudentProfile }>(endpoints.students.me);
      return res.data?.data ?? res.data;
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      major: null,
      gradYear: null,
      bio: null,
      skillsStr: '',
      linkedinUrl: '',
      githubUrl: '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        major: profile.major ?? '',
        gradYear: profile.gradYear ?? null,
        bio: profile.bio ?? '',
        skillsStr: profile.skills?.join(', ') ?? '',
        linkedinUrl: profile.linkedinUrl ?? '',
        githubUrl: profile.githubUrl ?? '',
      });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateStudentProfilePayload) => {
      const res = await api.put<{ data?: StudentProfile }>(endpoints.students.me, payload);
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'me'] });
      toast.success('Profile saved');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const handleResumeUpload = async (file: File): Promise<void> => {
    try {
      const presignRes = await api.post<{ data?: { uploadUrl: string; key: string } }>(
        endpoints.students.resumePresign,
        {
          filename: file.name,
          mimeType: 'application/pdf' as const,
          sizeBytes: file.size,
        },
      );

      const { uploadUrl } = presignRes.data?.data ?? presignRes.data;

      if (!uploadUrl || typeof uploadUrl !== 'string') {
        toast.error('Failed to get upload URL');
        return;
      }

      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': 'application/pdf' },
      });

      toast.success('Resume uploaded');
      setResumeFile(null);
      queryClient.invalidateQueries({ queryKey: ['students', 'me'] });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
      throw err;
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (resumeFile) {
      try {
        setIsUploading(true);
        await handleResumeUpload(resumeFile);
      } catch {
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const skills = values.skillsStr
      ? values.skillsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const payload: UpdateStudentProfilePayload = {
      firstName: values.firstName,
      lastName: values.lastName,
      major: values.major || null,
      gradYear: values.gradYear ?? null,
      bio: values.bio || null,
      skills,
      linkedinUrl: values.linkedinUrl || null,
      githubUrl: values.githubUrl || null,
    };

    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="ef-heading-gradient text-4xl font-semibold">Profile Settings</h1>
        </header>
        <div className="h-64 animate-pulse rounded-2xl bg-surface-tint" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Student</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Profile Settings
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Manage your profile details and public identity.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              label="First name"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
            <Input
              label="Last name"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
            <Input
              label="Major"
              placeholder="e.g. Computer Science"
              {...register('major')}
              error={errors.major?.message}
            />
            <Input
              label="Graduation year"
              type="number"
              placeholder="e.g. 2026"
              {...register('gradYear', {
              setValueAs: (v) => {
                if (v === '' || v === undefined) return undefined;
                const n = Number(v);
                return Number.isNaN(n) ? undefined : n;
              },
            })}
              error={errors.gradYear?.message}
            />
          </div>

          <Textarea
            label="Bio"
            placeholder="Tell us about yourself..."
            maxLength={2000}
            {...register('bio')}
            error={errors.bio?.message}
            hint="Max 2000 characters"
          />

          <Input
            label="Skills (comma-separated)"
            placeholder="e.g. React, Python, Product Design"
            {...register('skillsStr')}
            error={errors.skillsStr?.message}
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              label="LinkedIn URL"
              type="url"
              placeholder="https://linkedin.com/in/..."
              {...register('linkedinUrl')}
              error={errors.linkedinUrl?.message}
            />
            <Input
              label="GitHub URL"
              type="url"
              placeholder="https://github.com/..."
              {...register('githubUrl')}
              error={errors.githubUrl?.message}
            />
          </div>

          <FileUpload
            label="Resume (PDF)"
            accept="application/pdf"
            maxSizeMb={10}
            currentFile={profile?.resumeUrl ? 'Resume uploaded' : undefined}
            onFile={(file) => setResumeFile(file)}
            onClear={() => setResumeFile(null)}
          />

          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              withBorderEffect={false}
              disabled={updateMutation.isPending || isUploading}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
