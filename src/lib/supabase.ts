/**
 * Capitabee Financial Services CRM - Supabase Client Initialization
 * Connects to the shared Supabase Project: https://fvpnergqltezjbgbtwtv.supabase.co
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};

// Supabase project parameters
export const SUPABASE_URL =
  (metaEnv.VITE_SUPABASE_URL as string)?.trim() ||
  'https://fvpnergqltezjbgbtwtv.supabase.co';

export const SUPABASE_ANON_KEY =
  (metaEnv.VITE_SUPABASE_ANON_KEY as string)?.trim() || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_ANON_KEY.length > 20 &&
    SUPABASE_ANON_KEY !== 'undefined' &&
    SUPABASE_ANON_KEY !== 'null'
  );
};

// Fallback anon key dummy for safe client initialization when env key is not yet injected
const effectiveKey = SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder_key';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'capitabee_supabase_auth_token',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface TableCheckResult {
  name: string;
  exists: boolean;
  rowCount?: number;
  error?: string;
}

/**
 * Diagnostic utility to check Supabase connection health without attempting unauthorized direct table reads
 */
export async function testSupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  latencyMs: number;
  tables: TableCheckResult[];
  missingTables: string[];
  error?: string;
}> {
  const start = Date.now();
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      latencyMs: 0,
      tables: [],
      missingTables: [],
      error: 'VITE_SUPABASE_ANON_KEY environment variable is not configured.',
    };
  }

  try {
    // Ping Supabase auth health endpoint to verify connectivity
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
      },
    });

    const latencyMs = Date.now() - start;
    const connected = res.ok;

    return {
      configured: true,
      connected,
      latencyMs,
      tables: [],
      missingTables: [],
      error: connected ? undefined : `Supabase connection returned status ${res.status}`,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      latencyMs: Date.now() - start,
      tables: [],
      missingTables: [],
      error: err?.message || 'Failed to reach Supabase endpoint',
    };
  }
}
