import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Report, ReportStatus } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';

const TRUNCATE_LEN = 40;

function truncate(str: string, len: number): string {
  if (!str) return '—';
  return str.length <= len ? str : `${str.slice(0, len)}…`;
}

export default function ModerationReportsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolution, setResolution] = useState<'CONTENT_REMOVED' | 'DISMISSED'>('CONTENT_REMOVED');
  const [adminNotes, setAdminNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', 'pending'],
    queryFn: async () => {
      const res = await api.get<{ data?: Report[] }>(endpoints.reports.pending, {
        params: { limit: 100 },
      });
      const body = res.data;
      const items = body?.data ?? (Array.isArray(body) ? body : []);
      return Array.isArray(items) ? items : [];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) throw new Error('No report selected');
      await api.post(endpoints.reports.resolve(selectedReport.id), {
        resolution,
        adminNotes: adminNotes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success('Report resolved');
      setReviewModalOpen(false);
      setSelectedReport(null);
      setAdminNotes('');
      setConfirmOpen(false);
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to resolve report');
    },
  });

  const openReview = (report: Report) => {
    setSelectedReport(report);
    setResolution('CONTENT_REMOVED');
    setAdminNotes('');
    setReviewModalOpen(true);
  };

  const handleSubmit = () => {
    setConfirmOpen(true);
  };

  const confirmSubmit = () => {
    setConfirmOpen(false);
    resolveMutation.mutate();
  };

  const columns: Column<Report & Record<string, unknown>>[] = [
    {
      key: 'id',
      header: 'Report ID',
      render: (row) => (
        <span className="font-mono text-xs text-zinc-400">{truncate(row.id as string, 12)}</span>
      ),
    },
    {
      key: 'targetType',
      header: 'Target Type',
      render: (row) => <span className="text-zinc-300">{row.targetType}</span>,
    },
    {
      key: 'targetId',
      header: 'Target ID',
      render: (row) => (
        <span className="font-mono text-xs text-zinc-500">{truncate(row.targetId as string, 12)}</span>
      ),
    },
    {
      key: 'reporterReason',
      header: 'Reporter Reason',
      render: (row) => (
        <span className="text-zinc-400 max-w-[200px] truncate block" title={row.reporterReason as string}>
          {truncate((row.reporterReason as string) ?? '', TRUNCATE_LEN)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status as ReportStatus}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button
          variant="ghost"
          className="h-8 px-3 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            openReview(row);
          }}
        >
          Review
        </Button>
      ),
    },
  ];

  const tableData = reports.map((r) => ({ ...r } as Report & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Admin</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Moderation Reports
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-300 md:text-base">
          Review and resolve user-submitted reports.
        </p>
      </header>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No pending reports"
          description="All reports have been reviewed."
        />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No pending reports" />
      )}

      <Modal
        open={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedReport(null);
          setAdminNotes('');
        }}
        title="Review Report"
      >
        {selectedReport && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Target: {selectedReport.targetType} — {truncate(selectedReport.targetId, 20)}
            </p>
            <p className="text-sm text-zinc-300">{selectedReport.reporterReason}</p>
            {selectedReport.evidenceText && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="mb-1 text-xs uppercase tracking-[0.12em] text-zinc-500">Reporter Evidence</p>
                <p className="text-sm text-zinc-300">{selectedReport.evidenceText}</p>
              </div>
            )}
            {selectedReport.evidenceMessageId && (
              <p className="font-mono text-xs text-zinc-500">
                Evidence message: {selectedReport.evidenceMessageId}
              </p>
            )}
            <Select
              label="Resolution"
              options={[
                { value: 'CONTENT_REMOVED', label: 'Resolved (content removed)' },
                { value: 'DISMISSED', label: 'Dismissed' },
              ]}
              value={resolution}
              onChange={(e) => setResolution(e.target.value as 'CONTENT_REMOVED' | 'DISMISSED')}
            />
            <Textarea
              label="Admin Notes"
              placeholder="Optional notes..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                withBorderEffect={false}
                onClick={handleSubmit}
                disabled={resolveMutation.isPending}
              >
                Submit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmSubmit}
        title="Confirm resolution"
        description={`Are you sure you want to mark this report as ${resolution === 'DISMISSED' ? 'dismissed' : 'resolved'}?`}
        confirmLabel="Submit"
        loading={resolveMutation.isPending}
      />
    </div>
  );
}
