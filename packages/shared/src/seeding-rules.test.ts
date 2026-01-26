import { describe, it, expect } from 'vitest'
import { SeedingRules } from './seeding-rules'
import { isFrameCategory } from './categories'

/**
 * These tests cover the core seeding logic used to populate the database.
 * Special attention is paid to:
 * - Modular weapons (Kitguns, Zaws, Amps) - only primary parts should be included
 * - Necramechs - should be in separate category with maxRank 40
 * - PvP variants - should be globally excluded
 * - Kuva/Tenet weapons - should have maxRank 40
 */

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

  /**
   * Integration tests for seeder scenarios
   * These test realistic item data as would come from @wfcd/items
   */
  describe('Seeder Integration: Kitguns', () => {
    // Kitgun chambers (barrels) - SHOULD be included
    const catchmoon = {
      uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelC',
      name: 'Catchmoon',
      category: 'Misc',
      productCategory: 'Misc',
      masterable: true,
    }

    const tombfinger = {
      uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelA',
      name: 'Tombfinger',
      category: 'Misc',
      productCategory: 'Misc',
    }

    const vermisplicer = {
      uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularPrimary/Barrel/SUPrimaryBarrelB',
      name: 'Vermisplicer',
      category: 'Misc',
      productCategory: 'Misc',
    }

    // Kitgun grips - SHOULD be excluded
    const haymaker = {
      uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Grip/SUGripA',
      name: 'Haymaker',
      category: 'Misc',
      productCategory: 'Misc',
    }

    const loaderGrip = {
      uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Grip/SUGripB',
      name: 'Ramble',
      category: 'Misc',
    }

    // Kitgun loaders - SHOULD be excluded
    const splat = {
      uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Handle/SUHandle',
      name: 'Splat',
      category: 'Misc',
    }

    it('includes Kitgun chambers (Catchmoon)', () => {
      expect(SeedingRules.isGloballyExcluded(catchmoon)).toBe(false)
      expect(SeedingRules.detectCategory(catchmoon)).toBe('Kitgun')
      expect(SeedingRules.shouldInclude(catchmoon)).toBe(true)
    })

    it('includes Kitgun chambers (Tombfinger)', () => {
      expect(SeedingRules.detectCategory(tombfinger)).toBe('Kitgun')
    })

    it('includes Primary Kitgun chambers (Vermisplicer)', () => {
      expect(SeedingRules.detectCategory(vermisplicer)).toBe('Kitgun')
    })

    it('excludes Kitgun grips (Haymaker)', () => {
      expect(SeedingRules.isGloballyExcluded(haymaker)).toBe(true)
      expect(SeedingRules.detectCategory(haymaker)).toBe(null)
    })

    it('excludes Kitgun grips (Ramble)', () => {
      expect(SeedingRules.isGloballyExcluded(loaderGrip)).toBe(true)
    })

    it('excludes Kitgun loaders (Splat)', () => {
      // Loaders don't match /Barrel/ or /Tip/ patterns
      expect(SeedingRules.isGloballyExcluded(splat)).toBe(true)
    })

    it('assigns maxRank 30 to Kitguns', () => {
      expect(SeedingRules.getMaxRank(catchmoon, 'Kitgun')).toBe(30)
    })
  })

  describe('Seeder Integration: Zaws', () => {
    // Zaw strikes (tips) - SHOULD be included
    const balla = {
      uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Tip/OstronTip1',
      name: 'Balla',
      category: 'Misc',
    }

    const dokrahm = {
      uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Tip/OstronTip5',
      name: 'Dokrahm',
      category: 'Misc',
    }

    // Plague Zaws use /Tips/ (plural) instead of /Tip/
    const plagueKeewar = {
      uniqueName: '/Lotus/Weapons/Ostron/Melee/ModularMeleeInfested/Tips/InfestedTipTwo',
      name: 'Plague Keewar',
      category: 'Melee',
    }

    const plagueKripath = {
      uniqueName: '/Lotus/Weapons/Ostron/Melee/ModularMeleeInfested/Tips/InfestedTipOne',
      name: 'Plague Kripath',
      category: 'Melee',
    }

    // Zaw grips - SHOULD be excluded
    const peye = {
      uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Grip/OstronGrip1',
      name: 'Peye',
      category: 'Misc',
    }

    // Zaw links - SHOULD be excluded
    const ekwanaJaiLink = {
      uniqueName: '/Lotus/Weapons/Ostron/ModularMelee/Balance/OstronBalance1',
      name: 'Ekwana Jai Link',
      category: 'Misc',
    }

    it('includes Zaw strikes (Balla)', () => {
      expect(SeedingRules.isGloballyExcluded(balla)).toBe(false)
      expect(SeedingRules.detectCategory(balla)).toBe('Zaw')
    })

    it('includes Zaw strikes (Dokrahm)', () => {
      expect(SeedingRules.detectCategory(dokrahm)).toBe('Zaw')
    })

    it('includes Plague Zaws with /Tips/ path (Plague Keewar)', () => {
      // Plague Zaws use /Tips/ (plural) instead of /Tip/ (singular)
      // This tests the regex /\/Tips?\// in both detector and global exclusions
      expect(SeedingRules.isGloballyExcluded(plagueKeewar)).toBe(false)
      expect(SeedingRules.detectCategory(plagueKeewar)).toBe('Zaw')
    })

    it('includes Plague Zaws with /Tips/ path (Plague Kripath)', () => {
      expect(SeedingRules.isGloballyExcluded(plagueKripath)).toBe(false)
      expect(SeedingRules.detectCategory(plagueKripath)).toBe('Zaw')
    })

    it('excludes Zaw grips (Peye)', () => {
      expect(SeedingRules.isGloballyExcluded(peye)).toBe(true)
    })

    it('excludes Zaw links', () => {
      expect(SeedingRules.isGloballyExcluded(ekwanaJaiLink)).toBe(true)
    })
  })

  describe('Seeder Integration: Amps', () => {
    // Amp prisms (barrels) - SHOULD be included
    const raplakPrism = {
      uniqueName: '/Lotus/Weapons/Sentients/OperatorAmplifiers/Set1/Barrel/SentAmpBarrel1',
      name: 'Raplak Prism',
      category: 'Misc',
    }

    const klamora = {
      uniqueName: '/Lotus/Weapons/Sentients/OperatorAmplifiers/Set2/Barrel/SentAmpBarrel2A',
      name: 'Klamora Prism',
      category: 'Misc',
    }

    // Mote Prism (starter amp) - SHOULD be included
    // Special case: uniqueName ends with "Barrel" instead of having "/Barrel/" in path
    const motePrism = {
      uniqueName: '/Lotus/Weapons/Sentients/OperatorAmplifiers/SentTrainingAmplifier/SentAmpTrainingBarrel',
      name: 'Mote Prism',
      category: 'Misc',
      masterable: false,
    }

    // Sirocco (special Drifter amp) - SHOULD be included
    const sirocco = {
      uniqueName: '/Lotus/Weapons/Operator/Pistols/DrifterPistol/DrifterPistolPlayerWeapon',
      name: 'Sirocco',
      category: 'Misc',
    }

    // Amp scaffolds - SHOULD be excluded
    const shraksunScaffold = {
      uniqueName: '/Lotus/Weapons/Sentients/OperatorAmplifiers/Set1/Grip/SentAmpGrip1',
      name: 'Shraksun Scaffold',
      category: 'Misc',
    }

    // Amp braces - SHOULD be excluded
    const lohrinBrace = {
      uniqueName: '/Lotus/Weapons/Sentients/OperatorAmplifiers/Set1/Brace/SentAmpBrace1',
      name: 'Lohrin Brace',
      category: 'Misc',
    }

    it('includes Amp prisms (Raplak)', () => {
      expect(SeedingRules.isGloballyExcluded(raplakPrism)).toBe(false)
      expect(SeedingRules.detectCategory(raplakPrism)).toBe('Amp')
    })

    it('includes Amp prisms (Klamora)', () => {
      expect(SeedingRules.detectCategory(klamora)).toBe('Amp')
    })

    it('includes Mote Prism (starter amp with special uniqueName pattern)', () => {
      // Mote Prism uniqueName ends with "Barrel" instead of having "/Barrel/"
      // This tests the regex /\/Barrel\/|Barrel$/ in global exclusions
      expect(SeedingRules.isGloballyExcluded(motePrism)).toBe(false)
      expect(SeedingRules.detectCategory(motePrism)).toBe('Amp')
    })

    it('includes Sirocco (Drifter amp)', () => {
      expect(SeedingRules.detectCategory(sirocco)).toBe('Amp')
    })

    it('excludes Amp scaffolds', () => {
      expect(SeedingRules.isGloballyExcluded(shraksunScaffold)).toBe(true)
    })

    it('excludes Amp braces', () => {
      expect(SeedingRules.isGloballyExcluded(lohrinBrace)).toBe(true)
    })
  })

  describe('Seeder Integration: Necramechs', () => {
    const voidrig = {
      uniqueName: '/Lotus/Powersuits/EntratiMech/ArchonMech/ArchonMechA',
      name: 'Voidrig',
      category: 'Warframes',
      productCategory: 'Warframes',
    }

    const bonewidow = {
      uniqueName: '/Lotus/Powersuits/EntratiMech/ArchonMech/ArchonMechB',
      name: 'Bonewidow',
      category: 'Warframes',
      productCategory: 'Warframes',
    }

    // Regular warframe for comparison
    const excalibur = {
      uniqueName: '/Lotus/Powersuits/Excalibur/Excalibur',
      name: 'Excalibur',
      category: 'Warframes',
      productCategory: 'Warframes',
    }

    it('detects Voidrig as Necramech, not Warframe', () => {
      expect(SeedingRules.detectCategory(voidrig)).toBe('Necramechs')
    })

    it('detects Bonewidow as Necramech, not Warframe', () => {
      expect(SeedingRules.detectCategory(bonewidow)).toBe('Necramechs')
    })

    it('assigns maxRank 40 to Voidrig', () => {
      expect(SeedingRules.getMaxRank(voidrig, 'Necramechs')).toBe(40)
    })

    it('assigns maxRank 40 to Bonewidow', () => {
      expect(SeedingRules.getMaxRank(bonewidow, 'Necramechs')).toBe(40)
    })

    it('detects regular Warframes correctly', () => {
      expect(SeedingRules.detectCategory(excalibur)).toBe('Warframes')
    })

    it('assigns maxRank 30 to regular Warframes', () => {
      expect(SeedingRules.getMaxRank(excalibur, 'Warframes')).toBe(30)
    })
  })

  describe('Seeder Integration: PvP Variants', () => {
    const bratonPvP = {
      uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Rifle/PvPVariants/BratonPvP',
      name: 'Braton (Conclave)',
      category: 'Primary',
      productCategory: 'Primary',
    }

    const lexPvP = {
      uniqueName: '/Lotus/Weapons/Tenno/Pistols/PvPVariants/LexPvP',
      name: 'Lex (Conclave)',
      category: 'Secondary',
    }

    const skanaPvP = {
      uniqueName: '/Lotus/Weapons/Tenno/Melee/PvPVariants/SkanaPvP',
      name: 'Skana (Conclave)',
      category: 'Melee',
    }

    // Regular weapon for comparison
    const braton = {
      uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Rifle/Braton',
      name: 'Braton',
      category: 'Primary',
      productCategory: 'Primary',
    }

    it('excludes Braton PvP variant', () => {
      expect(SeedingRules.isGloballyExcluded(bratonPvP)).toBe(true)
      expect(SeedingRules.detectCategory(bratonPvP)).toBe(null)
    })

    it('excludes Lex PvP variant', () => {
      expect(SeedingRules.isGloballyExcluded(lexPvP)).toBe(true)
    })

    it('excludes Skana PvP variant', () => {
      expect(SeedingRules.isGloballyExcluded(skanaPvP)).toBe(true)
    })

    it('includes regular Braton', () => {
      expect(SeedingRules.isGloballyExcluded(braton)).toBe(false)
      expect(SeedingRules.detectCategory(braton)).toBe('Primary')
    })
  })

  describe('Seeder Integration: Kuva & Tenet Weapons', () => {
    const kuvaBraton = {
      uniqueName: '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/KuvaBraton',
      name: 'Kuva Braton',
      category: 'Primary',
      productCategory: 'Primary',
    }

    const kuvaChakkhurr = {
      uniqueName: '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/KuvaChakkhurr',
      name: 'Kuva Chakkhurr',
      category: 'Primary',
    }

    const tenetEnvoy = {
      uniqueName: '/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEArmCannon',
      name: 'Tenet Envoy',
      category: 'Primary',
    }

    const tenetCycron = {
      uniqueName: '/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBEPistol',
      name: 'Tenet Cycron',
      category: 'Secondary',
    }

    it('assigns maxRank 40 to Kuva Braton', () => {
      expect(SeedingRules.getMaxRank(kuvaBraton, 'Primary')).toBe(40)
    })

    it('assigns maxRank 40 to Kuva Chakkhurr', () => {
      expect(SeedingRules.getMaxRank(kuvaChakkhurr, 'Primary')).toBe(40)
    })

    it('assigns maxRank 40 to Tenet Envoy', () => {
      expect(SeedingRules.getMaxRank(tenetEnvoy, 'Primary')).toBe(40)
    })

    it('assigns maxRank 40 to Tenet Cycron', () => {
      expect(SeedingRules.getMaxRank(tenetCycron, 'Secondary')).toBe(40)
    })
  })

  describe('Seeder Integration: K-Drives', () => {
    // K-Drive decks - SHOULD be included
    const coldWaveDeck = {
      uniqueName: '/Lotus/Types/Vehicles/Hoverboard/HBDeckA/HBDeckA',
      name: 'Cold Wave',
      category: 'Misc',
    }

    const badBabyDeck = {
      uniqueName: '/Lotus/Types/Vehicles/Hoverboard/HBDeckB/HBDeckB',
      name: 'Bad Baby',
      category: 'Misc',
    }

    // K-Drive parts (not decks) - SHOULD be excluded
    const jetWiskers = {
      uniqueName: '/Lotus/Types/Vehicles/Hoverboard/Parts/HBReactorA',
      name: 'Jet Wiskers',
      category: 'Misc',
    }

    it('includes K-Drive decks (Cold Wave)', () => {
      expect(SeedingRules.detectCategory(coldWaveDeck)).toBe('Vehicles')
    })

    it('includes K-Drive decks (Bad Baby)', () => {
      expect(SeedingRules.detectCategory(badBabyDeck)).toBe('Vehicles')
    })

    it('does not categorize K-Drive parts as Vehicles', () => {
      // Parts that aren't decks shouldn't match the Vehicles category
      expect(SeedingRules.detectCategory(jetWiskers)).not.toBe('Vehicles')
    })
  })

  describe('Seeder Integration: Sentinel Weapons', () => {
    const deth = {
      uniqueName: '/Lotus/Weapons/Sentinels/SentinelGlaive',
      name: 'Deth Machine Rifle',
      productCategory: 'SentinelWeapons',
    }

    const sweeper = {
      uniqueName: '/Lotus/Weapons/Sentinels/SentinelShotgun',
      name: 'Sweeper',
      productCategory: 'SentinelWeapons',
    }

    it('detects Deth Machine Rifle as SentinelWeapons', () => {
      expect(SeedingRules.detectCategory(deth)).toBe('SentinelWeapons')
    })

    it('detects Sweeper as SentinelWeapons', () => {
      expect(SeedingRules.detectCategory(sweeper)).toBe('SentinelWeapons')
    })
  })

  /**
   * Venari and Venari Prime are Khora's companion kavats.
   * They are marked as masterable: false in @wfcd/items, but they DO give mastery.
   * The seeding rules have explicit inclusions to ensure they are seeded.
   */
  describe('Seeder Integration: Venari (Special Inclusion)', () => {
    // Venari is marked masterable: false in @wfcd/items, but it IS masterable in-game
    const venari = {
      uniqueName: '/Lotus/Powersuits/Khora/Kavat/KhoraKavatPowerSuit',
      name: 'Venari',
      category: 'Pets',
      productCategory: 'Pets',
      masterable: false, // @wfcd/items marks this incorrectly
    }

    const venariPrime = {
      uniqueName: '/Lotus/Powersuits/Khora/Kavat/KhoraPrimeKavatPowerSuit',
      name: 'Venari Prime',
      category: 'Pets',
      productCategory: 'Pets',
      masterable: false, // @wfcd/items marks this incorrectly
    }

    // Regular kavat for comparison
    const smeeta = {
      uniqueName: '/Lotus/Types/Friendly/Pets/CatbrowPet/CatbrowPetPowerSuit',
      name: 'Smeeta Kavat',
      category: 'Pets',
      productCategory: 'Pets',
      masterable: true,
    }

    it('includes Venari despite masterable: false', () => {
      expect(SeedingRules.shouldInclude(venari)).toBe(true)
    })

    it('includes Venari Prime despite masterable: false', () => {
      expect(SeedingRules.shouldInclude(venariPrime)).toBe(true)
    })

    it('detects Venari as Pets category', () => {
      expect(SeedingRules.detectCategory(venari)).toBe('Pets')
    })

    it('detects Venari Prime as Pets category', () => {
      expect(SeedingRules.detectCategory(venariPrime)).toBe('Pets')
    })

    it('assigns maxRank 30 to Venari (frame-type)', () => {
      expect(SeedingRules.getMaxRank(venari, 'Pets')).toBe(30)
    })

    it('assigns maxRank 30 to Venari Prime (frame-type)', () => {
      expect(SeedingRules.getMaxRank(venariPrime, 'Pets')).toBe(30)
    })

    it('includes regular kavats with masterable: true', () => {
      expect(SeedingRules.shouldInclude(smeeta)).toBe(true)
    })
  })

  /**
   * The Railjack Plexus is the mod configuration system for Railjack.
   * It was introduced in Update 29.10.0 and gives 6000 mastery XP (200 per rank × 30).
   *
   * NOTE: The Plexus is NOT in the @wfcd/items library, so it must be
   * added manually in the seeder (seed.ts). These tests document the expected
   * uniqueName and category for when it's manually inserted.
   */
  describe('Seeder Integration: Railjack Plexus (Manual Addition)', () => {
    // The Plexus must be manually added because @wfcd/items doesn't include it
    const plexus = {
      uniqueName: '/Lotus/Types/Game/CrewShip/RailJack/DefaultHarness',
      name: 'Plexus',
      category: 'Vehicles',
      maxRank: 30,
    }

    it('documents the correct uniqueName for Plexus', () => {
      // This uniqueName is used in DE's profile API for XP tracking
      expect(plexus.uniqueName).toBe('/Lotus/Types/Game/CrewShip/RailJack/DefaultHarness')
    })

    it('documents that Plexus should be in Vehicles category', () => {
      // Grouped with K-Drives and other vehicles
      expect(plexus.category).toBe('Vehicles')
    })

    it('documents that Plexus has maxRank 30', () => {
      // Standard 30 ranks like other equipment
      expect(plexus.maxRank).toBe(30)
    })

    it('Vehicles category is frame-type (200 MR per rank)', () => {
      // Plexus gives 6000 MR (30 ranks × 200 per rank)
      expect(isFrameCategory('Vehicles')).toBe(true)
    })
  })
})
