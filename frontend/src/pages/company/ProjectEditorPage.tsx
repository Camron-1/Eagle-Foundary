import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { BudgetType, CreateProjectPayload, Project, UpdateProjectPayload } from '@/lib/api/types';
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

interface ProjectWithQuestions extends Project {
  customQuestions?: CustomQuestion[] | null;
}

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  requirements: z.string().max(2000).optional().nullable(),
  budgetType: z.enum(['paid', 'unpaid', 'equity']).optional().nullable(),
  budgetRange: z.string().max(100).optional().nullable(),
  estimatedDuration: z.string().max(120).optional().nullable(),
  deadline: z.string().optional().nullable(),
  tagsStr: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const BUDGET_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'equity', label: 'Equity' },
];

export default function ProjectEditorPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);

  const { data: project, isLoading, isError, error } = useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const res = await api.get<{ data?: ProjectWithQuestions } | ProjectWithQuestions>(endpoints.projects.detail(id!));
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) as ProjectWithQuestions;
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
      estimatedDuration: '',
      deadline: '',
      tagsStr: '',
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        title: project.title,
        description: project.description ?? '',
        requirements: project.requirements ?? '',
        budgetType: project.budgetType ?? null,
        budgetRange: project.budgetRange ?? '',
        estimatedDuration: project.estimatedDuration ?? '',
        deadline: project.deadline ? new Date(project.deadline).toISOString().slice(0, 10) : '',
        tagsStr: project.tags?.join(', ') ?? '',
      });
      setCustomQuestions(Array.isArray(project.customQuestions) ? project.customQuestions : []);
    }
  }, [project, reset]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateProjectPayload & { customQuestions?: CustomQuestion[] | null }) => {
      const res = await api.post<{ data?: Project } | Project>(endpoints.projects.create, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'org', 'me'] });
      toast.success('Project created');
      navigate('/company/projects');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateProjectPayload & { customQuestions?: CustomQuestion[] | null }) => {
      const res = await api.patch<{ data?: Project } | Project>(endpoints.projects.update(id!), payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['projects', 'org', 'me'] });
      toast.success('Project saved');
      navigate('/company/projects');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await api.post(endpoints.projects.publish(id!));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['projects', 'org', 'me'] });
      toast.success('Project published');
      navigate('/company/projects');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      await api.post(endpoints.projects.close(id!));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['projects', 'org', 'me'] });
      toast.success('Project closed');
      navigate('/company/projects');
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
    const deadlineIso = values.deadline?.trim() ? new Date(values.deadline).toISOString() : null;

    if (isNew) {
      const payload: CreateProjectPayload & { customQuestions?: CustomQuestion[] | null } = {
        title: values.title,
        description: values.description || null,
        requirements: values.requirements || null,
        budgetType: (values.budgetType as BudgetType) ?? null,
        budgetRange: values.budgetRange || null,
        estimatedDuration: values.estimatedDuration || null,
        deadline: deadlineIso,
        tags,
        customQuestions: customQuestionsPayload,
      };
      createMutation.mutate(payload);
      return;
    }

    const payload: UpdateProjectPayload & { customQuestions?: CustomQuestion[] | null } = {
      title: values.title,
      description: values.description || null,
      requirements: values.requirements || null,
      budgetType: (values.budgetType as BudgetType) ?? null,
      budgetRange: values.budgetRange || null,
      estimatedDuration: values.estimatedDuration || null,
      deadline: deadlineIso,
      tags,
      customQuestions: customQuestionsPayload,
    };
    updateMutation.mutate(payload);
  };

  const savePending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="ef-heading-gradient text-4xl font-semibold">Edit Project</h1>
        </header>
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (!isNew && isError) {
    const apiErr = error instanceof ApiError ? error : parseApiError(error);
    return (
      <div className="space-y-8">
        <header>
          <h1 className="ef-heading-gradient text-4xl font-semibold">Edit Project</h1>
        </header>
        <Card>
          <p className="text-red-400">Failed to load project: {apiErr.message}</p>
          <Button type="button" variant="ghost" className="mt-4" onClick={() => navigate('/company/projects')}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Company</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          {isNew ? 'New Project' : 'Edit Project'}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-300 md:text-base">
          {isNew ? 'Create a new outsourced project for students.' : 'Update project details.'}
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input label="Title" placeholder="e.g. Build MVP Landing Page" {...register('title')} error={errors.title?.message} />
          <Textarea
            label="Description"
            placeholder="Describe the project scope..."
            maxLength={5000}
            {...register('description')}
            error={errors.description?.message}
            hint="Max 5000 characters"
          />
          <Textarea
            label="Requirements"
            placeholder="What deliverables and skills are required?"
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
          <Input label="Budget Range" placeholder="e.g. $500 - $1,200" {...register('budgetRange')} error={errors.budgetRange?.message} />
          <Input
            label="Estimated Duration"
            placeholder="e.g. 4 weeks"
            {...register('estimatedDuration')}
            error={errors.estimatedDuration?.message}
          />
          <Input label="Deadline" type="date" {...register('deadline')} error={errors.deadline?.message} />
          <Input
            label="Tags (comma-separated, max 10)"
            placeholder="e.g. react, ui, api"
            {...register('tagsStr')}
            error={errors.tagsStr?.message}
          />

          <div className="space-y-4 border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-zinc-200">Submission Form</h3>
            <p className="text-sm text-zinc-400">
              Students will provide name, address, resume URL, and cover letter by default. Add custom questions below if needed.
            </p>

            {customQuestions.map((q) => (
              <div key={q.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex-1">
                  <p className="text-sm text-zinc-300">{q.question}</p>
                  {q.required && <span className="text-xs text-amber-400">Required</span>}
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="text-zinc-500 transition-colors hover:text-red-400"
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
              <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={newQuestionRequired}
                  onChange={(e) => setNewQuestionRequired(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-900 text-indigo-500"
                />
                Required
              </label>
              <Button type="button" variant="ghost" onClick={addQuestion} disabled={!newQuestion.trim()} aria-label="Add question">
                <Plus size={16} />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <Button type="submit" variant="primary" withBorderEffect={false} disabled={savePending}>
              {savePending ? 'Saving...' : 'Save Draft'}
            </Button>
            {!isNew && project?.status === 'DRAFT' && (
              <Button type="button" variant="ghost" onClick={() => publishMutation.mutate()} disabled={savePending || publishMutation.isPending}>
                {publishMutation.isPending ? 'Publishing...' : 'Publish'}
              </Button>
            )}
            {!isNew && project?.status === 'PUBLISHED' && (
              <Button type="button" variant="ghost" onClick={() => closeMutation.mutate()} disabled={savePending || closeMutation.isPending}>
                {closeMutation.isPending ? 'Closing...' : 'Close'}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => navigate('/company/projects')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
