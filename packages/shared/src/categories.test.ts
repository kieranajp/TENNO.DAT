import { describe, it, expect } from 'vitest'
import {
  CATEGORIES,
  CATEGORY_ORDER,
  FRAME_CATEGORIES,
  WFCD_CATEGORIES,
  GLOBAL_EXCLUSIONS,
  GLOBAL_MAX_RANK_OVERRIDES,
  getCategoryConfig,
  isFrameCategory,
  sortByCategory,
} from './categories'

describe('CATEGORIES', () => {
  it('has all expected categories', () => {
    const expectedCategories = [
      'Warframes', 'Primary', 'Secondary', 'Melee',
      'Kitgun', 'Zaw', 'Amp', 'Pets', 'Sentinels',
      'SentinelWeapons', 'Archwing', 'ArchGun', 'ArchMelee',
      'Necramechs', 'Vehicles',
    ]
    expectedCategories.forEach(cat => {
      expect(CATEGORIES[cat]).toBeDefined()
    })
  })

  it('each category has required fields', () => {
    Object.values(CATEGORIES).forEach(config => {
      expect(config.name).toBeDefined()
      expect(config.displayName).toBeDefined()
      expect(config.wfcdCategory).toBeDefined()
      expect(typeof config.isFrameType).toBe('boolean')
      expect(config.icon).toBeDefined()
      expect(config.subtitle).toBeDefined()
      expect(typeof config.sortOrder).toBe('number')
    })
  })

  it('has unique sortOrder values', () => {
    const sortOrders = Object.values(CATEGORIES).map(c => c.sortOrder)
    const uniqueSortOrders = new Set(sortOrders)
    expect(uniqueSortOrders.size).toBe(sortOrders.length)
  })
})

describe('CATEGORY_ORDER', () => {
  it('is sorted by sortOrder', () => {
    for (let i = 1; i < CATEGORY_ORDER.length; i++) {
      const prevConfig = CATEGORIES[CATEGORY_ORDER[i - 1]]
      const currConfig = CATEGORIES[CATEGORY_ORDER[i]]
      expect(prevConfig.sortOrder).toBeLessThan(currConfig.sortOrder)
    }
  })

  it('contains all categories', () => {
    expect(CATEGORY_ORDER.length).toBe(Object.keys(CATEGORIES).length)
  })

  it('starts with Warframes', () => {
    expect(CATEGORY_ORDER[0]).toBe('Warframes')
  })
})

describe('FRAME_CATEGORIES', () => {
  it('includes Warframes', () => {
    expect(FRAME_CATEGORIES).toContain('Warframes')
  })

  it('includes Pets', () => {
    expect(FRAME_CATEGORIES).toContain('Pets')
  })

  it('includes Sentinels', () => {
    expect(FRAME_CATEGORIES).toContain('Sentinels')
  })

  it('includes Archwing', () => {
    expect(FRAME_CATEGORIES).toContain('Archwing')
  })

  it('includes Necramechs', () => {
    expect(FRAME_CATEGORIES).toContain('Necramechs')
  })

  it('does not include Primary', () => {
    expect(FRAME_CATEGORIES).not.toContain('Primary')
  })

  it('does not include Melee', () => {
    expect(FRAME_CATEGORIES).not.toContain('Melee')
  })
})

describe('WFCD_CATEGORIES', () => {
  it('contains unique categories', () => {
    const uniqueCategories = new Set(WFCD_CATEGORIES)
    expect(uniqueCategories.size).toBe(WFCD_CATEGORIES.length)
  })

  it('contains expected @wfcd/items categories', () => {
    expect(WFCD_CATEGORIES).toContain('Warframes')
    expect(WFCD_CATEGORIES).toContain('Primary')
    expect(WFCD_CATEGORIES).toContain('Secondary')
    expect(WFCD_CATEGORIES).toContain('Melee')
    expect(WFCD_CATEGORIES).toContain('Misc')
  })
})

describe('GLOBAL_EXCLUSIONS', () => {
  it('has PvP variant exclusion', () => {
    const hasPvpExclusion = GLOBAL_EXCLUSIONS.some(rule => {
      if (rule.matcher instanceof RegExp) {
        return rule.matcher.test('PvPVariant')
      }
      return false
    })
    expect(hasPvpExclusion).toBe(true)
  })

  it('has at least 2 exclusion rules', () => {
    expect(GLOBAL_EXCLUSIONS.length).toBeGreaterThanOrEqual(2)
  })
})

