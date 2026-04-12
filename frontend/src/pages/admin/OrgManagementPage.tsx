import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  Org,
  OrgStatus,
  OrgVerificationDocumentListResponse,
  OrgVerificationStatus,
  ReviewOrgVerificationPayload,
} from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';

interface OrgWithCount extends Org {
  _count?: { members?: number };
}

export default function OrgManagementPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [verificationStatusFilter, setVerificationStatusFilter] = useState<'' | OrgVerificationStatus>('PENDING_REVIEW');
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrgWithCount | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedVerificationOrg, setSelectedVerificationOrg] = useState<OrgWithCount | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [verifiedDomainsInput, setVerifiedDomainsInput] = useState('');

  const { data: orgsData = [], isLoading } = useQuery({
    queryKey: ['admin', 'orgs', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const url = `${endpoints.admin.orgs}${params.toString() ? `?${params}` : ''}`;
      const res = await api.get<{ data?: OrgWithCount[] }>(url, { params: { limit: 100 } });
      const body = res.data;
      const items = body?.data ?? (Array.isArray(body) ? body : []);
      return Array.isArray(items) ? items : [];
    },
  });

  const { data: verificationQueue = [], isLoading: verificationLoading } = useQuery({
    queryKey: ['admin', 'org-verifications', verificationStatusFilter],
    queryFn: async () => {
      const res = await api.get<{ data?: OrgWithCount[] }>(endpoints.admin.orgVerifications, {
        params: {
          status: verificationStatusFilter || undefined,
          limit: 100,
        },
      });
      const body = res.data;
      const items = body?.data ?? (Array.isArray(body) ? body : []);
      return Array.isArray(items) ? items : [];
    },
  });

  const { data: verificationDocs, isLoading: verificationDocsLoading } = useQuery({
    queryKey: ['admin', 'org-verification-docs', selectedVerificationOrg?.id],
    enabled: verificationModalOpen && !!selectedVerificationOrg?.id,
    queryFn: async () => {
      if (!selectedVerificationOrg?.id) {
        return null;
      }
      const res = await api.get<{ data?: OrgVerificationDocumentListResponse }>(
        endpoints.admin.orgVerificationDocs(selectedVerificationOrg.id),
      );
      return res.data?.data ?? null;
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return orgsData;
    const q = search.toLowerCase();
    return orgsData.filter((o) => o.name?.toLowerCase().includes(q));
  }, [orgsData, search]);

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrg) throw new Error('No organization selected');
      await api.patch(endpoints.admin.updateOrgStatus(selectedOrg.id), { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orgs'] });
      toast.success('Organization status updated');
      setManageModalOpen(false);
      setSelectedOrg(null);
      setConfirmOpen(false);
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const reviewVerificationMutation = useMutation({
    mutationFn: async (payload: ReviewOrgVerificationPayload & { orgId: string }) => {
      await api.patch(endpoints.admin.reviewOrgVerification(payload.orgId), {
        action: payload.action,
        reviewNotes: payload.reviewNotes,
        verifiedDomains: payload.verifiedDomains,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'org-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orgs'] });
      toast.success('Organization verification updated');
      setVerificationModalOpen(false);
      setSelectedVerificationOrg(null);
      setReviewNotes('');
      setVerifiedDomainsInput('');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const openManage = (org: OrgWithCount) => {
    setSelectedOrg(org);
    setNewStatus(org.status === 'SUSPENDED' ? 'ACTIVE' : org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
    setManageModalOpen(true);
  };

  const openVerificationReview = (org: OrgWithCount) => {
    setSelectedVerificationOrg(org);
    setReviewNotes(org.verificationReviewNotes ?? '');
    setVerifiedDomainsInput((org.verifiedDomains ?? []).join(', '));
    setVerificationModalOpen(true);
  };

  const parseVerifiedDomains = (): string[] => {
    const domains = verifiedDomainsInput
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(domains));
  };

  const handleReviewVerification = (action: 'APPROVE' | 'REJECT') => {
    if (!selectedVerificationOrg) {
      return;
    }

    const verifiedDomains = parseVerifiedDomains();
    reviewVerificationMutation.mutate({
      orgId: selectedVerificationOrg.id,
      action,
      reviewNotes: reviewNotes.trim() || null,
      ...(action === 'APPROVE' ? { verifiedDomains } : {}),
    });
  };

  const columns: Column<OrgWithCount & Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-fg">{row.name}</span>,
    },
    {
      key: 'members',
      header: 'Members',
      render: (row) => (
        <span className="text-fg-muted">{row._count?.members ?? 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status as OrgStatus}</Badge>,
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
            openManage(row);
          }}
        >
          Manage
        </Button>
      ),
    },
  ];

  const verificationColumns: Column<OrgWithCount & Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Organization',
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium text-fg">{row.name}</p>
          <p className="text-xs text-fg-subtle">{(row.verifiedDomains ?? []).join(', ') || 'No domains set'}</p>
        </div>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Submitted',
      render: (row) => (
        <span className="text-fg-muted">
          {row.verificationSubmittedAt ? new Date(row.verificationSubmittedAt).toLocaleString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'verificationStatus',
      header: 'Verification',
      render: (row) => <Badge>{row.verificationStatus ?? 'PENDING_REVIEW'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button
          variant="primary"
          withBorderEffect={false}
          className="h-8 px-3 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            openVerificationReview(row);
          }}
        >
          Review
        </Button>
      ),
    },
  ];

  const tableData = filtered.map((o) => ({ ...o } as OrgWithCount & Record<string, unknown>));
  const verificationTableData = verificationQueue.map((o) => ({ ...o } as OrgWithCount & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Admin</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Organization Management
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Manage organization status, verification, and domain allowlists.
        </p>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search organizations..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'ACTIVE', label: 'Active' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'PENDING_OTP', label: 'Pending OTP' },
            ],
          },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No organizations found" />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Verification queue</CardTitle>
          <CardDescription>Review organization verification documents and approve trusted domains.</CardDescription>
        </CardHeader>

        <div className="mb-4 flex justify-end">
          <Select
            value={verificationStatusFilter}
            onChange={(event) => setVerificationStatusFilter(event.target.value as '' | OrgVerificationStatus)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'PENDING_REVIEW', label: 'Pending review' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'APPROVED', label: 'Approved' },
            ]}
          />
        </div>

        {verificationLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <DataTable columns={verificationColumns} data={verificationTableData} emptyMessage="No verification records" />
        )}
      </Card>

      <Modal
        open={manageModalOpen}
        onClose={() => {
          setManageModalOpen(false);
          setSelectedOrg(null);
        }}
        title={selectedOrg ? `Manage ${selectedOrg.name}` : 'Manage Organization'}
      >
        {selectedOrg && (
          <div className="space-y-4">
            <Select
              label="Status"
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'SUSPENDED', label: 'Suspended' },
              ]}
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setManageModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" withBorderEffect={false} onClick={() => setConfirmOpen(true)} disabled={updateStatusMutation.isPending}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={verificationModalOpen}
        onClose={() => {
          if (reviewVerificationMutation.isPending) return;
          setVerificationModalOpen(false);
          setSelectedVerificationOrg(null);
        }}
        title={selectedVerificationOrg ? `Review ${selectedVerificationOrg.name}` : 'Review organization verification'}
      >
        <div className="space-y-4">
          <Input
            label="Verified domains (comma-separated)"
            value={verifiedDomainsInput}
            onChange={(event) => setVerifiedDomainsInput(event.target.value)}
            placeholder="example.com, subdomain.example.com"
          />

          <Textarea
            label="Review notes"
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            placeholder="Optional notes for the organization admin"
          />

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-fg-subtle">Verification documents</p>
            {verificationDocsLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-surface-tint" />
            ) : verificationDocs?.items.length ? (
              <div className="space-y-2">
                {verificationDocs.items.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-fg hover:border-border-strong"
                  >
                    <p>{doc.filename}</p>
                    <p className="mt-0.5 text-xs text-fg-subtle">Uploaded {new Date(doc.createdAt).toLocaleString()}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-fg-subtle">No verification documents uploaded.</p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleReviewVerification('REJECT')}
              disabled={reviewVerificationMutation.isPending}
            >
              Reject
            </Button>
            <Button
              type="button"
              variant="primary"
              withBorderEffect={false}
              onClick={() => handleReviewVerification('APPROVE')}
              disabled={reviewVerificationMutation.isPending}
            >
              {reviewVerificationMutation.isPending ? 'Saving...' : 'Approve'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => updateStatusMutation.mutate()}
        title="Confirm status change"
        description={`Are you sure you want to change this organization's status to ${newStatus}?`}
        confirmLabel="Confirm"
        loading={updateStatusMutation.isPending}
      />
    </div>
  );
}
