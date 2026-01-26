# PLAN P003: Display Personal Weapon Combat Stats in Item Modal

## Overview

Add personal weapon combat statistics (kills, headshots, accuracy, time equipped) from the DE profile to the item detail modal. Currently the modal shows acquisition/crafting data, but the DE profile contains rich per-weapon combat stats that would be valuable to display.

## Current State Analysis

### Data Available in DE Profile

The DE profile response contains weapon stats at **root level** `Stats.Weapons[]` (NOT under Results[0]):

```json
{
  "fired": 8214,
  "hits": 35545,
  "kills": 1202,
  "headshots": 36,
  "equipTime": 31813.7674868,
  "xp": 5316035,
  "assists": 184,
  "type": "/Lotus/Weapons/Tenno/Pistols/PrimeKompressa/PrimeKompressa"
}
```

| Field | Description | Notes |
|-------|-------------|-------|
| `fired` | Shots/swings | May be missing for some items |
| `hits` | Hits landed | Missing for melee weapons |
| `kills` | Total kills | |
| `headshots` | Headshot kills | |
| `equipTime` | Seconds equipped | Floating point |
| `xp` | XP earned | Redundant with XPInfo |
| `assists` | Kill assists | |
| `type` | uniqueName | Join key |

### Current Data Flow

1. `de-profile-api.ts:31` extracts `XPInfo` but ignores `Stats.Weapons`
2. `sync.ts:67-77` maps XP to mastery records, stores in `playerMastery`
3. `ItemModal.svelte` displays item via `getItemDetails(id)` which calls `findByIdWithAcquisitionData`

### Key Discoveries

- `Stats.Weapons` is never accessed: `de-profile-api.ts:31`
- `playerMastery` table only has: `playerId`, `itemId`, `xp`, `rank`: `schema.ts:103-113`
- Existing sync pattern can be extended: `sync.ts:67-79`
- Item details already fetch player-specific data via join: `mastery-repository.ts:50-118`

## Desired End State

When clicking a loadout item (or any item with mastery), the modal shows a "Personal Stats" section:

```
PERSONAL STATS
Accuracy:      85.3% (35,545 / 41,659)
Kills:         1,202
Headshots:     36 (3.0% of kills)
Time Equipped: 8h 50m
Assists:       184
```

### Verification

1. Sync profile and check database has stats columns populated
2. Open item modal for an equipped weapon
3. Verify stats display correctly with proper formatting
4. Verify items with no stats (unequipped/never used) show no section

## What We're NOT Doing

- Leaderboards or comparisons between weapons
- Historical tracking (stats are overwritten on sync)
- Stats for Warframes (DE profile only has weapon stats)
- Warframe-specific stats like abilities used (not in profile)
- Any new API endpoints (reuse existing item details flow)

## Implementation Approach

Extend the existing sync flow to capture weapon stats alongside XP data. Store stats in `playerMastery` table (adding columns) since they're 1:1 with mastery records. Return stats when fetching item details for items the player owns.

## Phase 1: Database Schema Extension

### Overview

Add columns to `playerMastery` table to store combat stats.

### Changes Required

#### 1. Create Migration

**File**: `packages/api/drizzle/0008_add_weapon_stats.sql`

```sql
ALTER TABLE "player_mastery" ADD COLUMN "fired" integer;
ALTER TABLE "player_mastery" ADD COLUMN "hits" integer;
ALTER TABLE "player_mastery" ADD COLUMN "kills" integer;
ALTER TABLE "player_mastery" ADD COLUMN "headshots" integer;
ALTER TABLE "player_mastery" ADD COLUMN "equip_time" integer;
ALTER TABLE "player_mastery" ADD COLUMN "assists" integer;
```

Note: `equip_time` stored as integer seconds (rounded from float).

#### 2. Update Schema Definition

**File**: `packages/api/src/infrastructure/persistence/drizzle/schema.ts`

Add to `playerMastery` table definition (after line 108):

```typescript
export const playerMastery = pgTable('player_mastery', {
  id: serial('id').primaryKey(),
  playerId: varchar('player_id', { length: 50 }).notNull(),
  itemId: integer('item_id').notNull().references(() => items.id),
  xp: integer('xp').notNull(),
  rank: integer('rank').notNull().default(0),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
  // Combat stats from DE profile
  fired: integer('fired'),
  hits: integer('hits'),
  kills: integer('kills'),
  headshots: integer('headshots'),
  equipTime: integer('equip_time'),
  assists: integer('assists'),
}, (table) => ({
  // ... existing indexes
}))
```

### Success Criteria

#### Automated Verification:
- [x] Migration applies cleanly: `pnpm db:migrate`
- [x] TypeScript compiles: `pnpm -r build`

