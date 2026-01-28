# PLAN 005: Wishlist Feature

## Overview

Add a wishlist feature allowing players to mark items they want to farm/build. Wishlisted items appear on a dedicated page and are sorted first on the mastery database page.

## Current State Analysis

- Player-specific data is keyed by `playerId` (Warframe IGN), not `userId` (Steam account)
- Existing pattern: `player_mastery` table uses `(playerId, itemId)` composite unique constraint
- Items displayed in grid on `/mastery` page with filtering by category/mastered/unmastered
- `ItemModal` component shows item details when clicking an item card
- API follows hexagonal architecture: ports in `domain/ports/`, implementations in `infrastructure/persistence/drizzle/`

### Key Files:
- Schema: `packages/api/src/infrastructure/persistence/drizzle/schema.ts`
- Mastery routes: `packages/api/src/application/http/mastery.ts`
- Container: `packages/api/src/infrastructure/bootstrap/container.ts`
- Frontend mastery page: `packages/web/src/routes/mastery/+page.svelte`
- ItemModal: `packages/web/src/lib/components/ItemModal.svelte`
- API client: `packages/web/src/lib/api.ts`

## Desired End State

1. Players can toggle items on/off their wishlist from item cards or the detail modal
2. A dedicated `/wishlist` page shows all wishlisted items
3. On the mastery page, wishlisted items appear first (before other sorting)
4. Wishlist state is visually indicated on item cards (star icon)

### Verification:
- Add an item to wishlist from the mastery page grid
- Verify it appears on `/wishlist` page
- Verify it sorts to the top of the mastery page
- Remove from wishlist, verify it's gone from `/wishlist` and no longer prioritized

## What We're NOT Doing

- Notes/comments on items (separate feature)
- Sharing wishlists with other players
- Priority levels or categories within the wishlist
- Wishlist import/export

## Implementation Approach

1. Database first: add `player_wishlist` table
2. Backend: repository, port, and API routes
3. Frontend: API client, then UI components
4. Integration: wire wishlist state into existing mastery page

---

## Phase 1: Database Schema

### Overview
Add the `player_wishlist` table to store wishlist entries.

### Changes Required:

#### 1. Schema Definition
**File**: `packages/api/src/infrastructure/persistence/drizzle/schema.ts`

Add after `playerNodes` table (around line 175):

```typescript
// Player wishlist - items they want to farm/build
export const playerWishlist = pgTable('player_wishlist', {
  id: serial('id').primaryKey(),
  playerId: varchar('player_id', { length: 50 }).notNull(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  playerItemIdx: index('player_wishlist_player_item_idx').on(table.playerId, table.itemId),
  playerItemUnique: unique('player_wishlist_unique').on(table.playerId, table.itemId),
}))
```

#### 2. Generate Migration
Run Drizzle Kit to generate the migration SQL.

### Success Criteria:

#### Automated Verification:
- [x] `pnpm drizzle-kit generate` creates migration file without errors
- [x] `pnpm db:migrate` applies migration successfully
- [x] TypeScript compiles: `pnpm -F api typecheck`

#### Manual Verification:
- [x] Verify table exists in database with correct columns and constraints

---

## Phase 2: Backend Repository & Port

### Overview
Create the wishlist repository interface and Drizzle implementation.

### Changes Required:

#### 1. Domain Port
**File**: `packages/api/src/domain/ports/wishlist-repository.ts` (new file)

```typescript
export interface WishlistRepository {
  /** Get all wishlisted item IDs for a player */
  getWishlistedItemIds(playerId: string): Promise<number[]>

  /** Check if a specific item is wishlisted */
  isWishlisted(playerId: string, itemId: number): Promise<boolean>

  /** Add item to wishlist (idempotent) */
  add(playerId: string, itemId: number): Promise<void>

  /** Remove item from wishlist */
  remove(playerId: string, itemId: number): Promise<void>

  /** Toggle wishlist status, returns new state */
  toggle(playerId: string, itemId: number): Promise<boolean>
}
```

#### 2. Drizzle Implementation
**File**: `packages/api/src/infrastructure/persistence/drizzle/wishlist-repository.ts` (new file)

