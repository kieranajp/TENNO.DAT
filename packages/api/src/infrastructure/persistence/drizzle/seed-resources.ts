import Items from '@wfcd/items'
import { db, schema } from './connection'
import { createLogger } from '../../logger'

const log = createLogger('SeedResources')

/**
 * Seed the resources table from @wfcd/items.
 * Resources include crafting materials like Plastids, Hexenon, Orokin Cells,
 * as well as Gems and Plants used for crafting.
 */
export async function seedResources() {
  log.info('Fetching resources from @wfcd/items...')

  // Fetch ALL items and filter by type, since resources are spread across
  // multiple categories (Resources: 236, Misc: 90 including Hexenon, Plastids, etc.)
  const allItems = new Items()

  // Filter to items that are resources:
  // 1. Items with type 'Resource', 'Gem', or 'Plant'
  // 2. Items in Misc category with uniqueName containing '/MiscItems/' (catches Neurodes, Ferrite with type 'Misc')
  const resources = allItems.filter((item: any) => {
    const type = item.type?.toLowerCase() ?? ''
    const uniqueName = item.uniqueName ?? ''

    // Primary: type-based identification
    if (type === 'resource' || type === 'gem' || type === 'plant') {
      return true
    }

    // Secondary: catch misc-typed items that are actually crafting resources
    // These are in the /MiscItems/ path and have category 'Misc'
    if (item.category === 'Misc' && type === 'misc' && uniqueName.includes('/MiscItems/')) {
      return true
    }

    return false
  })

  log.info(`Found ${resources.length} resources`)

  // Clear existing resource data
  log.info('Clearing existing resource data...')
  await db.delete(schema.resourceDrops)
  await db.delete(schema.itemResources)
  await db.delete(schema.resources)

  // Insert resources
  log.info('Inserting resources...')
  const BATCH_SIZE = 100
  for (let i = 0; i < resources.length; i += BATCH_SIZE) {
    const batch = resources.slice(i, i + BATCH_SIZE)
    await db.insert(schema.resources).values(batch.map((resource: any) => ({
      uniqueName: String(resource.uniqueName ?? ''),
      name: String(resource.name ?? ''),
      type: normalizeResourceType(resource.type),
      imageName: resource.imageName ? String(resource.imageName) : null,
      description: resource.description ? String(resource.description) : null,
      tradable: Boolean(resource.tradable ?? false),
    })))
    log.debug(`Inserted resources ${Math.min(i + BATCH_SIZE, resources.length)}/${resources.length}`)
  }

  // Build resource name/uniqueName -> id map
  const allDbResources = await db.select({
    id: schema.resources.id,
    uniqueName: schema.resources.uniqueName,
    name: schema.resources.name,
  }).from(schema.resources)

  const resourceIdByUniqueName = new Map(allDbResources.map(r => [r.uniqueName, r.id]))
  const resourceIdByName = new Map(allDbResources.map(r => [r.name.toLowerCase(), r.id]))

  // Insert resource drops
  log.info('Inserting resource drops...')
  for (let i = 0; i < resources.length; i += BATCH_SIZE) {
    const batch = resources.slice(i, i + BATCH_SIZE)
    const dropsToInsert = batch.flatMap((resource: any) => {
      const resourceId = resourceIdByUniqueName.get(resource.uniqueName)
      if (!resourceId) return []

      const drops = resource.drops ?? []
      return drops.slice(0, 10).map((drop: any) => ({
        resourceId,
        location: String(drop.location ?? drop.place ?? 'Unknown'),
        chance: String(typeof drop.chance === 'number' ? drop.chance : 0),
        rarity: drop.rarity ?? null,
        dropQuantity: drop.type ?? null, // e.g., "10X Plastids"
      }))
    })

    if (dropsToInsert.length > 0) {
      await db.insert(schema.resourceDrops).values(dropsToInsert)
    }
  }

  log.info('Resource seeding complete!')
  return { resourceIdByUniqueName, resourceIdByName }
}

/**
 * Normalize resource type to one of 'Resource', 'Gem', or 'Plant'
 */
function normalizeResourceType(type: string | undefined): string {
  const normalized = (type ?? '').toLowerCase()
  if (normalized === 'gem') return 'Gem'
  if (normalized === 'plant') return 'Plant'
  return 'Resource'
}

/**
 * Get the resource ID maps for use by item seeding.
 */
export async function getResourceMaps() {
  const allDbResources = await db.select({
    id: schema.resources.id,
    uniqueName: schema.resources.uniqueName,
    name: schema.resources.name,
  }).from(schema.resources)

  return {
    resourceIdByUniqueName: new Map(allDbResources.map(r => [r.uniqueName, r.id])),
    resourceIdByName: new Map(allDbResources.map(r => [r.name.toLowerCase(), r.id])),
  }
}

// Run standalone if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedResources()
    .then(() => process.exit(0))
    .catch((err) => {
      log.error('Resource seeding failed', err)
      process.exit(1)
    })
}
