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
            .maybeSingle();

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
            navigate('/get-started');
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
    <div data-theme="paper" className="min-h-screen bg-background text-foreground flex items-center justify-center paper-grain">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
        <p className="mono-label text-foreground/60">Completing sign in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
