import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ApiError, parseApiError } from '@/lib/api/errors';
import { useAuth, useAuthStore } from '@/store/authStore';

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

export default function MfaChallengePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { verifyMfa, pendingMfaChallenge } = useAuthStore();

  const state = (location.state as LocationState | null) ?? null;
  const challengeToken = state?.challengeToken ?? (
    pendingMfaChallenge?.nextStep === 'MFA_VERIFY' ? pendingMfaChallenge.challengeToken : undefined
  );

  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const destination = useMemo(() => {
    const from = state?.from;
    if (typeof from === 'string' && from.trim()) {
      return from;
    }
    return dashboardByRole[user?.role ?? ''] ?? '/dashboard';
  }, [state?.from, user?.role]);

  if (!challengeToken) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!useBackupCode && !/^\d{6}$/.test(code.trim())) {
      toast.error('Enter a valid 6-digit authenticator code.');
      return;
    }

    if (useBackupCode && backupCode.trim().length < 4) {
      toast.error('Enter a valid backup code.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await verifyMfa({
        challengeToken,
        ...(useBackupCode
          ? { backupCode: backupCode.trim() }
          : { code: code.trim() }),
      });

      if (result.usedBackupCode) {
        toast.success('Signed in using backup code.');
      } else {
        toast.success('Sign-in verified.');
      }

      navigate(destination, { replace: true });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Account Security</p>
      <h1 className="ef-heading-gradient mt-2 text-2xl font-semibold md:text-3xl">Enter verification code</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Complete sign-in using your authenticator app.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {!useBackupCode ? (
          <Input
            label="Authenticator code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
          />
        ) : (
          <Input
            label="Backup code"
            value={backupCode}
            onChange={(event) => setBackupCode(event.target.value.trim())}
            placeholder="ABCD-EFGH"
          />
        )}

        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? 'Verifying...' : 'Verify and continue'}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap gap-4 text-sm text-fg-muted">
        <button
          type="button"
          className="underline underline-offset-4 hover:text-fg"
          onClick={() => setUseBackupCode((prev) => !prev)}
        >
          {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
        </button>
        <Link to="/login" className="underline underline-offset-4 hover:text-fg">Back to login</Link>
      </div>
    </div>
  );
}
