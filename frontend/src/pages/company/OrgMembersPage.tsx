import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  AddOrgMemberPayload,
  OrgJoinRequest,
  ReviewOrgJoinRequestPayload,
  UserRole,
  OrgPermissions,
} from '@/lib/api/types';
import { getEffectiveOrgPermissions } from '@/lib/utils/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';

interface OrgMember {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  orgPermissions?: OrgPermissions | null;
}

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['COMPANY_ADMIN', 'COMPANY_MEMBER', 'COMPANY_VIEWER']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

function getRequesterName(request: OrgJoinRequest): string {
  if (request.user?.studentProfile) {
    const { firstName, lastName } = request.user.studentProfile;
    return `${firstName} ${lastName}`.trim();
  }

  return request.user?.email ?? 'Unknown user';
}

function EditPermissionsModal({
  member,
  onClose,
  onSave,
  isPending
}: {
  member: OrgMember;
  onClose: () => void;
  onSave: (role: UserRole, perms: OrgPermissions | null) => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState<UserRole>(member.role);
  
  // Initialize with exact overrides from database but fallback defaults to UI nicely
  // Actually, we should show the *effective* permissions disabled if they are derived.
  const [perms, setPerms] = useState<OrgPermissions>(member.orgPermissions || {});

  const effectivePerms = getEffectiveOrgPermissions({ ...member, role, orgPermissions: perms } as any);

  const toggleOverride = (key: keyof OrgPermissions) => {
    setPerms(prev => {
      const next = { ...prev };
      // By toggling, we invert the *effective* permission for this role.
      // But we just store the explicit override in DB.
      next[key] = !effectivePerms[key];
      return next;
    });
  };

  const isRoleAdmin = role === 'COMPANY_ADMIN';

  return (
    <Modal open onClose={onClose} title={`Edit Permissions: ${member.email}`}>
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-fg">Role</label>
          <Select
            options={[
              { value: 'COMPANY_ADMIN', label: 'Company Admin' },
              { value: 'COMPANY_MEMBER', label: 'Company Member (Mid-level)' },
              { value: 'COMPANY_VIEWER', label: 'Company Viewer (Read-only)' },
            ]}
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole);
              // reset perms overrides when role changes to avoid confusing states
              setPerms({});
            }}
          />
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-fg">Granular Permissions</label>
          {isRoleAdmin && (
            <p className="text-xs text-amber-500/80 mb-2">Admins automatically have all permissions. You cannot override these.</p>
          )}

          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-tint/50 p-4">
            <PermissionToggle
              label="Manage Organization Members"
              description="Invite, remove, or modify roles of other members."
              checked={!!effectivePerms.canManageMembers}
              disabled={isRoleAdmin}
              onChange={() => toggleOverride('canManageMembers')}
            />
            <PermissionToggle
              label="Invite Members"
              description="Send invitations to join the organization (requires admin approval if they lack manage permission)."
              checked={!!effectivePerms.canInviteMembers}
              disabled={isRoleAdmin}
              onChange={() => toggleOverride('canInviteMembers')}
            />
            <PermissionToggle
              label="Manage Opportunities"
              description="Create, edit, and publish opportunities."
              checked={!!effectivePerms.canManageOpportunities}
              disabled={isRoleAdmin}
              onChange={() => toggleOverride('canManageOpportunities')}
            />
            <PermissionToggle
              label="Manage Projects"
              description="Create, edit, and publish projects."
              checked={!!effectivePerms.canManageProjects}
              disabled={isRoleAdmin}
              onChange={() => toggleOverride('canManageProjects')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            withBorderEffect={false}
            onClick={() => onSave(role, Object.keys(perms).length > 0 ? perms : null)}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PermissionToggle({ label, description, checked, disabled, onChange }: any) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-border-strong bg-surface text-brand checked:border-brand checked:bg-brand focus:ring-brand focus:ring-offset-surface"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <div>
        <div className="text-sm font-medium text-fg">{label}</div>
        <div className="text-xs text-fg-subtle">{description}</div>
      </div>
    </label>
  );
}

