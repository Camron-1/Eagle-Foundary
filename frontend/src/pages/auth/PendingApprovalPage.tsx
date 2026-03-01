import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/store/authStore';

export default function PendingApprovalPage(): JSX.Element {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'SUSPENDED') {
    return <Navigate to="/unauthorized" replace />;
  }

  if (user.status === 'ACTIVE') {
    return <Navigate to="/dashboard" replace />;
  }

  const pendingType = user.pendingContext?.type ?? (
    user.status === 'PENDING_ORG_VERIFICATION' ? 'ORG_VERIFICATION_PENDING' : 'ORG_APPROVAL_PENDING'
  );

  const title = pendingType === 'ORG_VERIFICATION_PENDING'
    ? 'Organization verification in review'
    : pendingType === 'ORG_APPROVAL_REJECTED'
      ? 'Organization access request rejected'
      : 'Organization access request pending';

  const description = pendingType === 'ORG_VERIFICATION_PENDING'
    ? 'A university admin must verify your organization documents before company access is enabled.'
    : pendingType === 'ORG_APPROVAL_REJECTED'
      ? 'A company admin rejected your organization access request.'
      : 'A company admin must approve your organization access request before company features are enabled.';

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-10">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Account Status</p>
        <h1 className="ef-heading-gradient mt-2 text-3xl font-semibold md:text-4xl">
          Access Pending
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            <span className="text-zinc-500">Organization:</span>{' '}
            {user.pendingContext?.orgName ?? user.org?.name ?? 'Not available'}
          </p>

          {user.pendingContext?.reviewNotes && (
            <p>
              <span className="text-zinc-500">Review notes:</span>{' '}
              {user.pendingContext.reviewNotes}
            </p>
          )}

          {user.pendingContext?.joinRequestNote && (
            <p>
              <span className="text-zinc-500">Admin note:</span>{' '}
              {user.pendingContext.joinRequestNote}
            </p>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={() => navigate('/notifications')}>
          Open notifications
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
