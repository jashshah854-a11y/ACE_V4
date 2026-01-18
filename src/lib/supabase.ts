
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function resolveEnv(key: string) {
    const runtimeEnv = typeof window !== 'undefined'
        ? (window as typeof window & { __ACE_ENV__?: Record<string, string> }).__ACE_ENV__
        : undefined;
    return runtimeEnv?.[key] || import.meta.env[key] || '';
}

const supabaseUrl = resolveEnv('VITE_SUPABASE_URL');
const supabaseKey = resolveEnv('VITE_SUPABASE_ANON_KEY');

// Create a mock client for when Supabase is not configured
const createMockClient = () => ({
    from() {
        console.warn('Supabase client unavailable. ACE is running in local-only mode.');
        return {
            select: async () => ({ data: null, error: new Error('Supabase not configured') }),
            eq: () => this,
            single: async () => ({ data: null, error: new Error('Supabase not configured') }),
            upsert: async () => ({ error: new Error('Supabase not configured') }),
            order: () => this,
            insert: async () => ({ error: new Error('Supabase not configured') }),
            update: async () => ({ error: new Error('Supabase not configured') }),
            delete: async () => ({ error: new Error('Supabase not configured') }),
        };
    },
});

// Only create real client if both credentials exist
export const supabase: SupabaseClient<any, "public", any> | ReturnType<typeof createMockClient> = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : createMockClient();