describe('GLOBAL_MAX_RANK_OVERRIDES', () => {
  it('has Kuva weapon override', () => {
    const hasKuvaOverride = GLOBAL_MAX_RANK_OVERRIDES.some(override => {
      if (override.matcher instanceof RegExp) {
        return override.matcher.test('Kuva Braton') && override.maxRank === 40
      }
      return false
    })
    expect(hasKuvaOverride).toBe(true)
  })

  it('has Tenet weapon override', () => {
    const hasTenetOverride = GLOBAL_MAX_RANK_OVERRIDES.some(override => {
      if (override.matcher instanceof RegExp) {
        return override.matcher.test('Tenet Envoy') && override.maxRank === 40
      }
      return false
    })
    expect(hasTenetOverride).toBe(true)
  })

  it('has Paracesis override', () => {
    const hasParacesisOverride = GLOBAL_MAX_RANK_OVERRIDES.some(override => {
      return override.matcher === 'Paracesis' && override.maxRank === 40
    })
    expect(hasParacesisOverride).toBe(true)
  })
})

describe('getCategoryConfig', () => {
  it('returns config for valid category', () => {
    const config = getCategoryConfig('Warframes')
    expect(config).toBeDefined()
    expect(config?.name).toBe('Warframes')
    expect(config?.displayName).toBe('Warframes')
    expect(config?.isFrameType).toBe(true)
  })

  it('returns undefined for invalid category', () => {
    const config = getCategoryConfig('InvalidCategory')
    expect(config).toBeUndefined()
  })

  it('returns config with seeding rules for modular categories', () => {
    const kitgunConfig = getCategoryConfig('Kitgun')
    expect(kitgunConfig?.seeding).toBeDefined()
    expect(kitgunConfig?.seeding?.detector).toBeDefined()
  })
})

describe('isFrameCategory', () => {
  it('returns true for Warframes', () => {
    expect(isFrameCategory('Warframes')).toBe(true)
  })

  it('returns true for Pets', () => {
    expect(isFrameCategory('Pets')).toBe(true)
  })

  it('returns true for Necramechs', () => {
    expect(isFrameCategory('Necramechs')).toBe(true)
  })

  it('returns false for Primary', () => {
    expect(isFrameCategory('Primary')).toBe(false)
  })

  it('returns false for Melee', () => {
    expect(isFrameCategory('Melee')).toBe(false)
  })

  it('returns false for unknown category', () => {
    expect(isFrameCategory('UnknownCategory')).toBe(false)
  })
})

describe('sortByCategory', () => {
  it('sorts items by category order', () => {
    const items = [
      { category: 'Melee', name: 'Skana' },
      { category: 'Warframes', name: 'Excalibur' },
      { category: 'Primary', name: 'Braton' },
    ]
    const sorted = sortByCategory(items)
    expect(sorted[0].category).toBe('Warframes')
    expect(sorted[1].category).toBe('Primary')
    expect(sorted[2].category).toBe('Melee')
  })

  it('does not mutate original array', () => {
    const items = [
      { category: 'Melee', name: 'Skana' },
      { category: 'Warframes', name: 'Excalibur' },
    ]
    const sorted = sortByCategory(items)
    expect(items[0].category).toBe('Melee')
    expect(sorted[0].category).toBe('Warframes')
  })

  it('places unknown categories at the end alphabetically', () => {
    const items = [
      { category: 'ZZZ', name: 'Unknown1' },
      { category: 'AAA', name: 'Unknown2' },
      { category: 'Warframes', name: 'Frost' },
    ]
    const sorted = sortByCategory(items)
    expect(sorted[0].category).toBe('Warframes')
    expect(sorted[1].category).toBe('AAA')
    expect(sorted[2].category).toBe('ZZZ')
  })

  it('handles empty array', () => {
    const sorted = sortByCategory([])
    expect(sorted).toEqual([])
  })

  it('handles single item', () => {
    const items = [{ category: 'Primary', name: 'Braton' }]
    const sorted = sortByCategory(items)
    expect(sorted).toEqual(items)
  })
})
