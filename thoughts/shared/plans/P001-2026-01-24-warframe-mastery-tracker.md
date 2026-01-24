# PLAN P001: Warframe Mastery Tracker

## Overview

Build a local-first web application to track Warframe mastery progress with automatic profile sync, and later manual prime part tracking for targeted farming.

**MVP Scope:** Phases 1 & 2 (project setup + automatic mastery sync)

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Runtime | Node.js + TypeScript | |
| API | Hono | Minimal Express-like, TypeScript-first |
| Database | PostgreSQL + Drizzle ORM | SQL-like queries, typed schema |
| Frontend | Svelte + Vite | SvelteKit for routing |
| Styling | Bootstrap SASS | Selective imports, variable overrides |
| Package Manager | pnpm | Workspaces for monorepo |
| Data Source | @wfcd/items | Comprehensive item database |
| Profile API | DE Public Profile | `content.warframe.com/dynamic/getProfileViewingData.php` |

## Current State Analysis

- Greenfield project - no existing code
- Research completed in `thoughts/shared/research/R1-2026-01-24-warframe-mastery-tracker-feasibility.md`
- User is on Linux, so Windows-only tools (AlecaFrame/Overwolf) are not viable
- Public profile API provides mastery data but NOT inventory

## Desired End State

After MVP completion:
1. PostgreSQL database populated with all Warframe items from @wfcd/items
2. User can enter their Account ID and sync mastery data from DE's profile API
3. Web UI displays mastery progress by category with filtering
4. User can see what items they haven't mastered yet

**Verification:**
- Database contains 500+ items across all categories
- Profile sync retrieves XP data and correctly identifies mastered items
- UI renders item grid with mastery status indicators
- Filters work correctly (category, mastered/unmastered)

## What We're NOT Doing (MVP)

- Prime part tracking (Phase 3)
- Farm location recommendations (Phase 4)
- AI query integration (Future)
- Cloud sync / multi-device
- User authentication (single-user local app)
- Mobile optimization

## Project Structure

```
warframe-tracker/
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml
├── docker-compose.yml           # PostgreSQL
├── packages/
│   ├── api/                     # Hono backend (hexagonal architecture)
│   │   ├── package.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       │
│   │       ├── domain/                    # Pure business logic, zero external deps
│   │       │   ├── entities/
│   │       │   │   ├── item.ts            # Item entity + types
│   │       │   │   ├── mastery.ts         # isMastered(), getMasteredXp()
│   │       │   │   └── player.ts          # PlayerSettings entity
│   │       │   └── ports/                 # Interfaces (contracts)
│   │       │       ├── item-repository.ts
│   │       │       ├── mastery-repository.ts
│   │       │       ├── player-repository.ts
│   │       │       └── profile-api.ts     # DE API interface
│   │       │
│   │       ├── infrastructure/            # Adapters (implements ports)
│   │       │   ├── persistence/drizzle/
│   │       │   │   ├── schema.ts
│   │       │   │   ├── connection.ts
│   │       │   │   ├── migrate.ts
│   │       │   │   ├── seed.ts
│   │       │   │   ├── item-repository.ts
│   │       │   │   ├── mastery-repository.ts
│   │       │   │   └── player-repository.ts
│   │       │   ├── external/
│   │       │   │   └── de-profile-api.ts  # Implements ProfileApi port
│   │       │   └── bootstrap/
│   │       │       └── container.ts       # Dependency wiring
│   │       │
│   │       └── application/               # HTTP routes = use cases
│   │           ├── index.ts               # Hono app + server
│   │           └── http/                  # HTTP handlers (future: grpc/, mcp/)
│   │               ├── items.ts
│   │               ├── mastery.ts
│   │               └── sync.ts
│   │
│   └── web/                     # SvelteKit frontend
│       ├── package.json
│       ├── vite.config.ts
│       ├── svelte.config.js
│       └── src/
│           ├── styles/
│           │   ├── _variables.sass
│           │   └── _styles.sass
│           ├── lib/
│           │   ├── api.ts               # API client
│           │   └── components/
│           │       ├── ItemCard.svelte
│           │       ├── CategoryFilter.svelte
│           │       ├── ProgressBar.svelte
│           │       └── SyncButton.svelte
│           └── routes/
│               ├── +layout.svelte
│               ├── +page.svelte          # Dashboard
│               ├── mastery/
│               │   └── +page.svelte      # Mastery list
│               └── settings/
│                   └── +page.svelte      # Settings
```

### Architecture: Dependency Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     application/ (HTTP Routes)                   │
│  Routes ARE use cases: receive requests, orchestrate, respond    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ uses interfaces from
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         domain/ (Core)                           │
│  Entities, business rules, repository interfaces (ports)         │
│  *** NO EXTERNAL DEPENDENCIES ***                                │
└──────────────────────────────┬──────────────────────────────────┘
                               │ implemented by
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     infrastructure/ (Adapters)                   │
│  Drizzle repositories, DE API client, bootstrap/DI               │
└─────────────────────────────────────────────────────────────────┘
```

**Three layers:**
- **application/** - HTTP routes that orchestrate (routes ARE the use cases)
- **domain/** - pure business logic, entities, port interfaces (no external deps)
- **infrastructure/** - implements ports (Drizzle repos, DE API, DI wiring)

**Key rule:** Dependencies point inward. Domain never imports from infrastructure.

---

## Database Schema (ERD)

```
┌─────────────────────────────────────────────────────────────┐
│                          items                               │
├─────────────────────────────────────────────────────────────┤
│ PK  id              SERIAL                                   │
│     unique_name     VARCHAR(255)  NOT NULL, UNIQUE          │
│     name            VARCHAR(100)  NOT NULL                   │
│     category        VARCHAR(50)   NOT NULL                   │
│     is_prime        BOOLEAN       DEFAULT false              │
│     mastery_req     INTEGER       DEFAULT 0                  │
│     max_rank        INTEGER       DEFAULT 30                 │
│     image_name      VARCHAR(255)                             │
│     vaulted         BOOLEAN                                  │
├─────────────────────────────────────────────────────────────┤
│ IDX category_idx (category)                                  │
│ IDX is_prime_idx (is_prime)                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1
                              │
                              ▼ *
