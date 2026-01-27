import { describe, it, expect } from 'vitest'
import { SeedingRules } from './seeding-rules'
import { isFrameCategory } from './categories'

/**
 * Tests for seeding rules that populate the database.
 * Uses parameterized tests to reduce redundancy while maintaining coverage.
 */
describe('SeedingRules', () => {
  describe('matches', () => {
    it.each([
      ['exact uniqueName', { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }, '/Lotus/Powersuits/Frost/Frost', true],
      ['exact name', { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }, 'Frost', true],
      ['different string', { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }, 'Ember', false],
      ['RegExp on uniqueName', { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton' }, /\/Rifle\//, true],
      ['RegExp on name', { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Kuva Braton' }, /^Kuva /, true],
      ['RegExp no match', { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }, /Tenet/, false],
      ['function match', { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', isPrime: true }, (i: any) => i.isPrime === true, true],
      ['function no match', { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', isPrime: false }, (i: any) => i.isPrime === true, false],
    ])('%s', (_, item, matcher, expected) => {
      expect(SeedingRules.matches(item, matcher)).toBe(expected)
    })

    it('returns false for unknown matcher type', () => {
      const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }
      expect(SeedingRules.matches(item, 123 as any)).toBe(false)
    })
  })

  describe('matchesAny', () => {
    const item = { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }

    it('returns true if any rule matches', () => {
      const rules = [{ matcher: 'Ember' }, { matcher: 'Frost' }, { matcher: 'Volt' }]
      expect(SeedingRules.matchesAny(item, rules)).toBe(true)
    })

    it('returns false if no rules match', () => {
      const rules = [{ matcher: 'Ember' }, { matcher: 'Volt' }, { matcher: 'Mag' }]
      expect(SeedingRules.matchesAny(item, rules)).toBe(false)
    })

    it('returns false for empty rules array', () => {
      expect(SeedingRules.matchesAny(item, [])).toBe(false)
    })
  })

  describe('isGloballyExcluded', () => {
    it.each([
      ['PvP variants', { uniqueName: '/Lotus/Weapons/PvPVariant/Braton', name: 'Braton PvP' }, true],
      ['Kitgun grips', { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Grip/SUGripA', name: 'Grip' }, true],
      ['Amp braces', { uniqueName: '/Lotus/Weapons/OperatorAmplifiers/Set1/Brace/AmpBrace1', name: 'Brace' }, true],
      ['Kitgun barrels (not excluded)', { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelA', name: 'Catchmoon' }, false],
      ['Zaw tips (not excluded)', { uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Tip/ZawTip1', name: 'Balla' }, false],
      ['normal items (not excluded)', { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }, false],
    ])('%s', (_, item, expected) => {
      expect(SeedingRules.isGloballyExcluded(item)).toBe(expected)
    })
  })

  describe('detectCategory', () => {
    it.each([
      ['null for globally excluded', { uniqueName: '/Lotus/Weapons/PvPVariant/Braton', name: 'Braton PvP', category: 'Primary' }, null],
      ['Necramechs (custom detector)', { uniqueName: '/Lotus/Powersuits/EntratiMech/Voidrig', name: 'Voidrig', category: 'Warframes' }, 'Necramechs'],
      ['Kitgun barrels', { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelA', name: 'Catchmoon' }, 'Kitgun'],
      ['Zaw tips', { uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Tip/ZawTip1', name: 'Balla' }, 'Zaw'],
      ['Amp prisms', { uniqueName: '/Lotus/Weapons/OperatorAmplifiers/Set1/Barrel/AmpBarrel1', name: 'Raplak Prism' }, 'Amp'],
      ['Sirocco as Amp', { uniqueName: '/Lotus/Weapons/Operator/Pistols/DrifterPistol/DrifterPistolPlayerWeapon', name: 'Sirocco' }, 'Amp'],
      ['K-Drive decks as Vehicles', { uniqueName: '/Lotus/Vehicles/Hoverboard/HBDeckA/HBDeckA', name: 'Deck' }, 'Vehicles'],
      ['Warframes by wfcdCategory', { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', productCategory: 'Warframes' }, 'Warframes'],
      ['Primary by wfcdCategory', { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton', productCategory: 'Primary' }, 'Primary'],
      ['Arch-Gun normalized', { uniqueName: '/Lotus/Weapons/Archwing/Gun/Imperator', name: 'Imperator', category: 'Arch-Gun' }, 'ArchGun'],
      ['Arch-Melee normalized', { uniqueName: '/Lotus/Weapons/Archwing/Melee/Veritux', name: 'Veritux', category: 'Arch-Melee' }, 'ArchMelee'],
      ['Bonewidow as Necramech', { uniqueName: '/Lotus/Powersuits/EntratiMech/Bonewidow', name: 'Bonewidow', productCategory: 'Warframes' }, 'Necramechs'],
      ['null for unknown category', { uniqueName: '/Lotus/Unknown/Something', name: 'Unknown', category: 'SomeUnknownCategory' }, null],
    ])('%s', (_, item, expected) => {
      expect(SeedingRules.detectCategory(item)).toBe(expected)
    })
  })

  describe('getMaxRank', () => {
    it.each([
      ['40 for Kuva weapons', { uniqueName: '/Lotus/Weapons/Grineer/KuvaBraton', name: 'Kuva Braton' }, 'Primary', 40],
      ['40 for Tenet weapons', { uniqueName: '/Lotus/Weapons/Corpus/TenetEnvoy', name: 'Tenet Envoy' }, 'Secondary', 40],
      ['40 for Paracesis', { uniqueName: '/Lotus/Weapons/Tenno/Melee/Paracesis', name: 'Paracesis' }, 'Melee', 40],
      ['40 for Necramechs', { uniqueName: '/Lotus/Powersuits/EntratiMech/Voidrig', name: 'Voidrig' }, 'Necramechs', 40],
      ['maxLevelCap from item data', { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton', maxLevelCap: 35 }, 'Primary', 35],
      ['default 30 for normal items', { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton' }, 'Primary', 30],
    ])('%s', (_, item, category, expected) => {
      expect(SeedingRules.getMaxRank(item, category)).toBe(expected)
    })
  })

  describe('shouldInclude', () => {
    it.each([
      ['masterable: true', { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', masterable: true }, true],
      ['no masterable flag', { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost' }, true],
      ['masterable: false without inclusion', { uniqueName: '/Lotus/Unknown/Something', name: 'Unknown', masterable: false }, false],
      ['Venari despite masterable: false', { uniqueName: '/Lotus/Powersuits/Khora/Kavat/KhoraKavatPowerSuit', name: 'Venari', masterable: false }, true],
      ['Venari Prime despite masterable: false', { uniqueName: '/Lotus/Powersuits/Khora/Kavat/KhoraPrimeKavatPowerSuit', name: 'Venari Prime', masterable: false }, true],
    ])('%s', (_, item, expected) => {
      expect(SeedingRules.shouldInclude(item)).toBe(expected)
    })
  })

  /**
   * Integration tests for realistic item data from @wfcd/items.
   * Tests modular weapons, special cases, and edge cases.
   */
  describe('Modular Weapons Integration', () => {
    describe('Kitguns', () => {
      const kitgunChambers = [
        { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelC', name: 'Catchmoon', category: 'Misc' },
        { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelA', name: 'Tombfinger', category: 'Misc' },
        { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularPrimary/Barrel/SUPrimaryBarrelB', name: 'Vermisplicer', category: 'Misc' },
      ]

      const kitgunParts = [
        { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Grip/SUGripA', name: 'Haymaker', category: 'Misc' },
        { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Grip/SUGripB', name: 'Ramble', category: 'Misc' },
        { uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Handle/SUHandle', name: 'Splat', category: 'Misc' },
      ]

      it.each(kitgunChambers)('includes chamber: $name', (item) => {
        expect(SeedingRules.isGloballyExcluded(item)).toBe(false)
        expect(SeedingRules.detectCategory(item)).toBe('Kitgun')
      })

      it.each(kitgunParts)('excludes non-chamber part: $name', (item) => {
        expect(SeedingRules.isGloballyExcluded(item)).toBe(true)
      })

      it('assigns maxRank 30 to Kitguns', () => {
        expect(SeedingRules.getMaxRank(kitgunChambers[0], 'Kitgun')).toBe(30)
      })
    })

    describe('Zaws', () => {
      const zawStrikes = [
        { uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Tip/OstronTip1', name: 'Balla', category: 'Misc' },
        { uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Tip/OstronTip5', name: 'Dokrahm', category: 'Misc' },
        { uniqueName: '/Lotus/Weapons/Ostron/Melee/ModularMeleeInfested/Tips/InfestedTipTwo', name: 'Plague Keewar', category: 'Melee' },
        { uniqueName: '/Lotus/Weapons/Ostron/Melee/ModularMeleeInfested/Tips/InfestedTipOne', name: 'Plague Kripath', category: 'Melee' },
      ]

      const zawParts = [
        { uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Grip/OstronGrip1', name: 'Peye', category: 'Misc' },
        { uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Balance/OstronBalance1', name: 'Ekwana Jai Link', category: 'Misc' },
      ]

      it.each(zawStrikes)('includes strike: $name', (item) => {
        expect(SeedingRules.isGloballyExcluded(item)).toBe(false)
        expect(SeedingRules.detectCategory(item)).toBe('Zaw')
      })

      it.each(zawParts)('excludes non-strike part: $name', (item) => {
        expect(SeedingRules.isGloballyExcluded(item)).toBe(true)
      })
    })

    describe('Amps', () => {
      const ampPrisms = [
        { uniqueName: '/Lotus/Weapons/Sentients/OperatorAmplifiers/Set1/Barrel/SentAmpBarrel1', name: 'Raplak Prism', category: 'Misc' },
        { uniqueName: '/Lotus/Weapons/Sentients/OperatorAmplifiers/Set2/Barrel/SentAmpBarrel2A', name: 'Klamora Prism', category: 'Misc' },
        { uniqueName: '/Lotus/Weapons/Sentients/OperatorAmplifiers/SentTrainingAmplifier/SentAmpTrainingBarrel', name: 'Mote Prism', category: 'Misc', masterable: false },
        { uniqueName: '/Lotus/Weapons/Operator/Pistols/DrifterPistol/DrifterPistolPlayerWeapon', name: 'Sirocco', category: 'Misc' },
      ]

      const ampParts = [
        { uniqueName: '/Lotus/Weapons/Sentients/OperatorAmplifiers/Set1/Grip/SentAmpGrip1', name: 'Shraksun Scaffold', category: 'Misc' },
        { uniqueName: '/Lotus/Weapons/Sentients/OperatorAmplifiers/Set1/Brace/SentAmpBrace1', name: 'Lohrin Brace', category: 'Misc' },
      ]

      it.each(ampPrisms)('includes prism: $name', (item) => {
        expect(SeedingRules.isGloballyExcluded(item)).toBe(false)
        expect(SeedingRules.detectCategory(item)).toBe('Amp')
      })

      it.each(ampParts)('excludes non-prism part: $name', (item) => {
        expect(SeedingRules.isGloballyExcluded(item)).toBe(true)
      })
    })
  })

  describe('Necramechs', () => {
    const necramechs = [
      { uniqueName: '/Lotus/Powersuits/EntratiMech/ArchonMech/ArchonMechA', name: 'Voidrig', category: 'Warframes', productCategory: 'Warframes' },
      { uniqueName: '/Lotus/Powersuits/EntratiMech/ArchonMech/ArchonMechB', name: 'Bonewidow', category: 'Warframes', productCategory: 'Warframes' },
    ]

    it.each(necramechs)('detects $name as Necramech with maxRank 40', (item) => {
      expect(SeedingRules.detectCategory(item)).toBe('Necramechs')
      expect(SeedingRules.getMaxRank(item, 'Necramechs')).toBe(40)
    })

    it('detects regular Warframes correctly', () => {
      const excalibur = { uniqueName: '/Lotus/Powersuits/Excalibur/Excalibur', name: 'Excalibur', category: 'Warframes', productCategory: 'Warframes' }
      expect(SeedingRules.detectCategory(excalibur)).toBe('Warframes')
      expect(SeedingRules.getMaxRank(excalibur, 'Warframes')).toBe(30)
    })
  })

  describe('PvP Exclusions', () => {
    const pvpItems = [
      { uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Rifle/PvPVariants/BratonPvP', name: 'Braton (Conclave)', category: 'Primary', productCategory: 'Primary' },
      { uniqueName: '/Lotus/Weapons/Tenno/Pistols/PvPVariants/LexPvP', name: 'Lex (Conclave)', category: 'Secondary' },
      { uniqueName: '/Lotus/Weapons/Tenno/Melee/PvPVariants/SkanaPvP', name: 'Skana (Conclave)', category: 'Melee' },
    ]

    it.each(pvpItems)('excludes $name', (item) => {
      expect(SeedingRules.isGloballyExcluded(item)).toBe(true)
      expect(SeedingRules.detectCategory(item)).toBe(null)
    })

    it('includes regular Braton', () => {
      const braton = { uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Rifle/Braton', name: 'Braton', category: 'Primary', productCategory: 'Primary' }
      expect(SeedingRules.isGloballyExcluded(braton)).toBe(false)
      expect(SeedingRules.detectCategory(braton)).toBe('Primary')
    })
  })

  describe('Kuva & Tenet Weapons', () => {
    const lichWeapons = [
      { item: { uniqueName: '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/KuvaBraton', name: 'Kuva Braton', category: 'Primary' }, category: 'Primary' },
      { item: { uniqueName: '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/KuvaChakkhurr', name: 'Kuva Chakkhurr', category: 'Primary' }, category: 'Primary' },
      { item: { uniqueName: '/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEArmCannon', name: 'Tenet Envoy', category: 'Primary' }, category: 'Primary' },
      { item: { uniqueName: '/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBEPistol', name: 'Tenet Cycron', category: 'Secondary' }, category: 'Secondary' },
    ]

    it.each(lichWeapons)('assigns maxRank 40 to $item.name', ({ item, category }) => {
      expect(SeedingRules.getMaxRank(item, category)).toBe(40)
    })
  })

  describe('K-Drives', () => {
    it.each([
      { uniqueName: '/Lotus/Types/Vehicles/Hoverboard/HBDeckA/HBDeckA', name: 'Cold Wave', category: 'Misc' },
      { uniqueName: '/Lotus/Types/Vehicles/Hoverboard/HBDeckB/HBDeckB', name: 'Bad Baby', category: 'Misc' },
    ])('includes deck: $name as Vehicles', (item) => {
      expect(SeedingRules.detectCategory(item)).toBe('Vehicles')
    })

    it('does not categorize K-Drive parts as Vehicles', () => {
      const jetWiskers = { uniqueName: '/Lotus/Types/Vehicles/Hoverboard/Parts/HBReactorA', name: 'Jet Wiskers', category: 'Misc' }
      expect(SeedingRules.detectCategory(jetWiskers)).not.toBe('Vehicles')
    })
  })

  describe('Sentinel Weapons', () => {
    it.each([
      { uniqueName: '/Lotus/Weapons/Sentinels/SentinelGlaive', name: 'Deth Machine Rifle', productCategory: 'SentinelWeapons' },
      { uniqueName: '/Lotus/Weapons/Sentinels/SentinelShotgun', name: 'Sweeper', productCategory: 'SentinelWeapons' },
    ])('detects $name as SentinelWeapons', (item) => {
      expect(SeedingRules.detectCategory(item)).toBe('SentinelWeapons')
    })
  })

  describe('Venari Special Inclusion', () => {
    const venariItems = [
      { uniqueName: '/Lotus/Powersuits/Khora/Kavat/KhoraKavatPowerSuit', name: 'Venari', category: 'Pets', productCategory: 'Pets', masterable: false },
      { uniqueName: '/Lotus/Powersuits/Khora/Kavat/KhoraPrimeKavatPowerSuit', name: 'Venari Prime', category: 'Pets', productCategory: 'Pets', masterable: false },
    ]

    it.each(venariItems)('includes $name despite masterable: false', (item) => {
      expect(SeedingRules.shouldInclude(item)).toBe(true)
      expect(SeedingRules.detectCategory(item)).toBe('Pets')
      expect(SeedingRules.getMaxRank(item, 'Pets')).toBe(30)
    })

    it('includes regular kavats with masterable: true', () => {
      const smeeta = { uniqueName: '/Lotus/Types/Friendly/Pets/CatbrowPet/CatbrowPetPowerSuit', name: 'Smeeta Kavat', category: 'Pets', productCategory: 'Pets', masterable: true }
      expect(SeedingRules.shouldInclude(smeeta)).toBe(true)
    })
  })

  describe('Railjack Plexus Documentation', () => {
    // The Plexus must be manually added because @wfcd/items doesn't include it
    const plexus = { uniqueName: '/Lotus/Types/Game/CrewShip/RailJack/DefaultHarness', name: 'Plexus', category: 'Vehicles', maxRank: 30 }

    it('documents correct uniqueName, category, and maxRank for Plexus', () => {
      expect(plexus.uniqueName).toBe('/Lotus/Types/Game/CrewShip/RailJack/DefaultHarness')
      expect(plexus.category).toBe('Vehicles')
      expect(plexus.maxRank).toBe(30)
    })

    it('Vehicles category is frame-type (200 MR per rank)', () => {
      expect(isFrameCategory('Vehicles')).toBe(true)
    })
  })
})
