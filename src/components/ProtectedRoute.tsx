import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role if specified
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard based on role
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

// Component for public-only routes (login, signup)
interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, redirect to dashboard
  if (isAuthenticated && profile) {
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
