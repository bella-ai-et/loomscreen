import { auth } from '@/lib/supabase';
import { AuthError } from '@supabase/supabase-js';

type AuthResponse = {
  error: AuthError | null;
  data: any;
};

export const signInWithGoogle = async (): Promise<AuthResponse> => {
  const { data, error } = await auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  return { data, error };
};

export const signInWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const { data, error } = await auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const { data, error } = await auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    },
  });

  return { data, error };
};

export const signOut = async (): Promise<{ error: AuthError | null }> => {
  const { error } = await auth.signOut();
  return { error };
};

export const getSession = async () => {
  const { data: { session } } = await auth.getSession();
  return session;
};

export const getUser = async () => {
  const { data: { user } } = await auth.getUser();
  return user;
};
