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
          navigate(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }

        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, onboarding_completed')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Auth callback profile error:', profileError);
            navigate(`/login?error=${encodeURIComponent(profileError.message)}`);
            return;
          }

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
          navigate('/login?error=' + encodeURIComponent('Your sign-in session could not be found. Please try again.'));
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        const message = err instanceof Error ? err.message : 'Sign in could not be completed';
        navigate(`/login?error=${encodeURIComponent(message)}`);
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