```typescript
import { eq, and } from 'drizzle-orm'
import type { WishlistRepository } from '../../../domain/ports/wishlist-repository'
import { playerWishlist } from './schema'
import type { DrizzleDb } from './connection'

export class DrizzleWishlistRepository implements WishlistRepository {
  constructor(private db: DrizzleDb) {}

  async getWishlistedItemIds(playerId: string): Promise<number[]> {
    const rows = await this.db
      .select({ itemId: playerWishlist.itemId })
      .from(playerWishlist)
      .where(eq(playerWishlist.playerId, playerId))
    return rows.map(r => r.itemId)
  }

  async isWishlisted(playerId: string, itemId: number): Promise<boolean> {
    const row = await this.db
      .select({ id: playerWishlist.id })
      .from(playerWishlist)
      .where(and(
        eq(playerWishlist.playerId, playerId),
        eq(playerWishlist.itemId, itemId)
      ))
      .limit(1)
    return row.length > 0
  }

  async add(playerId: string, itemId: number): Promise<void> {
    await this.db
      .insert(playerWishlist)
      .values({ playerId, itemId })
      .onConflictDoNothing()
  }

  async remove(playerId: string, itemId: number): Promise<void> {
    await this.db
      .delete(playerWishlist)
      .where(and(
        eq(playerWishlist.playerId, playerId),
        eq(playerWishlist.itemId, itemId)
      ))
  }

  async toggle(playerId: string, itemId: number): Promise<boolean> {
    const isCurrentlyWishlisted = await this.isWishlisted(playerId, itemId)
    if (isCurrentlyWishlisted) {
      await this.remove(playerId, itemId)
      return false
    } else {
      await this.add(playerId, itemId)
      return true
    }
  }
}
```

#### 3. Update Container
**File**: `packages/api/src/infrastructure/bootstrap/container.ts`

Add import and wire up the repository:

```typescript
import type { WishlistRepository } from '../../domain/ports/wishlist-repository'
import { DrizzleWishlistRepository } from '../persistence/drizzle/wishlist-repository'

export interface Container {
  // ... existing
  wishlistRepo: WishlistRepository
}

export function createContainer(): Container {
  return {
    // ... existing
    wishlistRepo: new DrizzleWishlistRepository(db),
  }
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -F api typecheck`
- [x] Unit tests pass (if added): `pnpm -F api test`

#### Manual Verification:
- [x] N/A - tested via API routes in next phase

---

## Phase 3: Backend API Routes

### Overview
Add wishlist API endpoints for listing, toggling, and checking wishlist status.

### Changes Required:

#### 1. Wishlist Routes
**File**: `packages/api/src/application/http/wishlist.ts` (new file)

```typescript
import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import { handleRouteError, noPlayerConfigured } from './errors'
import { createLogger } from '../../infrastructure/logging/logger'

const log = createLogger('wishlist')

export function wishlistRoutes(container: Container) {
  const router = new Hono()

  // Get all wishlisted item IDs
  router.get('/', async (c) => {
    try {
      const auth = c.get('auth')
      const settings = await container.playerRepo.getSettings(auth.userId)
      if (!settings?.playerId) {
        return noPlayerConfigured(c, log)
      }
      const itemIds = await container.wishlistRepo.getWishlistedItemIds(settings.playerId)
      return c.json({ itemIds })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to get wishlist')
    }
  })

  // Toggle item wishlist status
  router.post('/:itemId/toggle', async (c) => {
    try {
      const auth = c.get('auth')
      const settings = await container.playerRepo.getSettings(auth.userId)
      if (!settings?.playerId) {
        return noPlayerConfigured(c, log)
      }
      const itemId = Number(c.req.param('itemId'))
      if (isNaN(itemId)) {
        return c.json({ error: 'Invalid item ID' }, 400)
      }
      const wishlisted = await container.wishlistRepo.toggle(settings.playerId, itemId)
      return c.json({ wishlisted })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to toggle wishlist')
    }
  })

  // Check if item is wishlisted (useful for item detail page)
  router.get('/:itemId', async (c) => {
    try {
      const auth = c.get('auth')
      const settings = await container.playerRepo.getSettings(auth.userId)
      if (!settings?.playerId) {
        return noPlayerConfigured(c, log)
      }
      const itemId = Number(c.req.param('itemId'))
      if (isNaN(itemId)) {
        return c.json({ error: 'Invalid item ID' }, 400)
      }
      const wishlisted = await container.wishlistRepo.isWishlisted(settings.playerId, itemId)
      return c.json({ wishlisted })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to check wishlist status')
    }
  })

  return router
}
```

