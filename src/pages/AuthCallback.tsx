import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login?error=auth_failed');
          return;
        }

        if (session?.user) {
          // Get user profile to determine redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, onboarding_completed')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const dashboardRoutes: Record<string, string> = {
              candidate: '/dashboard/candidate',
              mentor: '/dashboard/mentor',
              employer: '/dashboard/employer',
              school_admin: '/dashboard/school',
              admin: '/dashboard/admin',
            };

            const redirectTo = dashboardRoutes[profile.role] || '/';
            navigate(redirectTo);
          } else {
            navigate('/join');
          }
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=auth_failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
