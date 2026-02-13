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
  const expectedCategories = [
    'Warframes', 'Primary', 'Secondary', 'Melee',
    'Kitgun', 'Zaw', 'Amp', 'Pets', 'Sentinels',
    'SentinelWeapons', 'Archwing', 'ArchGun', 'ArchMelee',
    'Necramechs', 'Vehicles',
  ]

  it.each(expectedCategories)('has %s category', (cat) => {
    expect(CATEGORIES[cat]).toBeDefined()
  })

  it('each category has required fields', () => {
    Object.values(CATEGORIES).forEach(config => {
      expect(config).toMatchObject({
        name: expect.any(String),
        displayName: expect.any(String),
        wfcdCategory: expect.any(String),
        isFrameType: expect.any(Boolean),
        icon: expect.any(String),
        subtitle: expect.any(String),
        sortOrder: expect.any(Number),
      })
    })
  })

  it('has unique sortOrder values', () => {
    const sortOrders = Object.values(CATEGORIES).map(c => c.sortOrder)
    expect(new Set(sortOrders).size).toBe(sortOrders.length)
  })
})

describe('CATEGORY_ORDER', () => {
  it('is sorted by sortOrder and contains all categories', () => {
    expect(CATEGORY_ORDER.length).toBe(Object.keys(CATEGORIES).length)
    expect(CATEGORY_ORDER[0]).toBe('Warframes')

    for (let i = 1; i < CATEGORY_ORDER.length; i++) {
      expect(CATEGORIES[CATEGORY_ORDER[i - 1]].sortOrder)
        .toBeLessThan(CATEGORIES[CATEGORY_ORDER[i]].sortOrder)
    }
  })
})

describe('FRAME_CATEGORIES', () => {
  it.each([
    ['Warframes', true],
    ['Pets', true],
    ['Sentinels', true],
    ['Archwing', true],
    ['Necramechs', true],
    ['Vehicles', true], // K-Drives and Plexus give 200 MR per rank
    ['Primary', false],
    ['Melee', false],
  ])('%s is frame-type: %s', (category, isFrame) => {
    if (isFrame) {
      expect(FRAME_CATEGORIES).toContain(category)
    } else {
      expect(FRAME_CATEGORIES).not.toContain(category)
    }
  })
})

describe('WFCD_CATEGORIES', () => {
  it('contains unique expected @wfcd/items categories', () => {
    expect(new Set(WFCD_CATEGORIES).size).toBe(WFCD_CATEGORIES.length)
    expect(WFCD_CATEGORIES).toEqual(
      expect.arrayContaining(['Warframes', 'Primary', 'Secondary', 'Melee', 'Misc'])
    )
  })
})

describe('GLOBAL_EXCLUSIONS', () => {
  it('has PvP variant and other exclusion rules', () => {
    const hasPvpExclusion = GLOBAL_EXCLUSIONS.some(rule =>
      rule.matcher instanceof RegExp && rule.matcher.test('PvPVariant')
    )
    expect(hasPvpExclusion).toBe(true)
    expect(GLOBAL_EXCLUSIONS.length).toBeGreaterThanOrEqual(2)
  })
})

describe('GLOBAL_MAX_RANK_OVERRIDES', () => {
  it.each([
    ['Kuva', 'Kuva Braton'],
    ['Tenet', 'Tenet Envoy'],
    ['Coda', 'Coda Strun'],
  ])('has %s weapon override', (_, testName) => {
    const hasOverride = GLOBAL_MAX_RANK_OVERRIDES.some(override =>
      override.matcher instanceof RegExp && override.matcher.test(testName) && override.maxRank === 40
    )
    expect(hasOverride).toBe(true)
  })

  it('has Paracesis override', () => {
    const hasParacesisOverride = GLOBAL_MAX_RANK_OVERRIDES.some(override =>
      override.matcher === 'Paracesis' && override.maxRank === 40
    )
    expect(hasParacesisOverride).toBe(true)
  })
})

describe('getCategoryConfig', () => {
  it('returns config for valid category', () => {
    const config = getCategoryConfig('Warframes')
    expect(config).toMatchObject({
      name: 'Warframes',
      displayName: 'Warframes',
      isFrameType: true,
    })
  })

  it('returns undefined for invalid category', () => {
    expect(getCategoryConfig('InvalidCategory')).toBeUndefined()
  })

  it('returns config with seeding rules for modular categories', () => {
    const kitgunConfig = getCategoryConfig('Kitgun')
    expect(kitgunConfig?.seeding?.detector).toBeDefined()
  })
})

describe('isFrameCategory', () => {
  it.each([
    ['Warframes', true],
    ['Pets', true],
    ['Necramechs', true],
    ['Primary', false],
    ['Melee', false],
    ['UnknownCategory', false],
  ])('%s returns %s', (category, expected) => {
    expect(isFrameCategory(category)).toBe(expected)
  })
})

describe('sortByCategory', () => {
  it('sorts items by category order without mutating original', () => {
    const items = [
      { category: 'Melee', name: 'Skana' },
      { category: 'Warframes', name: 'Excalibur' },
      { category: 'Primary', name: 'Braton' },
    ]
    const sorted = sortByCategory(items)

    expect(items[0].category).toBe('Melee') // Original unchanged
    expect(sorted.map(i => i.category)).toEqual(['Warframes', 'Primary', 'Melee'])
  })

  it('places unknown categories at the end alphabetically', () => {
    const items = [
      { category: 'ZZZ', name: 'Unknown1' },
      { category: 'AAA', name: 'Unknown2' },
      { category: 'Warframes', name: 'Frost' },
    ]
    const sorted = sortByCategory(items)
    expect(sorted.map(i => i.category)).toEqual(['Warframes', 'AAA', 'ZZZ'])
  })

  it.each([
    [[], []],
    [[{ category: 'Primary', name: 'Braton' }], [{ category: 'Primary', name: 'Braton' }]],
  ])('handles edge cases: %j', (input, expected) => {
    expect(sortByCategory(input)).toEqual(expected)
  })
})
