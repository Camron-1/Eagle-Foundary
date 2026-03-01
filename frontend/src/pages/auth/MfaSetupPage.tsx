import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, unwrapApiData } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';
import { downloadBackupCodes } from '@/lib/security/backupCodes';
import { createQrCodeDataUrl } from '@/lib/security/qr';
import { useAuth, useAuthStore } from '@/store/authStore';
import type { MfaSetupCompleteResponse, MfaSetupStartResponse } from '@/lib/api/types';

const dashboardByRole: Record<string, string> = {
  STUDENT: '/student/dashboard',
  COMPANY_ADMIN: '/company/org',
  COMPANY_MEMBER: '/company/org',
  UNIVERSITY_ADMIN: '/admin',
};

interface LocationState {
  challengeToken?: string;
  from?: string;
}

export default function MfaSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { completeMfaSetup, pendingMfaChallenge } = useAuthStore();

  const state = (location.state as LocationState | null) ?? null;
  const challengeToken = state?.challengeToken ?? (
    pendingMfaChallenge?.nextStep === 'MFA_SETUP' ? pendingMfaChallenge.challengeToken : undefined
  );

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [setupError, setSetupError] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    if (!challengeToken) {
      setLoadingSetup(false);
      return;
    }

    let active = true;
    setLoadingSetup(true);
    setSetupError('');

    api.post(endpoints.auth.mfaSetupStart, { challengeToken })
      .then((res) => {
        if (!active) return;
        const payload = unwrapApiData<MfaSetupStartResponse>(res.data);
        setSecret(payload.secret);
        setOtpauthUrl(payload.otpauthUrl);
      })
      .catch((err) => {
        if (!active) return;
        const apiErr = err instanceof ApiError ? err : parseApiError(err);
        setSetupError(apiErr.message);
      })
      .finally(() => {
        if (active) setLoadingSetup(false);
      });

    return () => {
      active = false;
    };
  }, [challengeToken]);

  const destination = useMemo(() => {
    const from = state?.from;
    if (typeof from === 'string' && from.trim()) {
      return from;
    }
    return dashboardByRole[user?.role ?? ''] ?? '/dashboard';
  }, [state?.from, user?.role]);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [qrCodeError, setQrCodeError] = useState('');

  useEffect(() => {
    let mounted = true;

    if (!otpauthUrl) {
      setQrCodeDataUrl('');
      setQrCodeError('');
      return () => {
        mounted = false;
      };
    }

    createQrCodeDataUrl(otpauthUrl)
      .then((dataUrl) => {
        if (!mounted) return;
        setQrCodeDataUrl(dataUrl);
        setQrCodeError('');
      })
      .catch(() => {
        if (!mounted) return;
        setQrCodeDataUrl('');
        setQrCodeError('QR generation is unavailable right now. Use the manual key below.');
      });

    return () => {
      mounted = false;
    };
  }, [otpauthUrl]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!challengeToken) {
      toast.error('Missing MFA setup challenge. Please sign in again.');
      navigate('/login', { replace: true });
      return;
    }

    const normalizedCode = code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      toast.error('Enter a valid 6-digit authenticator code.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await completeMfaSetup({
        challengeToken,
        code: normalizedCode,
      }) as MfaSetupCompleteResponse;
      setBackupCodes(result.backupCodes);
      downloadBackupCodes(result.backupCodes, 'initial_setup');
      toast.success('Two-factor authentication enabled.');
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!challengeToken) {
    return <Navigate to="/login" replace />;
  }

  if (backupCodes.length > 0) {
    return (
      <div className="space-y-6">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Account Security</p>
        <h1 className="ef-heading-gradient mt-2 text-2xl font-semibold md:text-3xl">Save your backup codes</h1>
        <p className="text-sm text-zinc-400">
          Store these one-time backup codes in a safe place. Each code can only be used once.
        </p>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-zinc-200">
          {backupCodes.map((backupCode) => (
            <code key={backupCode} className="rounded bg-white/5 px-2 py-1">{backupCode}</code>
          ))}
        </div>

        <Button
          variant="primary"
          onClick={() => navigate(destination, { replace: true })}
          className="w-full"
        >
          Continue to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Account Security</p>
      <h1 className="ef-heading-gradient mt-2 text-2xl font-semibold md:text-3xl">Set up two-factor authentication</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Add Eagle-Foundry to your authenticator app and enter the 6-digit code to finish sign-in.
      </p>

      {loadingSetup ? (
        <div className="mt-6 h-24 animate-pulse rounded-xl bg-white/5" />
      ) : setupError ? (
        <p className="mt-6 text-sm text-red-400">{setupError}</p>
      ) : (
        <>
          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-black/55 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Scan QR code</p>
            {qrCodeDataUrl ? (
              <div className="rounded-xl bg-white p-3">
                <img src={qrCodeDataUrl} alt="MFA setup QR code" className="mx-auto h-56 w-56" />
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                {qrCodeError || 'Generating QR code...'}
              </p>
            )}
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Manual setup key</p>
            <code className="block break-all rounded bg-white/5 px-3 py-2 text-sm text-zinc-100">{secret}</code>
            <p className="text-xs text-zinc-500">If QR import is unavailable, enter this key manually in your authenticator app.</p>
            {otpauthUrl && (
              <a
                href={otpauthUrl}
                className="text-xs text-zinc-300 underline underline-offset-4 hover:text-white"
              >
                Open authenticator link
              </a>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Input
              label="Authenticator code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
            />

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? 'Verifying...' : 'Enable MFA'}
            </Button>
          </form>
        </>
      )}

      <div className="mt-5 text-sm text-zinc-400">
        <Link to="/login" className="underline underline-offset-4 hover:text-white">Back to login</Link>
      </div>
    </div>
  );
}