#### 2. Register Routes
**File**: `packages/api/src/application/index.ts`

Add import and route registration:

```typescript
import { wishlistRoutes } from './http/wishlist'

// In middleware section, add:
app.use('/wishlist', authMiddleware, onboardingMiddleware)
app.use('/wishlist/*', authMiddleware, onboardingMiddleware)

// In route registration section, add:
app.route('/wishlist', wishlistRoutes(container))
```

#### 3. Extend Mastery Items Response
**File**: `packages/api/src/application/http/mastery.ts`

Modify `GET /mastery/items` to include `wishlisted` flag and support wishlist sorting:

In the route handler, after getting items:
```typescript
// Get wishlist for sorting/flagging
const wishlistedIds = new Set(await container.wishlistRepo.getWishlistedItemIds(settings.playerId))

// Add wishlisted flag to each item
const itemsWithWishlist = items.map(item => ({
  ...item,
  wishlisted: wishlistedIds.has(item.id)
}))

// Sort: wishlisted first, then by name
itemsWithWishlist.sort((a, b) => {
  if (a.wishlisted && !b.wishlisted) return -1
  if (!a.wishlisted && b.wishlisted) return 1
  return a.name.localeCompare(b.name)
})

return c.json(itemsWithWishlist)
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -F api typecheck`
- [x] API tests pass: `pnpm -F api test`

#### Manual Verification:
- [ ] `curl` test: POST `/wishlist/123/toggle` returns `{ "wishlisted": true }`
- [ ] `curl` test: GET `/wishlist` returns `{ "itemIds": [123] }`
- [ ] `curl` test: GET `/mastery/items` includes `wishlisted` field

---

## Phase 4: Frontend API Client

### Overview
Add TypeScript API functions for wishlist operations.

### Changes Required:

#### 1. API Functions
**File**: `packages/web/src/lib/api.ts`

Add types and functions:

```typescript
// Update MasteryItem interface to include wishlisted
export interface MasteryItem {
  // ... existing fields
  wishlisted: boolean
}

// Wishlist API functions
export async function getWishlistItemIds(): Promise<number[]> {
  const response = await fetch(`${API_BASE}/wishlist`, {
    credentials: 'include'
  })
  const data = await handleResponse<{ itemIds: number[] }>(response)
  return data.itemIds
}

export async function toggleWishlist(itemId: number): Promise<boolean> {
  const response = await fetch(`${API_BASE}/wishlist/${itemId}/toggle`, {
    method: 'POST',
    credentials: 'include'
  })
  const data = await handleResponse<{ wishlisted: boolean }>(response)
  return data.wishlisted
}

export async function isItemWishlisted(itemId: number): Promise<boolean> {
  const response = await fetch(`${API_BASE}/wishlist/${itemId}`, {
    credentials: 'include'
  })
  const data = await handleResponse<{ wishlisted: boolean }>(response)
  return data.wishlisted
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -F web typecheck`

#### Manual Verification:
- [x] N/A - tested via UI in next phases

---

## Phase 5: Wishlist Toggle on Item Cards

### Overview
Add a wishlist toggle button to item cards on the mastery page.

### Changes Required:

#### 1. Update Mastery Page
**File**: `packages/web/src/routes/mastery/+page.svelte`

Add toggle handler and update item card:

```typescript
// In script section:
import { toggleWishlist } from '$lib/api';

async function handleWishlistToggle(event: MouseEvent, item: MasteryItem) {
  event.stopPropagation(); // Don't open modal
  const newState = await toggleWishlist(item.id);
  // Update local state
  items = items.map(i =>
    i.id === item.id ? { ...i, wishlisted: newState } : i
  );
}
```

In the item card template, add a wishlist button (before or after the rank display):

```svelte
<button
  class="wishlist-btn"
  class:active={item.wishlisted}
  onclick={(e) => handleWishlistToggle(e, item)}
  title={item.wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
>
  <span class="material-icons">{item.wishlisted ? 'star' : 'star_border'}</span>
</button>
```

Add styles:

```sass
.wishlist-btn
  background: transparent
  border: none
  cursor: pointer
  padding: 0.25rem
  color: $gray-400
  transition: color $transition-base

  &:hover
    color: $warning

  &.active
    color: $warning

  .material-icons
    font-size: 1.25rem
```

#### 2. Update Filtering Logic
Since the API now returns items sorted with wishlisted first, update the derived filter to maintain this order:

```typescript
let filteredItems = $derived(
  items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (!showPrime && item.isPrime) return false;
    return true;
  })
  // No additional sort needed - API handles wishlist-first sorting
);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -F web typecheck`
- [x] Linting passes: `pnpm -F web lint`

#### Manual Verification:
- [ ] Star icon visible on each item card
- [ ] Clicking star toggles between filled/outline
- [ ] Wishlisted items move to top of list after page refresh
- [ ] Clicking star doesn't open the item modal

---

## Phase 6: Wishlist Toggle in ItemModal

### Overview
Add wishlist toggle button to the item detail modal.

### Changes Required:

#### 1. Update ItemModal Component
**File**: `packages/web/src/lib/components/ItemModal.svelte`

Update props and add toggle:

```typescript
let {
  item,
  onClose,
  onWishlistToggle
}: {
  item: ItemDetails | null;
  onClose: () => void;
  onWishlistToggle?: (itemId: number, newState: boolean) => void;
} = $props();

let wishlisted = $state(false);
let togglingWishlist = $state(false);

// Load wishlist state when item changes
$effect(() => {
  if (item) {
    isItemWishlisted(item.id).then(state => {
      wishlisted = state;
    });
  }
});

async function handleToggle() {
  if (!item || togglingWishlist) return;
  togglingWishlist = true;
  try {
    const newState = await toggleWishlist(item.id);
    wishlisted = newState;
    onWishlistToggle?.(item.id, newState);
  } finally {
    togglingWishlist = false;
  }
}
```

Add import at top:
```typescript
import { toggleWishlist, isItemWishlisted } from '$lib/api';
```

Add button in the item-badges section (after existing badges):

```svelte
<button
  class="wishlist-toggle"
  class:active={wishlisted}
  onclick={handleToggle}
  disabled={togglingWishlist}
>
  <span class="material-icons">{wishlisted ? 'star' : 'star_border'}</span>
  {wishlisted ? 'WISHLISTED' : 'ADD TO WISHLIST'}
</button>
```

Add styles:

```sass
.wishlist-toggle
  display: flex
  align-items: center
  gap: 0.25rem
  padding: 0.25rem 0.5rem
  background: transparent
  border: 1px solid $gray-500
  color: $gray-300
  font-family: $font-family-monospace
  font-size: $font-size-xxs
  cursor: pointer
  transition: all $transition-base
  margin-top: 0.75rem

  &:hover
    border-color: $warning
    color: $warning

  &.active
    border-color: $warning
    color: $warning
    background: rgba($warning, 0.1)

  &:disabled
    opacity: 0.5
    cursor: not-allowed

  .material-icons
    font-size: 1rem
```

#### 2. Update Mastery Page to Handle Modal Callback
**File**: `packages/web/src/routes/mastery/+page.svelte`

Add callback handler and pass to modal:

```typescript
function handleModalWishlistToggle(itemId: number, newState: boolean) {
  items = items.map(i =>
    i.id === itemId ? { ...i, wishlisted: newState } : i
  );
}
```

Update modal usage:
```svelte
<ItemModal
  item={selectedItem}
  onClose={closeItemModal}
  onWishlistToggle={handleModalWishlistToggle}
/>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -F web typecheck`

#### Manual Verification:
- [ ] Wishlist button visible in item modal
- [ ] Button shows correct state when modal opens
- [ ] Toggling updates both modal and underlying item card

---

## Phase 7: Dedicated Wishlist Page

### Overview
Create a dedicated `/wishlist` page showing all wishlisted items.

### Changes Required:

