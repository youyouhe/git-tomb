
import { supabase } from './supabaseClient';
import { GraveEntry, ProjectData, DeathCause, SortOption, LeaderboardEntry, LLMProvider, PriestStats, UndertakerRankInfo, RitualType } from '../types';

// --- RANK SYSTEM LOGIC ---

// Configuration for Ranks
export const RANK_CONFIG: Omit<UndertakerRankInfo, 'title' | 'nextThreshold'>[] = [
    { id: 'rank.entropy', icon: '🌌', color: 'text-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]', minCount: 100 },
    { id: 'rank.reaper', icon: '💀', color: 'text-red-400', minCount: 50 },
    { id: 'rank.ferryman', icon: '🚣', color: 'text-purple-400', minCount: 25 },
    { id: 'rank.coroner', icon: '🩺', color: 'text-blue-400', minCount: 10 },
    { id: 'rank.keeper', icon: '🗝️', color: 'text-green-400', minCount: 3 },
    { id: 'rank.intern', icon: '🧹', color: 'text-gray-400', minCount: 0 },
];

export const getUndertakerRank = (count: number): UndertakerRankInfo => {
    // Sort desc to find the highest matching rank
    const sorted = [...RANK_CONFIG].sort((a, b) => b.minCount - a.minCount);
    const match = sorted.find(r => count >= r.minCount) || sorted[sorted.length - 1];
    
    // Find next threshold
    // We need to find the rank strictly "above" the current match
    // Since sorted is DESC, we look for the one before it in the array (index - 1)
    const matchIndex = sorted.indexOf(match);
    const nextRank = matchIndex > 0 ? sorted[matchIndex - 1] : null;

    return {
        ...match,
        title: match.id,
        nextThreshold: nextRank ? nextRank.minCount : null
    };
};

// NEW: Fetch specific stats for the current user
export const getUserStats = async (userId: string): Promise<{ count: number, rank: UndertakerRankInfo }> => {
    const { count, error } = await supabase
        .from('graveyards')
        .select('*', { count: 'exact', head: true }) // head: true means don't return data, just count
        .eq('undertaker_id', userId);

    if (error) {
        console.warn("Failed to fetch user stats", error);
        return { count: 0, rank: getUndertakerRank(0) };
    }

    const totalBuried = count || 0;
    return {
        count: totalBuried,
        rank: getUndertakerRank(totalBuried)
    };
}

// NEW: Fetch single grave by ID (For Deep Linking)
export const getGraveById = async (id: string): Promise<GraveEntry | null> => {
    const { data, error } = await supabase
        .from('graveyards')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Error fetching grave by ID:", error);
        return null;
    }

    return mapRowToEntry(data);
};

export const getGraves = async (page: number = 0, limit: number = 12, sortBy: SortOption = 'NEWEST'): Promise<GraveEntry[]> => {
  const start = page * limit;
  const end = start + limit - 1;

  let query = supabase.from('graveyards').select('*');

  // Server-side sorting
  switch (sortBy) {
      case 'STARS':
          query = query.order('stars_count', { ascending: false });
          break;
      case 'RESPECTS':
          query = query.order('respects_paid', { ascending: false });
          break;
      case 'NEWEST':
      default:
          query = query.order('created_at', { ascending: false });
          break;
  }

  // Pagination
  const { data, error } = await query.range(start, end);

  if (error) {
    console.error('Error fetching graves:', error);
    return [];
  }

  return data.map((row: any) => mapRowToEntry(row));
};

export const getGravesByOwner = async (owner: string): Promise<GraveEntry[]> => {
  const { data, error } = await supabase
    .from('graveyards')
    .select('*')
    .ilike('owner_name', owner) // Case insensitive match
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching graves by owner:', error);
    throw error;
  }

  return data.map((row: any) => mapRowToEntry(row));
};

