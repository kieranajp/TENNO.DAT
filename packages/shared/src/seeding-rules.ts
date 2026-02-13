import type {
  ItemMatcher,
  SeedingRule,
  MaxRankOverride,
  CategoryConfig,
} from './categories'
import {
  CATEGORIES,
  GLOBAL_EXCLUSIONS,
  GLOBAL_MAX_RANK_OVERRIDES,
  PRIME_OVERRIDES,
  RANK_THRESHOLDS,
} from './categories'

/**
 * Helper class for evaluating seeding rules against items.
 */
export class SeedingRules {
  /**
   * Check if an item matches a given matcher.
   */
  static matches(item: any, matcher: ItemMatcher): boolean {
    if (typeof matcher === 'string') {
      // Exact match against uniqueName or name
      return item.uniqueName === matcher || item.name === matcher
    }

    if (matcher instanceof RegExp) {
      // RegExp match against uniqueName or name
      return matcher.test(item.uniqueName) || matcher.test(item.name)
    }

    if (typeof matcher === 'function') {
      // Custom function matcher
      return matcher(item)
    }

    return false
  }

  /**
   * Check if an item matches any rule in a list.
   */
  static matchesAny(item: any, rules: SeedingRule[]): boolean {
    return rules.some((rule) => this.matches(item, rule.matcher))
  }

  /**
   * Check if an item is globally excluded.
   */
  static isGloballyExcluded(item: any): boolean {
    return this.matchesAny(item, GLOBAL_EXCLUSIONS)
  }

  /**
   * Check if an item should be marked as Prime.
   * Uses library flag first, then checks overrides for items missing the flag.
   */
  static isPrime(item: any): boolean {
    if (item.isPrime) return true
    return this.matchesAny(item, PRIME_OVERRIDES)
  }

  /**
   * Detect the appropriate category for an item using declarative rules.
   * Returns the category name or null if no category matches.
   */
  static detectCategory(item: any): string | null {
    // Check global exclusions first
    if (this.isGloballyExcluded(item)) {
      return null
    }

    // Try each category's detector and include rules
    for (const config of Object.values(CATEGORIES)) {
      // Check if category has a custom detector
      if (config.seeding?.detector && config.seeding.detector(item)) {
        // Check category-specific exclusions
        if (config.seeding.exclude && this.matchesAny(item, config.seeding.exclude)) {
          continue
        }
        return config.name
      }

      // Check explicit include rules
      if (config.seeding?.include && this.matchesAny(item, config.seeding.include)) {
        // Check category-specific exclusions
        if (config.seeding.exclude && this.matchesAny(item, config.seeding.exclude)) {
          continue
        }
        return config.name
      }
    }

    // Fallback: check if item's category/productCategory matches wfcdCategory
    for (const config of Object.values(CATEGORIES)) {
      const itemCategory = item.category || item.productCategory
      if (itemCategory === config.wfcdCategory) {
        // Check category-specific exclusions
        if (config.seeding?.exclude && this.matchesAny(item, config.seeding.exclude)) {
          continue
        }
        return config.name
      }
    }

    // Normalize hyphenated categories (Arch-Gun -> ArchGun)
    const categoryMap: Record<string, string> = {
      'Arch-Gun': 'ArchGun',
      'Arch-Melee': 'ArchMelee',
    }
    const normalized = categoryMap[item.category]
    if (normalized && CATEGORIES[normalized]) {
      return normalized
    }

    return null
  }

  /**
   * Get maxRank for an item, checking category and global overrides.
   * Falls back to maxLevelCap from item data or 30.
   */
  static getMaxRank(item: any, category: string): number {
    const config = CATEGORIES[category]

    // Check category-specific overrides for individual items
    if (config?.seeding?.maxRankOverrides) {
      for (const override of config.seeding.maxRankOverrides) {
        if (this.matches(item, override.matcher)) {
          return override.maxRank
        }
      }
    }

    // Check global overrides (Kuva, Tenet, Paracesis)
    for (const override of GLOBAL_MAX_RANK_OVERRIDES) {
      if (this.matches(item, override.matcher)) {
        return override.maxRank
      }
    }

    // Check category default maxRank
    if (config?.seeding?.defaultMaxRank) {
      return config.seeding.defaultMaxRank
    }

    // Use maxLevelCap from @wfcd/items if available
    if (item.maxLevelCap && typeof item.maxLevelCap === 'number') {
      return item.maxLevelCap
    }

    // Default to standard max rank
    return RANK_THRESHOLDS.standard
  }

  /**
   * Check if an item should be included in seeding.
   * Checks masterable flag and special inclusions (e.g., Venari, modular primaries).
   */
  static shouldInclude(item: any): boolean {
    // Check if item is marked as masterable
    if (item.masterable !== false) {
      return true
    }

    // Check special inclusions across all categories
    for (const config of Object.values(CATEGORIES)) {
      if (config.seeding?.include && this.matchesAny(item, config.seeding.include)) {
        return true
      }
    }

    return false
  }
}
