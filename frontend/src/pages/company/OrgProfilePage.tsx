import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Org, UpdateOrgPayload } from '@/lib/api/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function OrgProfilePage(): JSX.Element {
  const queryClient = useQueryClient();

  const { data: org, isLoading, isError } = useQuery({
    queryKey: ['orgs', 'me'],
    queryFn: async () => {
      const res = await api.get<{ data?: Org } | Org>(endpoints.orgs.me);
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) as Org;
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      website: '',
      logoUrl: '',
    },
  });

  useEffect(() => {
    if (org) {
      reset({
        name: org.name,
        description: org.description ?? '',
        website: org.website ?? '',
        logoUrl: org.logoUrl ?? '',
      });
    }
  }, [org, reset]);

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateOrgPayload) => {
      const res = await api.put<{ data?: Org } | Org>(endpoints.orgs.updateMe, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs', 'me'] });
      toast.success('Organization profile saved');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: UpdateOrgPayload = {
      name: values.name,
      description: values.description || null,
      website: values.website || null,
      logoUrl: values.logoUrl || null,
    };
    updateMutation.mutate(payload);
  };

  if (isError) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="ef-heading-gradient text-4xl font-semibold">Organization Profile</h1>
        </header>
        <p className="text-sm text-red-400">Failed to load organization profile. Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="ef-heading-gradient text-4xl font-semibold">Organization Profile</h1>
        </header>
        <div className="h-64 animate-pulse rounded-2xl bg-surface-tint" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Company</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="ef-heading-gradient text-4xl font-semibold leading-tight md:text-5xl">
            Organization Profile
          </h1>
          {org?.isVerifiedBadge && (
            <Badge variant="success">Verified</Badge>
          )}
        </div>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Manage your organization details and branding.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Organization name"
            {...register('name')}
            error={errors.name?.message}
          />
          <Textarea
            label="Description"
            placeholder="Tell us about your organization..."
            maxLength={2000}
            {...register('description')}
            error={errors.description?.message}
            hint="Max 2000 characters"
          />
          <Input
            label="Website"
            type="url"
            placeholder="https://example.com"
            {...register('website')}
            error={errors.website?.message}
          />
          <Input
            label="Logo URL"
            type="url"
            placeholder="https://..."
            {...register('logoUrl')}
            error={errors.logoUrl?.message}
          />
          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              withBorderEffect={false}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
