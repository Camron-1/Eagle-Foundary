import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MessageThread } from '@/lib/api/types';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

function getThreadContext(thread: MessageThread): string {
  if (thread.application) return `Application: ${thread.application.opportunity?.title ?? 'Opportunity'}`;
  if (thread.joinRequest) return `Join Request: ${thread.joinRequest.startup?.name ?? 'Startup'}`;
  return 'Message';
}

export default function MessagesPage(): JSX.Element {
  const navigate = useNavigate();

  const { data: threads = [], isLoading } = useQuery<MessageThread[]>({
    queryKey: ['messages', 'threads'],
    queryFn: async () => {
      const res = await api.get<{ data?: MessageThread[] } | MessageThread[]>(
        endpoints.messages.threads,
      );
      const body = res.data;
      return ((body && typeof body === 'object' && 'data' in body ? body.data : body) ?? []) as MessageThread[];
    },
  });

  const columns: Column<MessageThread & Record<string, unknown>>[] = [
    {
      key: 'thread',
      header: 'Thread',
      render: (row) => (
        <span className="font-medium text-fg">{getThreadContext(row)}</span>
      ),
    },
    {
      key: 'lastMessage',
      header: 'Last Message',
      render: (row) => {
        const last = row.lastMessage ?? row.messages?.[0];
        const preview = last?.isEncrypted
          ? 'New encrypted message'
          : (last?.content ?? '—');
        const truncated = preview.length > 60 ? `${preview.slice(0, 60)}…` : preview;
        return <span className="text-fg-muted">{truncated}</span>;
      },
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (row) => {
        const d = row.updatedAt ? new Date(row.updatedAt) : null;
        return (
          <span className="text-fg-subtle">
            {d && !isNaN(d.getTime()) ? formatDistanceToNow(d, { addSuffix: true }) : '—'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <span className="text-xs text-fg-subtle">View</span>
      ),
    },
  ];

  const tableData = threads.map((t: MessageThread) => ({ ...t } as MessageThread & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="ef-heading-gradient text-4xl font-semibold leading-tight md:text-5xl">
          Messages
        </h1>
      </header>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : threads.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Your message threads will appear here."
        />
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
          onRowClick={(row) => navigate(`/messages/${row.id}`)}
        />
      )}
    </div>
  );
}
