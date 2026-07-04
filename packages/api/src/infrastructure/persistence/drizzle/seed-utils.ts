/**
 * Pure utility functions for database seeding.
 * Extracted for testability.
 */

// Railjack proxima regions for grouping
export const RAILJACK_REGIONS: Record<string, string> = {
  'Earth': 'Earth Proxima',
  'Venus': 'Venus Proxima',
  'Saturn': 'Saturn Proxima',
  'Neptune': 'Neptune Proxima',
  'Pluto': 'Pluto Proxima',
  'Veil': 'Veil Proxima',
}

/**
 * Parse Railjack planet from value like "Mordo Cluster (Saturn)" -> "Saturn Proxima"
 */
export function parseRailjackPlanet(value: string): string {
  const match = value.match(/\(([^)]+)\)/)
  const planet = match ? match[1] : 'Unknown'
  return RAILJACK_REGIONS[planet] || `${planet} Proxima`
}

// Crafted parts that should always go to item_components, not resources
export const CRAFTED_PART_NAMES = new Set([
  'blueprint',
  'chassis',
  'neuroptics',
  'systems',
  'harness',
  'wings',
  'carapace',
  'cerebrum',
  'barrel',
  'receiver',
  'stock',
  'blade',
  'hilt',
  'handle',
  'grip',
  'string',
  'upper limb',
  'lower limb',
  'guard',
  'pouch',
  'stars',
  'disc',
  'ornament',
  'link',
  'chain',
  'head',
  'motor',
  'casing',
  'core',
  'prime blueprint',
  'prime chassis',
  'prime neuroptics',
  'prime systems',
  'prime barrel',
  'prime receiver',
  'prime stock',
  'prime blade',
  'prime hilt',
  'prime handle',
  'prime grip',
  'prime string',
  'prime upper limb',
  'prime lower limb',
  'prime guard',
  'prime pouch',
  'prime stars',
  'prime disc',
  'prime ornament',
  'prime link',
  'prime chain',
  'prime head',
  'prime motor',
  'prime casing',
  'prime core',
  'prime harness',
  'prime wings',
  'prime carapace',
  'prime cerebrum',
  'set',
  // Plural forms (e.g., Twin Vipers Wraith components)
  'barrels',
  'receivers',
  'blades',
  'stocks',
])

// Suffixes that indicate a crafted part
export const CRAFTED_SUFFIXES = [
  'blueprint',
  'chassis',
  'neuroptics',
  'systems',
  'harness',
  'wings',
  'carapace',
  'cerebrum',
]

export interface ComponentData {
  name: string
  drops?: Array<{ location: string; chance: number; rarity?: string }>
  ducats?: number
  tradable?: boolean
}

/**
 * Determine if a component is a crafted part (not a resource).
 * Crafted parts have relics drops, ducats value, or are known crafted types.
 */
export function isCraftedPart(comp: ComponentData): boolean {
  const nameLower = comp.name.toLowerCase()

  // Check if it's a known crafted part type
  if (CRAFTED_PART_NAMES.has(nameLower)) return true

  // Check if it ends with common crafted part suffixes
  if (CRAFTED_SUFFIXES.some(suffix => nameLower.endsWith(suffix))) return true

  // Components with drops (from relics) are crafted parts
  if (comp.drops && comp.drops.length > 0) return true

  // Components with ducats value are tradable crafted parts
  if (comp.ducats && comp.ducats > 0) return true

  return false
}

export interface MasteryReqValue {
  value?: number
  mr?: number
}

/**
 * Extract mastery requirement from item, handling various formats.
 */
export function getMasteryReq(item: { masteryReq?: number | MasteryReqValue }): number {
  const mr = item.masteryReq
  if (typeof mr === 'number') return mr
  if (typeof mr === 'object' && mr !== null) return Number(mr.value ?? mr.mr ?? 0)
  return 0
}

/**
 * Normalize an introduced date into a Postgres-safe ISO date string, or null.
 *
 * @wfcd/items ships placeholder dates for unreleased ("TBA") content — e.g. the
 * Haalvu weapon arrived with introduced.date "0000-00-00", which Postgres rejects
 * as "date/time field value out of range" and takes the whole seed batch down with
 * it. Anything that isn't a real YYYY-MM-DD calendar date becomes null.
 */
