# PLAN P006: Prime Part Tracking

## Overview

Add Prime part ownership tracking so players can check off which crafting components they have for each Prime item. Shows progress toward building each Prime, which relics to farm, and auto-marks mastered Primes as complete.

## Current State Analysis

### What Already Exists

The data pipeline for Prime parts is almost entirely built:

- **`items` table** has `isPrime` and `vaulted` flags on all Prime items
- **`item_components` table** stores crafting parts (Blueprint, Chassis, Neuroptics, Systems, etc.) with `ducats` values identifying tradeable Prime parts
- **`component_drops` table** stores relic sources per component with `rarity` (Common/Uncommon/Rare) and `chance`
- **`player_mastery` table** has XP/rank data - if rank 30, the player has mastered the Prime (and therefore had all parts at some point)
- **`player_wishlist` table** provides the exact pattern to follow for manual tracking

### Key Files

- Schema: `packages/api/src/infrastructure/persistence/drizzle/schema.ts`
- Item components seeding: `packages/api/src/infrastructure/persistence/drizzle/seed-utils.ts:26-86` (CRAFTED_PART_NAMES includes all Prime variants)
- Item repository: `packages/api/src/infrastructure/persistence/drizzle/item-repository.ts:38-154` (findByIdWithAcquisitionData)
- Shared types: `packages/shared/src/types.ts:19-42` (ItemAcquisitionData with components[].drops)
- Wishlist port: `packages/api/src/domain/ports/wishlist-repository.ts` (pattern to follow)
- Wishlist impl: `packages/api/src/infrastructure/persistence/drizzle/wishlist-repository.ts`
- Container: `packages/api/src/infrastructure/bootstrap/container.ts`
- App routes: `packages/api/src/application/index.ts`
- ItemModal: `packages/web/src/lib/components/ItemModal.svelte:209-231` (existing COMPONENT DROPS section)
- API client: `packages/web/src/lib/api.ts:129-145` (ItemDetails type)
- Mastery routes: `packages/api/src/application/http/mastery.ts:67-103` (items with wishlist pattern)

### Data Flow for Relic Info (Already Working)

```
@wfcd/items → seed-utils.ts extractComponents() → item_components + component_drops
                                                            ↓
ItemModal.svelte "COMPONENT DROPS" section ← item-repository.ts findByIdWithAcquisitionData()
```

The modal already shows component drops with relic names and chances. What's missing is tracking ownership and a dedicated farming view.

## Desired End State

1. In the item modal for any Prime item, each crafting component has a checkbox to mark as owned/unowned
2. Mastered Primes auto-mark all parts as owned (overridable)
3. Mastery page item cards for Primes show part progress (e.g., "2/4")
4. A new `/primes` page lists all incomplete Primes grouped by available/vaulted, with relic sources for missing parts
5. Filtering by vaulted/unvaulted, by category (Warframes/Weapons)

### Verification

- Open a Prime item modal → see checkboxes next to each component → toggle them
- Sync profile → mastered Primes auto-mark complete
- Navigate to `/primes` → see incomplete Primes with missing parts and their relic sources
- Filter to "Available only" → vaulted Primes hidden

## What We're NOT Doing

- Relic inventory tracking (which relics the player owns)
- Quantity tracking ("I have 3x Ember Prime Chassis") - just boolean owned/not-owned
- Warframe.market price integration (future enhancement)
- Forma/Catalyst tracking for building
- AlecaFrame integration for auto-import (future enhancement)
- Relic refinement drop rate variants

## Implementation Approach

1. Database: new `player_prime_parts` table (follows wishlist pattern)
2. Backend: repository, port, API routes
3. Auto-mark: hook into sync to auto-complete mastered Primes
4. Modal enhancement: add ownership checkboxes to existing component section
5. Mastery page: add part progress indicator to Prime item cards
6. New page: `/primes` farming view

---

## Phase 1: Database Schema

### Overview

Add the `player_prime_parts` table to track component ownership per player.

### Changes Required

#### 1. Schema Definition

**File**: `packages/api/src/infrastructure/persistence/drizzle/schema.ts`

Add after `playerWishlist` table (after line 186):

