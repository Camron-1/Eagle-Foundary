import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrapApiData } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  AuthSession,
  MfaBackupCodesResponse,
  MfaRegenerateBackupCodesPayload,
  MfaStatus,
  RevokeOtherSessionsResponse,
} from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';
import { downloadBackupCodes } from '@/lib/security/backupCodes';

export default function SecurityPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [regenOpen, setRegenOpen] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [latestBackupCodes, setLatestBackupCodes] = useState<string[]>([]);

  const { data: mfaStatus, isLoading: mfaLoading } = useQuery({
    queryKey: ['auth', 'mfa-status'],
    queryFn: async () => {
      const res = await api.get(endpoints.auth.mfaStatus);
      return unwrapApiData<MfaStatus>(res.data);
    },
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => {
      const res = await api.get(endpoints.auth.sessions);
      return unwrapApiData<AuthSession[]>(res.data);
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(endpoints.auth.revokeSession(sessionId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      toast.success('Session revoked');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const revokeOthersMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(endpoints.auth.revokeOtherSessions, {});
      return unwrapApiData<RevokeOtherSessionsResponse>(res.data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      toast.success(`${result.revokedCount} session(s) revoked`);
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async (payload: MfaRegenerateBackupCodesPayload) => {
      const res = await api.post(endpoints.auth.mfaBackupCodesRegenerate, payload);
      return unwrapApiData<MfaBackupCodesResponse>(res.data);
    },
    onSuccess: (result) => {
      setLatestBackupCodes(result.backupCodes);
      downloadBackupCodes(result.backupCodes, 'regenerated');
      setTotpCode('');
      queryClient.invalidateQueries({ queryKey: ['auth', 'mfa-status'] });
      toast.success('Backup codes regenerated');
    },
    onError: (err) => {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    },
  });

  const activeSessionCount = useMemo(
    () => sessions.filter((session) => !session.isCurrent).length,
    [sessions],
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Settings</p>
        <h1 className="ef-heading-gradient mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          Security
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-300 md:text-base">
          Manage two-factor authentication, backup codes, and active sessions.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>Authenticator app MFA is mandatory for all accounts.</CardDescription>
        </CardHeader>

        {mfaLoading ? (
          <div className="h-16 animate-pulse rounded-xl bg-white/5" />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge>{mfaStatus?.mfaEnabled ? 'Enabled' : 'Pending setup'}</Badge>
              </div>
              <p className="text-sm text-zinc-400">
                Backup codes remaining: <span className="text-zinc-200">{mfaStatus?.backupCodesRemaining ?? 0}</span>
              </p>
            </div>

            <Button variant="ghost" onClick={() => setRegenOpen(true)}>
              Regenerate backup codes
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Review where your account is signed in and revoke suspicious sessions.</CardDescription>
        </CardHeader>

        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <Button
            variant="primary"
            withBorderEffect={false}
            onClick={() => revokeOthersMutation.mutate()}
            disabled={revokeOthersMutation.isPending || activeSessionCount === 0}
          >
            {revokeOthersMutation.isPending ? 'Revoking...' : 'Revoke other sessions'}
          </Button>
        </div>

        {sessionsLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : sessions.length === 0 ? (
          <p className="text-sm text-zinc-500">No active sessions found.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Last Used</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-t border-white/10 text-zinc-200">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{session.userAgent || 'Unknown device'}</span>
                        {session.isCurrent && <Badge>Current</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(session.lastUsedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(session.expiresAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        className="text-xs text-red-400 hover:text-red-300"
                        disabled={revokeSessionMutation.isPending}
                        onClick={() => revokeSessionMutation.mutate(session.id)}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={regenOpen}
        onClose={() => {
          if (regenerateBackupCodesMutation.isPending) return;
          setRegenOpen(false);
          setTotpCode('');
        }}
        title="Regenerate backup codes"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Enter a current authenticator code to generate new backup codes. Existing backup codes will be invalidated.
          </p>

          <Input
            label="Authenticator code"
            value={totpCode}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />

          {latestBackupCodes.length > 0 && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/45 p-3 text-xs text-zinc-100">
              {latestBackupCodes.map((code) => (
                <code key={code} className="rounded bg-white/5 px-2 py-1">{code}</code>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRegenOpen(false)}
              disabled={regenerateBackupCodesMutation.isPending}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={regenerateBackupCodesMutation.isPending}
              onClick={() => {
                if (!/^\d{6}$/.test(totpCode.trim())) {
                  toast.error('Enter a valid 6-digit authenticator code.');
                  return;
                }
                regenerateBackupCodesMutation.mutate({ code: totpCode.trim() });
              }}
            >
              {regenerateBackupCodesMutation.isPending ? 'Generating...' : 'Generate new codes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
