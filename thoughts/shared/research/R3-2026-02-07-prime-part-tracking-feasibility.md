---
date: 2026-02-07T12:00:00Z
researcher: Claude (AI pair programming)
git_commit: N/A
branch: claude/review-roadmap-mxt6H
repository: TENNO.DAT
topic: "Prime Part Tracking - Feasibility and Data Sources"
tags: [research, warframe, prime-parts, relics, inventory, manual-tracking]
last_updated: 2026-02-07
last_updated_note: "Initial research"
---

# Research: Prime Part Tracking - Feasibility and Data Sources

**Date**: 2026-02-07
**Researcher**: Claude (AI pair programming)
**Repository**: TENNO.DAT

## Research Question

Can we automatically track which Prime parts a player owns, or does this require manual entry? What data sources are available for Prime part/relic relationships, and how much of the data pipeline already exists in the codebase?

## Summary

**The good news**: We already have almost everything we need. The seed script already stores Prime components and their relic drop sources in the database. @wfcd/items provides comprehensive relic data including era, rarity tier, and vaulted status.

**The bad news (as expected)**: DE's public profile API does **not** expose inventory data. There is no way to auto-detect which Prime parts a player currently owns. This will be a manual tracking feature.

**The silver lining**: We can infer some ownership data. If a player has mastered a Prime item (visible via XP in the profile API), they must have had all parts at some point. We can auto-mark mastered Primes as "complete".

---

## Part 1: Can We Auto-Detect Owned Prime Parts?

### DE Profile API - No Inventory Access

As established in R1, the public profile endpoint (`getProfileViewingData.php`) exposes:

| Available | Not Available |
|-----------|--------------|
| XP/affinity per item (mastery) | Owned Prime parts/blueprints |
| Current loadout | Relics in inventory |
| Weapon combat stats | Resources/credits/platinum |
| Mission completions | Mod collection |
| Intrinsics | Foundry queue |

**There is no way to query "does this player own Ember Prime Chassis?"** through public APIs.

### Other Potential Sources

| Source | Inventory Access? | Viable? |
|--------|-------------------|---------|
| **AlecaFrame API** | Full inventory | Windows/Overwolf only, requires user to have it installed |
| **EE.log parsing** | Partial (trade/craft events) | Unreliable, buffered writes, Linux Proton path issues |
| **OCR/screenshots** | Yes (manual trigger) | Complex, error-prone, platform-dependent |
| **Manual entry** | N/A | Universal, simple, proven pattern (FrameHub uses this) |

### Recommendation: Manual Tracking with Smart Defaults

1. **Manual checkboxes** for parts you own (like wishlist toggle pattern)
2. **Auto-complete mastered Primes** - if XP shows mastered, mark all parts as owned
3. **Optional future**: AlecaFrame import for users who have it

---

## Part 2: What Data Do We Already Have?

### Surprising finding: Almost everything is already seeded

The existing seed script (`seed.ts` + `seed-utils.ts`) already processes Prime component and relic data from @wfcd/items:

#### Items Table

```
items.isPrime = true           -- Flags Prime items
items.vaulted = true/false     -- Whether the Prime is vaulted
```

#### Item Components Table (Prime Parts)

```sql
-- Already seeded for Prime items:
item_components.name       -- "Prime Blueprint", "Prime Chassis", "Prime Neuroptics", etc.
item_components.item_count -- Usually 1
item_components.ducats     -- Void Trader value (confirms it's a Prime part)
item_components.tradable   -- Whether it can be traded
```

The seed script identifies Prime parts using multiple signals:
- Name matches known part types (Blueprint, Chassis, Neuroptics, Systems, etc.)
- Has relic drops (`drops.length > 0`)
- Has ducat value (`ducats > 0`)

#### Component Drops Table (Relic Sources)

```sql
-- Already seeded for Prime parts:
component_drops.location   -- "Lith A1 Relic", "Meso B2 Relic", etc.
component_drops.chance     -- Drop chance (0-1)
component_drops.rarity     -- "Common", "Uncommon", "Rare"
```

**This means the "which relics drop which parts" data is already in the database.**

### What's NOT in the database yet