┌─────────────────────────────────────────────────────────────┐
│                      player_mastery                          │
├─────────────────────────────────────────────────────────────┤
│ PK  id              SERIAL                                   │
│     player_id       VARCHAR(50)   NOT NULL                   │
│ FK  item_id         INTEGER       NOT NULL → items.id        │
│     xp              INTEGER       NOT NULL                   │
│     is_mastered     BOOLEAN       NOT NULL                   │
│     synced_at       TIMESTAMP     DEFAULT now()              │
├─────────────────────────────────────────────────────────────┤
│ IDX player_item_idx (player_id, item_id)                     │
│ UNQ player_item_unique (player_id, item_id)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ player_id
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     player_settings                          │
├─────────────────────────────────────────────────────────────┤
│ PK  id              SERIAL                                   │
│ UNQ player_id       VARCHAR(50)   NOT NULL                   │
│     platform        VARCHAR(10)   DEFAULT 'pc'               │
│     display_name    VARCHAR(100)                             │
│     last_sync_at    TIMESTAMP                                │
│     created_at      TIMESTAMP     DEFAULT now()              │
└─────────────────────────────────────────────────────────────┘
```

**Relationships:**
- `items` 1:* `player_mastery` — Each item can have mastery records for multiple players
- `player_mastery.player_id` references `player_settings.player_id` (logical, not FK enforced)

**Notes:**
- Single-user app for MVP, but schema supports multi-player for future
- `player_mastery` uses composite unique constraint on (player_id, item_id) for upserts
- `items.unique_name` matches DE's internal path format (e.g., `/Lotus/Powersuits/Frost/Frost`)

---

## Phase 1: Project Setup & Data Layer

### Overview

Initialize the monorepo, set up PostgreSQL with Drizzle, define the schema, and import item data from @wfcd/items.

### Changes Required:

#### 1. Root Workspace Configuration

**File**: `package.json`
```json
{
  "name": "warframe-tracker",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "db:generate": "pnpm --filter api db:generate",
    "db:migrate": "pnpm --filter api db:migrate",
    "db:seed": "pnpm --filter api db:seed"
  }
}
```

**File**: `pnpm-workspace.yaml`
```yaml
packages:
  - 'packages/*'
```

**File**: `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: warframe
      POSTGRES_PASSWORD: emarfraw
      POSTGRES_DB: warframe
    ports:
      - "5432:5432"
    volumes:
      - warframe_data:/var/lib/postgresql/data

volumes:
  warframe_data:
```

**File**: `.vscode/launch.json`
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev:api"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Web",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev:web"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "DB Migrate",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["db:migrate"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    },
    {
      "name": "DB Seed",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["db:seed"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["API", "Web"]
    }
  ]
}
```

#### 2. Domain Layer (Pure Business Logic)

**File**: `packages/api/src/domain/entities/item.ts`
```typescript
// Item categories from @wfcd/items
export type ItemCategory =
  | 'Warframes'
  | 'Primary'
  | 'Secondary'
  | 'Melee'
  | 'Companions'
  | 'Sentinels'
  | 'SentinelWeapons'
  | 'Archwing'
  | 'ArchGun'
  | 'ArchMelee'
  | 'Necramechs'
  | 'KDrives'
  | 'Amps'

export interface Item {
  id: number
  uniqueName: string
  name: string
  category: ItemCategory
  isPrime: boolean
  masteryReq: number
  maxRank: number
  imageName: string | null
  vaulted: boolean | null
}
```

**File**: `packages/api/src/domain/entities/mastery.ts`
```typescript
// Frame-type categories (200 mastery points per rank, 1000 XP multiplier)
const FRAME_CATEGORIES = [
  'Warframes', 'Companions', 'Archwing', 'KDrives', 'Sentinels', 'Pets', 'Necramechs'
] as const

/**
 * Calculate XP required for mastery at a given max rank.
 * Formula: multiplier × rank²
 * - Frames: 1000 × rank² (e.g., rank 30 = 900,000 XP)
 * - Weapons: 500 × rank² (e.g., rank 30 = 450,000 XP)
 */
export function getMasteredXp(category: string, maxRank: number): number {
  const multiplier = FRAME_CATEGORIES.includes(category as any) ? 1000 : 500
  return multiplier * maxRank * maxRank
}

export function isMastered(xp: number, category: string, maxRank: number): boolean {
  return xp >= getMasteredXp(category, maxRank)
}

export interface MasteryRecord {
  id: number
  playerId: string
  itemId: number
  xp: number
  isMastered: boolean
  syncedAt: Date
}
```

**File**: `packages/api/src/domain/entities/player.ts`
```typescript
export type Platform = 'pc' | 'ps' | 'xbox' | 'switch'

export interface PlayerSettings {
  id: number
  playerId: string
  platform: Platform
  displayName: string | null
  lastSyncAt: Date | null
}
```

#### 3. Domain Ports (Interfaces)

**File**: `packages/api/src/domain/ports/item-repository.ts`
```typescript
import type { Item } from '../entities/item'

export interface ItemRepository {
  findAll(category?: string): Promise<Item[]>
  findById(id: number): Promise<Item | null>
  findAllAsMap(): Promise<Map<string, Item>>  // keyed by uniqueName
  getCategories(): Promise<Array<{ category: string; count: number }>>
  upsertMany(items: Omit<Item, 'id'>[]): Promise<void>
}
```

**File**: `packages/api/src/domain/ports/mastery-repository.ts`
```typescript
import type { MasteryRecord } from '../entities/mastery'

export interface MasteryWithItem {
  id: number
  uniqueName: string
  name: string
  category: string
  isPrime: boolean
  masteryReq: number
  maxRank: number
  imageName: string | null
  vaulted: boolean | null
  xp: number | null
  isMastered: boolean | null
}

export interface MasterySummary {
  category: string
  total: number
  mastered: number
}

export interface MasteryRepository {
  upsertMany(records: Omit<MasteryRecord, 'id' | 'syncedAt'>[]): Promise<void>
  getSummary(playerId: string): Promise<MasterySummary[]>
  getItemsWithMastery(playerId: string, filters?: {
    category?: string
    masteredOnly?: boolean
    unmasteredOnly?: boolean
  }): Promise<MasteryWithItem[]>
}
```

