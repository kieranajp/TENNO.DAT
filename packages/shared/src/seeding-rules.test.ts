import { describe, it, expect } from 'vitest'
import { SeedingRules } from './seeding-rules'

describe('SeedingRules', () => {
  describe('matches', () => {
    it('matches exact string against uniqueName', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      expect(SeedingRules.matches(item, '/Lotus/Powersuits/Frost/Frost')).toBe(true)
    })

    it('matches exact string against name', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      expect(SeedingRules.matches(item, 'Frost')).toBe(true)
    })

    it('does not match when string is different', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      expect(SeedingRules.matches(item, 'Ember')).toBe(false)
    })

    it('matches RegExp against uniqueName', () => {
      const item = { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton' }
      expect(SeedingRules.matches(item, /\/Rifle\//)).toBe(true)
    })

    it('matches RegExp against name', () => {
      const item = { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Kuva Braton' }
      expect(SeedingRules.matches(item, /^Kuva /)).toBe(true)
    })

    it('does not match when RegExp fails', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      expect(SeedingRules.matches(item, /Tenet/)).toBe(false)
    })

    it('matches with custom function', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', isPrime: true }
      expect(SeedingRules.matches(item, (i) => i.isPrime === true)).toBe(true)
    })

    it('does not match when custom function returns false', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', isPrime: false }
      expect(SeedingRules.matches(item, (i) => i.isPrime === true)).toBe(false)
    })

    it('returns false for unknown matcher type', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      expect(SeedingRules.matches(item, 123 as any)).toBe(false)
    })
  })

  describe('matchesAny', () => {
    it('returns true if any rule matches', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      const rules = [
        { matcher: 'Ember' },
        { matcher: 'Frost' },
        { matcher: 'Volt' },
      ]
      expect(SeedingRules.matchesAny(item, rules)).toBe(true)
    })

    it('returns false if no rules match', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      const rules = [
        { matcher: 'Ember' },
        { matcher: 'Volt' },
        { matcher: 'Mag' },
      ]
      expect(SeedingRules.matchesAny(item, rules)).toBe(false)
    })

    it('returns false for empty rules array', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      expect(SeedingRules.matchesAny(item, [])).toBe(false)
    })
  })

  describe('isGloballyExcluded', () => {
    it('excludes PvP variants', () => {
      const item = { uniqueName: '/Lotus/Weapons/PvPVariant/Braton', name: 'Braton PvP' }
      expect(SeedingRules.isGloballyExcluded(item)).toBe(true)
    })

    it('excludes non-primary modular parts (grips)', () => {
      const item = { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Grip/SUGripA', name: 'Grip' }
      expect(SeedingRules.isGloballyExcluded(item)).toBe(true)
    })

    it('excludes non-primary amp parts (braces)', () => {
      const item = { uniqueName: '/Lotus/Weapons/OperatorAmplifiers/Set1/Brace/AmpBrace1', name: 'Brace' }
      expect(SeedingRules.isGloballyExcluded(item)).toBe(true)
    })

    it('does not exclude primary modular parts (barrels)', () => {
      const item = { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelA', name: 'Catchmoon' }
      expect(SeedingRules.isGloballyExcluded(item)).toBe(false)
    })

    it('does not exclude primary modular parts (tips)', () => {
      const item = { uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Tip/ZawTip1', name: 'Balla' }
      expect(SeedingRules.isGloballyExcluded(item)).toBe(false)
    })

    it('does not exclude normal items', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      expect(SeedingRules.isGloballyExcluded(item)).toBe(false)
    })
  })

  describe('detectCategory', () => {
    it('returns null for globally excluded items', () => {
      const item = { uniqueName: '/Lotus/Weapons/PvPVariant/Braton', name: 'Braton PvP', category: 'Primary' }
      expect(SeedingRules.detectCategory(item)).toBe(null)
    })

    it('detects Necramechs (custom detector)', () => {
      const item = { uniqueName: '/Lotus/Powersuits/EntratiMech/Voidrig', name: 'Voidrig', category: 'Warframes' }
      expect(SeedingRules.detectCategory(item)).toBe('Necramechs')
    })

    it('detects Kitgun barrels', () => {
      const item = { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelA', name: 'Catchmoon' }
      expect(SeedingRules.detectCategory(item)).toBe('Kitgun')
    })

    it('detects Zaw tips', () => {
      const item = { uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Tip/ZawTip1', name: 'Balla' }
      expect(SeedingRules.detectCategory(item)).toBe('Zaw')
    })

    it('detects Amp prisms', () => {
      const item = { uniqueName: '/Lotus/Weapons/OperatorAmplifiers/Set1/Barrel/AmpBarrel1', name: 'Raplak Prism' }
      expect(SeedingRules.detectCategory(item)).toBe('Amp')
    })

    it('detects Sirocco as Amp', () => {
      const item = { uniqueName: '/Lotus/Weapons/Operator/Pistols/DrifterPistol/DrifterPistolPlayerWeapon', name: 'Sirocco' }
      expect(SeedingRules.detectCategory(item)).toBe('Amp')
    })

    it('detects K-Drive decks as Vehicles', () => {
      const item = { uniqueName: '/Lotus/Vehicles/Hoverboard/HBDeckA/HBDeckA', name: 'Deck' }
      expect(SeedingRules.detectCategory(item)).toBe('Vehicles')
    })

    it('detects Warframes by wfcdCategory fallback', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', productCategory: 'Warframes' }
      expect(SeedingRules.detectCategory(item)).toBe('Warframes')
    })

    it('detects Primary weapons by wfcdCategory', () => {
      const item = { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton', productCategory: 'Primary' }
      expect(SeedingRules.detectCategory(item)).toBe('Primary')
    })

    it('normalizes Arch-Gun to ArchGun', () => {
      const item = { uniqueName: '/Lotus/Weapons/Archwing/Gun/Imperator', name: 'Imperator', category: 'Arch-Gun' }
      expect(SeedingRules.detectCategory(item)).toBe('ArchGun')
    })

    it('normalizes Arch-Melee to ArchMelee', () => {
      const item = { uniqueName: '/Lotus/Weapons/Archwing/Melee/Veritux', name: 'Veritux', category: 'Arch-Melee' }
      expect(SeedingRules.detectCategory(item)).toBe('ArchMelee')
    })

    it('excludes Bonewidow from Warframes category', () => {
      const item = { uniqueName: '/Lotus/Powersuits/EntratiMech/Bonewidow', name: 'Bonewidow', productCategory: 'Warframes' }
      // Should be Necramechs, not Warframes
      expect(SeedingRules.detectCategory(item)).toBe('Necramechs')
    })

    it('returns null for unknown category', () => {
      const item = { uniqueName: '/Lotus/Unknown/Something', name: 'Unknown', category: 'SomeUnknownCategory' }
      expect(SeedingRules.detectCategory(item)).toBe(null)
    })
  })

  describe('getMaxRank', () => {
    it('returns 40 for Kuva weapons (global override)', () => {
      const item = { uniqueName: '/Lotus/Weapons/Grineer/KuvaBraton', name: 'Kuva Braton' }
      expect(SeedingRules.getMaxRank(item, 'Primary')).toBe(40)
    })

    it('returns 40 for Tenet weapons (global override)', () => {
      const item = { uniqueName: '/Lotus/Weapons/Corpus/TenetEnvoy', name: 'Tenet Envoy' }
      expect(SeedingRules.getMaxRank(item, 'Secondary')).toBe(40)
    })

    it('returns 40 for Paracesis (global override)', () => {
      const item = { uniqueName: '/Lotus/Weapons/Tenno/Melee/Paracesis', name: 'Paracesis' }
      expect(SeedingRules.getMaxRank(item, 'Melee')).toBe(40)
    })

    it('returns 40 for Necramechs (category override)', () => {
      const item = { uniqueName: '/Lotus/Powersuits/EntratiMech/Voidrig', name: 'Voidrig' }
      expect(SeedingRules.getMaxRank(item, 'Necramechs')).toBe(40)
    })

    it('uses maxLevelCap from item data if available', () => {
      const item = { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton', maxLevelCap: 35 }
      expect(SeedingRules.getMaxRank(item, 'Primary')).toBe(35)
    })

    it('returns default 30 for normal items', () => {
      const item = { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton' }
      expect(SeedingRules.getMaxRank(item, 'Primary')).toBe(30)
    })

    it('prefers category override over global override', () => {
      // A hypothetical Kuva Necramech should use category override (40)
      const item = { uniqueName: '/Lotus/Powersuits/EntratiMech/Voidrig', name: 'Voidrig' }
      expect(SeedingRules.getMaxRank(item, 'Necramechs')).toBe(40)
    })
  })

  describe('shouldInclude', () => {
    it('returns true for items with masterable !== false', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', masterable: true }
      expect(SeedingRules.shouldInclude(item)).toBe(true)
    })

    it('returns true for items without masterable flag', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      expect(SeedingRules.shouldInclude(item)).toBe(true)
    })

    it('returns false for non-masterable items without special inclusion', () => {
      const item = { uniqueName: '/Lotus/Unknown/Something', name: 'Unknown', masterable: false }
      expect(SeedingRules.shouldInclude(item)).toBe(false)
    })

    it('returns true for Venari despite masterable: false', () => {
      const item = {
        uniqueName: '/Lotus/Powersuits/Khora/Kavat/KhoraKavatPowerSuit',
        name: 'Venari',
        masterable: false
      }
      expect(SeedingRules.shouldInclude(item)).toBe(true)
    })

    it('returns true for Venari Prime despite masterable: false', () => {
      const item = {
        uniqueName: '/Lotus/Powersuits/Khora/Kavat/KhoraPrimeKavatPowerSuit',
        name: 'Venari Prime',
        masterable: false
      }
      expect(SeedingRules.shouldInclude(item)).toBe(true)
    })
  })
})