| Missing | Source Available? | Notes |
|---------|-------------------|-------|
| Player ownership of individual parts | N/A (manual entry) | New table needed |
| Relic vaulted status | @wfcd/items `vaultInfo.vaulted` | Available but not seeded for relics |
| Relic era (Lith/Meso/Neo/Axi) | Parseable from relic name | e.g., "Lith A1 Relic" → era: "Lith" |
| Relic refinement drop rates | warframe-drop-data | Different chances per refinement level |

---

## Part 3: @wfcd/items Relic Data Structure

The @wfcd/items library uses data from [WFCD/warframe-relic-data](https://github.com/WFCD/warframe-relic-data):

```typescript
interface TitaniaRelic {
  name: string                      // "Axi A1"
  uniqueName: string                // Cross-reference ID
  rewards: TitaniaRelicReward[]     // What parts this relic contains
  locations: TitaniaRelicLocation[] // Where this relic drops (missions)
  vaultInfo: { vaulted: boolean }   // Whether relic is vaulted
  warframeMarket?: { id: string }   // WF Market cross-reference
}

interface TitaniaRelicReward {
  rarity: "Common" | "Uncommon" | "Rare"
  chance: number                    // Drop percentage
  item: {
    name: string                    // "Ember Prime Chassis"
    uniqueName: string              // Cross-reference
  }
}
```

This data is rich enough to build a complete "what to farm" view.

### Additional Data Sources

| Source | URL | Provides |
|--------|-----|----------|
| **warframe-relic-data** | [GitHub](https://github.com/WFCD/warframe-relic-data) | Dedicated relic dataset with rewards, vaulted status |
| **warframe-drop-data** | [drops.warframestat.us](https://drops.warframestat.us/) | Official DE drop tables in JSON, relic contents by refinement level |
| **warframe.market API** | [API docs](https://warframe.market/api_docs) | Trading prices for Prime parts (useful for "cheapest to buy" feature later) |

---

## Part 4: What Existing Tools Do

### FrameHub (closest comparable)

[FrameHub](https://framehub.paroxity.net/) by Paroxity:
- Manual checkboxes per Prime part
- Groups parts by Prime item (e.g., "Ember Prime" → Blueprint, Chassis, Neuroptics, Systems)
- Shows which relics drop each part with rarity tier
- Shows vaulted status
- Firebase storage, shareable links
- **Open source** (Apache 2.0): [GitHub](https://github.com/Paroxity/FrameHub)

### Key UX patterns from FrameHub:

1. **Per-item view**: Click a Prime → see all required parts with checkboxes
2. **Relic tooltip**: Hover over a part → see which relics contain it
3. **Vaulted indicator**: Dim/badge for vaulted items
4. **Progress bar**: X/4 parts collected per Prime
5. **Filter**: Show only incomplete, show only unvaulted

---

## Part 5: Proposed Approach

### Data Model

One new table needed (following the wishlist pattern):

```sql
CREATE TABLE player_prime_parts (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(50) NOT NULL,
  component_id INTEGER NOT NULL REFERENCES item_components(id) ON DELETE CASCADE,
  owned BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, component_id)
);
```

This is intentionally simple - a boolean "I have this part" per component. No quantity tracking (not useful for the "do I have what I need to build this" question).

### Smart Defaults

When viewing a Prime item's parts:
1. If the player has **mastered** the Prime (XP data shows rank 30) → auto-mark all parts as owned
2. If the player has **not mastered** it → parts default to unowned
3. User can override either way (maybe they sold it, or they have some parts but haven't built it)

### UI Concept

Two entry points:

**A) From mastery page** - existing item cards for Prime items get a "parts" indicator:
```
[Ember Prime]  ████░░ 2/4 parts
```
Click to expand or open modal showing parts checklist.

**B) Dedicated Prime farming view** - filter to unmastered Primes, grouped by vaulted status:
```
AVAILABLE PRIMES
├── Ember Prime        2/4 parts  [Chassis] [Systems] needed
│   └── Chassis: Meso E1 (Uncommon), Neo B4 (Rare)
│   └── Systems: Axi E1 (Common), Lith S1 (Uncommon)
├── Frost Prime        0/4 parts
│   └── ...

VAULTED PRIMES
├── Mag Prime          1/4 parts  [Trade only]
```

### What We Can Derive (No New Seeding)

From existing database tables:
- **Which Primes are unmastered**: `items WHERE is_prime = true` LEFT JOIN `player_mastery`
- **What parts each Prime needs**: `item_components WHERE item_id = X AND ducats IS NOT NULL`
- **Which relics drop each part**: `component_drops WHERE component_id = X`
- **Relic era**: Parse from `component_drops.location` (e.g., "Lith A1 Relic" → "Lith")
- **Relic rarity tier**: `component_drops.rarity` (Common/Uncommon/Rare)
- **Whether the Prime is vaulted**: `items.vaulted`

### What Needs Enhancement

1. **Relic vaulted status** - Currently `items.vaulted` tracks whether the Prime item itself is vaulted, but we don't have vaulted status per relic. Could parse from relic name or add to seed.
2. **Relic era parsing** - Simple string parse from location field, no schema change needed.

---

## Part 6: Implementation Complexity Assessment

| Component | Effort | Notes |
|-----------|--------|-------|
| Database migration | Small | One new table, follows wishlist pattern exactly |
| Repository + port | Small | CRUD on `player_prime_parts`, follows wishlist pattern |
| API routes | Small | Toggle owned, get parts for item, get all incomplete Primes |
| Seed changes | None | All data already seeded |
| Mastery auto-detection | Small | Query existing `player_mastery` for rank 30 items |
| Item modal enhancement | Medium | Add parts checklist section to existing modal |
| Prime farming page | Medium-Large | New page with grouping, filtering, relic info |
| Total | Medium | Most complexity is in the frontend/UX |

### Dependencies

- No external API integrations needed
- No new npm packages needed
- All relic/component data already flows through @wfcd/items → seed → database

---

## Open Questions

1. **Quantity tracking?** Should we track "I have 3x Ember Prime Chassis" or just "I have at least one"? Simpler to start with boolean.

2. **Relic inventory?** Should we also track which relics the player owns? This is a separate (larger) feature and probably not needed for MVP.

3. **Trading integration?** Warframe.market API could show prices for parts you need. Nice future enhancement but not MVP.

4. **Shared wishlists?** If a clan mate needs Ember Prime Chassis and you have a spare, that's useful. Requires multi-user features (already have Steam auth).

5. **Forma/Orokin Catalyst tracking?** Building a Prime also needs Forma and sometimes an Orokin Catalyst. Track these too? Probably not MVP.

---

## Recommendation

**Build it as a manual tracking feature.** The data pipeline is 90% there - the main work is:

1. New `player_prime_parts` table (tiny migration)
2. Backend CRUD (copy wishlist pattern)
3. Enhancement to ItemModal for parts checklist
4. New "Prime Farming" page showing incomplete Primes with relic sources

Start with the modal enhancement (most useful, smallest scope), then build the dedicated page. The auto-complete for mastered items is a nice quality-of-life touch that makes it feel less manual.

---

## References

### Data Sources
- [@wfcd/items](https://github.com/WFCD/warframe-items) - Primary item database (already in use)
- [WFCD/warframe-relic-data](https://github.com/WFCD/warframe-relic-data) - Dedicated relic dataset
- [WFCD/warframe-drop-data](https://github.com/WFCD/warframe-drop-data) - Official drop tables
- [warframe.market API](https://warframe.market/api_docs) - Trading prices

### Existing Tools
- [FrameHub](https://framehub.paroxity.net/) ([source](https://github.com/Paroxity/FrameHub)) - Closest comparable
- [AlecaFrame](https://alecaframe.com/) - Full inventory access (Windows only)

### Internal References
- R1: Warframe Mastery Tracker Feasibility (2026-01-24) - Profile API limitations
- P005: Wishlist Feature - Pattern for manual item tracking
- Seed script: `packages/api/src/infrastructure/persistence/drizzle/seed.ts`
- Seed utils: `packages/api/src/infrastructure/persistence/drizzle/seed-utils.ts`
