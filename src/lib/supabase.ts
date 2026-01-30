import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Supabase configuration using Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Missing Supabase environment variables. Please create a .env.local file with:\n' +
    '- VITE_SUPABASE_URL\n' +
    '- VITE_SUPABASE_PUBLISHABLE_KEY\n' +
    '- VITE_SUPABASE_PROJECT_ID (optional)'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'the3rdacademy-auth',
    },
  }
);

// Auth helper functions
export const signUp = async (
  email: string,
  password: string,
  metadata: {
    firstName: string;
    lastName: string;
    role: 'candidate' | 'mentor' | 'employer' | 'school_admin';
  }
) => {
  // Create the auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: metadata.firstName,
        last_name: metadata.lastName,
        role: metadata.role,
      },
    },
  });

  // If signup successful AND we have a session, create profile
  if (data.user && data.session && !error) {
    // Use the session to create the profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: email,
      first_name: metadata.firstName,
      last_name: metadata.lastName,
      role: metadata.role,
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }
  }

  return { data, error };
};

// Create profile for user (called after session is established)
export const createProfile = async (
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  role: 'candidate' | 'mentor' | 'employer' | 'school_admin'
) => {
  // First check if profile exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (existing) {
    // Profile already exists
    return { error: null };
  }

  // Create new profile
  const { error } = await supabase.from('profiles').insert({
    id: userId,
    email: email,
    first_name: firstName,
    last_name: lastName,
    role: role,
  });

  if (error) {
    console.error('createProfile error:', error);
  }

  return { error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const signInWithOAuth = async (provider: 'google' | 'linkedin_oidc') => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return { data, error };
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};
