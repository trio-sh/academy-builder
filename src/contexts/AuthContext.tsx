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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Timeout for profile fetching (5 seconds)
const PROFILE_FETCH_TIMEOUT = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use ref to track if component is mounted
  const isMounted = useRef(true);
  // Track if we're currently fetching profile to avoid race conditions
  const isFetchingProfile = useRef(false);

  // Fetch user profile with timeout
  const fetchProfile = useCallback(async (userId: string, userObj?: User): Promise<Profile | null> => {
    if (isFetchingProfile.current) {
      return null;
    }

    isFetchingProfile.current = true;

    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), PROFILE_FETCH_TIMEOUT);
      });

      // Fetch profile with timeout
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as Awaited<typeof fetchPromise>;

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it from user metadata
        if (userObj) {
          const metadata = userObj.user_metadata || {};
          await createProfile(
            userId,
            userObj.email || '',
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
    } finally {
      isFetchingProfile.current = false;
    }
  }, []);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id, user);
      if (isMounted.current) {
        setProfile(profileData);
      }
    }
  }, [user, fetchProfile]);

  // Initialize auth state
  useEffect(() => {
    isMounted.current = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!isMounted.current) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);

          // Fetch profile with timeout
          const profileData = await fetchProfile(initialSession.user.id, initialSession.user);
          if (isMounted.current) {
            setProfile(profileData);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Even on error, we need to stop loading
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

    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted.current) return;

        // Update session and user immediately
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession?.user) {
            // Use setTimeout to avoid blocking the auth state change
            // This helps with Supabase's internal state management
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

        // For other events like INITIAL_SESSION, let initAuth handle it
        if (event === 'INITIAL_SESSION' && !isInitialized) {
          return; // initAuth will handle this
        }
      }
    );

    authSubscription = subscription;

    // Initialize auth
    initAuth();

    return () => {
      isMounted.current = false;
      authSubscription?.unsubscribe();
    };
  }, [fetchProfile, isInitialized]);

  // Safety timeout - ensure loading doesn't stay forever
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading && isMounted.current) {
        console.warn('Auth loading timeout - forcing completion');
        setIsLoading(false);
      }
    }, 10000); // 10 second max loading time

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Auth methods
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
    }
    // Don't set loading to false on success - let onAuthStateChange handle it
    return { error: error as Error | null };
  };

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setIsLoading(false);
    }
    // Don't set loading to false on success - let onAuthStateChange handle it
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
    setIsLoading(true);
    await signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsLoading(false);
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