```typescript
// Player Prime part ownership tracking
export const playerPrimeParts = pgTable('player_prime_parts', {
  id: serial('id').primaryKey(),
  playerId: varchar('player_id', { length: 50 }).notNull(),
  componentId: integer('component_id').notNull().references(() => itemComponents.id, { onDelete: 'cascade' }),
  owned: boolean('owned').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  playerComponentIdx: index('player_prime_parts_player_component_idx').on(table.playerId, table.componentId),
  playerComponentUnique: unique('player_prime_parts_unique').on(table.playerId, table.componentId),
}))
```

#### 2. Generate Migration

Run `pnpm drizzle-kit generate` to create the migration SQL.

### Success Criteria

#### Automated Verification:
- [ ] `pnpm drizzle-kit generate` creates migration file without errors
- [ ] `pnpm db:migrate` applies migration successfully
- [ ] TypeScript compiles: `pnpm -F api typecheck`

#### Manual Verification:
- [ ] Verify table exists with correct columns and constraints

---

## Phase 2: Backend Repository & Port

### Overview

Create the Prime parts repository interface and Drizzle implementation, following the wishlist pattern.

### Changes Required

#### 1. Domain Port

**File**: `packages/api/src/domain/ports/prime-parts-repository.ts` (new file)

```typescript
export interface PrimePartsRepository {
  /** Get all owned component IDs for a player */
  getOwnedComponentIds(playerId: string): Promise<number[]>

  /** Get owned component IDs for a specific item */
  getOwnedComponentIdsForItem(playerId: string, itemId: number): Promise<number[]>

  /** Toggle ownership of a component, returns new state */
  toggle(playerId: string, componentId: number): Promise<boolean>

  /** Bulk mark components as owned (for auto-completing mastered Primes) */
  markOwned(playerId: string, componentIds: number[]): Promise<void>

  /** Bulk mark components as unowned */
  markUnowned(playerId: string, componentIds: number[]): Promise<void>
}
```

#### 2. Drizzle Implementation

**File**: `packages/api/src/infrastructure/persistence/drizzle/prime-parts-repository.ts` (new file)

```typescript
import { eq, and, inArray } from 'drizzle-orm'
import type { PrimePartsRepository } from '../../../domain/ports/prime-parts-repository'
import { playerPrimeParts, itemComponents } from './schema'
import type { DrizzleDb } from './connection'

export class DrizzlePrimePartsRepository implements PrimePartsRepository {
  constructor(private db: DrizzleDb) {}

  async getOwnedComponentIds(playerId: string): Promise<number[]> {
    const rows = await this.db
      .select({ componentId: playerPrimeParts.componentId })
      .from(playerPrimeParts)
      .where(and(
        eq(playerPrimeParts.playerId, playerId),
        eq(playerPrimeParts.owned, true)
      ))
    return rows.map(r => r.componentId)
  }

  async getOwnedComponentIdsForItem(playerId: string, itemId: number): Promise<number[]> {
    const rows = await this.db
      .select({ componentId: playerPrimeParts.componentId })
      .from(playerPrimeParts)
      .innerJoin(itemComponents, eq(playerPrimeParts.componentId, itemComponents.id))
      .where(and(
        eq(playerPrimeParts.playerId, playerId),
        eq(itemComponents.itemId, itemId),
        eq(playerPrimeParts.owned, true)
      ))
    return rows.map(r => r.componentId)
  }

  async toggle(playerId: string, componentId: number): Promise<boolean> {
    // Check current state
    const [existing] = await this.db
      .select({ owned: playerPrimeParts.owned })
      .from(playerPrimeParts)
      .where(and(
        eq(playerPrimeParts.playerId, playerId),
        eq(playerPrimeParts.componentId, componentId)
      ))

    if (existing) {
      const newState = !existing.owned
      await this.db
        .update(playerPrimeParts)
        .set({ owned: newState })
        .where(and(
          eq(playerPrimeParts.playerId, playerId),
          eq(playerPrimeParts.componentId, componentId)
        ))
      return newState
    }

    // Doesn't exist yet - insert as owned
    await this.db
      .insert(playerPrimeParts)
      .values({ playerId, componentId, owned: true })
    return true
  }

  async markOwned(playerId: string, componentIds: number[]): Promise<void> {
    if (componentIds.length === 0) return
    for (const componentId of componentIds) {
      await this.db
        .insert(playerPrimeParts)
        .values({ playerId, componentId, owned: true })
        .onConflictDoNothing()
    }
  }

  async markUnowned(playerId: string, componentIds: number[]): Promise<void> {
    if (componentIds.length === 0) return
    await this.db
      .delete(playerPrimeParts)
      .where(and(
        eq(playerPrimeParts.playerId, playerId),
        inArray(playerPrimeParts.componentId, componentIds)
      ))
  }
}
```

