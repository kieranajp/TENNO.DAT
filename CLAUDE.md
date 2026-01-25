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

## Testing

### Unit Tests (Vitest)

```bash
pnpm test           # Run all unit tests
pnpm test:watch     # Watch mode
```

Test files are co-located with source: `*.test.ts`

Key test coverage:
- `packages/shared/src/seeding-rules.test.ts` - Kitguns, Zaws, Amps, Necramechs, PvP exclusions, Venari, Plexus
- `packages/shared/src/categories.test.ts` - Category config, FRAME_CATEGORIES, sorting
- `packages/api/src/domain/entities/mastery.test.ts` - XP calculations, MR thresholds
- `packages/api/src/infrastructure/external/de-profile-api.test.ts` - Profile parsing, focus schools
- `packages/api/src/application/http/sync.test.ts` - Rank calculation during sync
- `packages/web/src/lib/api.test.ts` - URL formatters, time display

### Visual Regression Tests (Playwright)

For CSS/SASS refactors, use visual regression tests to catch unintended changes:

```bash
cd packages/web
pnpm test:e2e                    # Run tests (fails if screenshots differ)
pnpm test:e2e:update-snapshots   # Update baseline screenshots after intentional changes
pnpm test:e2e:ui                 # Interactive UI for debugging
```

Workflow for SASS refactors:
1. Run `pnpm test:e2e:update-snapshots` to capture current state
2. Make your CSS/SASS changes
3. Run `pnpm test:e2e` to see what changed visually
4. Review diffs and update snapshots if changes are intentional

### CI

GitHub Actions runs unit tests on push to `main` and on PRs. Visual tests can be run locally before pushing.
