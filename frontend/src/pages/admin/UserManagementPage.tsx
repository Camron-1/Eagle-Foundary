import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { User, UserRole, UserStatus } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';

export default function UserManagementPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetMfaTarget, setResetMfaTarget] = useState<User | null>(null);

  const { data: usersData = [], isLoading } = useQuery({
    queryKey: ['admin', 'users', statusFilter],
    queryFn: async () => {
      const res = await api.get<{ data?: User[] }>(endpoints.admin.users, {
        params: { limit: 100, ...(statusFilter ? { status: statusFilter } : {}) },
      });
      const body = res.data;
      const items = body?.data ?? (Array.isArray(body) ? body : []);
      return Array.isArray(items) ? items : [];
    },
  });

  const filtered = useMemo(() => {
    let list = usersData;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.email?.toLowerCase().includes(q));
    }
    if (roleFilter) {
      list = list.filter((u) => u.role === roleFilter);
    }
    return list;
  }, [usersData, search, roleFilter]);

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error('No user selected');
      await api.patch(endpoints.admin.updateUserStatus(selectedUser.id), { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User status updated');
      setManageModalOpen(false);
      setSelectedUser(null);
      setConfirmOpen(false);
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const resetMfaMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(endpoints.admin.resetUserMfa(userId), {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User MFA has been reset');
      setResetMfaTarget(null);
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const openManage = (user: User) => {
    setSelectedUser(user);
    setNewStatus(user.status === 'SUSPENDED' ? 'ACTIVE' : user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
    setManageModalOpen(true);
  };

  const columns: Column<User & Record<string, unknown>>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="font-medium text-fg">{row.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge>{row.role as UserRole}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge>{row.status as UserStatus}</Badge>,
    },
    {
      key: 'mfa',
      header: 'MFA',
      render: (row) => <Badge>{row.mfaEnabled ? 'Enabled' : 'Disabled'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setResetMfaTarget(row);
            }}
          >
            Reset MFA
          </Button>
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
        </div>
      ),
    },
  ];

  const tableData = filtered.map((u) => ({ ...u } as User & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Admin</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          User Management
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Search and manage user accounts, roles, status, and MFA state.
        </p>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by email..."
        filters={[
          {
            key: 'role',
            label: 'Role',
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { value: 'STUDENT', label: 'Student' },
              { value: 'COMPANY_ADMIN', label: 'Company Admin' },
              { value: 'COMPANY_MEMBER', label: 'Company Member' },
              { value: 'UNIVERSITY_ADMIN', label: 'University Admin' },
            ],
          },
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'ACTIVE', label: 'Active' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'PENDING_OTP', label: 'Pending OTP' },
              { value: 'PENDING_ORG_VERIFICATION', label: 'Pending Org Verification' },
              { value: 'PENDING_ORG_APPROVAL', label: 'Pending Org Approval' },
            ],
          },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No users found" />
      )}

      <Modal
        open={manageModalOpen}
        onClose={() => {
          setManageModalOpen(false);
          setSelectedUser(null);
        }}
        title={selectedUser ? `Manage ${selectedUser.email}` : 'Manage User'}
      >
        {selectedUser && (
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

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          updateStatusMutation.mutate();
        }}
        title="Confirm status change"
        description={`Are you sure you want to change this user's status to ${newStatus}?`}
        confirmLabel="Confirm"
        loading={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        open={!!resetMfaTarget}
        onClose={() => setResetMfaTarget(null)}
        onConfirm={() => {
          if (!resetMfaTarget) return;
          resetMfaMutation.mutate(resetMfaTarget.id);
        }}
        title={`Reset MFA for ${resetMfaTarget?.email ?? 'this user'}?`}
        description="This revokes all active sessions and requires MFA setup again on next login."
        confirmLabel="Reset MFA"
        loading={resetMfaMutation.isPending}
      />
    </div>
  );
}
