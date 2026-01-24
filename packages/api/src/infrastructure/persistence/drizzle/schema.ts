import { pgTable, serial, varchar, integer, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core'

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
  playerItemUnique: unique('player_item_unique').on(table.playerId, table.itemId),
}))