**File**: `packages/api/src/domain/ports/player-repository.ts`
```typescript
import type { PlayerSettings, Platform } from '../entities/player'

export interface PlayerRepository {
  getSettings(): Promise<PlayerSettings | null>
  saveSettings(playerId: string, platform: Platform): Promise<void>
  updateDisplayName(playerId: string, displayName: string): Promise<void>
  updateLastSync(playerId: string): Promise<void>
}
```

**File**: `packages/api/src/domain/ports/profile-api.ts`
```typescript
import type { Platform } from '../entities/player'

export interface ProfileXpComponent {
  itemType: string   // uniqueName, e.g. "/Lotus/Powersuits/Frost/Frost"
  xp: number
}

export interface ProfileData {
  displayName: string | null
  playerLevel: number
  xpComponents: ProfileXpComponent[]
}

export interface ProfileApi {
  fetch(playerId: string, platform: Platform): Promise<ProfileData>
}
```

#### 4. API Package Setup

**File**: `packages/api/package.json`
```json
{
  "name": "api",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/application/index.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/infrastructure/persistence/drizzle/migrate.ts",
    "db:seed": "tsx src/infrastructure/persistence/drizzle/seed.ts"
  },
  "dependencies": {
    "@wfcd/items": "latest",
    "drizzle-orm": "^0.30.0",
    "hono": "^4.0.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.0",
    "tsx": "^4.0.0",
    "typescript": "^5.4.0"
  }
}
```

**File**: `packages/api/drizzle.config.ts`
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://warframe:emarfraw@localhost:5432/warframe',
  },
})
```

#### 5. Infrastructure: Drizzle Schema

**File**: `packages/api/src/infrastructure/persistence/drizzle/schema.ts`
```typescript
import { pgTable, serial, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core'

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  uniqueName: varchar('unique_name', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  isPrime: boolean('is_prime').default(false).notNull(),
  masteryReq: integer('mastery_req').default(0).notNull(),
  maxRank: integer('max_rank').default(30).notNull(),
  imageName: varchar('image_name', { length: 255 }),
  vaulted: boolean('vaulted'),
}, (table) => ({
  categoryIdx: index('category_idx').on(table.category),
  isPrimeIdx: index('is_prime_idx').on(table.isPrime),
}))

export const playerSettings = pgTable('player_settings', {
  id: serial('id').primaryKey(),
  playerId: varchar('player_id', { length: 50 }).notNull().unique(),
  platform: varchar('platform', { length: 10 }).notNull().default('pc'),
  displayName: varchar('display_name', { length: 100 }),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const playerMastery = pgTable('player_mastery', {
  id: serial('id').primaryKey(),
  playerId: varchar('player_id', { length: 50 }).notNull(),
  itemId: integer('item_id').notNull().references(() => items.id),
  xp: integer('xp').notNull(),
  isMastered: boolean('is_mastered').notNull(),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
}, (table) => ({
  playerItemIdx: index('player_item_idx').on(table.playerId, table.itemId),
}))
```

#### 6. Infrastructure: Database Connection

**File**: `packages/api/src/infrastructure/persistence/drizzle/connection.ts`
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL ?? 'postgres://warframe:emarfraw@localhost:5432/warframe'
const client = postgres(connectionString)

export const db = drizzle(client, { schema })
export type DrizzleDb = typeof db
export { schema }
```

#### 7. Infrastructure: Migration Runner

**File**: `packages/api/src/infrastructure/persistence/drizzle/migrate.ts`
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL ?? 'postgres://warframe:emarfraw@localhost:5432/warframe'
const client = postgres(connectionString, { max: 1 })
const db = drizzle(client)

async function main() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations complete')
  await client.end()
}

main().catch(console.error)
```

#### 8. Infrastructure: Item Seed Script

**File**: `packages/api/src/infrastructure/persistence/drizzle/seed.ts`
```typescript
import Items from '@wfcd/items'
import { db, schema } from './connection'

const MASTERABLE_CATEGORIES = [
  'Warframes',
  'Primary',
  'Secondary',
  'Melee',
  'Pets',
  'Sentinels',
  'SentinelWeapons',
  'Archwing',
  'ArchGun',
  'ArchMelee',
]

async function seed() {
  console.log('Fetching items from @wfcd/items...')

  const allItems = new Items({ category: MASTERABLE_CATEGORIES })
  const masterableItems = allItems.filter((item: any) => item.masterable !== false)

  console.log(`Found ${masterableItems.length} masterable items`)

  const getMaxRank = (item: any): number => {
    if (item.category === 'Necramechs') return 40
    if (item.name?.includes('Kuva ') || item.name?.includes('Tenet ')) return 40
    if (item.name === 'Paracesis') return 40
    return 30
  }

  const itemsToInsert = masterableItems.map((item: any) => ({
    uniqueName: item.uniqueName,
    name: item.name,
    category: item.category,
    isPrime: item.isPrime ?? false,
    masteryReq: item.masteryReq ?? 0,
    maxRank: getMaxRank(item),
    imageName: item.imageName ?? null,
    vaulted: item.vaulted ?? null,
  }))

  console.log('Inserting items into database...')

  const BATCH_SIZE = 100
  for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
    const batch = itemsToInsert.slice(i, i + BATCH_SIZE)
    await db.insert(schema.items).values(batch).onConflictDoUpdate({
      target: schema.items.uniqueName,
      set: {
        name: schema.items.name,
        category: schema.items.category,
        isPrime: schema.items.isPrime,
        masteryReq: schema.items.masteryReq,
        maxRank: schema.items.maxRank,
        imageName: schema.items.imageName,
        vaulted: schema.items.vaulted,
      },
    })
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, itemsToInsert.length)}/${itemsToInsert.length}`)
  }

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch(console.error)
```

#### 9. Infrastructure: Item Repository

