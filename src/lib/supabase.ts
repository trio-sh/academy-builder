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
  // First, create the auth user
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

  // If signup successful, create profile in database
  if (data.user && !error) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: email,
      first_name: metadata.firstName,
      last_name: metadata.lastName,
      role: metadata.role,
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail signup if profile creation fails - can retry later
    }
  }

  return { data, error };
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