#### 3. Update Container

**File**: `packages/api/src/infrastructure/bootstrap/container.ts`

Add import and wire up:

```typescript
import { DrizzlePrimePartsRepository } from '../persistence/drizzle/prime-parts-repository'
import type { PrimePartsRepository } from '../../domain/ports/prime-parts-repository'

// Add to Container interface (line 29):
primePartsRepo: PrimePartsRepository

// Add to createContainer() (line 42):
primePartsRepo: new DrizzlePrimePartsRepository(db),
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm -F api typecheck`

#### Manual Verification:
- [ ] N/A - tested via API routes in next phase

---

## Phase 3: Backend API Routes

### Overview

Add Prime parts API endpoints for toggling ownership, getting part progress, and listing incomplete Primes.

### Changes Required

#### 1. Prime Parts Routes

**File**: `packages/api/src/application/http/prime-parts.ts` (new file)

```typescript
import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import { handleRouteError, noPlayerConfigured } from './errors'
import { createLogger } from '../../infrastructure/logger'

const log = createLogger('PrimeParts')

export function primePartsRoutes(container: Container) {
  const router = new Hono()

  // Toggle component ownership
  router.post('/components/:componentId/toggle', async (c) => {
    try {
      const auth = c.get('auth')
      const settings = await container.playerRepo.getSettings(auth.userId)
      if (!settings?.playerId) return noPlayerConfigured(c, log)

      const componentId = Number(c.req.param('componentId'))
      if (isNaN(componentId)) return c.json({ error: 'Invalid component ID' }, 400)

      const owned = await container.primePartsRepo.toggle(settings.playerId, componentId)
      return c.json({ owned })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to toggle component ownership')
    }
  })

  // Get owned component IDs for a specific item
  router.get('/items/:itemId/components', async (c) => {
    try {
      const auth = c.get('auth')
      const settings = await container.playerRepo.getSettings(auth.userId)
      if (!settings?.playerId) return noPlayerConfigured(c, log)

      const itemId = Number(c.req.param('itemId'))
      if (isNaN(itemId)) return c.json({ error: 'Invalid item ID' }, 400)

      const ownedIds = await container.primePartsRepo.getOwnedComponentIdsForItem(
        settings.playerId, itemId
      )
      return c.json({ ownedComponentIds: ownedIds })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to get component ownership')
    }
  })

  // Get all incomplete Primes with part progress
  router.get('/incomplete', async (c) => {
    try {
      const auth = c.get('auth')
      const settings = await container.playerRepo.getSettings(auth.userId)
      if (!settings?.playerId) return noPlayerConfigured(c, log)

      const category = c.req.query('category') || undefined // 'Warframes', 'Primary', etc.
      const showVaulted = c.req.query('vaulted') !== 'false'  // default: show all

      // Get all Prime items with their components and player ownership
      const primes = await container.itemRepo.findPrimesWithComponents(category)
      const ownedIds = new Set(
        await container.primePartsRepo.getOwnedComponentIds(settings.playerId)
      )

      // Get mastered item IDs to auto-detect completed Primes
      const masteredItemIds = new Set(
        await container.masteryRepo.getMasteredItemIds(settings.playerId)
      )

      const result = primes
        .filter(prime => showVaulted || !prime.vaulted)
        .map(prime => {
          const isMastered = masteredItemIds.has(prime.id)
          const components = prime.components.map(comp => ({
            id: comp.id,
            name: comp.name,
            ducats: comp.ducats,
            owned: isMastered || ownedIds.has(comp.id),
            drops: comp.drops,
          }))

          return {
            id: prime.id,
            name: prime.name,
            category: prime.category,
            imageName: prime.imageName,
            vaulted: prime.vaulted,
            mastered: isMastered,
            components,
            ownedCount: components.filter(c => c.owned).length,
            totalCount: components.length,
          }
        })
        .filter(prime => !prime.mastered || prime.ownedCount < prime.totalCount)
        .sort((a, b) => {
          // Incomplete (some parts) first, then none, then by name
          const aProgress = a.ownedCount / a.totalCount
          const bProgress = b.ownedCount / b.totalCount
          if (aProgress !== bProgress) return bProgress - aProgress
          return a.name.localeCompare(b.name)
        })

      return c.json(result)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to get incomplete Primes')
    }
  })

  return router
}
```

