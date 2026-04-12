import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  Opportunity,
  CreateOpportunityPayload,
  UpdateOpportunityPayload,
  BudgetType,
} from '@/lib/api/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';
import { Plus, Trash2 } from 'lucide-react';

interface CustomQuestion {
  id: string;
  question: string;
  required: boolean;
}

interface OpportunityWithQuestions extends Opportunity {
  customQuestions?: CustomQuestion[] | null;
}

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  requirements: z.string().max(2000).optional().nullable(),
  budgetType: z.enum(['paid', 'unpaid', 'equity']).optional().nullable(),
  budgetRange: z.string().max(100).optional().nullable(),
  tagsStr: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const BUDGET_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'equity', label: 'Equity' },
];

export default function OpportunityEditorPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ['opportunities', id],
    queryFn: async () => {
      const res = await api.get<{ data?: OpportunityWithQuestions } | OpportunityWithQuestions>(
        endpoints.opportunities.detail(id!),
      );
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) as OpportunityWithQuestions;
    },
    enabled: !isNew,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      requirements: '',
      budgetType: null,
      budgetRange: '',
      tagsStr: '',
    },
  });

  useEffect(() => {
    if (opportunity) {
      reset({
        title: opportunity.title,
        description: opportunity.description ?? '',
        requirements: opportunity.requirements ?? '',
        budgetType: opportunity.budgetType ?? null,
        budgetRange: opportunity.budgetRange ?? '',
        tagsStr: opportunity.tags?.join(', ') ?? '',
      });
      setCustomQuestions(Array.isArray(opportunity.customQuestions) ? opportunity.customQuestions : []);
    }
  }, [opportunity, reset]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateOpportunityPayload & { customQuestions?: CustomQuestion[] | null }) => {
      const res = await api.post<{ data?: Opportunity } | Opportunity>(endpoints.opportunities.create, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', 'org', 'me'] });
      toast.success('Opportunity created');
      navigate('/company/opportunities');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateOpportunityPayload & { customQuestions?: CustomQuestion[] | null }) => {
      const res = await api.patch<{ data?: Opportunity } | Opportunity>(
        endpoints.opportunities.update(id!),
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunities', 'org', 'me'] });
      toast.success('Opportunity saved');
      navigate('/company/opportunities');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await api.post(endpoints.opportunities.publish(id!));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunities', 'org', 'me'] });
      toast.success('Opportunity published');
      navigate('/company/opportunities');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      await api.post(endpoints.opportunities.close(id!));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunities', 'org', 'me'] });
      toast.success('Opportunity closed');
      navigate('/company/opportunities');
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

    const customQuestionsPayload = customQuestions.length > 0 ? customQuestions : null;

    if (isNew) {
      const payload: CreateOpportunityPayload & { customQuestions?: CustomQuestion[] | null } = {
        title: values.title,
        description: values.description || null,
        requirements: values.requirements || null,
        budgetType: (values.budgetType as BudgetType) ?? null,
        budgetRange: values.budgetRange || null,
        tags,
        customQuestions: customQuestionsPayload,
      };
      createMutation.mutate(payload);
    } else {
      const payload: UpdateOpportunityPayload & { customQuestions?: CustomQuestion[] | null } = {
        title: values.title,
        description: values.description || null,
        requirements: values.requirements || null,
        budgetType: (values.budgetType as BudgetType) ?? null,
        budgetRange: values.budgetRange || null,
        tags,
        customQuestions: customQuestionsPayload,
      };
      updateMutation.mutate(payload);
    }
  };

  const handlePublish = () => {
    if (opportunity?.status === 'DRAFT') {
      publishMutation.mutate();
    }
  };

  const handleClose = () => {
    if (opportunity?.status === 'PUBLISHED') {
      closeMutation.mutate();
    }
  };

  const savePending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="ef-heading-gradient text-4xl font-semibold">Edit Opportunity</h1>
        </header>
        <div className="h-64 animate-pulse rounded-2xl bg-surface-tint" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Company</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          {isNew ? 'New Opportunity' : 'Edit Opportunity'}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          {isNew ? 'Create a new opportunity for students.' : 'Update opportunity details.'}
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Title"
            placeholder="e.g. Summer Internship"
            {...register('title')}
            error={errors.title?.message}
          />
          <Textarea
            label="Description"
            placeholder="Describe the opportunity..."
            maxLength={5000}
            {...register('description')}
            error={errors.description?.message}
            hint="Max 5000 characters"
          />
          <Textarea
            label="Requirements"
            placeholder="What are the requirements?"
            maxLength={2000}
            {...register('requirements')}
            error={errors.requirements?.message}
            hint="Max 2000 characters"
          />
          <Select
            label="Budget Type"
            options={BUDGET_OPTIONS}
            placeholder="Select..."
            {...register('budgetType')}
            error={errors.budgetType?.message}
          />
          <Input
            label="Budget Range"
            placeholder="e.g. $15-20/hr"
            {...register('budgetRange')}
            error={errors.budgetRange?.message}
          />
          <Input
            label="Tags (comma-separated, max 10)"
            placeholder="e.g. internship, frontend, react"
            {...register('tagsStr')}
            error={errors.tagsStr?.message}
          />

          {/* Application Form Settings */}
          <div className="border-t border-border-subtle pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-fg">Application Form</h3>
            <p className="text-sm text-fg-muted">
              Applicants will be asked for their name, address, resume URL, and a cover letter by default.
              Add custom questions below if you need specific information.
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
                  aria-label="Delete question"
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

          <div className="flex flex-wrap gap-2 pt-4">
            <Button type="submit" variant="primary" withBorderEffect={false} disabled={savePending}>
              {savePending ? 'Saving...' : 'Save Draft'}
            </Button>
            {!isNew && opportunity?.status === 'DRAFT' && (
              <Button
                type="button"
                variant="ghost"
                onClick={handlePublish}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending ? 'Publishing...' : 'Publish'}
              </Button>
            )}
            {!isNew && opportunity?.status === 'PUBLISHED' && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={closeMutation.isPending}
              >
                {closeMutation.isPending ? 'Closing...' : 'Close'}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => navigate('/company/opportunities')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