export function normalizeIntroducedDate(date: unknown): string | null {
  if (typeof date !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null
  // Reject impossible dates (e.g. 2025-02-30) via a UTC round-trip.
  const parsed = new Date(`${date}T00:00:00Z`)
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

export interface RawComponent {
  name?: string
  itemCount?: number
  ducats?: number
  tradable?: boolean
  drops?: Array<{ location?: string; place?: string; chance?: number; rarity?: string }>
}

/**
 * Extract and normalize components from an item.
 * Limits to 10 components and 5 drops per component for sanity.
 */
export function extractComponents(item: { components?: RawComponent[] }) {
  return (item.components ?? []).slice(0, 10).map((c) => ({
    name: c.name ?? 'Component',
    itemCount: typeof c.itemCount === 'number' ? c.itemCount : 1,
    ducats: typeof c.ducats === 'number' ? c.ducats : undefined,
    tradable: typeof c.tradable === 'boolean' ? c.tradable : undefined,
    drops: (c.drops ?? []).slice(0, 5).map((d) => ({
      location: d.location ?? d.place ?? 'Unknown',
      chance: typeof d.chance === 'number' ? d.chance : 0,
      rarity: d.rarity ?? undefined,
    })),
  }))
}

export interface RawDrop {
  location?: string
  place?: string
  chance?: number
  rarity?: string
}

/**
 * Extract and normalize drops from an item.
 * Limits to 10 drops for sanity.
 */
export function extractDrops(item: { drops?: RawDrop[] }) {
  return (item.drops ?? []).slice(0, 10).map((d) => ({
    location: d.location ?? d.place ?? 'Unknown',
    chance: typeof d.chance === 'number' ? d.chance : 0,
    rarity: d.rarity ?? 'Common',
  }))
}

// Constants for star chart node XP values
export const JUNCTION_XP = 1000
export const DEFAULT_NODE_XP = 24
export const RAILJACK_NODE_XP = 0

// Planets/regions whose nodes give 0 mastery XP
export const ZERO_MASTERY_PLANETS = new Set([
  'Deimos',
  'Zariman',
  'Duviri',
  'Void',
  'Lua',
  'Kuva Fortress',
  'Höllvania',
  'Dark Refractory',
])

// Individual nodes that give 0 mastery XP despite being on mastery-granting planets
export const ZERO_MASTERY_NODES = new Set([
  'SolNode94',  // Apollodorus (Mercury)
  'SolNode28',  // Terminus (Mercury)
  'SolNode451', // Saya's Vigil (Earth)
])

// Junctions data (not in any API, must be hardcoded)
export const JUNCTIONS: Array<{ key: string; name: string; planet: string }> = [
  { key: 'EarthToVenusJunction', name: 'Venus Junction', planet: 'Earth' },
  { key: 'VenusToMercuryJunction', name: 'Mercury Junction', planet: 'Venus' },
  { key: 'EarthToMarsJunction', name: 'Mars Junction', planet: 'Earth' },
  { key: 'MarsToPhobosJunction', name: 'Phobos Junction', planet: 'Mars' },
  { key: 'MarsToCeresJunction', name: 'Ceres Junction', planet: 'Mars' },
  { key: 'CeresToJupiterJunction', name: 'Jupiter Junction', planet: 'Ceres' },
  { key: 'JupiterToEuropaJunction', name: 'Europa Junction', planet: 'Jupiter' },
  { key: 'JupiterToSaturnJunction', name: 'Saturn Junction', planet: 'Jupiter' },
  { key: 'SaturnToUranusJunction', name: 'Uranus Junction', planet: 'Saturn' },
  { key: 'UranusToNeptuneJunction', name: 'Neptune Junction', planet: 'Uranus' },
  { key: 'NeptuneToPlutoJunction', name: 'Pluto Junction', planet: 'Neptune' },
  { key: 'ErisToSednaJunction', name: 'Sedna Junction', planet: 'Eris' },
  { key: 'PlutoToErisJunction', name: 'Eris Junction', planet: 'Pluto' },
]
