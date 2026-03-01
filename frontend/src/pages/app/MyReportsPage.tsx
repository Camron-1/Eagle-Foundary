import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Report, CreateReportPayload } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import { format } from 'date-fns';

const TARGET_TYPE_OPTIONS = [
  { value: 'STARTUP', label: 'Startup' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'USER', label: 'User' },
  { value: 'MESSAGE', label: 'Message' },
  { value: 'ORG', label: 'Organization' },
];

export default function MyReportsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<string>('STARTUP');
  const [targetId, setTargetId] = useState('');
  const [reporterReason, setReporterReason] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceMessageId, setEvidenceMessageId] = useState('');

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['reports', 'me'],
    queryFn: async () => {
      const res = await api.get<{ data?: Report[] } | Report[]>(endpoints.reports.me);
      const body = res.data;
      return ((body && typeof body === 'object' && 'data' in body ? body.data : body) ?? []) as Report[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateReportPayload) => {
      await api.post(endpoints.reports.create, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'me'] });
      setModalOpen(false);
      setTargetType('STARTUP');
      setTargetId('');
      setReporterReason('');
      setEvidenceText('');
      setEvidenceMessageId('');
      toast.success('Report submitted successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to submit report');
    },
  });

  const handleSubmit = () => {
    const trimmedId = targetId.trim();
    const trimmedReason = reporterReason.trim();
    if (!trimmedId || !trimmedReason) {
      toast.error('Please fill in target ID and reason');
      return;
    }
    createMutation.mutate({
      targetType: targetType as CreateReportPayload['targetType'],
      targetId: trimmedId,
      reporterReason: trimmedReason,
      evidenceText: evidenceText.trim() ? evidenceText.trim() : null,
      evidenceMessageId: evidenceMessageId.trim() ? evidenceMessageId.trim() : null,
    });
  };

  const columns: Column<Report & Record<string, unknown>>[] = [
    {
      key: 'target',
      header: 'Target',
      render: (row) => (
        <span className="text-zinc-300">
          {row.targetType} / {String(row.targetId).slice(0, 8)}…
        </span>
      ),
    },
    {
      key: 'reporterReason',
      header: 'Reason',
      render: (row) => {
        const reason = row.reporterReason ?? '';
        const truncated = reason.length > 80 ? `${reason.slice(0, 80)}…` : reason;
        return <span className="text-zinc-400">{truncated}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status}</Badge>,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (row) => {
        const d = row.updatedAt ? new Date(row.updatedAt) : null;
        return <span className="text-zinc-500">{d && !isNaN(d.getTime()) ? format(d, 'MMM d, yyyy') : '—'}</span>;
      },
    },
  ];

  const tableData = reports.map((r: Report) => ({ ...r } as Report & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="ef-heading-gradient text-4xl font-semibold leading-tight md:text-5xl">
          My Reports
        </h1>
        <Button variant="primary" withBorderEffect={false} onClick={() => setModalOpen(true)}>
          New Report
        </Button>
      </header>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Report"
      >
        <div className="space-y-4">
          <Select
            label="Target Type"
            options={TARGET_TYPE_OPTIONS}
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
          />
          <Input
            label="Target ID"
            placeholder="UUID of the startup, opportunity, user, or message"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          />
          <Textarea
            label="Reason"
            placeholder="Describe why you are reporting this..."
            value={reporterReason}
            onChange={(e) => setReporterReason(e.target.value)}
            rows={4}
          />
          <Textarea
            label="Evidence (optional)"
            placeholder="Paste relevant excerpt or context for moderation review"
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
            rows={3}
          />
          <Input
            label="Evidence message ID (optional)"
            placeholder="Message UUID, if applicable"
            value={evidenceMessageId}
            onChange={(e) => setEvidenceMessageId(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              withBorderEffect={false}
              onClick={handleSubmit}
              disabled={createMutation.isPending || !targetId.trim() || !reporterReason.trim()}
            >
              {createMutation.isPending ? 'Submitting…' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </Modal>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Reports you submit will appear here."
        />
      ) : (
        <DataTable columns={columns} data={tableData} />
      )}
    </div>
  );
}