**File**: `packages/api/src/infrastructure/persistence/drizzle/item-repository.ts`
```typescript
import { eq, sql } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { items } from './schema'
import type { Item } from '../../../domain/entities/item'
import type { ItemRepository } from '../../../domain/ports/item-repository'

export class DrizzleItemRepository implements ItemRepository {
  constructor(private db: DrizzleDb) {}

  async findAll(category?: string): Promise<Item[]> {
    let query = this.db.select().from(items)
    if (category) {
      query = query.where(eq(items.category, category)) as typeof query
    }
    return query
  }

  async findById(id: number): Promise<Item | null> {
    const result = await this.db.select().from(items).where(eq(items.id, id))
    return result[0] ?? null
  }

  async findAllAsMap(): Promise<Map<string, Item>> {
    const allItems = await this.db.select().from(items)
    return new Map(allItems.map(item => [item.uniqueName, item]))
  }

  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    return this.db
      .select({
        category: items.category,
        count: sql<number>`count(*)::int`,
      })
      .from(items)
      .groupBy(items.category)
      .orderBy(items.category)
  }

  async upsertMany(itemsToInsert: Omit<Item, 'id'>[]): Promise<void> {
    const BATCH_SIZE = 100
    for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
      const batch = itemsToInsert.slice(i, i + BATCH_SIZE)
      await this.db.insert(items).values(batch).onConflictDoUpdate({
        target: items.uniqueName,
        set: {
          name: items.name,
          category: items.category,
          isPrime: items.isPrime,
          masteryReq: items.masteryReq,
          maxRank: items.maxRank,
          imageName: items.imageName,
          vaulted: items.vaulted,
        },
      })
    }
  }
}
```

#### 10. Infrastructure: Bootstrap (Dependency Wiring)

**File**: `packages/api/src/infrastructure/bootstrap/container.ts`
```typescript
import { db } from '../persistence/drizzle/connection'
import { DrizzleItemRepository } from '../persistence/drizzle/item-repository'
import type { ItemRepository } from '../../domain/ports/item-repository'

export interface Container {
  itemRepo: ItemRepository
}

export function createContainer(): Container {
  return {
    itemRepo: new DrizzleItemRepository(db),
  }
}
```

#### 11. Application: HTTP Server & Routes

**File**: `packages/api/src/application/index.ts`
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createContainer } from '../infrastructure/bootstrap/container'
import { itemsRoutes } from './http/items'

const container = createContainer()
const app = new Hono()

app.use('*', logger())
app.use('*', cors({ origin: 'http://localhost:5173' }))

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/items', itemsRoutes(container))

const port = Number(process.env.PORT) || 3000
console.log(`Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
```

#### 12. Application: Items Route

**File**: `packages/api/src/application/http/items.ts`
```typescript
import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'

export function itemsRoutes(container: Container) {
  const router = new Hono()

  // Get all items with optional category filter
  router.get('/', async (c) => {
    const category = c.req.query('category') || undefined
    const items = await container.itemRepo.findAll(category)
    return c.json(items)
  })

  // Get item categories with counts
  router.get('/categories', async (c) => {
    const categories = await container.itemRepo.getCategories()
    return c.json(categories)
  })

  // Get single item
  router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const item = await container.itemRepo.findById(id)

    if (!item) {
      return c.json({ error: 'Item not found' }, 404)
    }

    return c.json(item)
  })

  return router
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `docker compose up -d` starts PostgreSQL
- [ ] `pnpm install` completes without errors
- [ ] `pnpm db:generate` creates migration files
- [ ] `pnpm db:migrate` applies migrations
- [ ] `pnpm db:seed` populates items table with 500+ items
- [ ] `pnpm dev:api` starts Hono server on port 3000
- [ ] `curl localhost:3000/health` returns `{"status":"ok"}`
- [ ] `curl localhost:3000/items/categories` returns category counts

#### Manual Verification:
- [ ] Items table contains expected categories (Warframes, Primary, etc.)
- [ ] Prime items have `is_prime = true`
- [ ] Kuva/Tenet weapons have `max_rank = 40`

---

## Phase 2: Profile Sync & Mastery Tracking

### Overview

Add player settings, mastery tracking, and profile sync functionality. Implements remaining repositories, the DE profile API adapter, and sync/mastery routes.

### Changes Required:

#### 1. Infrastructure: Player Repository

**File**: `packages/api/src/infrastructure/persistence/drizzle/player-repository.ts`
```typescript
import { eq } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { playerSettings } from './schema'
import type { PlayerSettings, Platform } from '../../../domain/entities/player'
import type { PlayerRepository } from '../../../domain/ports/player-repository'

export class DrizzlePlayerRepository implements PlayerRepository {
  constructor(private db: DrizzleDb) {}

  async getSettings(): Promise<PlayerSettings | null> {
    const result = await this.db.select().from(playerSettings).limit(1)
    return result[0] ?? null
  }

  async saveSettings(playerId: string, platform: Platform): Promise<void> {
    const existing = await this.getSettings()

    if (existing) {
      await this.db
        .update(playerSettings)
        .set({ playerId, platform })
        .where(eq(playerSettings.id, existing.id))
    } else {
      await this.db.insert(playerSettings).values({ playerId, platform })
    }
  }

  async updateDisplayName(playerId: string, displayName: string): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ displayName })
      .where(eq(playerSettings.playerId, playerId))
  }

  async updateLastSync(playerId: string): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ lastSyncAt: new Date() })
      .where(eq(playerSettings.playerId, playerId))
  }
}
```

#### 2. Infrastructure: Mastery Repository

**File**: `packages/api/src/infrastructure/persistence/drizzle/mastery-repository.ts`
```typescript
import { eq, sql, and } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { playerMastery, items } from './schema'
import type { MasteryRecord } from '../../../domain/entities/mastery'
import type { MasteryRepository, MasterySummary, MasteryWithItem } from '../../../domain/ports/mastery-repository'

export class DrizzleMasteryRepository implements MasteryRepository {
  constructor(private db: DrizzleDb) {}

