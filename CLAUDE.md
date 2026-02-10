# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

pnpm monorepo: **api** (Hono + hexagonal), **web** (SvelteKit 2 + Svelte 5), **shared** (types + config)

**Hexagonal pattern**: `domain/` (entities, ports) → `infrastructure/` (Drizzle repos, DE API, Steam auth) → `application/http/` (routes)

**Category system**: `packages/shared/src/categories.ts` is single source of truth - all category metadata, seeding rules, XP multipliers defined here. Adding a category = update `CATEGORIES` object + `pnpm db:seed`.

## Key Design Decisions

### Mastery XP Calculation
- **Formula**: Total XP = Equipment XP + Intrinsics XP + Star Chart XP
- **Equipment**: Rank stored as raw XP, derived via `rank = sqrt(xp / multiplier)`. Contribution = `rank × (100 or 200)` per rank
- **Intrinsics**: 90 total levels (Railjack 50 + Drifter 40) × 1500 XP each
- **MR**: 1-30 uses `2500 × MR²`, Legendary (31+) adds 147,500 per rank
- **Rank 40 support**: Kuva/Tenet weapons, Necramechs via maxRank overrides in categories.ts

### Profile Sync Flow
1. Steam OpenID auth → session cookie (`tenno_session`)
2. Fetch DE profile endpoint (600KB+ JSON at `.Results[0]`)
3. Match XP data (`.LoadOutInventory.XPInfo`) + weapon stats (`.Stats.Weapons`) by `uniqueName`
4. Extract loadout, focus school, intrinsics (`.PlayerSkills.LPS_*`), missions
5. Persist via Drizzle repos (postgres port 5433)

### DE Profile API Paths
- XP: `.Results[0].LoadOutInventory.XPInfo[]` → `{ItemType, XP}`
- Stats: `.Stats.Weapons[]` → `{type, kills, headshots, fired, hits, equipTime}`
- Loadout: `.Results[0].LoadOutInventory.{Suits,LongGuns,Pistols,Melee}[0].ItemType`
- Intrinsics: `.Results[0].PlayerSkills.LPS_{TACTICAL,PILOTING,etc}`
- Missions: `.Results[0].Missions[]` → `{Tag, Completes, Tier}` (Tier=1 = Steel Path)

### Category Seeding
- Declarative rules: detectors, include/exclude patterns, maxRank overrides
- `isFrameType` flag → 200 MR/rank (frames) vs 100 MR/rank (weapons)
- Global exclusions: PvP variants, non-primary modular parts
- Sources: `@wfcd/items` library + manual overrides (Venari, Sirocco)

## Adding Categories

1. Edit `packages/shared/src/categories.ts` → add to `CATEGORIES` object
2. Define: `name`, `wfcdCategory`, `isFrameType`, `icon`, `sortOrder`, optional `seeding` rules
3. Run `pnpm db:seed` - everything else auto-derives from config

## Testing

**Unit tests**: `pnpm test` (Vitest) - seeding rules, mastery calcs, profile parsing, weapon stats
**Visual regression**: `cd packages/web && pnpm test:e2e` (Playwright) - catches CSS changes
**Update snapshots**: `pnpm test:e2e:update-snapshots` after intentional UI changes

Key test files:
- `packages/shared/src/seeding-rules.test.ts` - Kitguns, Zaws, Amps, modular parts
- `packages/api/src/domain/entities/mastery.test.ts` - XP formulas, MR thresholds
- `packages/api/src/application/http/sync.test.ts` - Profile sync, weapon stats

## Non-Obvious Details

- Items identified by `uniqueName` (e.g., `/Lotus/Powersuits/Frost/Frost`)
- Images from `https://cdn.warframestat.us/img/{imageName}`
- Focus school codes: `AP_ATTACK`=Madurai, `AP_DEFENSE`=Vazarin, `AP_TACTIC`=Naramon, `AP_POWER`=Zenurik, `AP_WARD`=Unairu
- Session durations: 24hr default, 30 days with "remember me"
- Steel Path detection: `.Missions[].Tier === 1`
