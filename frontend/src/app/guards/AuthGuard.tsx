import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/authStore';

export default function AuthGuard(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-page" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
