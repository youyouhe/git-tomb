
import { createClient } from '@supabase/supabase-js';

// Configuration
// 1. Check LocalStorage (User Override)
// 2. Try to load from Vite environment variables (if .env exists)
// 3. Fallback to the Public Demo Project (Repo Graveyard Official)

const STORAGE_KEY = 'repo_graveyard_supabase_config';

const getEnv = (key: string) => {
    // @ts-ignore
    return typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[key] : undefined;
}

const DEFAULT_URL = getEnv('VITE_SUPABASE_URL') || 'https://vbzhpselnugbpjxxewjl.supabase.co';
const DEFAULT_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiemhwc2VsbnVnYnBqeHhld2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTQ5MDUsImV4cCI6MjA4MzY5MDkwNX0.jBRHss8cbFcEsMsbC6YY_-73pPcsp62nhwSPYVFkyzA';

// Load Config
let activeConfig = { url: DEFAULT_URL, key: DEFAULT_KEY };

try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.key) {
            activeConfig = parsed;
        }
    }
} catch (e) {
    console.error("Failed to load supabase config", e);
}

export const SUPABASE_URL = activeConfig.url;
export const SUPABASE_ANON_KEY = activeConfig.key;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper functions for Settings UI
export const updateSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, key }));
    window.location.reload(); // Reload to re-initialize client
}

export const resetSupabaseConfig = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
}

export const getCurrentSupabaseConfig = () => activeConfig;