#### 2. Register Routes

**File**: `packages/api/src/application/index.ts`

Add import (after line 13):

```typescript
import { primePartsRoutes } from './http/prime-parts'
```

Add middleware (after line 47):

```typescript
app.use('/primes', authMiddleware, onboardingMiddleware)
app.use('/primes/*', authMiddleware, onboardingMiddleware)
```

Add route (after line 54):

```typescript
app.route('/primes', primePartsRoutes(container))
```

#### 3. New Repository Methods

Two new methods needed on existing repositories:

**File**: `packages/api/src/domain/ports/item-repository.ts`

Add to `ItemRepository` interface:

```typescript
findPrimesWithComponents(category?: string): Promise<Array<Item & {
  components: Array<{
    id: number
    name: string
    ducats: number | null
    drops: Array<{ location: string; chance: number; rarity: string | null }>
  }>
}>>
```

**File**: `packages/api/src/domain/ports/mastery-repository.ts`

Add to `MasteryRepository` interface:

```typescript
getMasteredItemIds(playerId: string): Promise<number[]>
```

Implement these in the corresponding Drizzle repositories. `findPrimesWithComponents` queries `items WHERE is_prime = true` joined with `item_components` (filtered to components with `ducats IS NOT NULL` to get only tradeable Prime parts) and their `component_drops`. `getMasteredItemIds` queries `player_mastery WHERE rank >= 30` and returns item IDs.

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm -F api typecheck`

#### Manual Verification:
- [ ] `curl` test: POST `/primes/components/123/toggle` returns `{ "owned": true }`
- [ ] `curl` test: GET `/primes/items/456/components` returns `{ "ownedComponentIds": [...] }`
- [ ] `curl` test: GET `/primes/incomplete` returns list of incomplete Primes with components

---

## Phase 4: Auto-Complete Mastered Primes on Sync

### Overview

When a profile sync detects a mastered Prime item, automatically mark all its crafting components as owned.

### Changes Required

#### 1. Update Sync Handler

**File**: `packages/api/src/application/http/sync.ts`

After existing mastery upsert logic, add auto-completion:

```typescript
// Auto-mark Prime parts as owned for mastered Primes
const masteredPrimeIds = masteryRecords
  .filter(r => {
    const item = [...itemsMap.values()].find(i => i.id === r.itemId)
    return item?.isPrime && r.rank >= 30
  })
  .map(r => r.itemId)

if (masteredPrimeIds.length > 0) {
  // Get component IDs for mastered Primes
  const componentIds = await container.itemRepo.getComponentIdsForItems(masteredPrimeIds)
  await container.primePartsRepo.markOwned(settings.playerId, componentIds)
  log.info('Auto-marked Prime parts as owned', {
    masteredPrimeCount: masteredPrimeIds.length,
    componentCount: componentIds.length,
  })
}
```

#### 2. New Repository Method

**File**: `packages/api/src/domain/ports/item-repository.ts`

Add to `ItemRepository` interface:

```typescript
getComponentIdsForItems(itemIds: number[]): Promise<number[]>
```

Implementation: query `item_components WHERE item_id IN (itemIds) AND ducats IS NOT NULL`, return component IDs.

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm -F api typecheck`
- [ ] Unit test: sync with mastered Prime → components auto-marked

#### Manual Verification:
- [ ] Sync profile → check database: mastered Prime components have entries in `player_prime_parts`

