import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export auth helpers
export const { auth } = supabase;

// Export storage helpers
export const storage = supabase.storage;

// Export database helpers
export const db = supabase.from;