  async upsertMany(records: Omit<MasteryRecord, 'id' | 'syncedAt'>[]): Promise<void> {
    for (const record of records) {
      await this.db
        .insert(playerMastery)
        .values(record)
        .onConflictDoUpdate({
          target: [playerMastery.playerId, playerMastery.itemId],
          set: {
            xp: record.xp,
            isMastered: record.isMastered,
            syncedAt: new Date(),
          },
        })
    }
  }

  async getSummary(playerId: string): Promise<MasterySummary[]> {
    return this.db
      .select({
        category: items.category,
        total: sql<number>`count(*)::int`,
        mastered: sql<number>`count(case when ${playerMastery.isMastered} then 1 end)::int`,
      })
      .from(items)
      .leftJoin(
        playerMastery,
        and(
          eq(items.id, playerMastery.itemId),
          eq(playerMastery.playerId, playerId)
        )
      )
      .groupBy(items.category)
      .orderBy(items.category)
  }

  async getItemsWithMastery(playerId: string, filters?: {
    category?: string
    masteredOnly?: boolean
    unmasteredOnly?: boolean
  }): Promise<MasteryWithItem[]> {
    let query = this.db
      .select({
        id: items.id,
        uniqueName: items.uniqueName,
        name: items.name,
        category: items.category,
        isPrime: items.isPrime,
        masteryReq: items.masteryReq,
        maxRank: items.maxRank,
        imageName: items.imageName,
        vaulted: items.vaulted,
        xp: playerMastery.xp,
        isMastered: playerMastery.isMastered,
      })
      .from(items)
      .leftJoin(
        playerMastery,
        and(
          eq(items.id, playerMastery.itemId),
          eq(playerMastery.playerId, playerId)
        )
      )

    const conditions = []
    if (filters?.category) {
      conditions.push(eq(items.category, filters.category))
    }
    if (filters?.masteredOnly) {
      conditions.push(eq(playerMastery.isMastered, true))
    }
    if (filters?.unmasteredOnly) {
      conditions.push(sql`${playerMastery.isMastered} IS NOT TRUE`)
    }

    if (conditions.length) {
      query = query.where(and(...conditions)) as typeof query
    }

    return query.orderBy(items.name)
  }
}
```

#### 3. Infrastructure: DE Profile API Adapter

**File**: `packages/api/src/infrastructure/external/de-profile-api.ts`
```typescript
import type { Platform } from '../../domain/entities/player'
import type { ProfileApi, ProfileData } from '../../domain/ports/profile-api'

const PLATFORM_URLS: Record<Platform, string> = {
  pc: 'https://content.warframe.com',
  ps: 'https://content-ps4.warframe.com',
  xbox: 'https://content-xb1.warframe.com',
  switch: 'https://content-swi.warframe.com',
}

