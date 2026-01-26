import { pgTable, serial, varchar, integer, boolean, timestamp, index, unique, jsonb, text, decimal, date } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

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
  // Acquisition data
  marketCost: integer('market_cost'),
  bpCost: integer('bp_cost'),
  buildPrice: integer('build_price'),
  buildTime: integer('build_time'),
  acquisitionData: jsonb('acquisition_data'),
  // Introduced info (normalized from acquisitionData)
  introducedName: varchar('introduced_name', { length: 255 }),
  introducedDate: date('introduced_date'),
}, (table) => ({
  categoryIdx: index('category_idx').on(table.category),
  isPrimeIdx: index('is_prime_idx').on(table.isPrime),
}))

export const itemsRelations = relations(items, ({ many }) => ({
  components: many(itemComponents),
  drops: many(itemDrops),
  resources: many(itemResources),
}))

// Crafting components for each item
export const itemComponents = pgTable('item_components', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  itemCount: integer('item_count').notNull().default(1),
  ducats: integer('ducats'),
  tradable: boolean('tradable').default(false),
}, (table) => ({
  itemIdIdx: index('item_components_item_id_idx').on(table.itemId),
  itemNameUnique: unique('item_components_item_name_unique').on(table.itemId, table.name),
}))

export const itemComponentsRelations = relations(itemComponents, ({ one, many }) => ({
  item: one(items, {
    fields: [itemComponents.itemId],
    references: [items.id],
  }),
  drops: many(componentDrops),
}))

// Direct item drop locations
export const itemDrops = pgTable('item_drops', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  location: varchar('location', { length: 255 }).notNull(),
  chance: decimal('chance', { precision: 10, scale: 8 }).notNull(),
  rarity: varchar('rarity', { length: 20 }),
}, (table) => ({
  itemIdIdx: index('item_drops_item_id_idx').on(table.itemId),
}))

export const itemDropsRelations = relations(itemDrops, ({ one }) => ({
  item: one(items, {
    fields: [itemDrops.itemId],
    references: [items.id],
  }),
}))

// Component drop locations
export const componentDrops = pgTable('component_drops', {
  id: serial('id').primaryKey(),
  componentId: integer('component_id').notNull().references(() => itemComponents.id, { onDelete: 'cascade' }),
  location: varchar('location', { length: 255 }).notNull(),
  chance: decimal('chance', { precision: 10, scale: 8 }).notNull(),
  rarity: varchar('rarity', { length: 20 }),
}, (table) => ({
  componentIdIdx: index('component_drops_component_id_idx').on(table.componentId),
}))

export const componentDropsRelations = relations(componentDrops, ({ one }) => ({
  component: one(itemComponents, {
    fields: [componentDrops.componentId],
    references: [itemComponents.id],
  }),
}))

export const playerSettings = pgTable('player_settings', {
  id: serial('id').primaryKey(),
  playerId: varchar('player_id', { length: 50 }).notNull().unique(),
  platform: varchar('platform', { length: 10 }).notNull().default('pc'),
  displayName: varchar('display_name', { length: 100 }),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Manual mastery inputs (not available from DE API)
  railjackIntrinsics: integer('railjack_intrinsics').default(0).notNull(),
  drifterIntrinsics: integer('drifter_intrinsics').default(0).notNull(),
})

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
  playerItemIdx: index('player_item_idx').on(table.playerId, table.itemId),
  playerItemUnique: unique('player_item_unique').on(table.playerId, table.itemId),
}))

export const playerLoadout = pgTable('player_loadout', {
  id: serial('id').primaryKey(),
  playerId: varchar('player_id', { length: 50 }).notNull().unique(),
  warframeId: integer('warframe_id').references(() => items.id),
  primaryId: integer('primary_id').references(() => items.id),
  secondaryId: integer('secondary_id').references(() => items.id),
  meleeId: integer('melee_id').references(() => items.id),
  focusSchool: varchar('focus_school', { length: 50 }),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
})

export const nodes = pgTable('nodes', {
  id: serial('id').primaryKey(),
  nodeKey: varchar('node_key', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  planet: varchar('planet', { length: 50 }).notNull(),
  nodeType: varchar('node_type', { length: 20 }).notNull(), // mission, junction, railjack
  masteryXp: integer('mastery_xp').notNull(),
})

export const playerNodes = pgTable('player_nodes', {
  id: serial('id').primaryKey(),
  playerId: varchar('player_id', { length: 50 }).notNull(),
  nodeId: integer('node_id').notNull().references(() => nodes.id),
  completes: integer('completes').notNull().default(0),
  isSteelPath: boolean('is_steel_path').notNull().default(false),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
}, (table) => ({
  playerNodeUnique: unique().on(table.playerId, table.nodeId, table.isSteelPath),
}))

// Resources table (materials needed for crafting)
export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  uniqueName: varchar('unique_name', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'Resource' | 'Gem' | 'Plant'
  imageName: varchar('image_name', { length: 255 }),
  description: text('description'),
  tradable: boolean('tradable').default(false),
}, (table) => ({
  nameIdx: index('resources_name_idx').on(table.name),
}))

export const resourcesRelations = relations(resources, ({ many }) => ({
  itemResources: many(itemResources),
  drops: many(resourceDrops),
}))

// Junction table linking items to resources with quantities
export const itemResources = pgTable('item_resources', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
}, (table) => ({
  itemIdIdx: index('item_resources_item_id_idx').on(table.itemId),
  resourceIdIdx: index('item_resources_resource_id_idx').on(table.resourceId),
  itemResourceUnique: unique('item_resources_unique').on(table.itemId, table.resourceId),
}))

export const itemResourcesRelations = relations(itemResources, ({ one }) => ({
  item: one(items, {
    fields: [itemResources.itemId],
    references: [items.id],
  }),
  resource: one(resources, {
    fields: [itemResources.resourceId],
    references: [resources.id],
  }),
}))

// Farm locations for resources
export const resourceDrops = pgTable('resource_drops', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  location: varchar('location', { length: 255 }).notNull(),
  chance: decimal('chance', { precision: 10, scale: 8 }).notNull(),
  rarity: varchar('rarity', { length: 20 }),
  dropQuantity: varchar('drop_quantity', { length: 50 }), // e.g., "10X Plastids"
}, (table) => ({
  resourceIdIdx: index('resource_drops_resource_id_idx').on(table.resourceId),
}))

export const resourceDropsRelations = relations(resourceDrops, ({ one }) => ({
  resource: one(resources, {
    fields: [resourceDrops.resourceId],
    references: [resources.id],
  }),
}))