#### 1. Create Wishlist Page
**File**: `packages/web/src/routes/wishlist/+page.svelte` (new file)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { getMasteryItems, getItemDetails, getImageUrl, toggleWishlist, type MasteryItem, type ItemDetails } from '$lib/api';
  import ItemModal from '$lib/components/ItemModal.svelte';

  let items: MasteryItem[] = $state([]);
  let loading = $state(true);
  let selectedItem: ItemDetails | null = $state(null);
  let loadingItem = $state(false);

  async function loadWishlist() {
    loading = true;
    try {
      // Get all items, then filter to wishlisted
      const allItems = await getMasteryItems({});
      items = allItems.filter(item => item.wishlisted);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadWishlist();
  });

  async function openItemModal(itemId: number) {
    loadingItem = true;
    try {
      selectedItem = await getItemDetails(itemId);
    } catch (e) {
      console.error('Failed to load item details:', e);
    } finally {
      loadingItem = false;
    }
  }

  function closeItemModal() {
    selectedItem = null;
  }

  async function handleRemove(event: MouseEvent, item: MasteryItem) {
    event.stopPropagation();
    await toggleWishlist(item.id);
    items = items.filter(i => i.id !== item.id);
  }

  function handleModalWishlistToggle(itemId: number, newState: boolean) {
    if (!newState) {
      // Removed from wishlist - remove from list
      items = items.filter(i => i.id !== itemId);
    }
  }
</script>

<div class="page-header kim-panel mb-4">
  <h2>
    <span class="material-icons">star</span>
    WISHLIST
  </h2>
  <p class="subtitle">Items you want to farm or build</p>
</div>

