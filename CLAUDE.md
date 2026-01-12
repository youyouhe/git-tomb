# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Repo Graveyard** is a gamified web application for "burying" dead software projects. Users submit GitHub repositories that have been inactive for 6+ months, AI generates humorous eulogies, and projects are displayed as tombstones with a tiered ranking system.

- **Tech Stack**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with pixel-art aesthetic
- **Languages**: Bilingual (English/Chinese), default is Chinese

## Development Commands

```bash
npm install              # Install dependencies
npm run dev             # Start dev server (http://localhost:3000)
npm run build           # Production build
npm run preview         # Preview production build
```

**Environment Setup**: Create `.env.local` with `GEMINI_API_KEY` (or any OpenAI-compatible API key for LLM features).

## Architecture

### Application Structure

This is a **single-page React app** without a router. Navigation is handled via view state in `App.tsx`:

```typescript
type ViewState = 'HOME' | 'BURY_FORM' | 'DETAIL' | 'SCANNER' | 'FIND_KIN' | 'LEADERBOARD';
```

**Key Files:**
- `App.tsx` - Main orchestrator (462 lines), manages view state, pagination, leaderboard data
- `types.ts` - Centralized TypeScript types and enums
- `i18n.tsx` - React Context-based internationalization (use `useTranslation()` hook)
- `index.html` - Contains Tailwind config and custom CSS

**Directories:**
- `components/` - React UI components
- `services/` - Business logic layer (Supabase, GitHub API, LLM integration)

### Service Layer Pattern

All backend interactions are in `/services`:

| Service | Purpose |
|---------|---------|
| `graveyardService.ts` | Supabase CRUD, pagination, leaderboard aggregation |
| `githubService.ts` | GitHub API - fetch repo info, scan for dead repos (6+ months inactive) |
| `geminiService.ts` | Multi-LLM eulogy generation (Gemini, OpenAI, DeepSeek) |
| `identityService.ts` | User profile management (localStorage-based) |
| `supabaseClient.ts` | Supabase client initialization |

### State Management

No state management library. State is either:
- Local component state (`useState`)
- Lifted to parent `App.tsx` when shared across views (e.g., leaderboard data)

### Internationalization

Custom React Context system in `i18n.tsx`:
- Default language: **Chinese** (`zh`)
- Supported: `en`, `zh`
- Enum values (like `DeathCause`) require enum translations
- Usage: `const { t } = useTranslation();`

### Database Schema (Supabase)

**Table: `graveyards`**
- `repo_url` (unique constraint)
- Columns: id, repo_url, repo_name, description, language, stars_count, forks_count, birth_date, death_date, owner_name, cause_of_death, eulogy, respects_paid, epitaph, created_at, undertaker_id, undertaker_name, provider

**Table: `priest_stats`**
- Columns: provider, likes_count

## Gamification & Features

### Tombstone Tier System

Score = `stars + (respects × 10)`

| Tier | Score | Visual Style |
|------|-------|--------------|
| GOLD | 10k+ | Gradient, shine animation |
| SILVER | 1k+ | Silver gradient |
| BRONZE | 100+ | Bronze gradient |
| IRON | 20+ | Dark gray |
| WOOD | >0 | Brown |
| ROTTEN | 0 | Cracked effect |

### Undertaker Identity

Each user gets a random alias: `[Adjective][Noun]#[Number]` (e.g., "SkepticalUndertaker#42")
- Stored in localStorage via `identityService.ts`
- Optional X (Twitter) handle binding
- Leaderboard tracks burial count per undertaker

### AI Priest Personas

Multi-LLM support for eulogy generation:
- **GEMINI** - Father Flash (fast, free, hallucinates)
- **OPENAI** - Bishop GPT (expensive, ceremonial)
- **DEEPSEEK** - Taoist DeepSeek (open source, frugal)

Users configure provider and API key in Settings modal (stored in localStorage).

## Important Notes

- **No tests** - This project has no test framework configured
- **Hardcoded credentials** - Supabase URL/key are in `supabaseClient.ts` (should be env vars)
- **Schema migration** - Handled via try/catch fallback in `graveyardService.ts` (not proper migrations)
- **Default language is Chinese** - i18n defaults to `zh`, not English