---

## Phase 5: Item Modal Enhancement

### Overview

Add ownership checkboxes to the existing "COMPONENT DROPS" section in the item modal for Prime items.

### Changes Required

#### 1. Update API Client Types

**File**: `packages/web/src/lib/api.ts`

Add new API function (after `isItemWishlisted`, line 316):

```typescript
export async function getOwnedComponents(itemId: number): Promise<number[]> {
  const response = await fetch(`${API_BASE}/primes/items/${itemId}/components`, {
    credentials: 'include'
  });
  const data = await handleResponse<{ ownedComponentIds: number[] }>(response);
  return data.ownedComponentIds;
}

export async function toggleComponentOwned(componentId: number): Promise<boolean> {
  const response = await fetch(`${API_BASE}/primes/components/${componentId}/toggle`, {
    method: 'POST',
    credentials: 'include'
  });
  const data = await handleResponse<{ owned: boolean }>(response);
  return data.owned;
}
```

#### 2. Extend ItemAcquisitionData Component Type

**File**: `packages/shared/src/types.ts`

Add `id` field to the component type in `ItemAcquisitionData` (line 25):

```typescript
components: Array<{
  id: number          // ← ADD THIS (component_id from item_components table)
  name: string
  itemCount: number
  ducats?: number
  tradable?: boolean
  drops: Array<{
    location: string
    chance: number
    rarity?: string
  }>
}>
```

This requires also returning `id` from `findByIdWithAcquisitionData` in `item-repository.ts`.

#### 3. Update ItemModal Component

**File**: `packages/web/src/lib/components/ItemModal.svelte`

Add imports (line 2):

```typescript
import { getImageUrl, formatBuildTime, toggleWishlist, isItemWishlisted, getOwnedComponents, toggleComponentOwned, type ItemDetails } from '$lib/api';
```

Add state for owned components (after line 15):

```typescript
let ownedComponentIds = $state<Set<number>>(new Set());
let togglingComponent = $state<number | null>(null);
```

Add effect to load owned state when Prime item opens (after line 24):

```typescript
$effect(() => {
  if (item?.isPrime) {
    getOwnedComponents(item.id).then(ids => {
      ownedComponentIds = new Set(ids);
    });
  } else {
    ownedComponentIds = new Set();
  }
});
```

Add toggle handler (after `handleWishlistToggle`, line 36):

```typescript
async function handleComponentToggle(componentId: number) {
  if (togglingComponent) return;
  togglingComponent = componentId;
  try {
    const owned = await toggleComponentOwned(componentId);
    ownedComponentIds = new Set(
      owned
        ? [...ownedComponentIds, componentId]
        : [...ownedComponentIds].filter(id => id !== componentId)
    );
  } finally {
    togglingComponent = null;
  }
}
```

Update the "COMPONENT DROPS" section (lines 209-231) to add checkboxes for Prime items:

```svelte
<!-- Component Drops -->
{#if item.acquisitionData?.components && item.acquisitionData.components.length > 0}
  <div class="acquisition-section">
    <h4>
      <span class="material-icons">{item.isPrime ? 'checklist' : 'layers'}</span>
      {item.isPrime ? 'PRIME PARTS' : 'COMPONENT DROPS'}
      {#if item.isPrime}
        <span class="parts-progress">
          {ownedComponentIds.size}/{item.acquisitionData.components.length}
        </span>
      {/if}
    </h4>
    {#each item.acquisitionData.components as comp}
      <div class="component-group" class:owned={ownedComponentIds.has(comp.id)}>
        <div class="component-header">
          {#if item.isPrime}
            <button
              class="component-checkbox"
              class:checked={ownedComponentIds.has(comp.id)}
              disabled={togglingComponent === comp.id}
              onclick={() => handleComponentToggle(comp.id)}
            >
              <span class="material-icons">
                {ownedComponentIds.has(comp.id) ? 'check_box' : 'check_box_outline_blank'}
              </span>
            </button>
          {/if}
          <div class="component-name">
            {comp.name}{#if comp.itemCount > 1} x{comp.itemCount}{/if}
            {#if comp.ducats}
              <span class="ducats">{comp.ducats}d</span>
            {/if}
          </div>
        </div>
        {#if comp.drops && comp.drops.length > 0 && !ownedComponentIds.has(comp.id)}
          <div class="drop-list">
            {#each comp.drops.slice(0, 3) as drop}
              <div class="drop-item">
                <span class="drop-location">{drop.location}</span>
                <span class="drop-chance">{(drop.chance * 100).toFixed(1)}%</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
```