#### Manual Verification:
- [ ] Check table structure: `\d player_mastery` in psql shows new columns

---

## Phase 2: Profile Data Extraction

### Overview

Extract weapon stats from DE profile response and include in `ProfileData`.

### Changes Required

#### 1. Add Type Definition

**File**: `packages/api/src/domain/ports/profile-api.ts`

Add after `ProfileXpComponent` interface (line 6):

```typescript
export interface WeaponStats {
  itemType: string   // uniqueName
  fired: number | null
  hits: number | null
  kills: number
  headshots: number
  equipTime: number  // seconds (rounded from float)
  assists: number
}
```

Update `ProfileData` interface (after line 46):

```typescript
export interface ProfileData {
  displayName: string | null
  playerLevel: number
  xpComponents: ProfileXpComponent[]
  weaponStats: WeaponStats[]  // Add this
  loadout: Loadout
  intrinsics: Intrinsics
  missions: MissionCompletion[]
}
```

#### 2. Extract Stats from Profile

**File**: `packages/api/src/infrastructure/external/de-profile-api.ts`

Add extraction after line 44 (after missions extraction):

```typescript
// Extract weapon combat stats
const rawWeaponStats = data.Results?.[0]?.Stats?.Weapons ?? []
const weaponStats = this.extractWeaponStats(rawWeaponStats)
```

Add to return object (after line 64):

```typescript
return {
  displayName: data.Results?.[0]?.DisplayName ?? null,
  playerLevel: data.Results?.[0]?.PlayerLevel ?? 0,
  xpComponents: xpInfo.map((xp: any) => ({
    itemType: xp.ItemType,
    xp: xp.XP,
  })),
  weaponStats,  // Add this
  loadout,
  intrinsics,
  missions,
}
```

Add extraction method after `extractMissions` (line 119):

```typescript
private extractWeaponStats(rawStats: any[]): WeaponStats[] {
  return rawStats
    .filter((s: any) => s.type) // Must have type (uniqueName)
    .map((s: any) => ({
      itemType: s.type,
      fired: s.fired ?? null,
      hits: s.hits ?? null,
      kills: s.kills ?? 0,
      headshots: s.headshots ?? 0,
      equipTime: Math.round(s.equipTime ?? 0),
      assists: s.assists ?? 0,
    }))
}
```

Update logging (after line 51):

```typescript
log.info('Profile fetched', {
  displayName: data.Results?.[0]?.DisplayName,
  playerLevel: data.Results?.[0]?.PlayerLevel,
  xpItemCount: xpInfo.length,
  weaponStatsCount: weaponStats.length,  // Add this
  missionsCount: missions.length,
  loadout,
  intrinsics,
})
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -r build`
- [ ] Unit test for profile parsing (add test case)

#### Manual Verification:
- [ ] Add temporary log to verify stats extraction during sync

---

## Phase 3: Sync Flow Update

### Overview

Store weapon stats during profile sync.

### Changes Required

#### 1. Update MasteryRecord Type

**File**: `packages/api/src/domain/entities/mastery.ts`

Update or add `MasteryRecord` interface:

```typescript
export interface MasteryRecord {
  id?: number
  playerId: string
  itemId: number
  xp: number
  rank: number
  syncedAt?: Date
  // Combat stats
  fired?: number | null
  hits?: number | null
  kills?: number | null
  headshots?: number | null
  equipTime?: number | null
  assists?: number | null
}
```

#### 2. Update Sync Handler

**File**: `packages/api/src/application/http/sync.ts`

Create stats lookup map after line 53:

```typescript
const itemsMap = await container.itemRepo.findAllAsMap()

// Build weapon stats lookup by uniqueName
const weaponStatsMap = new Map(
  profile.weaponStats.map(ws => [ws.itemType, ws])
)
```

Update mastery records mapping (lines 67-77):

```typescript
const masteryRecords = profile.xpComponents
  .filter(xp => itemsMap.has(xp.itemType))
  .map(xp => {
    const item = itemsMap.get(xp.itemType)!
    const stats = weaponStatsMap.get(xp.itemType)
    return {
      playerId: settings.playerId,
      itemId: item.id,
      xp: xp.xp,
      rank: getRankFromXp(xp.xp, item.category, item.maxRank),
      // Combat stats (null if not a weapon or no stats)
      fired: stats?.fired ?? null,
      hits: stats?.hits ?? null,
      kills: stats?.kills ?? null,
      headshots: stats?.headshots ?? null,
      equipTime: stats?.equipTime ?? null,
      assists: stats?.assists ?? null,
    }
  })
```

#### 3. Update Repository Upsert

