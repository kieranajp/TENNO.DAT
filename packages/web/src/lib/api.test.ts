import { describe, it, expect } from 'vitest'
import {
  formatBuildTime,
  getImageUrl,
  getMasteryRankIconUrl,
  getFocusSchoolInfo,
  FOCUS_SCHOOLS,
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

describe('FOCUS_SCHOOLS', () => {
  it('has all five focus schools', () => {
    expect(Object.keys(FOCUS_SCHOOLS)).toHaveLength(5)
    expect(FOCUS_SCHOOLS.Madurai).toBeDefined()
    expect(FOCUS_SCHOOLS.Vazarin).toBeDefined()
    expect(FOCUS_SCHOOLS.Naramon).toBeDefined()
    expect(FOCUS_SCHOOLS.Zenurik).toBeDefined()
    expect(FOCUS_SCHOOLS.Unairu).toBeDefined()
  })

  it('each school has name, color, and imageName', () => {
    Object.values(FOCUS_SCHOOLS).forEach(school => {
      expect(school.name).toBeDefined()
      expect(school.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(school.imageName).toBeDefined()
      expect(school.imageName).toMatch(/\.png$/)
    })
  })

  it('has correct school names', () => {
    expect(FOCUS_SCHOOLS.Madurai.name).toBe('Madurai')
    expect(FOCUS_SCHOOLS.Vazarin.name).toBe('Vazarin')
    expect(FOCUS_SCHOOLS.Naramon.name).toBe('Naramon')
    expect(FOCUS_SCHOOLS.Zenurik.name).toBe('Zenurik')
    expect(FOCUS_SCHOOLS.Unairu.name).toBe('Unairu')
  })
})

describe('getFocusSchoolInfo', () => {
  it('returns null for null input', () => {
    expect(getFocusSchoolInfo(null)).toBe(null)
  })

  it('returns null for unknown school', () => {
    expect(getFocusSchoolInfo('Unknown')).toBe(null)
    expect(getFocusSchoolInfo('')).toBe(null)
  })

  it('returns info for Madurai', () => {
    const info = getFocusSchoolInfo('Madurai')
    expect(info).not.toBe(null)
    expect(info?.name).toBe('Madurai')
    expect(info?.color).toBe('#ff6b35')
  })

  it('returns info for all valid schools', () => {
    expect(getFocusSchoolInfo('Madurai')).toEqual(FOCUS_SCHOOLS.Madurai)
    expect(getFocusSchoolInfo('Vazarin')).toEqual(FOCUS_SCHOOLS.Vazarin)
    expect(getFocusSchoolInfo('Naramon')).toEqual(FOCUS_SCHOOLS.Naramon)
    expect(getFocusSchoolInfo('Zenurik')).toEqual(FOCUS_SCHOOLS.Zenurik)
    expect(getFocusSchoolInfo('Unairu')).toEqual(FOCUS_SCHOOLS.Unairu)
  })
})
