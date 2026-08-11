import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { Database } from '@/types/database.types';

type UserRole = Database['public']['Tables']['profiles']['Row']['role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen message="Verifying your entry in the register" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/get-started" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    const dashboardRoutes: Record<UserRole, string> = {
      candidate: '/dashboard/candidate',
      mentor: '/dashboard/mentor',
      employer: '/dashboard/employer',
      school_admin: '/dashboard/school',
      admin: '/dashboard/admin',
    };
    const userDashboard = dashboardRoutes[profile.role] || '/';
    return <Navigate to={userDashboard} replace />;
  }

  return <>{children}</>;
}

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="One moment — checking the register" />;
  }

  if (isAuthenticated && profile) {
    if (!profile.onboarding_completed) {
      return <Navigate to="/get-started" replace />;
    }
    const dashboardRoutes: Record<UserRole, string> = {
      candidate: '/dashboard/candidate',
      mentor: '/dashboard/mentor',
      employer: '/dashboard/employer',
      school_admin: '/dashboard/school',
      admin: '/dashboard/admin',
    };
    const userDashboard = dashboardRoutes[profile.role] || '/';
    return <Navigate to={userDashboard} replace />;
  }

  return <>{children}</>;
}
