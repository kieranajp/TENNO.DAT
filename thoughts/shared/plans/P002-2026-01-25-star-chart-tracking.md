# PLAN P002: Star Chart Tracking for Mastery Rank

## Overview

Add star chart node and junction tracking to the mastery rank calculation. The DE public profile API **does** expose mission completion data, making automatic sync possible.

## Current State

**Already implemented:**
- Manual intrinsics entry in Settings (railjack 0-50, drifter 0-40)
- `intrinsicsToXP()` function in mastery calculation
- Intrinsics stored in `player_settings` table

**Not yet implemented:**
- Star chart node tracking
- Junction tracking
- Auto-sync intrinsics from profile API (currently manual only)

---

## Research Findings

### What the Profile API Provides

Based on analysis of [WFCD/profile-parser](https://github.com/WFCD/profile-parser) and [SpaceNinjaServer inventory types](https://github.com/spaceninjaserver/SpaceNinjaServer):

| Data | Available? | Location in Response | Notes |
|------|------------|---------------------|-------|
| **Mission completions** | Yes | `Results[0].Stats.Missions[]` | Array with `nodeKey`, `completes`, `tier` (Steel Path) |
| **Intrinsics** | Yes | `Results[0].LoadOutInventory` | Railjack + Drifter intrinsics ranks |
| **Junctions** | Unclear | Needs investigation | May be in Missions array or separate field |
| **MissionsCompleted** | Yes | `Results[0].Stats.MissionsCompleted` | Total count (not per-node) |

### Intrinsics Data (Can Be Auto-Synced!)

The profile API **does** expose intrinsics - contrary to what the settings page currently says. From profile-parser:

```typescript
// Railjack Intrinsics (in LoadOutInventory)
LPP_SPACE / 1000 = railjackPoints
// Individual skills: Tactical, Piloting, Gunnery, Engineering, Command

// Drifter Intrinsics
LPP_DRIFTER / 1000 = drifterPoints
// Individual skills: Riding, Combat, Opportunity, Endurance
```

**Recommendation**: Auto-sync during profile sync, keep manual entry as override/fallback.

### Mastery XP Values (from [FrameHub](https://github.com/Paroxity/FrameHub))

| Source | XP per Unit | Max Available | Total Possible XP |
|--------|-------------|---------------|-------------------|
| **Star Chart Nodes** | ~24-63 per node | 263 nodes | ~16,500 XP |
| **Junctions** | 1,000 per junction | 19 junctions | 19,000 XP |
| **Railjack Intrinsics** | 1,500 per rank | 50 ranks (5×10) | 75,000 XP |
| **Drifter Intrinsics** | 1,500 per rank | 40 ranks (4×10) | 60,000 XP |
| **Steel Path Nodes** | Same as normal | 263 nodes | ~16,500 XP |
| **Steel Path Junctions** | 1,000 per junction | 19 junctions | 19,000 XP |

**Total additional mastery from star chart + intrinsics: ~206,000 XP**

### Node Data Source

[FrameHub's nodes.json](https://github.com/Paroxity/FrameHub/blob/main/src/resources/nodes.json) provides:
```json
{
  "SolNode63": {
    "name": "Mantle",
    "type": 5,
    "faction": 0,
    "lvl": [2, 4],
    "xp": 24
  }
}
```

Key: `SolNode###` matches the `nodeKey` from profile API.

---

## Implementation Plan

### Phase 1: Database Schema

Add tables for star chart data:

```sql
-- Star chart nodes (seeded from FrameHub/warframe-items data)
CREATE TABLE nodes (
  id SERIAL PRIMARY KEY,
  node_key VARCHAR(50) NOT NULL UNIQUE,  -- e.g., "SolNode63"
  name VARCHAR(100) NOT NULL,             -- e.g., "Mantle"
  planet VARCHAR(50) NOT NULL,            -- e.g., "Earth"
  mission_type INTEGER NOT NULL,          -- 0-42 mission type index
  faction INTEGER NOT NULL,               -- 0=Grineer, 1=Corpus, etc.
  min_level INTEGER NOT NULL,
  max_level INTEGER NOT NULL,
  xp INTEGER NOT NULL,                    -- Mastery XP granted
  is_junction BOOLEAN DEFAULT false
);

-- Junctions (separate for clarity, could be in nodes with is_junction=true)
CREATE TABLE junctions (
  id SERIAL PRIMARY KEY,
  node_key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,             -- e.g., "Venus Junction"
  from_planet VARCHAR(50) NOT NULL,
  to_planet VARCHAR(50) NOT NULL,
  xp INTEGER NOT NULL DEFAULT 1000
);

-- Player node completions
CREATE TABLE player_nodes (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(50) NOT NULL,
  node_id INTEGER NOT NULL REFERENCES nodes(id),
  completes INTEGER NOT NULL DEFAULT 0,
  is_steel_path BOOLEAN DEFAULT false,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, node_id, is_steel_path)
);

-- Player junction completions
CREATE TABLE player_junctions (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(50) NOT NULL,
  junction_id INTEGER NOT NULL REFERENCES junctions(id),
  completed BOOLEAN DEFAULT false,
  is_steel_path BOOLEAN DEFAULT false,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, junction_id, is_steel_path)
);

-- Player intrinsics
CREATE TABLE player_intrinsics (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(50) NOT NULL UNIQUE,
  -- Railjack
  railjack_points INTEGER DEFAULT 0,
  tactical INTEGER DEFAULT 0,
  piloting INTEGER DEFAULT 0,
  gunnery INTEGER DEFAULT 0,
  engineering INTEGER DEFAULT 0,
  command INTEGER DEFAULT 0,
  -- Drifter
  drifter_points INTEGER DEFAULT 0,
  riding INTEGER DEFAULT 0,
  combat INTEGER DEFAULT 0,
  opportunity INTEGER DEFAULT 0,
  endurance INTEGER DEFAULT 0,
  synced_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 2: Seed Node Data

Create seed script using FrameHub's nodes.json or warframe-public-export-plus ExportRegions.json:

1. Fetch node data from FrameHub or create our own nodes.json
2. Parse and insert into `nodes` table
3. Separately handle junctions (FrameHub has `planetJunctionsMap`)

### Phase 3: Update Profile API Adapter

Extend `de-profile-api.ts` to extract:

```typescript
export interface NodeCompletion {
  nodeKey: string      // "SolNode63"
  completes: number    // times completed
  tier?: number        // 1 = Steel Path
}

export interface IntrinsicsData {
  railjack: {
    points: number
    tactical: number
    piloting: number
    gunnery: number
    engineering: number
    command: number
  }
  drifter: {
    points: number
    riding: number
    combat: number
    opportunity: number
    endurance: number
  }
}

export interface ProfileData {
  // ... existing fields ...
  missions: NodeCompletion[]
  intrinsics: IntrinsicsData
}
```

### Phase 4: Update Sync Logic

In `sync.ts`:

1. Extract missions array from profile response
2. Match `nodeKey` against `nodes` table
3. Upsert into `player_nodes` (track Steel Path separately via `tier`)
4. Extract and upsert intrinsics data
5. Junction detection: Need to investigate if junctions appear in missions array or separate field

### Phase 5: Update Mastery Calculation

Extend mastery summary to include:

```typescript
interface MasterySummary {
  // ... existing equipment mastery ...
  starChart: {
    nodes: { completed: number, total: number, xp: number }
    junctions: { completed: number, total: number, xp: number }
    steelPath: {
      nodes: { completed: number, total: number, xp: number }
      junctions: { completed: number, total: number, xp: number }
    }
  }
  intrinsics: {
    railjack: { ranks: number, maxRanks: number, xp: number }
    drifter: { ranks: number, maxRanks: number, xp: number }
  }
  totalXp: number
  masteryRank: number
}
```

### Phase 6: Frontend Star Chart View

Add new page/component showing:
- Planet-by-planet node completion grid
- Junction status
- Steel Path progress toggle
- Intrinsics breakdown

---

## Open Questions

1. **Junction data location**: Are junctions in the `Missions[]` array with a special nodeKey, or in a separate field? Need to examine actual profile response.

2. **Steel Path detection**: FrameHub uses `tier` field. Need to verify this is in the public profile API response.

3. **Node XP values**: FrameHub's nodes.json has XP per node. Need to verify these are accurate or if we need another source.

4. **Data freshness**: Do we need to periodically update node data (new nodes added with updates)?

---

## Tasks

### Phase 0: Quick Win - Auto-Sync Intrinsics
- [ ] Extend `de-profile-api.ts` to extract intrinsics from `LoadOutInventory`
- [ ] Update sync route to call `updateIntrinsics()` with extracted values
- [ ] Update settings page text (remove "not available from API" note)

### Phase 1: Research & Schema
- [ ] Dump a real profile response and examine `Stats.Missions` structure
- [ ] Verify junction representation in profile data
- [ ] Create Drizzle schema for nodes, junctions tables

### Phase 2: Seed Star Chart Data
- [ ] Download/adapt FrameHub's nodes.json
- [ ] Create seed script for node data
- [ ] Handle junction data separately

### Phase 3: Sync Star Chart Progress
- [ ] Extend profile API adapter to extract `Stats.Missions[]`
- [ ] Add node/junction repositories
- [ ] Update sync route to process star chart completions

### Phase 4: Mastery & UI
- [ ] Update mastery calculation to include node/junction XP
- [ ] Build star chart progress UI component
- [ ] Add to dashboard summary

---

## References

- [FrameHub Source](https://github.com/Paroxity/FrameHub) - mastery-rank.js, nodes.js, nodes.json
- [WFCD/profile-parser](https://github.com/WFCD/profile-parser) - Mission.ts, Intrinsics.ts, Stats.ts
- [SpaceNinjaServer](https://github.com/spaceninjaserver/SpaceNinjaServer) - inventoryTypes.ts
- [Warframe Wiki - Mastery Rank](https://wiki.warframe.com/w/Mastery_Rank)
- [Warframe Wiki - Star Chart](https://wiki.warframe.com/w/Star_Chart)
