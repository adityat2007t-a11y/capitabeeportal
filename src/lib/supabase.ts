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
 * Diagnostic utility to probe tables and check connection health
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
      missingTables: [
        'profiles',
        'leads',
        'customers',
        'applications',
        'stage_updates',
        'documents',
        'notifications',
        'messages',
        'reviews',
        'targets',
        'activity_logs',
      ],
      error: 'VITE_SUPABASE_ANON_KEY environment variable is not configured.',
    };
  }

  const expectedTables = [
    'profiles',
    'leads',
    'customers',
    'applications',
    'stage_updates',
    'documents',
    'notifications',
    'messages',
    'reviews',
    'targets',
    'activity_logs',
  ];

  const tableResults: TableCheckResult[] = [];
  const missingTables: string[] = [];

  for (const table of expectedTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        tableResults.push({
          name: table,
          exists: false,
          error: error.message,
        });
        missingTables.push(table);
      } else {
        tableResults.push({
          name: table,
          exists: true,
          rowCount: count ?? 0,
        });
      }
    } catch (err: any) {
      tableResults.push({
        name: table,
        exists: false,
        error: err.message,
      });
      missingTables.push(table);
    }
  }

  const latencyMs = Date.now() - start;
  const anyConnected = tableResults.some(t => t.exists);

  return {
    configured: true,
    connected: anyConnected,
    latencyMs,
    tables: tableResults,
    missingTables,
    error: missingTables.length > 0 ? `Missing or restricted tables: ${missingTables.join(', ')}` : undefined,
  };
}
