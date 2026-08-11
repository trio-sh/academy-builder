import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, signInWithOAuth, createProfile } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Tables']['profiles']['Row']['role'];

type EntryPath = 'resume_upload' | 'liveworks' | 'civic_access';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (
    email: string,
    password: string,
    metadata: {
      firstName: string;
      lastName: string;
      role: UserRole;
      entryPath?: EntryPath;
      companyName?: string;
      schoolName?: string;
      industry?: string;
      yearsExperience?: number;
    }
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithLinkedIn: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_FETCH_TIMEOUT = 5000;

/** Surface an auth error as a toast — no more silent console.errors. */
function surfaceAuthError(title: string, err: unknown) {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'An unexpected error occurred';
  console.error(`[auth] ${title}:`, err);
  toast({
    title,
    description: message,
    variant: 'destructive',
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const isMounted = useRef(true);
  const isFetchingProfile = useRef(false);

  const fetchProfile = useCallback(async (userId: string, userObj?: User): Promise<Profile | null> => {
    if (isFetchingProfile.current) return null;
    isFetchingProfile.current = true;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timed out')), PROFILE_FETCH_TIMEOUT);
      });

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as Awaited<typeof fetchPromise>;

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist — bootstrap from user metadata.
        if (userObj) {
          const metadata = userObj.user_metadata || {};
          const { error: createErr } = await createProfile(
            userId,
            userObj.email || '',
            metadata.first_name || '',
            metadata.last_name || '',
            metadata.role || 'candidate'
          );
          if (createErr) {
            surfaceAuthError('Could not create your profile', createErr);
            return null;
          }
          const { data: newData, error: refetchErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (refetchErr) {
            surfaceAuthError('Profile was created but could not be loaded', refetchErr);
            return null;
          }
          return newData;
        }
        return null;
      }

      if (error) {
        surfaceAuthError('Could not load your profile', error);
        return null;
      }

      return data;
    } catch (err) {
      surfaceAuthError('Could not load your profile', err);
      return null;
    } finally {
      isFetchingProfile.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id, user);
      if (isMounted.current) {
        setProfile(profileData);
      }
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    isMounted.current = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          surfaceAuthError('Could not restore your session', error);
        }
        if (!isMounted.current) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          const profileData = await fetchProfile(initialSession.user.id, initialSession.user);
          if (isMounted.current) setProfile(profileData);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        surfaceAuthError('Could not initialise authentication', err);
        if (isMounted.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted.current) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession?.user) {
            setTimeout(async () => {
              if (!isMounted.current) return;
              const profileData = await fetchProfile(currentSession.user.id, currentSession.user);
              if (isMounted.current) {
                setProfile(profileData);
                setIsLoading(false);
              }
            }, 0);
          }
        }

        if (event === 'INITIAL_SESSION' && !isInitialized) {
          return;
        }
      }
    );

    authSubscription = subscription;
    initAuth();

    return () => {
      isMounted.current = false;
      authSubscription?.unsubscribe();
    };
  }, [fetchProfile, isInitialized]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading && isMounted.current) {
        console.warn('Auth loading timeout - forcing completion');
        setIsLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handleSignUp = async (
    email: string,
    password: string,
    metadata: {
      firstName: string;
      lastName: string;
      role: UserRole;
      entryPath?: EntryPath;
      companyName?: string;
      schoolName?: string;
      industry?: string;
      yearsExperience?: number;
    }
  ) => {
    setIsLoading(true);
    const { error } = await signUp(email, password, metadata);
    if (error) {
      setIsLoading(false);
      surfaceAuthError('Sign up failed', error);
    }
    return { error: error as Error | null };
  };

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setIsLoading(false);
      surfaceAuthError('Sign in failed', error);
    }
    return { error: error as Error | null };
  };

  const handleSignInWithGoogle = async () => {
    const { error } = await signInWithOAuth('google');
    if (error) surfaceAuthError('Google sign-in failed', error);
    return { error: error as Error | null };
  };

  const handleSignInWithLinkedIn = async () => {
    const { error } = await signInWithOAuth('linkedin_oidc');
    if (error) surfaceAuthError('LinkedIn sign-in failed', error);
    return { error: error as Error | null };
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    const { error } = await signOut();
    if (error) {
      surfaceAuthError('Sign out failed', error);
    }
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsLoading(false);
    return { error: error as Error | null };
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
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

export function useUserRole() {
  const { profile } = useAuth();
  return profile?.role ?? null;
}

export function useHasRole(role: UserRole | UserRole[]) {
  const userRole = useUserRole();
  if (!userRole) return false;
  if (Array.isArray(role)) {
    return role.includes(userRole);
  }
  return userRole === role;
}
