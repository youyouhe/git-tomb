


export enum DeathCause {
  // Common
  LOST_INTEREST = "Lost Interest (3-Minute Passion)",
  NO_MARKET = "Zero Users / No Market",
  LIFE_HAPPENED = "Life Happened (Touched Grass)",
  
  // Tech
  TECH_DEBT = "Suffocated by Spaghetti Code",
  DEPENDENCY_HELL = "Crushed by node_modules",
  WORKS_ON_MACHINE = "Works on My Machine (Only)",
  
  // Psychology
  SHINY_OBJECT = "Distracted by New Framework",
  PERFECTIONISM = "Refactored Until It Died",
  BURNOUT = "Developer Evaporated (Burnout)",
  
  // Business/External
  FEATURE_CREEP = "Bloated to Death (Feature Creep)",
  KILLED_BY_COMPETITOR = "Killed by Competitor",
  AI_REPLACED = "Obsoleted by AI",
  DOMAIN_EXPIRED = "Forgot to Renew Domain",
  FLOPPED = "Shipped but Flopped"
}

export interface ProjectData {
  repoUrl: string;
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  birthDate: string;
  deathDate: string; // Last Push
  owner: string;
}

export interface GraveEntry {
  id: string;
  repoUrl: string;
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  birthDate: string;
  deathDate: string;
  owner: string;
  cause: DeathCause;
  eulogy: string;
  respectsPaid: number;
  epitaph?: string;
  burialDate: string;
  undertakerId?: string;
  undertakerName?: string;
  provider?: string;
}

export interface DeadRepoCandidate extends ProjectData {
  daysDead: number;
}

export type ViewState = 'HOME' | 'BURY_FORM' | 'DETAIL' | 'SCANNER' | 'FIND_KIN' | 'LEADERBOARD';

export type SortOption = 'NEWEST' | 'STARS' | 'RESPECTS';

export type LLMProvider = 'GEMINI' | 'OPENAI' | 'OPENROUTER' | 'DEEPSEEK';

export interface LLMSettings {
  provider: LLMProvider;
  apiKey?: string;
  model?: string;
}

export interface UndertakerProfile {
    id: string; // UUID
    alias: string;
    handle?: string;
    avatarUrl?: string;
    level: number;
}

export interface UndertakerRankInfo {
    id: string;
    title: string;
    icon: string;
    color: string;
    minCount: number;
    nextThreshold: number | null;
}

export interface LeaderboardEntry {
    undertakerId: string;
    alias: string; 
    handle?: string;
    count: number;
    lastBuried: string;
    rankInfo?: UndertakerRankInfo;
}

export interface PriestStats {
    provider: LLMProvider;
    busyCount: number;
    likes: number;
}

// --- RITUAL SYSTEM ---
export type RitualType = 'CANDLE' | 'SALUTE' | 'COFFEE' | 'BUG' | 'FIRE' | 'WAIFU';
export type ShareTemplate = 'DEFAULT' | 'HUMOR' | 'TRIBUTE' | 'INVITE';

export interface RitualConfig {
    id: RitualType;
    icon: string;
    power: number;
    minLevel?: number; // Future proofing
    requiresAuth: boolean;
    labelKey: string;
}

export const RITUALS: Record<RitualType, RitualConfig> = {
    // UPDATED: All rituals now require authentication
    CANDLE: { id: 'CANDLE', icon: '🕯️', power: 1, requiresAuth: true, labelKey: 'ritual.candle' },
    SALUTE: { id: 'SALUTE', icon: '🫡', power: 1, requiresAuth: true, labelKey: 'ritual.salute' },
    COFFEE: { id: 'COFFEE', icon: '☕', power: 2, requiresAuth: true, labelKey: 'ritual.coffee' },
    BUG:    { id: 'BUG',    icon: '🐛', power: 3, requiresAuth: true, labelKey: 'ritual.bug' },
    FIRE:   { id: 'FIRE',   icon: '🔥', power: 5, requiresAuth: true, labelKey: 'ritual.fire' },
    WAIFU:  { id: 'WAIFU',  icon: '💋', power: 10, requiresAuth: true, labelKey: 'ritual.waifu' },
};
