import { Navigate } from 'react-router-dom';
import { useAuth } from '@/store/authStore';

export default function DashboardPage(): JSX.Element {
  const { role, user, isLoading } = useAuth();

  if (isLoading) return null as unknown as JSX.Element;
  if (user?.status === 'PENDING_ORG_VERIFICATION' || user?.status === 'PENDING_ORG_APPROVAL') {
    return <Navigate to="/pending-approval" replace />;
  }
  if (role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
  if (role === 'COMPANY_ADMIN' || role === 'COMPANY_MEMBER') return <Navigate to="/company/org" replace />;
  if (role === 'UNIVERSITY_ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}
