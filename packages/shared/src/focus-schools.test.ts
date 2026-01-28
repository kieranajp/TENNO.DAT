import { describe, it, expect } from 'vitest'
import { FocusSchool } from './focus-schools'

describe('FocusSchool', () => {
  describe('static instances', () => {
    it('has all five focus schools', () => {
      expect(FocusSchool.all()).toHaveLength(5)
    })

    it('defines Madurai with correct properties', () => {
      expect(FocusSchool.Madurai.name).toBe('Madurai')
      expect(FocusSchool.Madurai.code).toBe('AP_ATTACK')
      expect(FocusSchool.Madurai.color).toBe('#ff6b35')
      expect(FocusSchool.Madurai.imageName).toBe('madurai-lens-e675bac31e.png')
    })

    it('defines Vazarin with correct properties', () => {
      expect(FocusSchool.Vazarin.name).toBe('Vazarin')
      expect(FocusSchool.Vazarin.code).toBe('AP_DEFENSE')
      expect(FocusSchool.Vazarin.color).toBe('#4ecdc4')
    })

    it('defines Naramon with correct properties', () => {
      expect(FocusSchool.Naramon.name).toBe('Naramon')
      expect(FocusSchool.Naramon.code).toBe('AP_TACTIC')
      expect(FocusSchool.Naramon.color).toBe('#f7dc6f')
    })

    it('defines Zenurik with correct properties', () => {
      expect(FocusSchool.Zenurik.name).toBe('Zenurik')
      expect(FocusSchool.Zenurik.code).toBe('AP_POWER')
      expect(FocusSchool.Zenurik.color).toBe('#5dade2')
    })

    it('defines Unairu with correct properties', () => {
      expect(FocusSchool.Unairu.name).toBe('Unairu')
      expect(FocusSchool.Unairu.code).toBe('AP_WARD')
      expect(FocusSchool.Unairu.color).toBe('#a569bd')
    })
  })

  describe('fromCode', () => {
    const codeTests = [
      { code: 'AP_ATTACK', expected: FocusSchool.Madurai },
      { code: 'AP_DEFENSE', expected: FocusSchool.Vazarin },
      { code: 'AP_TACTIC', expected: FocusSchool.Naramon },
      { code: 'AP_POWER', expected: FocusSchool.Zenurik },
      { code: 'AP_WARD', expected: FocusSchool.Unairu },
    ]

    it.each(codeTests)('maps $code to $expected.name', ({ code, expected }) => {
      expect(FocusSchool.fromCode(code)).toBe(expected)
    })

    it('returns null for unknown code', () => {
      expect(FocusSchool.fromCode('UNKNOWN')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(FocusSchool.fromCode('')).toBeNull()
    })

    it('is case-sensitive', () => {
      expect(FocusSchool.fromCode('ap_attack')).toBeNull()
      expect(FocusSchool.fromCode('Ap_Attack')).toBeNull()
    })
  })

  describe('fromName', () => {
    const nameTests = [
      { name: 'Madurai', expected: FocusSchool.Madurai },
      { name: 'Vazarin', expected: FocusSchool.Vazarin },
      { name: 'Naramon', expected: FocusSchool.Naramon },
      { name: 'Zenurik', expected: FocusSchool.Zenurik },
      { name: 'Unairu', expected: FocusSchool.Unairu },
    ]

    it.each(nameTests)('maps $name to correct school', ({ name, expected }) => {
      expect(FocusSchool.fromName(name)).toBe(expected)
    })

    it('returns null for unknown name', () => {
      expect(FocusSchool.fromName('Unknown')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(FocusSchool.fromName('')).toBeNull()
    })

    it('is case-sensitive', () => {
      expect(FocusSchool.fromName('madurai')).toBeNull()
      expect(FocusSchool.fromName('MADURAI')).toBeNull()
    })
  })

  describe('all', () => {
    it('returns all schools in consistent order', () => {
      const schools = FocusSchool.all()
      expect(schools[0]).toBe(FocusSchool.Madurai)
      expect(schools[1]).toBe(FocusSchool.Vazarin)
      expect(schools[2]).toBe(FocusSchool.Naramon)
      expect(schools[3]).toBe(FocusSchool.Zenurik)
      expect(schools[4]).toBe(FocusSchool.Unairu)
    })

    it('returns same instances on multiple calls', () => {
      const first = FocusSchool.all()
      const second = FocusSchool.all()
      expect(first).toEqual(second)
      first.forEach((school, i) => {
        expect(school).toBe(second[i])
      })
    })
  })

  describe('toJSON', () => {
    it('serializes to object with name, color, and imageName', () => {
      const json = FocusSchool.Madurai.toJSON()
      expect(json).toEqual({
        name: 'Madurai',
        color: '#ff6b35',
        imageName: 'madurai-lens-e675bac31e.png',
      })
    })

    it('excludes code from serialization', () => {
      const json = FocusSchool.Zenurik.toJSON()
      expect(json).not.toHaveProperty('code')
    })

    it.each(FocusSchool.all())('serializes %s correctly', (school) => {
      const json = school.toJSON()
      expect(json).toHaveProperty('name', school.name)
      expect(json).toHaveProperty('color', school.color)
      expect(json).toHaveProperty('imageName', school.imageName)
    })
  })

  describe('identity', () => {
    it('fromCode and fromName return same instance', () => {
      expect(FocusSchool.fromCode('AP_ATTACK')).toBe(FocusSchool.fromName('Madurai'))
      expect(FocusSchool.fromCode('AP_POWER')).toBe(FocusSchool.fromName('Zenurik'))
    })
  })
})