export default function OrgMembersPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; email: string } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [editPermissionsTarget, setEditPermissionsTarget] = useState<OrgMember | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['orgs', 'me', 'members'],
    queryFn: async () => {
      const res = await api.get<{ data?: OrgMember[] } | OrgMember[]>(endpoints.orgs.members);
      const body = res.data;
      return (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
    },
  });

  const { data: pendingJoinRequests = [], isLoading: joinRequestsLoading } = useQuery({
    queryKey: ['orgs', 'me', 'join-requests'],
    queryFn: async () => {
      const res = await api.get<{
        data?: OrgJoinRequest[];
      }>(endpoints.orgs.joinRequests, {
        params: { status: 'PENDING', limit: 100 },
      });
      const body = res.data;
      const items = body?.data ?? (Array.isArray(body) ? body : []);
      return Array.isArray(items) ? items : [];
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'COMPANY_MEMBER' },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: AddOrgMemberPayload) => {
      await api.post(endpoints.orgs.members, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs', 'me', 'members'] });
      setInviteOpen(false);
      reset();
      toast.success('Invitation sent');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(endpoints.orgs.removeMember(memberId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs', 'me', 'members'] });
      setRemoveTarget(null);
      toast.success('Member removed');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ReviewOrgJoinRequestPayload }) => {
      await api.patch(endpoints.orgs.reviewJoinRequest(id), payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs', 'me', 'join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['orgs', 'me', 'members'] });
      toast.success('Join request reviewed');
      setReviewTarget(null);
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const editPermissionsMutation = useMutation({
    mutationFn: async (payload: { id: string; role: UserRole; orgPermissions: OrgPermissions | null }) => {
      await api.patch(endpoints.orgs.updateMemberPermissions(payload.id), {
        role: payload.role,
        orgPermissions: payload.orgPermissions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs', 'me', 'members'] });
      toast.success('Permissions updated');
      setEditPermissionsTarget(null);
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const onInvite = (values: InviteFormValues) => {
    inviteMutation.mutate({ email: values.email, role: values.role });
  };

  const columns: Column<OrgMember & Record<string, unknown>>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-fg-muted">{row.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge>{row.role}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="text-xs text-fg-muted hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              setEditPermissionsTarget(row as OrgMember);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="text-xs text-red-400 hover:text-red-300"
            onClick={(e) => {
              e.stopPropagation();
              setRemoveTarget({ id: row.id, email: row.email });
            }}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  const tableData = members.map((m) => ({ ...m } as OrgMember & Record<string, unknown>));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Company</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="ef-heading-gradient text-4xl font-semibold leading-tight md:text-5xl">
            Organization Members
          </h1>
          <Button variant="primary" withBorderEffect={false} onClick={() => setInviteOpen(true)}>
            Invite Member
          </Button>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-fg-muted md:text-base">
          Manage who has access to your organization.
        </p>
      </header>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-surface-tint" />
      ) : (
        <DataTable columns={columns} data={tableData} emptyMessage="No members yet" />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending access requests</CardTitle>
          <CardDescription>Approve or reject self-signup requests for your organization.</CardDescription>
        </CardHeader>

        {joinRequestsLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-surface-tint" />
        ) : pendingJoinRequests.length === 0 ? (
          <p className="text-sm text-fg-subtle">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {pendingJoinRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface px-3 py-2.5"
              >
                <div className="space-y-0.5">
                  <p className="text-sm text-fg">{getRequesterName(request)}</p>
                  <p className="text-xs text-fg-subtle">{request.user?.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="text-xs text-fg-muted hover:text-fg"
                    onClick={() => setReviewTarget({ id: request.id, action: 'REJECT' })}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    withBorderEffect={false}
                    className="text-xs"
                    onClick={() => setReviewTarget({ id: request.id, action: 'APPROVE' })}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Member">
        <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="colleague@company.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <Select
            label="Role"
            options={[
              { value: 'COMPANY_ADMIN', label: 'Company Admin' },
              { value: 'COMPANY_MEMBER', label: 'Company Member (Mid-level)' },
              { value: 'COMPANY_VIEWER', label: 'Company Viewer (Read-only)' },
            ]}
            {...register('role')}
            error={errors.role?.message}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" withBorderEffect={false} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Sending...' : 'Invite'}
            </Button>
          </div>
        </form>
      </Modal>

      {editPermissionsTarget && (
        <EditPermissionsModal 
          member={editPermissionsTarget}
          onClose={() => setEditPermissionsTarget(null)}
          onSave={(role, perms) => editPermissionsMutation.mutate({ id: editPermissionsTarget.id, role, orgPermissions: perms })}
          isPending={editPermissionsMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
        title={`Remove ${removeTarget?.email ?? 'this member'}?`}
        description="They will lose access to the organization."
        confirmLabel="Remove"
        loading={removeMutation.isPending}
      />

      <ConfirmDialog
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        onConfirm={() => {
          if (!reviewTarget) return;
          reviewMutation.mutate({
            id: reviewTarget.id,
            payload: { action: reviewTarget.action },
          });
        }}
        title={reviewTarget?.action === 'APPROVE' ? 'Approve join request?' : 'Reject join request?'}
        description={
          reviewTarget?.action === 'APPROVE'
            ? 'This user will be activated as a company member.'
            : 'This user will remain blocked until a new approval is granted.'
        }
        confirmLabel={reviewTarget?.action === 'APPROVE' ? 'Approve' : 'Reject'}
        loading={reviewMutation.isPending}
      />
    </div>
  );
}
