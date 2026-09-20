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

/**
 * A person's name out of whatever the identity provider happened to send.
 *
 * This application's own sign-up writes first_name and last_name. An
 * OAuth provider does not: Google sends given_name and family_name when
 * it has them, and otherwise only a single `name` (or `full_name`).
 *
 * Splitting a single name on the first space is a guess, and it is wrong
 * for plenty of real names. It is still better than recording nobody at
 * all, and the person can correct it in their profile. What this must not
 * do is return two empty strings when the provider plainly told us who
 * the account belongs to.
 */
export function deriveNames(
  metadata: Record<string, unknown>,
): { firstName: string; lastName: string } {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  const first = str(metadata.first_name) || str(metadata.given_name);
  const last = str(metadata.last_name) || str(metadata.family_name);
  if (first || last) return { firstName: first, lastName: last };

  const whole = str(metadata.full_name) || str(metadata.name);
  if (!whole) return { firstName: '', lastName: '' };

  const parts = whole.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
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
          // PLC-005 Note 1 (e) — role is never taken from client-held
          // metadata. user_metadata.role originates in the sign-up request
          // and is therefore attacker-controlled; trusting it here was the
          // client half of the self-assertion defect closed in migration
          // 20260918000000_t3a_close_role_self_assertion.sql.
          //
          // Individual (candidate) is the only role a person may take for
          // themselves. Mentor is granted by invitation and employer by
          // approved application, both derived server-side. The database
          // refuses anything else from a client session regardless; this
          // keeps the client from sending a request that can only fail.
          // first_name/last_name are what this application's own sign-up
          // writes. An OAuth provider does not use those keys: Google
          // sends given_name/family_name, or only a single `name`. Reading
          // just the first pair left every Google account with a blank
          // name, which is worse than cosmetic — the oversight-standing
          // guard verifies that an email belongs to an account but does
          // not verify the name, so a profile with no name on record will
          // accept whatever name is typed against it.
          const { firstName, lastName } = deriveNames(metadata);

          const { error: createErr } = await createProfile(
            userId,
            userObj.email || '',
            firstName,
            lastName,
            'candidate'
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