// Simple Client-side Aggregation for Leaderboard MVP
export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    // Fetch last 1000 graves to calculate leaderboard
    // ATTEMPT 1: Try to fetch with undertaker_name (Requires Migration)
    let { data, error } = await supabase
        .from('graveyards')
        .select('undertaker_id, undertaker_name') 
        .not('undertaker_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000);

    // ATTEMPT 2: Fallback if column missing (e.g. Migration not run)
    if (error) {
        console.warn("Primary leaderboard fetch failed (likely missing column), attempting fallback...", error.message);
        const retry = await supabase
            .from('graveyards')
            .select('undertaker_id')
            .not('undertaker_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1000);
        
        // FIX: Cast to any to avoid TS error because inferred type of `data` expects undertaker_name
        data = retry.data as any; 
        error = retry.error;
    }

    if (error || !data) {
        console.error("Error fetching leaderboard data", error);
        return [];
    }

    const counts: Record<string, number> = {};
    const names: Record<string, string> = {}; // Map ID to last known name
    
    data.forEach((row: any) => {
        const uid = row.undertaker_id;
        counts[uid] = (counts[uid] || 0) + 1;
        if (row.undertaker_name) {
            names[uid] = row.undertaker_name;
        }
    });

    const leaderboard: LeaderboardEntry[] = Object.entries(counts)
        .map(([id, count]) => {
            const handle = names[id];
            return {
                undertakerId: id,
                alias: handle ? `@${handle}` : `Undertaker #${id.slice(0, 4)}`,
                handle: handle,
                count: count,
                lastBuried: new Date().toISOString(), // Placeholder
                rankInfo: getUndertakerRank(count) // INJECT RANK INFO HERE
            };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 100); // Top 100

    return leaderboard;
}

// --- PRIEST STATS LOGIC ---
export const getPriestStats = async (): Promise<PriestStats[]> => {
    // 1. Get Busy Counts (Aggregation)
    let { data: graveData, error: graveError } = await supabase
        .from('graveyards')
        .select('provider')
        .limit(1000);
    
    if (graveError) {
        console.warn("Could not fetch provider stats from graveyards table:", graveError.message);
        graveData = [];
    }
    
    const busyCounts: Record<string, number> = {
        'GEMINI': 0,
        'OPENAI': 0,
        'OPENROUTER': 0,
        'DEEPSEEK': 0
    };

    if (graveData) {
        graveData.forEach((row: any) => {
            const p = row.provider;
            if (p && busyCounts[p] !== undefined) {
                busyCounts[p]++;
            } else if (p) {
                // If it's a provider we don't know (legacy?), maybe map it or ignore
                // For now, if we encounter a legacy DEEPSEEK string but the enum exists, it works.
                if (!busyCounts[p]) busyCounts[p] = 0;
                busyCounts[p]++;
            }
        });
    }

    // 2. Get Likes (From dedicated table)
    const { data: likesData, error: likesError } = await supabase
        .from('priest_stats')
        .select('*');
    
    if (likesError) {
         console.warn("Could not fetch priest_stats:", likesError.message);
    }
    
    const likesMap: Record<string, number> = {};
    if (likesData) {
        likesData.forEach((row: any) => {
            const p = row.provider_id;
            likesMap[p] = (likesMap[p] || 0) + row.likes_count;
        });
    }

    // 3. Combine
    const providers: LLMProvider[] = ['OPENROUTER', 'DEEPSEEK', 'GEMINI', 'OPENAI'];
    return providers.map(p => ({
        provider: p,
        busyCount: busyCounts[p] || 0,
        likes: likesMap[p] || 0
    })).sort((a, b) => b.busyCount - a.busyCount);
};

export const blessPriest = async (provider: LLMProvider, currentLikes: number) => {
    // UPDATED: Use RPC for atomic increment
    const { error } = await supabase.rpc('bless_priest', { provider_id: provider });

    if (error) console.error("Error blessing priest:", error);
}

// Helper to map DB row to GraveEntry
const mapRowToEntry = (row: any): GraveEntry => ({
  id: row.id,
  repoUrl: row.repo_url,
  name: row.repo_name,
  description: row.description,
  language: row.language,
  stars: row.stars_count,
  forks: row.forks_count,
  birthDate: row.birth_date,
  deathDate: row.death_date,
  owner: row.owner_name,
  cause: row.cause_of_death as DeathCause,
  eulogy: row.eulogy,
  respectsPaid: row.respects_paid,
  epitaph: row.epitaph,
  burialDate: row.created_at,
  undertakerId: row.undertaker_id,
  provider: row.provider,
  undertakerName: row.undertaker_name
});

// Returns the ID if exists, otherwise null
export const checkRepoExists = async (repoUrl: string): Promise<string | null> => {
    // UPDATED: Use maybeSingle() instead of single()
    // single() throws an error (PGRST116) and results in a 406 network error if no rows are found.
    // maybeSingle() correctly returns data: null and error: null for 0 rows.
    const { data, error } = await supabase
        .from('graveyards')
        .select('id')
        .eq('repo_url', repoUrl)
        .maybeSingle();
    
    if (error) { 
        console.error("Error checking repo existence:", error);
    }

    return data ? data.id : null;
}

export const buryProject = async (
  project: ProjectData,
  cause: DeathCause,
  eulogy: string,
  epitaph: string,
  undertakerId: string,
  provider: string = 'GEMINI',
  undertakerName?: string // Pass the X handle
): Promise<GraveEntry> => {
  
  const payload: any = {
      repo_url: project.repoUrl,
      repo_name: project.name,
      description: project.description,
      language: project.language,
      stars_count: project.stars,
      forks_count: project.forks,
      birth_date: project.birthDate,
      death_date: project.deathDate,
      owner_name: project.owner,
      cause_of_death: cause,
      eulogy: eulogy,
      epitaph: epitaph,
      respects_paid: 0,
      undertaker_id: undertakerId, // Add this column to DB!
      provider: provider
  };

  if (undertakerName) {
      payload.undertaker_name = undertakerName;
  }

  // ATTEMPT 1: Insert with all fields
  let { data, error } = await supabase
    .from('graveyards')
    .insert([payload])
    .select()
    .single();

  // ATTEMPT 2: Fallback if column missing (42703 is Undefined Column in Postgres)
  if (error && (error.code === '42703' || error.message.includes('column'))) {
    console.warn("Insert failed due to schema mismatch, retrying without undertaker_name/provider...", error.message);
    
    // Remove potentially problematic new columns
    delete payload.undertaker_name;
    // provider might also be missing if previous step failed
    // delete payload.provider; // Keep provider for now as it was step 2
    
    const retry = await supabase
        .from('graveyards')
        .insert([payload])
        .select()
        .single();
    
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Error burying project:', error);
    if (error.code === '23505') { // Unique violation
        throw new Error("This project is already buried.");
    }
    throw new Error(error.message);
  }

  return mapRowToEntry(data);
};

export const performRitual = async (
    graveId: string, 
    userId: string | null, // null for anon
    ritualType: RitualType, 
    power: number
): Promise<{ success: boolean, message?: string, newCount?: number }> => {
    
    // VALIDATION: Ensure graveId is a valid UUID to prevent RPC 400 errors (e.g. invalid input syntax for type uuid)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(graveId)) {
        console.warn("Skipping ritual on invalid UUID (Mock Data?):", graveId);
        return { success: false, message: "Invalid Grave ID (Mock Data)" };
    }

    // Call the complex RPC
    const { data, error } = await supabase.rpc('perform_ritual', {
        grave_uuid: graveId,
        user_uuid: userId,
        r_type: ritualType,
        power_val: power
    });

    if (error) {
        // Improved logging: Stringify to see details of [object Object]
        console.error("Ritual RPC failed:", JSON.stringify(error));
        
        // Fallback for legacy RPC if new one doesn't exist yet
        if (error.code === '42883' || error.message?.includes('function not found')) {
             console.warn("New RPC not found, trying legacy increment...");
             await supabase.rpc('increment_respects', { row_id: graveId });
             return { success: true, newCount: undefined };
        }
        return { success: false, message: error.message || "Ritual RPC failed" };
    }

    if (data && data.success === false) {
        return { success: false, message: data.message };
    }

    return { success: true, newCount: data?.new_count };
};
