import { describe, it, expect } from 'vitest'
import {
  formatBuildTime,
  getImageUrl,
  getMasteryRankIconUrl,
  FocusSchool,
} from './api'

describe('formatBuildTime', () => {
  it('returns null for null input', () => {
    expect(formatBuildTime(null)).toBe(null)
  })

  it('returns null for 0 seconds', () => {
    expect(formatBuildTime(0)).toBe(null)
  })

  it('formats minutes only', () => {
    expect(formatBuildTime(60)).toBe('1m')
    expect(formatBuildTime(120)).toBe('2m')
    expect(formatBuildTime(1800)).toBe('30m')
  })

  it('formats hours and minutes', () => {
    expect(formatBuildTime(3600)).toBe('1h')
    expect(formatBuildTime(3660)).toBe('1h 1m')
    expect(formatBuildTime(7200)).toBe('2h')
    expect(formatBuildTime(9000)).toBe('2h 30m')
  })

  it('formats days and hours', () => {
    expect(formatBuildTime(86400)).toBe('1d')
    expect(formatBuildTime(90000)).toBe('1d 1h')
    expect(formatBuildTime(172800)).toBe('2d')
    expect(formatBuildTime(259200)).toBe('3d')
  })

  it('formats common Warframe build times', () => {
    // 12 hours
    expect(formatBuildTime(43200)).toBe('12h')
    // 24 hours
    expect(formatBuildTime(86400)).toBe('1d')
    // 72 hours (3 days)
    expect(formatBuildTime(259200)).toBe('3d')
  })

  it('handles edge cases', () => {
    // Just under 1 hour
    expect(formatBuildTime(3599)).toBe('59m')
    // Just under 1 day
    expect(formatBuildTime(86399)).toBe('23h 59m')
  })
})

describe('getImageUrl', () => {
  it('returns null for null imageName', () => {
    expect(getImageUrl(null)).toBe(null)
  })

  it('returns CDN URL for valid imageName', () => {
    expect(getImageUrl('frost-prime.png')).toBe('https://cdn.warframestat.us/img/frost-prime.png')
  })

  it('handles image names with paths', () => {
    expect(getImageUrl('warframes/frost.png')).toBe('https://cdn.warframestat.us/img/warframes/frost.png')
  })
})

describe('getMasteryRankIconUrl', () => {
  it('returns wiki URL for MR 0', () => {
    expect(getMasteryRankIconUrl(0)).toBe('https://wiki.warframe.com/images/IconRank0.png')
  })

  it('returns wiki URL for regular ranks', () => {
    expect(getMasteryRankIconUrl(10)).toBe('https://wiki.warframe.com/images/IconRank10.png')
    expect(getMasteryRankIconUrl(30)).toBe('https://wiki.warframe.com/images/IconRank30.png')
  })

  it('returns wiki URL for legendary ranks', () => {
    expect(getMasteryRankIconUrl(31)).toBe('https://wiki.warframe.com/images/IconRank31.png')
    expect(getMasteryRankIconUrl(40)).toBe('https://wiki.warframe.com/images/IconRank40.png')
  })
})

describe('FocusSchool', () => {
  it('has all five focus schools', () => {
    expect(FocusSchool.all()).toHaveLength(5)
    expect(FocusSchool.Madurai).toBeDefined()
    expect(FocusSchool.Vazarin).toBeDefined()
    expect(FocusSchool.Naramon).toBeDefined()
    expect(FocusSchool.Zenurik).toBeDefined()
    expect(FocusSchool.Unairu).toBeDefined()
  })

  it('each school has name, color, and imageName', () => {
    FocusSchool.all().forEach(school => {
      expect(school.name).toBeDefined()
      expect(school.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(school.imageName).toBeDefined()
      expect(school.imageName).toMatch(/\.png$/)
    })
  })

  it('has correct school names', () => {
    expect(FocusSchool.Madurai.name).toBe('Madurai')
    expect(FocusSchool.Vazarin.name).toBe('Vazarin')
    expect(FocusSchool.Naramon.name).toBe('Naramon')
    expect(FocusSchool.Zenurik.name).toBe('Zenurik')
    expect(FocusSchool.Unairu.name).toBe('Unairu')
  })

  it('fromName returns null for null-ish input', () => {
    expect(FocusSchool.fromName('')).toBe(null)
    expect(FocusSchool.fromName('Unknown')).toBe(null)
  })

  it('fromName returns school for valid name', () => {
    expect(FocusSchool.fromName('Madurai')).toBe(FocusSchool.Madurai)
    expect(FocusSchool.fromName('Vazarin')).toBe(FocusSchool.Vazarin)
    expect(FocusSchool.fromName('Naramon')).toBe(FocusSchool.Naramon)
    expect(FocusSchool.fromName('Zenurik')).toBe(FocusSchool.Zenurik)
    expect(FocusSchool.fromName('Unairu')).toBe(FocusSchool.Unairu)
  })

  it('fromCode maps DE codes to schools', () => {
    expect(FocusSchool.fromCode('AP_ATTACK')).toBe(FocusSchool.Madurai)
    expect(FocusSchool.fromCode('AP_DEFENSE')).toBe(FocusSchool.Vazarin)
    expect(FocusSchool.fromCode('AP_TACTIC')).toBe(FocusSchool.Naramon)
    expect(FocusSchool.fromCode('AP_POWER')).toBe(FocusSchool.Zenurik)
    expect(FocusSchool.fromCode('AP_WARD')).toBe(FocusSchool.Unairu)
  })

  it('fromCode returns null for unknown codes', () => {
    expect(FocusSchool.fromCode('UNKNOWN')).toBe(null)
    expect(FocusSchool.fromCode('')).toBe(null)
  })
})
