/**
 * Comprehensive category configuration for Warframe items.
 * This is the single source of truth for all category-related metadata.
 */

export interface CategoryConfig {
  /** Internal category name (used in DB) */
  name: string
  /** Display name for UI */
  displayName: string
  /** Category name used in @wfcd/items library (for seeding) */
  wfcdCategory: string
  /** Whether this is a frame-type (200 MR per rank, 1000 XP multiplier) vs weapon-type (100 MR per rank, 500 XP multiplier) */
  isFrameType: boolean
  /** Material icon name for UI */
  icon: string
  /** Subtitle for category cards */
  subtitle: string
  /** Display order (lower = earlier) */
  sortOrder: number
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  Warframes: {
    name: 'Warframes',
    displayName: 'Warframes',
    wfcdCategory: 'Warframes',
    isFrameType: true,
    icon: 'accessibility_new',
    subtitle: 'BIOLOGICAL SUITS',
    sortOrder: 1,
  },
  Primary: {
    name: 'Primary',
    displayName: 'Primary',
    wfcdCategory: 'Primary',
    isFrameType: false,
    icon: 'gps_fixed',
    subtitle: 'RIFLES, BOWS, SHOTGUNS',
    sortOrder: 2,
  },
  Secondary: {
    name: 'Secondary',
    displayName: 'Secondary',
    wfcdCategory: 'Secondary',
    isFrameType: false,
    icon: 'filter_tilt_shift',
    subtitle: 'PISTOLS, THROWN',
    sortOrder: 3,
  },
  Melee: {
    name: 'Melee',
    displayName: 'Melee',
    wfcdCategory: 'Melee',
    isFrameType: false,
    icon: 'colorize',
    subtitle: 'SWORDS, POLEARMS',
    sortOrder: 4,
  },
  Kitgun: {
    name: 'Kitgun',
    displayName: 'Kitgun',
    wfcdCategory: 'Misc', // Special: filtered from Misc in normalizeCategory
    isFrameType: false,
    icon: 'tune',
    subtitle: 'MODULAR SECONDARY',
    sortOrder: 5,
  },
  Zaw: {
    name: 'Zaw',
    displayName: 'Zaw',
    wfcdCategory: 'Misc', // Special: filtered from Misc in normalizeCategory
    isFrameType: false,
    icon: 'handyman',
    subtitle: 'MODULAR MELEE',
    sortOrder: 6,
  },
  Amp: {
    name: 'Amp',
    displayName: 'Amp',
    wfcdCategory: 'Misc', // Special: filtered from Misc in normalizeCategory
    isFrameType: false,
    icon: 'electric_bolt',
    subtitle: 'OPERATOR AMPS',
    sortOrder: 7,
  },
  Pets: {
    name: 'Pets',
    displayName: 'Pets',
    wfcdCategory: 'Pets',
    isFrameType: true,
    icon: 'pets',
    subtitle: 'KUBROWS, KAVATS',
    sortOrder: 8,
  },
  Sentinels: {
    name: 'Sentinels',
    displayName: 'Sentinels',
    wfcdCategory: 'Sentinels',
    isFrameType: true,
    icon: 'smart_toy',
    subtitle: 'FLOATING COMPANIONS',
    sortOrder: 9,
  },
  SentinelWeapons: {
    name: 'SentinelWeapons',
    displayName: 'Sentinel Weapons',
    wfcdCategory: 'SentinelWeapons',
    isFrameType: false,
    icon: 'precision_manufacturing',
    subtitle: 'SENTINEL ARMS',
    sortOrder: 10,
  },
  Archwing: {
    name: 'Archwing',
    displayName: 'Archwing',
    wfcdCategory: 'Archwing',
    isFrameType: true,
    icon: 'flight',
    subtitle: 'SPACE WINGS',
    sortOrder: 11,
  },
  ArchGun: {
    name: 'ArchGun',
    displayName: 'Arch-Gun',
    wfcdCategory: 'Arch-Gun',
    isFrameType: false,
    icon: 'rocket_launch',
    subtitle: 'HEAVY WEAPONS',
    sortOrder: 12,
  },
  ArchMelee: {
    name: 'ArchMelee',
    displayName: 'Arch-Melee',
    wfcdCategory: 'Arch-Melee',
    isFrameType: false,
    icon: 'bolt',
    subtitle: 'ARCH BLADES',
    sortOrder: 13,
  },
  Necramechs: {
    name: 'Necramechs',
    displayName: 'Necramechs',
    wfcdCategory: 'Warframes', // Special: filtered from Warframes in normalizeCategory
    isFrameType: true,
    icon: 'smart_toy',
    subtitle: 'COMBAT MECHS',
    sortOrder: 14,
  },
  Vehicles: {
    name: 'Vehicles',
    displayName: 'Vehicles',
    wfcdCategory: 'Misc', // Special: K-Drives filtered from Misc in normalizeCategory
    isFrameType: true,
    icon: 'skateboarding',
    subtitle: 'K-DRIVES',
    sortOrder: 15,
  },
}

/**
 * Ordered list of category names for display.
 * Sorted by sortOrder from CATEGORIES configuration.
 */
export const CATEGORY_ORDER = Object.values(CATEGORIES)
  .sort((a, b) => a.sortOrder - b.sortOrder)
  .map((c) => c.name) as readonly string[]

/**
 * List of frame-type categories (200 MR per rank, 1000 XP multiplier).
 * Derived from isFrameType flag in CATEGORIES.
 */
export const FRAME_CATEGORIES = Object.values(CATEGORIES)
  .filter((c) => c.isFrameType)
  .map((c) => c.name) as readonly string[]

/**
 * List of unique @wfcd/items categories to fetch when seeding.
 * Used by the seeder to fetch all necessary items from the library.
 */
export const WFCD_CATEGORIES = Array.from(
  new Set(Object.values(CATEGORIES).map((c) => c.wfcdCategory))
)

/**
 * Get category configuration by name.
 */
export function getCategoryConfig(name: string): CategoryConfig | undefined {
  return CATEGORIES[name]
}

/**
 * Check if a category is a frame-type (for mastery XP calculations).
 */
export function isFrameCategory(category: string): boolean {
  return FRAME_CATEGORIES.includes(category)
}

/**
 * Sort items by category order.
 * Unknown categories are placed at the end alphabetically.
 */
export function sortByCategory<T extends { category: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a.category)
    const bIndex = CATEGORY_ORDER.indexOf(b.category)

    // Both in order list: sort by order
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    // Only a in list: a comes first
    if (aIndex !== -1) return -1
    // Only b in list: b comes first
    if (bIndex !== -1) return 1
    // Neither in list: alphabetical
    return a.category.localeCompare(b.category)
  })
}

/**
 * Type for valid category names.
 */
export type CategoryName = keyof typeof CATEGORIES
