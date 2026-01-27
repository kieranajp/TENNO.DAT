/**
 * Comprehensive category configuration for Warframe items.
 * This is the single source of truth for all category-related metadata.
 */

/** Pattern matcher for item detection - can be string (exact match), RegExp, or function */
export type ItemMatcher = string | RegExp | ((item: any) => boolean)

/** Rule for including/excluding items during seeding */
export interface SeedingRule {
  matcher: ItemMatcher
  reason?: string
}

/** Rule for overriding maxRank values */
export interface MaxRankOverride {
  matcher: ItemMatcher
  maxRank: number
  reason?: string
}

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
  /** Seeding configuration (optional) */
  seeding?: {
    /** Custom detector function to identify items for this category */
    detector?: (item: any) => boolean
    /** Items to explicitly include (for items not automatically detected) */
    include?: SeedingRule[]
    /** Items to explicitly exclude from this category */
    exclude?: SeedingRule[]
    /** Default maxRank for all items in this category (overrides the global default of 30) */
    defaultMaxRank?: number
    /** Override maxRank for specific items in this category */
    maxRankOverrides?: MaxRankOverride[]
  }
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
    seeding: {
      exclude: [
        {
          matcher: (item) => item.name === 'Bonewidow' || item.name === 'Voidrig',
          reason: 'Necramechs are in separate category',
        },
      ],
    },
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
    wfcdCategory: 'Misc',
    isFrameType: false,
    icon: 'tune',
    subtitle: 'MODULAR SECONDARY',
    sortOrder: 5,
    seeding: {
      detector: (item) =>
        (item.uniqueName?.includes('SUModularSecondary') ||
          item.uniqueName?.includes('SUModularPrimary')) &&
        item.uniqueName?.includes('/Barrel/'),
      include: [
        {
          matcher: /SUModular(Secondary|Primary).*\/Barrel\//,
          reason: 'Kitgun chambers (primary parts only)',
        },
      ],
    },
  },
  Zaw: {
    name: 'Zaw',
    displayName: 'Zaw',
    wfcdCategory: 'Misc',
    isFrameType: false,
    icon: 'handyman',
    subtitle: 'MODULAR MELEE',
    sortOrder: 6,
    seeding: {
      detector: (item) =>
        item.uniqueName?.includes('ModularMelee') && /\/Tips?\//.test(item.uniqueName),
      include: [
        {
          matcher: /ModularMelee.*\/Tips?\//,
          reason: 'Zaw strikes (primary parts only)',
        },
      ],
    },
  },
  Amp: {
    name: 'Amp',
    displayName: 'Amp',
    wfcdCategory: 'Misc',
    isFrameType: false,
    icon: 'electric_bolt',
    subtitle: 'OPERATOR AMPS',
    sortOrder: 7,
    seeding: {
      detector: (item) =>
        (item.uniqueName?.includes('OperatorAmplifiers') &&
          item.uniqueName?.includes('Barrel')) ||
        item.uniqueName === '/Lotus/Weapons/Operator/Pistols/DrifterPistol/DrifterPistolPlayerWeapon',
      include: [
        {
          matcher: /OperatorAmplifiers.*Barrel/,
          reason: 'Amp prisms (primary parts only)',
        },
        {
          matcher: '/Lotus/Weapons/Operator/Pistols/DrifterPistol/DrifterPistolPlayerWeapon',
          reason: 'Sirocco (Drifter amp)',
        },
      ],
    },
  },
  Pets: {
    name: 'Pets',
    displayName: 'Pets',
    wfcdCategory: 'Pets',
    isFrameType: true,
    icon: 'pets',
    subtitle: 'KUBROWS, KAVATS',
    sortOrder: 8,
    seeding: {
      include: [
        {
          matcher: '/Lotus/Powersuits/Khora/Kavat/KhoraKavatPowerSuit',
          reason: 'Venari (masterable despite library marking)',
        },
        {
          matcher: '/Lotus/Powersuits/Khora/Kavat/KhoraPrimeKavatPowerSuit',
          reason: 'Venari Prime (masterable despite library marking)',
        },
      ],
    },
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
    seeding: {
      detector: (item) => item.productCategory === 'SentinelWeapons',
    },
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
    wfcdCategory: 'Warframes',
    isFrameType: true,
    icon: 'smart_toy',
    subtitle: 'COMBAT MECHS',
    sortOrder: 14,
    seeding: {
      detector: (item) => item.name === 'Bonewidow' || item.name === 'Voidrig',
      defaultMaxRank: 40,
    },
  },
  Vehicles: {
    name: 'Vehicles',
    displayName: 'Vehicles',
    wfcdCategory: 'Misc',
    isFrameType: true,
    icon: 'skateboarding',
    subtitle: 'K-DRIVES',
    sortOrder: 15,
    seeding: {
      detector: (item) =>
        item.uniqueName?.includes('/Vehicles/Hoverboard/') &&
        item.uniqueName?.includes('Deck'),
      include: [
        {
          matcher: /\/Vehicles\/Hoverboard\/.*Deck/,
          reason: 'K-Drive decks (primary parts only)',
        },
      ],
    },
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

/**
 * Global seeding exclusion rules.
 * Items matching these patterns will be excluded from seeding.
 */
export const GLOBAL_EXCLUSIONS: SeedingRule[] = [
  {
    matcher: /PvPVariant/,
    reason: 'PvP variants are not masterable',
  },
  {
    matcher: (item) =>
      (item.uniqueName?.includes('ModularMelee') ||
        item.uniqueName?.includes('OperatorAmplifiers') ||
        item.uniqueName?.includes('SUModular')) &&
      !(/\/Tips?\//.test(item.uniqueName) || // Zaw strikes (Tip or Tips)
        /\/Barrel\/|Barrel$/.test(item.uniqueName)), // Kitgun chambers & Amp prisms (incl Mote)
    reason: 'Non-primary modular parts (grips, links, braces)',
  },
]

/**
 * Global maxRank overrides for specific item patterns.
 */
export const GLOBAL_MAX_RANK_OVERRIDES: MaxRankOverride[] = [
  {
    matcher: /^(Kuva |Tenet )/,
    maxRank: 40,
    reason: 'Kuva and Tenet weapons cap at rank 40',
  },
  {
    matcher: 'Paracesis',
    maxRank: 40,
    reason: 'Paracesis caps at rank 40',
  },
]

/**
 * Items that should be marked as Prime but aren't by the library.
 */
export const PRIME_OVERRIDES: SeedingRule[] = [
  {
    matcher: '/Lotus/Powersuits/Khora/Kavat/KhoraPrimeKavatPowerSuit',
    reason: 'Venari Prime not marked as prime by wfcd library',
  },
]

/**
 * Mastery XP configuration by category type.
 * Frame-types give more XP per rank than weapon-types.
 */
export const MASTERY_CONFIG = {
  frame: { xpMultiplier: 1000, xpPerRank: 200 },
  weapon: { xpMultiplier: 500, xpPerRank: 100 },
} as const

/**
 * Mastery rank threshold constants.
 * Used for calculating player mastery rank from total XP.
 */
export const MASTERY_RANK_CONFIG = {
  /** XP coefficient for MR 1-30: threshold = coefficient × MR² */
  xpPerMRSquared: 2500,
  /** XP required per legendary rank (MR 31+) */
  xpPerLegendaryRank: 147500,
  /** Total XP threshold for MR 30 (transition to legendary ranks) */
  mr30Threshold: 2250000,
  /** XP granted per intrinsic level (Railjack/Drifter) */
  xpPerIntrinsicLevel: 1500,
} as const

/**
 * Standard item rank thresholds.
 */
export const RANK_THRESHOLDS = {
  /** Standard max rank for most items */
  standard: 30,
  /** Extended max rank for Kuva/Tenet weapons, Necramechs, etc. */
  extended: 40,
} as const

/**
 * Get the XP multiplier for a category.
 * Used in formula: XP = multiplier × rank²
 */
export function getXpMultiplier(category: string): number {
  return CATEGORIES[category]?.isFrameType
    ? MASTERY_CONFIG.frame.xpMultiplier
    : MASTERY_CONFIG.weapon.xpMultiplier
}

/**
 * Get the mastery XP earned per rank for a category.
 */
export function getXpPerRank(category: string): number {
  return CATEGORIES[category]?.isFrameType
    ? MASTERY_CONFIG.frame.xpPerRank
    : MASTERY_CONFIG.weapon.xpPerRank
}
