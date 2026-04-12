import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Startup, CreateStartupPayload } from '@/lib/api/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface CustomQuestion {
  id: string;
  question: string;
  required: boolean;
}

interface StartupWithSettings extends Startup {
  acceptingJoinRequests?: boolean;
  customQuestions?: CustomQuestion[] | null;
}

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  tagline: z.string().max(280).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  stage: z.string().max(100).optional().nullable(),
  tagsStr: z.string().optional(),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function StartupEditorPage(): JSX.Element {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id && id !== 'new';

  // Join request settings (only for edit mode)
  const [acceptingJoinRequests, setAcceptingJoinRequests] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);

  const { data: startup, isLoading } = useQuery({
    queryKey: ['startups', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get<{ data?: StartupWithSettings }>(endpoints.startups.detail(id));
      return (res.data?.data ?? res.data) as StartupWithSettings | null;
    },
    enabled: isEdit && !!id,
  });

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      tagline: '',
      description: '',
      stage: '',
      tagsStr: '',
      logoUrl: '',
    },
  });

  useEffect(() => {
    if (startup) {
      setValue('name', startup.name);
      setValue('tagline', startup.tagline ?? '');
      setValue('description', startup.description ?? '');
      setValue('stage', startup.stage ?? '');
      setValue('tagsStr', startup.tags?.join(', ') ?? '');
      setValue('logoUrl', startup.logoUrl ?? '');
      setAcceptingJoinRequests(startup.acceptingJoinRequests ?? false);
      setCustomQuestions(
        Array.isArray(startup.customQuestions) ? startup.customQuestions : [],
      );
    }
  }, [startup, setValue]);

  const saveMutation = useMutation({
    mutationFn: async (payload: CreateStartupPayload & {
      acceptingJoinRequests?: boolean;
      customQuestions?: CustomQuestion[] | null;
    }) => {
      if (isEdit && id) {
        const res = await api.put<{ data?: Startup }>(endpoints.startups.update(id), payload);
        return res.data?.data ?? res.data;
      }
      const res = await api.post<{ data?: Startup }>(endpoints.startups.create, payload);
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startups'] });
      toast.success(isEdit ? 'Startup updated' : 'Startup created');
      navigate('/student/startups');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing startup id');
      const res = await api.post<{ data?: Startup }>(endpoints.startups.submit(id));
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startups'] });
      queryClient.invalidateQueries({ queryKey: ['startups', id] });
      toast.success('Startup submitted for review');
      navigate('/student/startups');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setCustomQuestions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), question: newQuestion.trim(), required: newQuestionRequired },
    ]);
    setNewQuestion('');
    setNewQuestionRequired(false);
  };

  const removeQuestion = (qId: string) => {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const onSubmit = (values: FormValues) => {
    const tags = values.tagsStr
      ? values.tagsStr.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10)
      : [];

    const payload = {
      name: values.name,
      tagline: values.tagline || null,
      description: values.description || null,
      stage: values.stage || null,
      tags,
      logoUrl: values.logoUrl || null,
      acceptingJoinRequests,
      customQuestions: customQuestions.length > 0 ? customQuestions : null,
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="ef-heading-gradient text-4xl font-semibold">Startup Editor</h1>
        </header>
        <div className="h-64 animate-pulse rounded-2xl bg-surface-tint" />
      </div>
    );
  }

  const showAdminFeedback = isEdit && startup?.status === 'NEEDS_CHANGES' && startup?.adminFeedback;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Student</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          {isEdit ? 'Edit Startup' : 'Create Startup'}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          {isEdit
            ? 'Update your startup details before submission.'
            : 'Create a new startup and add your team.'}
        </p>
      </header>

      {showAdminFeedback && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="shrink-0 text-amber-400" />
            <div>
              <h3 className="font-medium text-amber-400">Admin feedback</h3>
              <p className="mt-1 text-sm text-fg-muted">{startup.adminFeedback}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Name"
            placeholder="Startup name"
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Tagline"
            placeholder="One-line description"
            {...register('tagline')}
            error={errors.tagline?.message}
          />
          <Textarea
            label="Description"
            placeholder="Detailed description..."
            maxLength={5000}
            {...register('description')}
            error={errors.description?.message}
            hint="Max 5000 characters"
          />
          <Input
            label="Stage"
            placeholder="e.g. idea, MVP, prototype"
            {...register('stage')}
            error={errors.stage?.message}
          />
          <Input
            label="Tags (comma-separated, max 10)"
            placeholder="e.g. tech, edtech, fintech"
            {...register('tagsStr')}
            error={errors.tagsStr?.message}
          />
          <Input
            label="Logo URL"
            type="url"
            placeholder="https://..."
            {...register('logoUrl')}
            error={errors.logoUrl?.message}
          />

          {/* Join Request Settings */}
          {isEdit && (
            <div className="border-t border-border-subtle pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-fg">Join Request Settings</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptingJoinRequests}
                  onChange={(e) => setAcceptingJoinRequests(e.target.checked)}
                  className="h-4 w-4 rounded border-border-input bg-surface-input text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-fg-muted">
                  Accept join requests from other students
                </span>
              </label>

              {acceptingJoinRequests && (
                <div className="space-y-3 pl-7">
                  <p className="text-xs text-fg-subtle">
                    Applicants will be asked for their name, address, resume, and cover letter by default.
                    Add custom questions below if you need additional information.
                  </p>

                  {customQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-tint p-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-fg-muted">{q.question}</p>
                        {q.required && (
                          <span className="text-xs text-amber-400">Required</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="text-fg-subtle hover:text-red-400 transition-colors"
                        aria-label="Remove question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a custom question..."
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addQuestion();
                        }
                      }}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-fg-muted whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={newQuestionRequired}
                        onChange={(e) => setNewQuestionRequired(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-border-input bg-surface-input text-indigo-500"
                      />
                      Required
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={addQuestion}
                      disabled={!newQuestion.trim()}
                      aria-label="Add question"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              withBorderEffect={false}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || saveMutation.isPending}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit for Review'}
              </Button>
            )}
            <Button variant="ghost" type="button" onClick={() => navigate('/student/startups')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
