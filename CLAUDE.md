# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

pnpm monorepo with three packages:

**packages/api** - Hono REST API with hexagonal architecture:
- `domain/ports/` - Repository interfaces
- `infrastructure/persistence/drizzle/` - Drizzle ORM implementations
- `infrastructure/external/de-profile-api.ts` - DE profile fetcher
- `infrastructure/bootstrap/container.ts` - DI container wiring

**packages/web** - SvelteKit 2 + Svelte 5 with Bootstrap 5/SASS

**packages/shared** - Shared types and configuration:
- `src/categories.ts` - Single source of truth for all category metadata (names, icons, subtitles, seeding rules)
- `src/seeding-rules.ts` - Declarative category detection and item filtering logic

## Data Flow

1. Sync fetches from DE's public profile endpoint
2. XP data matched against items table by `uniqueName`
3. Mastery records and loadout persisted to postgres

## DE Profile API

The profile response is large (600KB+). Use jq to explore:

```bash
jq '.Results[0].LoadOutInventory | keys' de-profile-response.json
jq '.Results[0].LoadOutInventory.Suits[0].ItemType' de-profile-response.json
```

Loadout: `.Results[0].LoadOutInventory.{Suits,LongGuns,Pistols,Melee}[0].ItemType`

Focus schools: `AP_ATTACK`=Madurai, `AP_DEFENSE`=Vazarin, `AP_TACTIC`=Naramon, `AP_POWER`=Zenurik, `AP_WARD`=Unairu

## Key Patterns

- Items identified by `uniqueName` (e.g., `/Lotus/Powersuits/Frost/Frost`)
- Images from `https://cdn.warframestat.us/img/{imageName}`
- Postgres on port 5433 (not default 5432)

## Adding New Categories

To add a new item category (e.g., "Incarnon", "Companions"):

1. Add entry to `packages/shared/src/categories.ts` in the `CATEGORIES` object
2. Define:
   - `name`, `displayName` - Internal and display names
   - `wfcdCategory` - Category name in @wfcd/items library
   - `isFrameType` - `true` for 200 MR/rank (frames), `false` for 100 MR/rank (weapons)
   - `icon`, `subtitle` - UI display metadata
   - `sortOrder` - Display order (lower = earlier)
   - `seeding` (optional) - Detection rules, inclusions, exclusions, maxRank overrides
3. Run `pnpm db:seed` to re-seed the database
4. No other files need modification - everything is derived from this config!