{#if loading}
  <div class="loading-state">
    <div class="spinner"></div>
    <p>LOADING WISHLIST...</p>
  </div>
{:else if items.length === 0}
  <div class="empty-state">
    <span class="material-icons">star_border</span>
    <p>YOUR WISHLIST IS EMPTY</p>
    <p class="hint">Add items from the <a href="/mastery">Mastery Database</a></p>
  </div>
{:else}
  <div class="results-header">
    <span class="results-count">{items.length} ITEMS</span>
  </div>

  <div class="items-grid">
    {#each items as item}
      <div
        class="item-card"
        class:mastered={item.masteryState === 'mastered_30'}
        class:mastered-full={item.masteryState === 'mastered_40'}
        onclick={() => openItemModal(item.id)}
      >
        <div class="item-image-container">
          {#if getImageUrl(item.imageName)}
            <img src={getImageUrl(item.imageName)} alt={item.name} class="item-img" loading="lazy" />
          {:else}
            <div class="item-img-placeholder">
              <span class="material-icons">help_outline</span>
            </div>
          {/if}
        </div>
        <div class="item-details">
          <div class="item-name" title={item.name}>{item.name}</div>
          <div class="item-meta">
            <span class="item-category">{item.category}</span>
            {#if item.isPrime}
              <span class="item-prime">PRIME</span>
            {/if}
          </div>
        </div>
        <button
          class="remove-btn"
          onclick={(e) => handleRemove(e, item)}
          title="Remove from wishlist"
        >
          <span class="material-icons">close</span>
        </button>
      </div>
    {/each}
  </div>
{/if}

<ItemModal
  item={selectedItem}
  onClose={closeItemModal}
  onWishlistToggle={handleModalWishlistToggle}
/>

{#if loadingItem}
  <div class="loading-overlay">
    <div class="spinner"></div>
  </div>
{/if}

<style lang="sass">
  @use '../../styles/variables' as *

  .page-header
    h2
      display: flex
      align-items: center
      gap: 0.5rem
      margin: 0

      .material-icons
        color: $warning

    .subtitle
      margin: 0.5rem 0 0 0
      color: $gray-500
      font-size: $font-size-sm

  // Reuse item grid styles from mastery page
  .items-grid
    display: grid
    grid-template-columns: repeat(2, 1fr)
    gap: 0.75rem

    @media (min-width: 768px)
      grid-template-columns: repeat(3, 1fr)

    @media (min-width: 1024px)
      grid-template-columns: repeat(4, 1fr)

  .item-card
    background: white
    border: $border-width solid $kim-border
    display: flex
    align-items: center
    gap: 0.75rem
    padding: 0.5rem
    transition: all $transition-base
    cursor: pointer
    min-width: 0
    overflow: hidden

    &:hover
      border-color: $kim-accent
      background: $danger-bg

    &.mastered
      opacity: 0.6
      &:hover
        opacity: 1

    &.mastered-full
      opacity: 0.7
      border-color: $warning
      background: $warning-bg
      &:hover
        opacity: 1

  .item-image-container
    flex-shrink: 0

  .item-img
    width: $icon-size-lg
    height: $icon-size-lg
    object-fit: contain
    background: $gray-200
    border: 1px solid $gray-400
    image-rendering: pixelated

  .item-img-placeholder
    width: $icon-size-lg
    height: $icon-size-lg
    background: $gray-200
    border: 1px solid $gray-400
    display: flex
    align-items: center
    justify-content: center
    color: $gray-400

  .item-details
    flex: 1
    min-width: 0

  .item-name
    font-family: $font-family-monospace
    font-size: $font-size-sm
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    text-transform: uppercase

  .item-meta
    display: flex
    gap: 0.5rem
    align-items: center
    margin-top: 0.25rem

  .item-category
    font-size: $font-size-xxs
    color: $gray-500
    text-transform: uppercase

  .item-prime
    font-size: 0.65rem
    background: $warning-bg-soft
    color: $warning-text
    padding: 0 0.25rem
    border: 1px solid $warning

  .remove-btn
    background: transparent
    border: none
    cursor: pointer
    padding: 0.25rem
    color: $gray-400
    flex-shrink: 0

    &:hover
      color: $kim-accent

    .material-icons
      font-size: 1.25rem

  .results-header
    display: flex
    justify-content: space-between
    margin-bottom: 1rem
    font-family: $font-family-monospace
    font-size: $font-size-sm

  .results-count
    color: $kim-border

  .loading-state, .empty-state
    display: flex
    flex-direction: column
    align-items: center
    justify-content: center
    padding: 4rem
    font-family: $font-family-monospace
    text-transform: uppercase
    color: $gray-500

    .material-icons
      font-size: $font-size-xxl
      margin-bottom: 1rem
      opacity: 0.5

  .empty-state
    .hint
      font-size: $font-size-sm
      margin-top: 0.5rem
      text-transform: none

      a
        color: $kim-accent
        text-decoration: underline

  .spinner
    width: 24px
    height: 24px
    border: 3px solid $gray-300
    border-top-color: $kim-border
    border-radius: 50%
    animation: spin 1s linear infinite
    margin-bottom: 1rem

  .loading-overlay
    position: fixed
    inset: 0
    background: rgba(0, 0, 0, 0.5)
    display: flex
    align-items: center
    justify-content: center
    z-index: $zindex-noise
</style>
```

#### 2. Add Navigation Link
**File**: `packages/web/src/lib/components/Sidebar.svelte` (or wherever nav is)

Add link to wishlist page in the navigation:

```svelte
<a href="/wishlist" class:active={$page.url.pathname === '/wishlist'}>
  <span class="material-icons">star</span>
  WISHLIST
</a>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -F web typecheck`
- [x] Build succeeds: `pnpm -F web build`

#### Manual Verification:
- [ ] `/wishlist` page loads and shows wishlisted items
- [ ] Empty state shown when no items wishlisted
- [ ] Remove button removes item from list immediately
- [ ] Clicking item opens modal
- [ ] Navigation link works

---

## Testing Strategy

### Unit Tests:
- Wishlist repository: test add, remove, toggle, getWishlistedItemIds
- API routes: test toggle returns correct state, handles invalid IDs

### Integration Tests:
- Full flow: add item → verify in list → remove → verify gone

### Manual Testing Steps:
1. Navigate to mastery page, find an unmastered item
2. Click the star icon on the item card
3. Verify star becomes filled (yellow)
4. Refresh the page - verify wishlisted items appear at top
5. Navigate to `/wishlist` - verify item appears
6. Click item to open modal
7. Verify wishlist button shows "WISHLISTED"
8. Click to remove from wishlist
9. Verify item disappears from wishlist page
10. Go back to mastery - verify star is now outline

## Performance Considerations

- Wishlist IDs are fetched once per mastery page load (not per-item)
- Toggle is optimistic on frontend (update immediately, API call in background)
- Consider caching wishlist state in a Svelte store if performance becomes an issue

## Migration Notes

- No data migration needed - new table starts empty
- Feature is additive, no breaking changes to existing functionality

## References

- Similar pattern: `player_mastery` table uses same `(playerId, itemId)` structure
- Mastery routes: `packages/api/src/application/http/mastery.ts:67-86`
- Item card pattern: `packages/web/src/routes/mastery/+page.svelte:150-201`
