# AGENTS.md - Repo Graveyard

## Build Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run preview          # Preview production build
```

**No test framework configured** - This project has no tests. Do not attempt to run tests.

**No lint command configured** - No ESLint or other linter is set up.

## Code Style Guidelines

### File Organization

- `App.tsx` - Main orchestrator (462 lines), manages view state and global data
- `types.ts` - Centralized TypeScript types and enums (DO NOT split types)
- `i18n.tsx` - React Context-based i18n (use `useTranslation()` hook)
- `components/` - React UI components
- `services/` - Business logic layer (Supabase, GitHub, LLM)

### Imports

```typescript
// React - named imports for hooks
import React, { useState, useEffect, useCallback } from 'react';

// Components - named imports
import { Header } from './components/Header';

// Services - named imports
import { getGraves } from './services/graveyardService';

// Types - import from central types file
import { GraveEntry, ViewState } from './types';
```

### TypeScript & Types

- **All types defined in `types.ts`** - Never define types locally in components/services
- Use interfaces for component props and object shapes
- Use type aliases for union types and primitives
- Enum values require separate translation in `i18n.tsx`
- Explicitly type async function returns: `Promise<GraveEntry[]>`

### Naming Conventions

- **Components**: PascalCase (`Tombstone`, `Header`)
- **Functions/Services**: camelCase (`getGraves`, `fetchGithubInfo`)
- **Constants/Enums**: SCREAMING_SNAKE_CASE (`DeathCause.LOST_INTEREST`)
- **State variables**: Descriptive camelCase (`isLeaderboardLoading`)
- **File names**: PascalCase for components (`.tsx`), camelCase for services (`.ts`)

### Component Patterns

```typescript
// Functional component with TypeScript
interface TombstoneProps {
  entry: GraveEntry;
  onPayRespect: (id: string) => void;
  isDetail?: boolean;  // Optional props
}

export const Tombstone: React.FC<TombstoneProps> = ({ entry, onPayRespect, isDetail = false }) => {
  const [justPaid, setJustPaid] = useState(false);
  // Component logic...
};
```

### State Management

- Use `useState` for local component state
- Lift shared state to parent (e.g., leaderboard data in `App.tsx`)
- **No state management library** - Just React built-in state
- Use `localStorage` for user preferences via `identityService.ts`

### Error Handling

```typescript
// Service layer pattern
try {
  const data = await fetchData();
  return data.map(row => transformRow(row));
} catch (error) {
  console.error("Failed to fetch data:", error);
  return [];  // Graceful fallback
  // OR throw new Error("User-friendly message");
}

// User-facing errors
alert(error.message || "Something went wrong.");
```

### Internationalization

```typescript
const { t, language } = useTranslation();

// Basic usage
t('tomb.rip')  // "R.I.P"

// With parameters
t('leaderboard.share_msg', { rank: 5, count: 42 })
```

**Default language is Chinese (`zh`)** - NOT English. Always translate new strings for both languages.

Add translations to `i18n.tsx` in both `en` and `zh` objects. Use dot notation for nested keys.

### Service Layer Pattern

All backend interactions go through `/services`:
- `graveyardService.ts` - Supabase CRUD, pagination, leaderboard
- `githubService.ts` - GitHub API (fetch repo info, scan dead repos)
- `geminiService.ts` - LLM eulogy generation (Gemini, OpenAI, DeepSeek)
- `identityService.ts` - User profile (localStorage-based)

**Never import supabase client directly** in components - go through services.

### Database Schema Fallback

The codebase uses try/catch fallback for missing database columns (see `graveyardService.ts:253-270`). New columns should handle missing schema gracefully.

### Styling

- **Tailwind CSS** for all styling
- Custom fonts: `font-pixel` (Press Start 2P), `font-mono` (VT323)
- Custom color palette: `graveyard-dark`, `graveyard-stone`, `graveyard-text`, etc.
- Extensive use of Tailwind utility classes - prefer built-in utilities over custom CSS
- Custom animations in `index.html` (shine effects for tombstone tiers)

### Environment Variables

Create `.env.local` with:
```
GEMINI_API_KEY=your_key_here
```

**Do not commit `.env.local` files.**

## Important Notes

- **No tests** - This project has no test framework
- **Supabase credentials hardcoded** in `supabaseClient.ts` (should be env vars)
- **No migrations** - Schema changes handled via try/catch fallback
- **Single-page app** - No routing, view state managed in `App.tsx`
- **TypeScript config** allows importing `.ts` files directly (no `js` extensions needed)
