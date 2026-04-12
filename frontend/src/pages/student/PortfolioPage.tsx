import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PortfolioItem, CreatePortfolioItemPayload } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('')),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

function truncate(str: string | null, len: number): string {
  if (!str) return '—';
  return str.length <= len ? str : `${str.slice(0, len)}…`;
}

export default function PortfolioPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['students', 'portfolio'],
    queryFn: async () => {
      const res = await api.get<{ data?: PortfolioItem[] } | PortfolioItem[]>(endpoints.students.portfolio);
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreatePortfolioItemPayload) => {
      const res = await api.post<{ data?: PortfolioItem }>(endpoints.students.portfolio, payload);
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'portfolio'] });
      toast.success('Portfolio item added');
      setModalOpen(false);
      reset();
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreatePortfolioItemPayload }) => {
      const res = await api.put<{ data?: PortfolioItem }>(endpoints.students.portfolioItem(id), payload);
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'portfolio'] });
      toast.success('Portfolio item updated');
      setModalOpen(false);
      setEditingItem(null);
      reset();
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      url: '',
      imageUrl: '',
    },
  });

  const openCreate = () => {
    setEditingItem(null);
    reset({ title: '', description: '', url: '', imageUrl: '' });
    setModalOpen(true);
  };

  const openEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setValue('title', item.title);
    setValue('description', item.description ?? '');
    setValue('url', item.url ?? '');
    setValue('imageUrl', item.imageUrl ?? '');
    setModalOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const payload: CreatePortfolioItemPayload = {
      title: values.title,
      description: values.description || null,
      url: values.url || null,
      imageUrl: values.imageUrl || null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(endpoints.students.portfolioItem(deleteTarget.id));
      queryClient.invalidateQueries({ queryKey: ['students', 'portfolio'] });
      toast.success('Portfolio item deleted');
      setDeleteTarget(null);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<PortfolioItem & Record<string, unknown>>[] = [
    { key: 'title', header: 'Title' },
    {
      key: 'description',
      header: 'Description',
      render: (row) => truncate(row.description, 60),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (row) => {
        const d = row.updatedAt ? new Date(row.updatedAt) : null;
        return <span className="text-fg-muted">{d && !isNaN(d.getTime()) ? format(d, 'MMM d, yyyy') : '—'}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
            className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-surface-tint hover:text-fg"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-surface-tint hover:text-red-400"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const tableData = items.map((item) => ({ ...item } as PortfolioItem & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Student</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Portfolio
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Add and organize your portfolio entries.
        </p>
      </header>

      <div className="flex justify-end">
        <Button variant="primary" withBorderEffect={false} onClick={openCreate}>
          Add Item
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No portfolio items"
          description="Add your first project or work sample to showcase your skills."
          action={<Button variant="primary" withBorderEffect={false} onClick={openCreate}>Add Item</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
          emptyMessage="No portfolio items"
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Item' : 'Add Item'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title"
            placeholder="Project name"
            {...register('title')}
            error={errors.title?.message}
          />
          <Textarea
            label="Description"
            placeholder="Brief description..."
            {...register('description')}
            error={errors.description?.message}
          />
          <Input
            label="URL"
            type="url"
            placeholder="https://..."
            {...register('url')}
            error={errors.url?.message}
          />
          <Input
            label="Image URL"
            type="url"
            placeholder="https://..."
            {...register('imageUrl')}
            error={errors.imageUrl?.message}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              withBorderEffect={false}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete portfolio item"
        description="This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  );
}
