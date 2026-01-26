/**
 * Star chart planet/region ordering.
 * Used for consistent display across the application.
 */

/** Standard star chart planets in progression order */
export const PLANETS = [
  'Earth',
  'Venus',
  'Mercury',
  'Mars',
  'Phobos',
  'Void',
  'Ceres',
  'Jupiter',
  'Europa',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Sedna',
  'Eris',
  'Kuva Fortress',
  'Lua',
  'Deimos',
  'Zariman',
  'Duviri',
  'Höllvania',
] as const

/** Railjack proxima regions */
export const PROXIMA_REGIONS = [
  'Earth Proxima',
  'Venus Proxima',
  'Saturn Proxima',
  'Neptune Proxima',
  'Pluto Proxima',
  'Veil Proxima',
] as const

/** Complete planet order including Railjack regions */
export const PLANET_ORDER = [...PLANETS, ...PROXIMA_REGIONS] as const

export type Planet = (typeof PLANETS)[number]
export type ProximaRegion = (typeof PROXIMA_REGIONS)[number]
export type StarChartLocation = (typeof PLANET_ORDER)[number]
