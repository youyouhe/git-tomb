

import { supabase } from './supabaseClient';
import { UndertakerProfile } from "../types";

const STORAGE_KEY = 'repo_graveyard_undertaker';
const LIMIT_KEY = 'repo_graveyard_limit';

const ADJECTIVES = ['Silent', 'Gloomy', 'Pale', 'Rusty', 'Hollow', 'Cursed', 'Spectral', 'Digital', 'Pixel', '8-Bit', 'Lost', 'Forgotten'];
const NOUNS = ['Digger', 'Keeper', 'Priest', 'Necromancer', 'Crow', 'Shovel', 'Spirit', 'Glitch', 'Daemon', 'Miner', 'Soul', 'Bones'];

const generateAlias = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 9999);
    return `${adj}${noun}#${num}`;
};

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Sync function to get current profile (Auth > Local)
export const getUndertakerProfile = (): UndertakerProfile => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }

    // Generate anonymous profile if none exists
    const newProfile: UndertakerProfile = {
        id: generateUUID(),
        alias: generateAlias(),
        level: 1
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    return newProfile;
};

// Check if user is legally authenticated (Linked with GitHub)
export const isAuthenticated = (): boolean => {
    const profile = getUndertakerProfile();
    return !!profile.handle; 
};

// --- SOUL POWER (LIMIT SYSTEM) ---
interface DailyLimit {
    date: string; // YYYY-MM-DD
    count: number;
}

export const checkDailyQuota = (): boolean => {
    // Authenticated users (Undertakers) have unlimited power
    if (isAuthenticated()) return true;

    // Anonymous users (Ghosts) have limited soul power
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(LIMIT_KEY);
    
    if (stored) {
        const limit: DailyLimit = JSON.parse(stored);
        if (limit.date === today) {
            return limit.count < 5; // Max 5 rituals per day for ghosts
        }
    }
    
    // If no record or old date, they have quota (will be reset on increment)
    return true;
};

export const consumeSoulPower = () => {
    // Only track for ghosts
    if (isAuthenticated()) return;

    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(LIMIT_KEY);
    let count = 0;

    if (stored) {
        const limit: DailyLimit = JSON.parse(stored);
        if (limit.date === today) {
            count = limit.count;
        }
    }

    const newLimit: DailyLimit = {
        date: today,
        count: count + 1
    };

    localStorage.setItem(LIMIT_KEY, JSON.stringify(newLimit));
};


// NEW: Explicitly reset to a new anonymous profile
export const resetToAnonymous = (): UndertakerProfile => {
    const newProfile: UndertakerProfile = {
        id: generateUUID(),
        alias: generateAlias(),
        level: 1
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    return newProfile;
}

// --- AUTH METHODS (SWITCHED TO GITHUB) ---

export const signInWithGitHub = async () => {
    // 1. Determine safe redirect URL
    let redirectUrl = window.location.origin;
    
    // Fix for local Tauri dev or raw file opening where origin might be 'null' or 'file://'
    // Defaulting to standard Vite/Tauri dev port if origin is weird.
    if (!redirectUrl || redirectUrl === 'null' || redirectUrl.startsWith('file://')) {
        redirectUrl = 'http://localhost:1420';
    }

    console.log("Initiating GitHub Login with Redirect:", redirectUrl);

    // 2. Use skipBrowserRedirect: true to manually handle the navigation
    // This helps avoid some automatic iframe/webview issues by letting us control the `href`.
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true 
        }
    });

    if (error) throw error;

    // 3. Force Top-Level Navigation
    // This breaks out of iframes if the app is embedded, which solves "refused to connect" in previewers.
    if (data?.url) {
        window.location.href = data.url;
    }
    
    return data;
};

export const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEY);
    // Reload to regenerate anonymous profile
    window.location.reload();
};

// Check for active session and sync to local storage for instant access
export const syncAuthProfile = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
        const user = session.user;
        const metadata = user.user_metadata || {};
        
        // Extract GitHub Handle
        // Supabase standardizes this: user_name (github username), preferred_username, or name
        const handle = metadata.user_name || metadata.preferred_username || metadata.name || "VerifiedDev";
        const avatar = metadata.avatar_url;
        
        const authProfile: UndertakerProfile = {
            id: user.id, // USE SUPABASE AUTH ID
            alias: `@${handle}`,
            handle: handle,
            avatarUrl: avatar,
            level: 1 
        };

        // Overwrite local storage with the verified profile
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authProfile));
        return true;
    }
    return false;
};

// Legacy manual update (Optional fallback)
export const updateUndertakerProfile = (handle: string): UndertakerProfile => {
    const current = getUndertakerProfile();
    let cleanHandle = handle.trim();
    if (cleanHandle.startsWith('@')) cleanHandle = cleanHandle.substring(1);

    const updated: UndertakerProfile = {
        ...current,
        handle: cleanHandle,
        alias: `@${cleanHandle}`
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
}