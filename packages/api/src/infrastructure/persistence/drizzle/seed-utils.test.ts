import { describe, it, expect } from 'vitest'
import {
  parseRailjackPlanet,
  RAILJACK_REGIONS,
  isCraftedPart,
  CRAFTED_PART_NAMES,
  CRAFTED_SUFFIXES,
  getMasteryReq,
  extractComponents,
  extractDrops,
  JUNCTION_XP,
  DEFAULT_NODE_XP,
  RAILJACK_NODE_XP,
  JUNCTIONS,
} from './seed-utils'

describe('seed-utils', () => {
  describe('parseRailjackPlanet', () => {
    it.each([
      ['Mordo Cluster (Saturn)', 'Saturn Proxima'],
      ['Flexa (Veil)', 'Veil Proxima'],
      ['Korms Belt (Earth)', 'Earth Proxima'],
      ['Luckless Expanse (Venus)', 'Venus Proxima'],
      ['Mammon\'s Prospect (Neptune)', 'Neptune Proxima'],
      ['Fenton\'s Field (Pluto)', 'Pluto Proxima'],
    ])('parses "%s" -> "%s"', (input, expected) => {
      expect(parseRailjackPlanet(input)).toBe(expected)
    })

    it('returns "Unknown Proxima" for unrecognized planets', () => {
      expect(parseRailjackPlanet('Mystery Zone (Mars)')).toBe('Mars Proxima')
    })

    it('returns "Unknown Proxima" for values without parentheses', () => {
      expect(parseRailjackPlanet('Some Random Node')).toBe('Unknown Proxima')
    })

    it('handles empty string', () => {
      expect(parseRailjackPlanet('')).toBe('Unknown Proxima')
    })
  })

  describe('RAILJACK_REGIONS', () => {
    it('includes all known Railjack proxima regions', () => {
      expect(RAILJACK_REGIONS).toEqual({
        'Earth': 'Earth Proxima',
        'Venus': 'Venus Proxima',
        'Saturn': 'Saturn Proxima',
        'Neptune': 'Neptune Proxima',
        'Pluto': 'Pluto Proxima',
        'Veil': 'Veil Proxima',
      })
    })
  })

  describe('isCraftedPart', () => {
    describe('known part names', () => {
      it.each([
        'blueprint',
        'chassis',
        'neuroptics',
        'systems',
        'harness',
        'wings',
        'barrel',
        'receiver',
        'stock',
        'blade',
        'prime blueprint',
        'prime chassis',
        'set',
      ])('recognizes "%s" as a crafted part', (name) => {
        expect(isCraftedPart({ name })).toBe(true)
      })

      it('is case insensitive', () => {
        expect(isCraftedPart({ name: 'Blueprint' })).toBe(true)
        expect(isCraftedPart({ name: 'CHASSIS' })).toBe(true)
        expect(isCraftedPart({ name: 'Neuroptics' })).toBe(true)
      })
    })

    describe('suffix matching', () => {
      it.each([
        'Frost Blueprint',
        'Braton Prime Chassis',
        'Soma Neuroptics',
        'Ember Systems',
        'Titania Harness',
        'Titania Wings',
      ])('recognizes "%s" by suffix', (name) => {
        expect(isCraftedPart({ name })).toBe(true)
      })
    })

    describe('drops indicate crafted part', () => {
      it('returns true when component has drops', () => {
        expect(isCraftedPart({
          name: 'Random Part',
          drops: [{ location: 'Lith A1', chance: 0.1 }],
        })).toBe(true)
      })

      it('returns false when drops is empty', () => {
        expect(isCraftedPart({ name: 'Resource', drops: [] })).toBe(false)
      })
    })

    describe('ducats indicate crafted part', () => {
      it('returns true when component has ducats value', () => {
        expect(isCraftedPart({ name: 'Random Part', ducats: 45 })).toBe(true)
      })

      it('returns false when ducats is 0', () => {
        expect(isCraftedPart({ name: 'Resource', ducats: 0 })).toBe(false)
      })

      it('returns false when ducats is undefined', () => {
        expect(isCraftedPart({ name: 'Resource' })).toBe(false)
      })
    })

    describe('resources (not crafted parts)', () => {
      it.each([
        'Alloy Plate',
        'Argon Crystal',
        'Control Module',
        'Ferrite',
        'Morphics',
        'Neural Sensors',
        'Neurodes',
        'Orokin Cell',
        'Plastids',
        'Polymer Bundle',
        'Rubedo',
        'Salvage',
        'Tellurium',
        'Forma',
        'Orokin Reactor',
        'Orokin Catalyst',
      ])('does not recognize "%s" as crafted part', (name) => {
        expect(isCraftedPart({ name })).toBe(false)
      })
    })
  })

  describe('getMasteryReq', () => {
    it('returns number directly when masteryReq is a number', () => {
      expect(getMasteryReq({ masteryReq: 5 })).toBe(5)
      expect(getMasteryReq({ masteryReq: 0 })).toBe(0)
      expect(getMasteryReq({ masteryReq: 15 })).toBe(15)
    })

    it('extracts value from object format', () => {
      expect(getMasteryReq({ masteryReq: { value: 8 } })).toBe(8)
      expect(getMasteryReq({ masteryReq: { mr: 12 } })).toBe(12)
      expect(getMasteryReq({ masteryReq: { value: 5, mr: 10 } })).toBe(5) // value takes precedence
    })

    it('returns 0 when masteryReq is undefined', () => {
      expect(getMasteryReq({})).toBe(0)
    })

    it('returns 0 when masteryReq object has no value or mr', () => {
      expect(getMasteryReq({ masteryReq: {} })).toBe(0)
    })
  })

  describe('extractComponents', () => {
    it('extracts basic component info', () => {
      const item = {
        components: [
          { name: 'Blueprint', itemCount: 1 },
          { name: 'Chassis', itemCount: 1 },
        ],
      }

      const result = extractComponents(item)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        name: 'Blueprint',
        itemCount: 1,
        ducats: undefined,
        tradable: undefined,
        drops: [],
      })
    })

    it('extracts ducats and tradable status', () => {
      const item = {
        components: [
          { name: 'Prime Barrel', itemCount: 1, ducats: 45, tradable: true },
        ],
      }

      const result = extractComponents(item)

      expect(result[0].ducats).toBe(45)
      expect(result[0].tradable).toBe(true)
    })

    it('extracts drops with rarity', () => {
      const item = {
        components: [
          {
            name: 'Prime Blueprint',
            itemCount: 1,
            drops: [
              { location: 'Lith A1 Relic', chance: 0.11, rarity: 'Uncommon' },
              { place: 'Meso B2 Relic', chance: 0.25 },
            ],
          },
        ],
      }

      const result = extractComponents(item)

      expect(result[0].drops).toHaveLength(2)
      expect(result[0].drops[0]).toEqual({
        location: 'Lith A1 Relic',
        chance: 0.11,
        rarity: 'Uncommon',
      })
      expect(result[0].drops[1]).toEqual({
        location: 'Meso B2 Relic',
        chance: 0.25,
        rarity: undefined,
      })
    })

    it('defaults missing values', () => {
      const item = {
        components: [{}],
      }

      const result = extractComponents(item)

      expect(result[0]).toEqual({
        name: 'Component',
        itemCount: 1,
        ducats: undefined,
        tradable: undefined,
        drops: [],
      })
    })

    it('limits to 10 components', () => {
      const item = {
        components: Array(15).fill({ name: 'Part', itemCount: 1 }),
      }

      const result = extractComponents(item)

      expect(result).toHaveLength(10)
    })

    it('limits to 5 drops per component', () => {
      const item = {
        components: [
          {
            name: 'Part',
            itemCount: 1,
            drops: Array(10).fill({ location: 'Place', chance: 0.1 }),
          },
        ],
      }

      const result = extractComponents(item)

      expect(result[0].drops).toHaveLength(5)
    })

    it('returns empty array when components is undefined', () => {
      expect(extractComponents({})).toEqual([])
    })
  })

  describe('extractDrops', () => {
    it('extracts basic drop info', () => {
      const item = {
        drops: [
          { location: 'Earth/E Prime', chance: 0.05, rarity: 'Rare' },
        ],
      }

      const result = extractDrops(item)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        location: 'Earth/E Prime',
        chance: 0.05,
        rarity: 'Rare',
      })
    })

    it('uses "place" as fallback for "location"', () => {
      const item = {
        drops: [{ place: 'Some Mission', chance: 0.1 }],
      }

      const result = extractDrops(item)

      expect(result[0].location).toBe('Some Mission')
    })

    it('defaults missing values', () => {
      const item = {
        drops: [{}],
      }

      const result = extractDrops(item)

      expect(result[0]).toEqual({
        location: 'Unknown',
        chance: 0,
        rarity: 'Common',
      })
    })

    it('limits to 10 drops', () => {
      const item = {
        drops: Array(15).fill({ location: 'Place', chance: 0.1, rarity: 'Common' }),
      }

      const result = extractDrops(item)

      expect(result).toHaveLength(10)
    })

    it('returns empty array when drops is undefined', () => {
      expect(extractDrops({})).toEqual([])
    })
  })

  describe('constants', () => {
    it('JUNCTION_XP is 1000', () => {
      expect(JUNCTION_XP).toBe(1000)
    })

    it('DEFAULT_NODE_XP is 24', () => {
      expect(DEFAULT_NODE_XP).toBe(24)
    })

    it('RAILJACK_NODE_XP is 0 (railjack nodes do not grant mastery)', () => {
      expect(RAILJACK_NODE_XP).toBe(0)
    })
  })

  describe('JUNCTIONS', () => {
    it('has 13 junctions', () => {
      expect(JUNCTIONS).toHaveLength(13)
    })

    it('each junction has key, name, and planet', () => {
      JUNCTIONS.forEach((junction) => {
        expect(junction.key).toBeDefined()
        expect(junction.name).toBeDefined()
        expect(junction.planet).toBeDefined()
        expect(junction.name).toContain('Junction')
      })
    })

    it('includes known junctions', () => {
      const keys = JUNCTIONS.map((j) => j.key)
      expect(keys).toContain('EarthToVenusJunction')
      expect(keys).toContain('NeptuneToPlutoJunction')
      expect(keys).toContain('PlutoToErisJunction')
    })
  })

  describe('CRAFTED_PART_NAMES', () => {
    it('is a Set with known part names', () => {
      expect(CRAFTED_PART_NAMES).toBeInstanceOf(Set)
      expect(CRAFTED_PART_NAMES.has('blueprint')).toBe(true)
      expect(CRAFTED_PART_NAMES.has('chassis')).toBe(true)
      expect(CRAFTED_PART_NAMES.has('neuroptics')).toBe(true)
      expect(CRAFTED_PART_NAMES.has('systems')).toBe(true)
      expect(CRAFTED_PART_NAMES.has('prime blueprint')).toBe(true)
    })
  })

  describe('CRAFTED_SUFFIXES', () => {
    it('includes common Warframe part suffixes', () => {
      expect(CRAFTED_SUFFIXES).toContain('blueprint')
      expect(CRAFTED_SUFFIXES).toContain('chassis')
      expect(CRAFTED_SUFFIXES).toContain('neuroptics')
      expect(CRAFTED_SUFFIXES).toContain('systems')
    })
  })
})