**File**: `packages/api/src/infrastructure/persistence/drizzle/mastery-repository.ts`

Update `upsertMany` method (lines 10-24):

```typescript
async upsertMany(records: Omit<MasteryRecord, 'id' | 'syncedAt'>[]): Promise<void> {
  for (const record of records) {
    await this.db
      .insert(playerMastery)
      .values(record)
      .onConflictDoUpdate({
        target: [playerMastery.playerId, playerMastery.itemId],
        set: {
          xp: sql`excluded.xp`,
          rank: sql`excluded.rank`,
          syncedAt: new Date(),
          // Update stats on sync
          fired: sql`excluded.fired`,
          hits: sql`excluded.hits`,
          kills: sql`excluded.kills`,
          headshots: sql`excluded.headshots`,
          equipTime: sql`excluded.equip_time`,
          assists: sql`excluded.assists`,
        },
      })
  }
}
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -r build`
- [ ] Sync endpoint works: `curl -X POST localhost:3000/sync/profile`

#### Manual Verification:
- [ ] Query database to verify stats are stored:
  ```sql
  SELECT i.name, pm.kills, pm.headshots, pm.equip_time
  FROM player_mastery pm
  JOIN items i ON pm.item_id = i.id
  WHERE pm.kills > 0
  LIMIT 10;
  ```

---

## Phase 4: API Response Extension

### Overview

Include stats when returning item details for items the player owns.

### Changes Required

#### 1. Add Stats to ItemDetails Type

**File**: `packages/web/src/lib/api.ts`

Add interface after `ItemDetails` (line 80):

```typescript
export interface PersonalStats {
  fired: number | null;
  hits: number | null;
  kills: number;
  headshots: number;
  equipTime: number;
  assists: number;
}
```

Update `ItemDetails` interface:

```typescript
export interface ItemDetails {
  // ... existing fields
  personalStats: PersonalStats | null;  // Add this
}
```

#### 2. Update Item Repository

**File**: `packages/api/src/infrastructure/persistence/drizzle/item-repository.ts`

Update `findByIdWithAcquisitionData` to accept optional playerId and join with mastery:

```typescript
async findByIdWithAcquisitionData(
  id: number,
  playerId?: string
): Promise<(Item & { acquisitionData: ItemAcquisitionData; personalStats: PersonalStats | null }) | null> {
  // Get the base item
  const [item] = await this.db.select().from(items).where(eq(items.id, id))
  if (!item) return null

  // Get personal stats if player specified
  let personalStats: PersonalStats | null = null
  if (playerId) {
    const [mastery] = await this.db
      .select({
        fired: playerMastery.fired,
        hits: playerMastery.hits,
        kills: playerMastery.kills,
        headshots: playerMastery.headshots,
        equipTime: playerMastery.equipTime,
        assists: playerMastery.assists,
      })
      .from(playerMastery)
      .where(and(
        eq(playerMastery.itemId, id),
        eq(playerMastery.playerId, playerId)
      ))

    if (mastery && mastery.kills !== null) {
      personalStats = {
        fired: mastery.fired,
        hits: mastery.hits,
        kills: mastery.kills ?? 0,
        headshots: mastery.headshots ?? 0,
        equipTime: mastery.equipTime ?? 0,
        assists: mastery.assists ?? 0,
      }
    }
  }

  // ... rest of existing code ...

  return {
    ...item,
    acquisitionData,
    personalStats,
  }
}
```

#### 3. Update API Handler

**File**: `packages/api/src/application/http/items.ts`

Update the `GET /:id` handler to pass player ID:

```typescript
router.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))

  // Get current player settings to include personal stats
  const settings = await container.playerRepo.getSettings()
  const playerId = settings?.playerId

  const item = await container.itemRepo.findByIdWithAcquisitionData(id, playerId)
  if (!item) {
    return c.json({ error: 'Item not found' }, 404)
  }
  return c.json(item)
})
```

#### 4. Update Repository Interface

**File**: `packages/api/src/domain/ports/item-repository.ts`

Update method signature:

```typescript
findByIdWithAcquisitionData(
  id: number,
  playerId?: string
): Promise<(Item & { acquisitionData: ItemAcquisitionData; personalStats: PersonalStats | null }) | null>
```

