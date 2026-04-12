import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Notification } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';

function getTypeIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'application':
    case 'opportunity':
      return '📋';
    case 'join_request':
    case 'startup':
      return '🤝';
    case 'message':
      return '💬';
    default:
      return '🔔';
  }
}

export default function NotificationsPage(): JSX.Element {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ data?: Notification[] } | Notification[]>(
        endpoints.notifications.list,
      );
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(endpoints.notifications.read(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(endpoints.notifications.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post(endpoints.notifications.readAll);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="ef-heading-gradient text-4xl font-semibold leading-tight md:text-5xl">
          Notifications
        </h1>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            withBorderEffect={false}
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || !notifications.some((n) => !n.readAt)}
          >
            <CheckCheck size={16} className="mr-2" />
            Mark All Read
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border-subtle bg-surface p-4"
            >
              <div className="h-4 w-3/4 rounded bg-surface-tint" />
              <div className="mt-2 h-3 w-1/2 rounded bg-surface-tint" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="You're all caught up."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'flex items-start gap-4 rounded-xl border p-4 transition-colors',
                n.readAt
                  ? 'border-border-subtle bg-page/30'
                  : 'border-l-4 border-l-amber-500/50 border-border-subtle bg-surface-faint',
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-lg">
                {getTypeIcon(n.type)}
              </div>
              <div
                className="min-w-0 flex-1 cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => !n.readAt && markReadMutation.mutate(n.id)}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !n.readAt) markReadMutation.mutate(n.id); }}
              >
                <p className={cn('text-sm', n.readAt ? 'font-normal text-fg-muted' : 'font-semibold text-fg')}>
                  {n.title}
                </p>
                <p className="mt-0.5 text-sm text-fg-subtle">{n.message}</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!n.readAt && (
                  <button
                    type="button"
                    onClick={() => markReadMutation.mutate(n.id)}
                    className="rounded-lg p-2 text-fg-subtle hover:bg-surface-tint hover:text-fg-muted"
                    title="Mark as read"
                  >
                    <Bell size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(n.id)}
                  className="rounded-lg p-2 text-fg-subtle hover:bg-surface-tint hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
