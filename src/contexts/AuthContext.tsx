import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, signInWithOAuth, createProfile } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Tables']['profiles']['Row']['role'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (
    email: string,
    password: string,
    metadata: { firstName: string; lastName: string; role: UserRole }
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithLinkedIn: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile, create if doesn't exist
  const fetchProfile = useCallback(async (userId: string, user?: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it from user metadata
        if (user) {
          const metadata = user.user_metadata || {};
          await createProfile(
            userId,
            user.email || '',
            metadata.first_name || '',
            metadata.last_name || '',
            metadata.role || 'candidate'
          );
          // Fetch again after creation
          const { data: newData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return newData;
        }
        return null;
      }

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id, user);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const profileData = await fetchProfile(initialSession.user.id, initialSession.user);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Fetch or create profile
          const profileData = await fetchProfile(currentSession.user.id, currentSession.user);
          setProfile(profileData);
        } else {
          setProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Auth methods
  const handleSignUp = async (
    email: string,
    password: string,
    metadata: { firstName: string; lastName: string; role: UserRole }
  ) => {
    const { error } = await signUp(email, password, metadata);
    return { error: error as Error | null };
  };

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    return { error: error as Error | null };
  };

  const handleSignInWithGoogle = async () => {
    const { error } = await signInWithOAuth('google');
    return { error: error as Error | null };
  };

  const handleSignInWithLinkedIn = async () => {
    const { error } = await signInWithOAuth('linkedin_oidc');
    return { error: error as Error | null };
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithLinkedIn: handleSignInWithLinkedIn,
    signOut: handleSignOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for getting user role
export function useUserRole() {
  const { profile } = useAuth();
  return profile?.role ?? null;
}

// Hook for checking if user has specific role
export function useHasRole(role: UserRole | UserRole[]) {
  const userRole = useUserRole();
  if (!userRole) return false;
  if (Array.isArray(role)) {
    return role.includes(userRole);
  }
  return userRole === role;
}
