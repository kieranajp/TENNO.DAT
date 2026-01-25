# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

pnpm monorepo with two packages:

**packages/api** - Hono REST API with hexagonal architecture:
- `domain/ports/` - Repository interfaces
- `infrastructure/persistence/drizzle/` - Drizzle ORM implementations
- `infrastructure/external/de-profile-api.ts` - DE profile fetcher
- `infrastructure/bootstrap/container.ts` - DI container wiring

**packages/web** - SvelteKit 2 + Svelte 5 with Bootstrap 5/SASS

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
