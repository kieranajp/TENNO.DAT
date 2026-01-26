/**
 * Focus school configuration - single source of truth.
 * Used by API for code-to-name conversion and web for UI display.
 */

/**
 * DE's internal codes for focus schools (from profile API response).
 */
export const FOCUS_SCHOOL_CODES = {
  AP_ATTACK: 'Madurai',
  AP_DEFENSE: 'Vazarin',
  AP_TACTIC: 'Naramon',
  AP_POWER: 'Zenurik',
  AP_WARD: 'Unairu',
} as const

export type FocusSchoolCode = keyof typeof FOCUS_SCHOOL_CODES
export type FocusSchoolName = (typeof FOCUS_SCHOOL_CODES)[FocusSchoolCode]

/**
 * Focus school UI metadata (colors, lens images).
 */
export const FOCUS_SCHOOLS: Record<
  FocusSchoolName,
  { name: FocusSchoolName; color: string; imageName: string }
> = {
  Madurai: { name: 'Madurai', color: '#ff6b35', imageName: 'madurai-lens-e675bac31e.png' },
  Vazarin: { name: 'Vazarin', color: '#4ecdc4', imageName: 'vazarin-lens-ae790776d3.png' },
  Naramon: { name: 'Naramon', color: '#f7dc6f', imageName: 'naramon-lens-7be3563b7d.png' },
  Zenurik: { name: 'Zenurik', color: '#5dade2', imageName: 'zenurik-lens-0f0eb9c38b.png' },
  Unairu: { name: 'Unairu', color: '#a569bd', imageName: 'unairu-lens-f251e69759.png' },
} as const

/**
 * Convert DE's internal focus school code to friendly name.
 * Used when parsing profile API responses.
 */
export function getFocusSchoolFromCode(code: string): FocusSchoolName | null {
  return FOCUS_SCHOOL_CODES[code as FocusSchoolCode] ?? null
}

/**
 * Get focus school UI info (color, image) from friendly name.
 * Used for displaying focus school in the UI.
 */
export function getFocusSchoolInfo(
  name: string | null
): (typeof FOCUS_SCHOOLS)[FocusSchoolName] | null {
  if (!name) return null
  return FOCUS_SCHOOLS[name as FocusSchoolName] ?? null
}
