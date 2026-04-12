import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/store/authStore';
import type { UserRole } from '@/lib/api/types';

interface Props {
  allowed: UserRole[];
}

export default function RoleGuard({ allowed }: Props): JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-page" />;

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
