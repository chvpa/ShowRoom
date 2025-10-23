// This file handles the Supabase client configuration with proper environment variables
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get environment variables safely
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// Verify required environment variables
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

/**
 * Supabase client instance with proper typing
 * For efficient data handling, we configure:
 * - Persistent sessions for better UX
 * - Auto-refreshing of tokens
 * - Custom headers for monitoring
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // 🔥 FIX: Evitar detección automática de sesión en URL
  },
  global: {
    headers: {
      'x-client-info': 'showroom-app',
    },
  },
});