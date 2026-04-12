import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/store/authStore';

export default function ActiveUserGuard(): JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-page" />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'PENDING_OTP') {
    return <Navigate to="/verify-otp" replace />;
  }

  if (user.status === 'PENDING_ORG_VERIFICATION' || user.status === 'PENDING_ORG_APPROVAL') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (user.status === 'SUSPENDED') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