export class DeProfileApi implements ProfileApi {
  async fetch(playerId: string, platform: Platform): Promise<ProfileData> {
    const baseUrl = PLATFORM_URLS[platform]
    const url = `${baseUrl}/dynamic/getProfileViewingData.php?playerId=${playerId}`

    const response = await fetch(url, {
      headers: { 'User-Agent': 'WarframeMasteryTracker/1.0' },
    })

    if (!response.ok) {
      throw new Error(`Profile API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      displayName: data.Results?.[0]?.DisplayName ?? null,
      playerLevel: data.Results?.[0]?.PlayerLevel ?? 0,
      xpComponents: (data.XpComponents ?? []).map((xp: any) => ({
        itemType: xp.ItemType,
        xp: xp.XP,
      })),
    }
  }
}
```

#### 4. Infrastructure: Updated Bootstrap

**File**: `packages/api/src/infrastructure/bootstrap/container.ts`
```typescript
import { db } from '../persistence/drizzle/connection'
import { DrizzleItemRepository } from '../persistence/drizzle/item-repository'
import { DrizzlePlayerRepository } from '../persistence/drizzle/player-repository'
import { DrizzleMasteryRepository } from '../persistence/drizzle/mastery-repository'
import { DeProfileApi } from '../external/de-profile-api'
import type { ItemRepository } from '../../domain/ports/item-repository'
import type { PlayerRepository } from '../../domain/ports/player-repository'
import type { MasteryRepository } from '../../domain/ports/mastery-repository'
import type { ProfileApi } from '../../domain/ports/profile-api'

export interface Container {
  itemRepo: ItemRepository
  playerRepo: PlayerRepository
  masteryRepo: MasteryRepository
  profileApi: ProfileApi
}

export function createContainer(): Container {
  return {
    itemRepo: new DrizzleItemRepository(db),
    playerRepo: new DrizzlePlayerRepository(db),
    masteryRepo: new DrizzleMasteryRepository(db),
    profileApi: new DeProfileApi(),
  }
}
```

#### 5. Application: Sync Routes

**File**: `packages/api/src/application/http/sync.ts`
```typescript
import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import type { Platform } from '../../domain/entities/player'
import { isMastered } from '../../domain/entities/mastery'

export function syncRoutes(container: Container) {
  const router = new Hono()

  // Get player settings
  router.get('/settings', async (c) => {
    const settings = await container.playerRepo.getSettings()
    return c.json(settings)
  })

  // Save player settings
  router.post('/settings', async (c) => {
    const { playerId, platform } = await c.req.json<{
      playerId: string
      platform: Platform
    }>()

    await container.playerRepo.saveSettings(playerId, platform)
    return c.json({ success: true })
  })

  // Trigger profile sync
  router.post('/profile', async (c) => {
    const settings = await container.playerRepo.getSettings()

    if (!settings) {
      return c.json({ error: 'No player settings configured' }, 400)
    }

    try {
      const profile = await container.profileApi.fetch(settings.playerId, settings.platform)

      if (profile.displayName) {
        await container.playerRepo.updateDisplayName(settings.playerId, profile.displayName)
      }

      const itemsMap = await container.itemRepo.findAllAsMap()

      const masteryRecords = profile.xpComponents
        .filter(xp => itemsMap.has(xp.itemType))
        .map(xp => {
          const item = itemsMap.get(xp.itemType)!
          return {
            playerId: settings.playerId,
            itemId: item.id,
            xp: xp.xp,
            isMastered: isMastered(xp.xp, item.category, item.maxRank),
          }
        })

      await container.masteryRepo.upsertMany(masteryRecords)
      await container.playerRepo.updateLastSync(settings.playerId)

      return c.json({
        success: true,
        synced: masteryRecords.length,
        mastered: masteryRecords.filter(r => r.isMastered).length,
      })
    } catch (error) {
      console.error('Sync error:', error)
      return c.json({ error: 'Failed to sync profile' }, 500)
    }
  })

  return router
}
```

#### 6. Application: Mastery Routes

**File**: `packages/api/src/application/http/mastery.ts`
```typescript
import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'

export function masteryRoutes(container: Container) {
  const router = new Hono()

  // Get mastery progress summary
  router.get('/summary', async (c) => {
    const settings = await container.playerRepo.getSettings()

    if (!settings) {
      return c.json({ error: 'No player configured' }, 400)
    }

    const categories = await container.masteryRepo.getSummary(settings.playerId)

    const totals = categories.reduce(
      (acc, cat) => ({
        total: acc.total + cat.total,
        mastered: acc.mastered + cat.mastered,
      }),
      { total: 0, mastered: 0 }
    )

    return c.json({
      categories,
      totals,
      lastSyncAt: settings.lastSyncAt,
      displayName: settings.displayName,
    })
  })

  // Get items with mastery status
  router.get('/items', async (c) => {
    const settings = await container.playerRepo.getSettings()

    if (!settings) {
      return c.json({ error: 'No player configured' }, 400)
    }

    const items = await container.masteryRepo.getItemsWithMastery(settings.playerId, {
      category: c.req.query('category') || undefined,
      masteredOnly: c.req.query('mastered') === 'true',
      unmasteredOnly: c.req.query('unmastered') === 'true',
    })

    return c.json(items)
  })

  return router
}
```

#### 7. Application: Updated HTTP Server

**File**: `packages/api/src/application/index.ts`
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createContainer } from '../infrastructure/bootstrap/container'
import { itemsRoutes } from './http/items'
import { masteryRoutes } from './http/mastery'
import { syncRoutes } from './http/sync'

const container = createContainer()
const app = new Hono()

app.use('*', logger())
app.use('*', cors({ origin: 'http://localhost:5173' }))

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/items', itemsRoutes(container))
app.route('/mastery', masteryRoutes(container))
app.route('/sync', syncRoutes(container))

const port = Number(process.env.PORT) || 3000
console.log(`Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
```

#### 8. Infrastructure: Schema with Unique Constraint

**File**: `packages/api/src/infrastructure/persistence/drizzle/schema.ts` (add unique constraint)
```typescript
import { unique } from 'drizzle-orm/pg-core'

// ... existing items and playerSettings tables ...

export const playerMastery = pgTable('player_mastery', {
  id: serial('id').primaryKey(),
  playerId: varchar('player_id', { length: 50 }).notNull(),
  itemId: integer('item_id').notNull().references(() => items.id),
  xp: integer('xp').notNull(),
  isMastered: boolean('is_mastered').notNull(),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
}, (table) => ({
  playerItemIdx: index('player_item_idx').on(table.playerId, table.itemId),
  playerItemUnique: unique('player_item_unique').on(table.playerId, table.itemId),
}))
```

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm db:generate` creates new migration for unique constraint
- [ ] `pnpm db:migrate` applies migration
- [ ] `curl -X POST localhost:3000/sync/settings -H "Content-Type: application/json" -d '{"playerId":"xxx","platform":"pc"}'` saves settings
- [ ] `curl localhost:3000/sync/settings` returns saved settings
- [ ] `curl -X POST localhost:3000/sync/profile` triggers sync (requires valid account ID)
- [ ] `curl localhost:3000/mastery/summary` returns category breakdown
- [ ] `curl localhost:3000/mastery/items?category=Warframes` returns warframes with mastery status

#### Manual Verification:
- [ ] Profile sync correctly retrieves data from DE API
- [ ] Mastery status correctly calculated based on XP thresholds
- [ ] Re-syncing updates existing records rather than creating duplicates

---

## Phase 3: Web Frontend (MVP)

### Overview

Build the SvelteKit frontend with Dashboard, Mastery List, and Settings pages.

### Changes Required:

#### 1. Web Package Setup

**File**: `packages/web/package.json`
```json
{
  "name": "web",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "bootstrap": "^5.3.0"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "sass": "^1.70.0",
    "svelte": "^4.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.0.0"
  }
}
```

**File**: `packages/web/vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'

export default defineConfig({
  plugins: [sveltekit()],
  css: {
    preprocessorOptions: {
      sass: {
        additionalData: `@use "./src/styles/_variables.sass" as *\n`
      }
    }
  },
})
```

#### 2. Styles Setup

**File**: `packages/web/src/styles/_variables.sass`
```sass
// Bootstrap variable overrides
$primary: #7c3aed
$secondary: #64748b
$success: #22c55e
$warning: #f59e0b
$danger: #ef4444

$border-radius: 6px
$border-radius-lg: 8px

$font-family-sans-serif: system-ui, -apple-system, sans-serif
```

**File**: `packages/web/src/styles/_styles.sass`
```sass
@import "variables"

// Bootstrap core
@import "bootstrap/scss/functions"
@import "bootstrap/scss/variables"
@import "bootstrap/scss/mixins"

// Bootstrap components (selective)
@import "bootstrap/scss/root"
@import "bootstrap/scss/reboot"
@import "bootstrap/scss/type"
@import "bootstrap/scss/grid"
@import "bootstrap/scss/utilities"
@import "bootstrap/scss/buttons"
@import "bootstrap/scss/forms"
@import "bootstrap/scss/card"
@import "bootstrap/scss/nav"
@import "bootstrap/scss/navbar"
@import "bootstrap/scss/badge"
@import "bootstrap/scss/progress"
@import "bootstrap/scss/spinners"
@import "bootstrap/scss/utilities/api"

// Custom global styles
.item-image
  width: 64px
  height: 64px
  object-fit: contain
  background: #f1f5f9
  border-radius: $border-radius

.mastered
  opacity: 0.6

.mastery-check
  color: $success
  font-weight: bold
```

#### 3. API Client

**File**: `packages/web/src/lib/api.ts`
```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface MasterySummary {
  categories: Array<{
    category: string
    total: number
    mastered: number
  }>
  totals: { total: number; mastered: number }
  lastSyncAt: string | null
  displayName: string | null
}

export interface MasteryItem {
  id: number
  uniqueName: string
  name: string
  category: string
  isPrime: boolean
  masteryReq: number
  maxRank: number
  imageName: string | null
  vaulted: boolean | null
  xp: number | null
  isMastered: boolean | null
}

export interface PlayerSettings {
  id: number
  playerId: string
  platform: string
  displayName: string | null
  lastSyncAt: string | null
}

export async function getMasterySummary(): Promise<MasterySummary> {
  const res = await fetch(`${API_BASE}/mastery/summary`)
  return res.json()
}

export async function getMasteryItems(params?: {
  category?: string
  mastered?: boolean
  unmastered?: boolean
}): Promise<MasteryItem[]> {
  const searchParams = new URLSearchParams()
  if (params?.category) searchParams.set('category', params.category)
  if (params?.mastered) searchParams.set('mastered', 'true')
  if (params?.unmastered) searchParams.set('unmastered', 'true')

  const res = await fetch(`${API_BASE}/mastery/items?${searchParams}`)
  return res.json()
}

export async function getSettings(): Promise<PlayerSettings | null> {
  const res = await fetch(`${API_BASE}/sync/settings`)
  return res.json()
}

export async function saveSettings(playerId: string, platform: string): Promise<void> {
  await fetch(`${API_BASE}/sync/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, platform }),
  })
}

export async function syncProfile(): Promise<{ success: boolean; synced: number; mastered: number }> {
  const res = await fetch(`${API_BASE}/sync/profile`, { method: 'POST' })
  return res.json()
}

export function getImageUrl(imageName: string | null): string {
  if (!imageName) return '/placeholder.png'
  return `https://cdn.warframestat.us/img/${imageName}`
}
```

#### 4. Layout

**File**: `packages/web/src/routes/+layout.svelte`
```svelte
<script>
  import '../styles/_styles.sass'
</script>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
  <div class="container">
    <a class="navbar-brand" href="/">Warframe Mastery</a>
    <ul class="navbar-nav">
      <li class="nav-item">
        <a class="nav-link" href="/">Dashboard</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/mastery">Mastery</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/settings">Settings</a>
      </li>
    </ul>
  </div>
</nav>

<main class="container">
  <slot />
</main>
```

#### 5. Dashboard Page

**File**: `packages/web/src/routes/+page.svelte`
```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { getMasterySummary, syncProfile, type MasterySummary } from '$lib/api'

  let summary: MasterySummary | null = null
  let syncing = false
  let error: string | null = null

  onMount(async () => {
    try {
      summary = await getMasterySummary()
    } catch (e) {
      error = 'Failed to load mastery data. Check settings.'
    }
  })

  async function handleSync() {
    syncing = true
    error = null
    try {
      const result = await syncProfile()
      summary = await getMasterySummary()
    } catch (e) {
      error = 'Sync failed. Check your Account ID.'
    } finally {
      syncing = false
    }
  }

  function percent(mastered: number, total: number): number {
    return total > 0 ? Math.round((mastered / total) * 100) : 0
  }
</script>

<div class="row mb-4">
  <div class="col">
    <h1>Dashboard</h1>
    {#if summary?.displayName}
      <p class="text-muted">Playing as {summary.displayName}</p>
    {/if}
  </div>
  <div class="col-auto">
    <button class="btn btn-primary" on:click={handleSync} disabled={syncing}>
      {#if syncing}
        <span class="spinner-border spinner-border-sm me-2"></span>
      {/if}
      Sync Profile
    </button>
  </div>
</div>

{#if error}
  <div class="alert alert-danger">{error}</div>
{/if}

{#if summary}
  <div class="card mb-4">
    <div class="card-body">
      <h5 class="card-title">Overall Progress</h5>
      <div class="progress mb-2" style="height: 24px">
        <div
          class="progress-bar"
          style="width: {percent(summary.totals.mastered, summary.totals.total)}%"
        >
          {summary.totals.mastered} / {summary.totals.total}
        </div>
      </div>
      <small class="text-muted">
        {percent(summary.totals.mastered, summary.totals.total)}% mastered
        {#if summary.lastSyncAt}
          · Last sync: {new Date(summary.lastSyncAt).toLocaleString()}
        {/if}
      </small>
    </div>
  </div>

  <h5 class="mb-3">By Category</h5>
  <div class="row g-3">
    {#each summary.categories as cat}
      <div class="col-md-6 col-lg-4">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">{cat.category}</h6>
            <div class="progress mb-2">
              <div
                class="progress-bar"
                style="width: {percent(cat.mastered, cat.total)}%"
              ></div>
            </div>
            <small>{cat.mastered} / {cat.total} ({percent(cat.mastered, cat.total)}%)</small>
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else if !error}
  <div class="text-center py-5">
    <div class="spinner-border"></div>
    <p class="mt-3">Loading...</p>
  </div>
{/if}
```

#### 6. Mastery List Page

**File**: `packages/web/src/routes/mastery/+page.svelte`
```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { getMasteryItems, getImageUrl, type MasteryItem } from '$lib/api'

  let items: MasteryItem[] = []
  let loading = true

  let category = ''
  let filter: 'all' | 'mastered' | 'unmastered' = 'all'
  let search = ''

  const categories = [
    'Warframes', 'Primary', 'Secondary', 'Melee',
    'Companions', 'Sentinels', 'Archwing', 'ArchGun', 'ArchMelee'
  ]

  async function loadItems() {
    loading = true
    items = await getMasteryItems({
      category: category || undefined,
      mastered: filter === 'mastered',
      unmastered: filter === 'unmastered',
    })
    loading = false
  }

  onMount(loadItems)

  $: filteredItems = items.filter(item =>
    !search || item.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleFilterChange() {
    loadItems()
  }
</script>

<h1 class="mb-4">Mastery Checklist</h1>

<div class="row g-3 mb-4">
  <div class="col-md-4">
    <select class="form-select" bind:value={category} on:change={handleFilterChange}>
      <option value="">All Categories</option>
      {#each categories as cat}
        <option value={cat}>{cat}</option>
      {/each}
    </select>
  </div>
  <div class="col-md-4">
    <select class="form-select" bind:value={filter} on:change={handleFilterChange}>
      <option value="all">All Items</option>
      <option value="mastered">Mastered Only</option>
      <option value="unmastered">Unmastered Only</option>
    </select>
  </div>
  <div class="col-md-4">
    <input
      type="search"
      class="form-control"
      placeholder="Search..."
      bind:value={search}
    />
  </div>
</div>

{#if loading}
  <div class="text-center py-5">
    <div class="spinner-border"></div>
  </div>
{:else}
  <p class="text-muted mb-3">{filteredItems.length} items</p>

  <div class="row g-3">
    {#each filteredItems as item}
      <div class="col-6 col-md-4 col-lg-3">
        <div class="card h-100" class:mastered={item.isMastered}>
          <div class="card-body d-flex align-items-center gap-3">
            <img
              src={getImageUrl(item.imageName)}
              alt={item.name}
              class="item-image"
            />
            <div class="flex-grow-1 min-width-0">
              <h6 class="card-title mb-1 text-truncate">{item.name}</h6>
              <div class="d-flex gap-2 align-items-center">
                <span class="badge bg-secondary">{item.category}</span>
                {#if item.isPrime}
                  <span class="badge bg-warning text-dark">Prime</span>
                {/if}
              </div>
            </div>
            {#if item.isMastered}
              <span class="mastery-check">✓</span>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .min-width-0 {
    min-width: 0;
  }
</style>
```

#### 7. Settings Page

**File**: `packages/web/src/routes/settings/+page.svelte`
```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { getSettings, saveSettings, type PlayerSettings } from '$lib/api'

  let settings: PlayerSettings | null = null
  let playerId = ''
  let platform = 'pc'
  let saving = false
  let saved = false

  onMount(async () => {
    settings = await getSettings()
    if (settings) {
      playerId = settings.playerId
      platform = settings.platform
    }
  })

  async function handleSave() {
    saving = true
    saved = false
    await saveSettings(playerId, platform)
    settings = await getSettings()
    saving = false
    saved = true
    setTimeout(() => saved = false, 3000)
  }
</script>

<h1 class="mb-4">Settings</h1>

<div class="card" style="max-width: 500px">
  <div class="card-body">
    <h5 class="card-title">Account Settings</h5>

    <div class="mb-3">
      <label class="form-label" for="playerId">Account ID</label>
      <input
        type="text"
        class="form-control"
        id="playerId"
        bind:value={playerId}
        placeholder="Your Warframe Account ID"
      />
      <div class="form-text">
        Find this in your EE.log file or use the Tenno Tracker browser extension.
      </div>
    </div>

    <div class="mb-3">
      <label class="form-label" for="platform">Platform</label>
      <select class="form-select" id="platform" bind:value={platform}>
        <option value="pc">PC</option>
        <option value="ps">PlayStation</option>
        <option value="xbox">Xbox</option>
        <option value="switch">Nintendo Switch</option>
      </select>
    </div>

    <button class="btn btn-primary" on:click={handleSave} disabled={saving || !playerId}>
      {#if saving}
        <span class="spinner-border spinner-border-sm me-2"></span>
      {/if}
      Save Settings
    </button>

    {#if saved}
      <span class="text-success ms-3">Saved!</span>
    {/if}
  </div>
</div>

{#if settings?.lastSyncAt}
  <div class="card mt-4" style="max-width: 500px">
    <div class="card-body">
      <h5 class="card-title">Sync History</h5>
      <p class="mb-0">
        Last sync: {new Date(settings.lastSyncAt).toLocaleString()}
      </p>
    </div>
  </div>
{/if}
```

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm install` in web package installs dependencies
- [ ] `pnpm dev:web` starts Vite dev server on port 5173
- [ ] No TypeScript errors in web package
- [ ] No SASS compilation errors

#### Manual Verification:
- [ ] Dashboard shows category progress bars
- [ ] Sync button triggers profile sync and updates display
- [ ] Mastery list shows items with images from CDN
- [ ] Category filter works correctly
- [ ] Mastered/Unmastered filter works correctly
- [ ] Search filters items by name
- [ ] Settings page saves and loads account ID
- [ ] Navigation between pages works

---

## Testing Strategy

### Unit Tests (Future):
- Mastery threshold calculations
- XP to mastered status logic
- API route handlers

### Integration Tests (Future):
- Database seed script
- Profile sync flow
- API endpoints return correct data

### Manual Testing Steps:
1. Start PostgreSQL with `docker compose up -d`
2. Run migrations and seed: `pnpm db:migrate && pnpm db:seed`
3. Start API: `pnpm dev:api`
4. Start web: `pnpm dev:web`
5. Go to Settings, enter Account ID
6. Go to Dashboard, click Sync
7. Verify mastery progress displays
8. Go to Mastery list, test filters

---

## Future Phases (Not MVP)

### Phase 4: Prime Part Tracking
- Add `prime_components` and `player_components` tables
- Manual entry UI for owned parts
- "Almost complete" detection (missing 1 part)

### Phase 5: Farm Recommendations
- Import relic data from `@wfcd/relics`
- Import drop locations from `drops.warframestat.us`
- Show "where to farm" for missing parts

### Phase 6: AI Integration
- Add vector embeddings for items
- Natural language query endpoint
- "What am I missing to build X?" queries

---

## References

- Research: `thoughts/shared/research/R1-2026-01-24-warframe-mastery-tracker-feasibility.md`
- WFCD Items: https://github.com/WFCD/warframe-items
- Profile Parser: https://github.com/WFCD/profile-parser
- Drizzle ORM: https://orm.drizzle.team/
- Hono: https://hono.dev/
- SvelteKit: https://kit.svelte.dev/