Add `PersonalStats` interface export.

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -r build`
- [ ] API returns stats: `curl localhost:3000/items/123 | jq '.personalStats'`

#### Manual Verification:
- [ ] Item with stats shows `personalStats` object
- [ ] Item without stats shows `personalStats: null`

---

## Phase 5: Modal UI Update

### Overview

Display personal stats in the item modal.

### Changes Required

#### 1. Add Stats Display Section

**File**: `packages/web/src/lib/components/ItemModal.svelte`

Add helper function in script section:

```typescript
function formatEquipTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function formatAccuracy(hits: number | null, fired: number | null): string | null {
  if (hits === null || fired === null || fired === 0) return null;
  return `${((hits / fired) * 100).toFixed(1)}%`;
}
```

Add section after "Requirements" section (after line 178):

```svelte
<!-- Personal Stats -->
{#if item.personalStats && item.personalStats.kills > 0}
  <div class="acquisition-section">
    <h4>
      <span class="material-icons">analytics</span>
      PERSONAL STATS
    </h4>

    {#if item.personalStats.fired !== null && item.personalStats.hits !== null}
      {@const accuracy = formatAccuracy(item.personalStats.hits, item.personalStats.fired)}
      {#if accuracy}
        <div class="info-row">
          <span class="info-label">Accuracy</span>
          <span class="info-value">{accuracy} ({item.personalStats.hits.toLocaleString()} / {item.personalStats.fired.toLocaleString()})</span>
        </div>
      {/if}
    {/if}

    <div class="info-row">
      <span class="info-label">Kills</span>
      <span class="info-value">{item.personalStats.kills.toLocaleString()}</span>
    </div>

    {#if item.personalStats.headshots > 0}
      {@const headshotPct = ((item.personalStats.headshots / item.personalStats.kills) * 100).toFixed(1)}
      <div class="info-row">
        <span class="info-label">Headshots</span>
        <span class="info-value">{item.personalStats.headshots.toLocaleString()} ({headshotPct}%)</span>
      </div>
    {/if}

    {#if item.personalStats.equipTime > 0}
      <div class="info-row">
        <span class="info-label">Time Equipped</span>
        <span class="info-value">{formatEquipTime(item.personalStats.equipTime)}</span>
      </div>
    {/if}

    {#if item.personalStats.assists > 0}
      <div class="info-row">
        <span class="info-label">Assists</span>
        <span class="info-value">{item.personalStats.assists.toLocaleString()}</span>
      </div>
    {/if}
  </div>
{/if}
```

#### 2. Update ItemDetails Type Import

Ensure `PersonalStats` is included in the type or inline in `ItemDetails`.

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -r build`
- [ ] Visual regression tests pass: `pnpm test:e2e` (update snapshots if needed)

#### Manual Verification:
- [ ] Click on loadout weapon, see Personal Stats section
- [ ] Accuracy displays correctly with hit/fired counts
- [ ] Headshot percentage is correct
- [ ] Time equipped formats nicely (e.g., "8h 50m")
- [ ] Section hidden for items with no kills

---

## Testing Strategy

### Unit Tests

**File**: `packages/api/src/infrastructure/external/de-profile-api.test.ts`

Add test case for weapon stats extraction:

```typescript
it('should extract weapon stats from profile', async () => {
  // Mock response with Stats.Weapons
  const mockResponse = {
    Results: [{
      // ... existing mock data
      Stats: {
        Weapons: [{
          type: '/Lotus/Weapons/Test/TestWeapon',
          fired: 1000,
          hits: 850,
          kills: 200,
          headshots: 50,
          equipTime: 3600.5,
          assists: 25,
        }]
      }
    }]
  };

  // Verify extraction
  expect(result.weaponStats).toHaveLength(1);
  expect(result.weaponStats[0]).toEqual({
    itemType: '/Lotus/Weapons/Test/TestWeapon',
    fired: 1000,
    hits: 850,
    kills: 200,
    headshots: 50,
    equipTime: 3601, // rounded
    assists: 25,
  });
});
```

### Integration Tests

- Sync profile and verify stats stored in database
- Fetch item details and verify `personalStats` included

### Manual Testing Steps

1. Run database migration
2. Sync profile: click "Sync Profile" on dashboard
3. Click any weapon in loadout
4. Verify "Personal Stats" section appears with correct data
5. Compare values against DE profile JSON to confirm accuracy
6. Test item with no stats (newly acquired) - section should not appear

## Performance Considerations

- Weapon stats lookup is a simple indexed query on `(player_id, item_id)`
- No additional API calls required - stats returned with existing item details
- Stats array in profile (~300 items typical) is small, extraction is O(n)

## Migration Notes

- Migration is additive (new nullable columns) - no data loss risk
- Existing mastery records will have NULL stats until next sync
- First sync after migration will populate all weapon stats

## References

- DE profile response sample: `de-profile-response.json` lines 6852-6944
- Existing sync flow: `packages/api/src/application/http/sync.ts:32-142`
- Item modal component: `packages/web/src/lib/components/ItemModal.svelte`