Add styles for the new elements:

```sass
.component-header
  display: flex
  align-items: center
  gap: 0.5rem

.component-checkbox
  background: transparent
  border: none
  cursor: pointer
  padding: 0
  color: $gray-400
  transition: color $transition-base
  flex-shrink: 0

  &:hover
    color: $kim-accent

  &.checked
    color: $success

  &:disabled
    opacity: 0.5
    cursor: not-allowed

  .material-icons
    font-size: 1.25rem

.component-group.owned
  opacity: 0.5

  .component-name
    text-decoration: line-through

.parts-progress
  margin-left: auto
  font-size: $font-size-xxs
  color: $gray-500

.ducats
  font-size: $font-size-xxs
  color: $warning
  margin-left: 0.5rem
```

Key UX decisions:
- When a component is marked as owned, its relic drops are **hidden** (you don't need to farm it anymore)
- Owned components are dimmed with strikethrough
- Progress counter shows "2/4" in the section header
- Ducat value shown next to Prime parts

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm -F web typecheck`
- [ ] Build succeeds: `pnpm -F web build`

#### Manual Verification:
- [ ] Open a Prime item modal → checkboxes visible next to components
- [ ] Toggle a component → state persists on modal reopen
- [ ] Owned components hide their drop locations
- [ ] Progress counter updates correctly
- [ ] Non-Prime items still show normal "COMPONENT DROPS" without checkboxes

---

## Phase 6: Mastery Page Part Progress

### Overview

Add a progress indicator to Prime item cards on the mastery page.

### Changes Required

#### 1. Extend Mastery Items Response

**File**: `packages/api/src/application/http/mastery.ts`

In `GET /items` handler (after line 83), fetch Prime part progress:

```typescript
// Get Prime part ownership for progress display
const ownedComponentIds = new Set(
  await container.primePartsRepo.getOwnedComponentIds(settings.playerId)
)
const masteredItemIds = new Set(
  await container.masteryRepo.getMasteredItemIds(settings.playerId)
)
```

Add `primeProgress` to item mapping (inside `.map()` around line 89):

```typescript
const itemsWithExtras = items.map(item => {
  const wishlisted = wishlistedSet.has(item.id)
  // ... existing wishlisted logic ...

  // Prime part progress (null for non-Primes)
  let primeProgress = null
  if (item.isPrime && item.componentCount > 0) {
    const isMastered = masteredItemIds.has(item.id)
    primeProgress = {
      owned: isMastered ? item.componentCount : item.componentIds
        .filter(id => ownedComponentIds.has(id)).length,
      total: item.componentCount,
    }
  }

  return { ...item, wishlisted, primeProgress }
})
```

This requires the mastery repo's `getItemsWithMastery` to also return component IDs for Prime items. An alternative simpler approach: just return `componentCount` per item and let a separate API call or batch query handle progress. Consider the performance tradeoff.

**Simpler alternative**: Pre-compute progress per Prime item in the `/primes/incomplete` endpoint, and on the mastery page just show a small badge without loading all component data.

#### 2. Update MasteryItem Type

**File**: `packages/web/src/lib/api.ts`

Add to `MasteryItem` interface (after line 115):

```typescript
primeProgress: { owned: number; total: number } | null;
```

#### 3. Update Mastery Page Item Cards

**File**: `packages/web/src/routes/mastery/+page.svelte`

Add progress indicator to Prime item cards:

```svelte
{#if item.primeProgress && item.primeProgress.total > 0}
  <div class="prime-progress">
    <span class="progress-text">{item.primeProgress.owned}/{item.primeProgress.total}</span>
  </div>
{/if}
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm -F web typecheck`

#### Manual Verification:
- [ ] Prime item cards show "2/4" progress badge
- [ ] Non-Prime items don't show progress
- [ ] Mastered Primes show full progress (4/4)

---

## Phase 7: Prime Farming Page

### Overview

Create a dedicated `/primes` page showing all incomplete Primes with their missing parts and relic sources.

### Changes Required

#### 1. Create Page

**File**: `packages/web/src/routes/primes/+page.svelte` (new file)

Page layout:

```
┌─────────────────────────────────────────────────┐
│ PRIME TRACKER                                   │
│ Track your Prime part collection                │
├─────────────────────────────────────────────────┤
│ Filters: [All Categories ▾] [☐ Hide Vaulted]   │
├─────────────────────────────────────────────────┤
│ AVAILABLE                                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ [img] EMBER PRIME         ████░░ 2/4 parts  │ │
│ │       ☐ Prime Blueprint   Lith E1 (Common)  │ │
│ │       ☑ Prime Chassis     ─ owned ─         │ │
│ │       ☑ Prime Neuroptics  ─ owned ─         │ │
│ │       ☐ Prime Systems     Neo E1 (Rare)     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ VAULTED                                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ [img] MAG PRIME           ░░░░░░ 0/4 parts  │ │
│ │       ☐ Prime Blueprint   (trade only)      │ │
│ │       ...                                   │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

Features:
- Calls `GET /primes/incomplete` endpoint
- Groups by vaulted/available
- Inline component checkboxes with relic info for unowned parts
- Category filter dropdown
- "Hide vaulted" toggle
- Clicking item image/name opens the existing ItemModal
- Progress bar per Prime

#### 2. Add Navigation Link

**File**: `packages/web/src/lib/components/Sidebar.svelte` (or equivalent nav component)

Add link between mastery and starchart:

```svelte
<a href="/primes" class:active={$page.url.pathname === '/primes'}>
  <span class="material-icons">diamond</span>
  PRIMES
</a>
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm -F web typecheck`
- [ ] Build succeeds: `pnpm -F web build`

#### Manual Verification:
- [ ] `/primes` page loads with incomplete Primes listed
- [ ] Available and vaulted sections separated
- [ ] Component checkboxes toggle correctly
- [ ] Relic info shows for unowned parts only
- [ ] Category filter works
- [ ] "Hide vaulted" toggle works
- [ ] Progress sorted: most complete first
- [ ] Clicking item opens modal
- [ ] Navigation link visible in sidebar

---

## Testing Strategy

### Unit Tests

- **Prime parts repository**: test toggle, markOwned, getOwnedComponentIds, getOwnedComponentIdsForItem
- **Sync auto-complete**: test that mastered Prime items trigger component ownership
- **Incomplete Primes query**: test filtering, sorting, progress calculation
- **API routes**: test toggle returns correct state, handles invalid IDs

### Integration Tests

- Full flow: toggle part in modal → verify `/primes/incomplete` reflects change
- Sync flow: sync mastered Prime → verify parts auto-marked → verify `/primes/incomplete` excludes it

### Manual Testing Steps

1. Seed database, run sync
2. Open mastery page → find a Prime item → verify progress badge
3. Click Prime item → see parts checklist in modal
4. Toggle a part owned → modal updates, reopen confirms persistence
5. Navigate to `/primes` → see incomplete Primes
6. Toggle parts on the Primes page → progress updates
7. Check a mastered Prime → all parts should be pre-checked
8. Filter to "Available only" → vaulted Primes hidden
9. Filter by category → only matching Primes shown

## Performance Considerations

- `getOwnedComponentIds` is a single indexed query per page load
- Mastery page: one additional query for owned components (batch, not per-item)
- `/primes/incomplete` does more work (joins across 3 tables) but is a dedicated page load, not real-time
- Component toggle is a single row upsert

## Migration Notes

- New table, no existing data affected
- Auto-completion runs on next sync after migration
- Feature is additive, no breaking changes

## References

- R3: Prime Part Tracking Feasibility (2026-02-07) - Data sources and approach
- P005: Wishlist Feature - Pattern for manual tracking
- @wfcd/items component data: ducats, tradable, drops with relic sources
- FrameHub (Paroxity) - UX reference for Prime part checklist
