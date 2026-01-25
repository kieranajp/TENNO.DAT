import { sql } from 'drizzle-orm'
import { db, schema } from './connection'

interface RawNode {
  value: string    // e.g., "Galatea (Neptune)"
  enemy?: string
  type?: string
}

// Junction XP is always 1000
const JUNCTION_XP = 1000

// Junctions (not in warframestat API, must be hardcoded)
// Format: Tag from DE API -> Display name
const JUNCTIONS: Array<{ key: string; name: string; planet: string }> = [
  { key: 'EarthToVenusJunction', name: 'Venus Junction', planet: 'Earth' },
  { key: 'VenusToMercuryJunction', name: 'Mercury Junction', planet: 'Venus' },
  { key: 'EarthToMarsJunction', name: 'Mars Junction', planet: 'Earth' },
  { key: 'MarsToPhobosJunction', name: 'Phobos Junction', planet: 'Mars' },
  { key: 'MarsToCeresJunction', name: 'Ceres Junction', planet: 'Mars' },
  { key: 'CeresToJupiterJunction', name: 'Jupiter Junction', planet: 'Ceres' },
  { key: 'JupiterToEuropaJunction', name: 'Europa Junction', planet: 'Jupiter' },
  { key: 'JupiterToSaturnJunction', name: 'Saturn Junction', planet: 'Jupiter' },
  { key: 'SaturnToUranusJunction', name: 'Uranus Junction', planet: 'Saturn' },
  { key: 'UranusToNeptuneJunction', name: 'Neptune Junction', planet: 'Uranus' },
  { key: 'NeptuneToPlutoJunction', name: 'Pluto Junction', planet: 'Neptune' },
  { key: 'PlutoToSednaJunction', name: 'Sedna Junction', planet: 'Pluto' },
  { key: 'PlutoToErisJunction', name: 'Eris Junction', planet: 'Pluto' },
]

// Regular node XP averages ~63 based on total ~14,000 XP / 227 nodes
const REGULAR_NODE_XP = 63

// Railjack nodes give more XP (varies, but typically higher)
const RAILJACK_NODE_XP = 100

/**
 * Parse planet from node value like "Galatea (Neptune)" -> "Neptune"
 * For junctions like "EarthToVenusJunction", extract from key
 */
function parsePlanet(value: string, nodeKey: string): string {
  // Handle junctions - extract planet from key (e.g., "EarthToVenusJunction" -> "Earth")
  if (nodeKey.includes('Junction')) {
    const match = nodeKey.match(/^(\w+)To/)
    return match ? match[1] : 'Unknown'
  }

  // Regular nodes have format "Name (Planet)"
  const match = value.match(/\(([^)]+)\)/)
  return match ? match[1] : 'Unknown'
}

/**
 * Determine node type from raw data
 */
function getNodeType(nodeKey: string, rawType?: string): 'mission' | 'junction' | 'railjack' {
  if (nodeKey.includes('Junction')) return 'junction'
  if (rawType?.includes('Empyrean') || rawType?.includes('Railjack') || rawType?.includes('Skirmish')) return 'railjack'
  return 'mission'
}

/**
 * Get mastery XP for a node
 */
function getMasteryXp(nodeType: 'mission' | 'junction' | 'railjack'): number {
  switch (nodeType) {
    case 'junction': return JUNCTION_XP
    case 'railjack': return RAILJACK_NODE_XP
    default: return REGULAR_NODE_XP
  }
}

/**
 * Check if node should be excluded (no mastery XP)
 */
function shouldExclude(nodeKey: string, rawType?: string, enemy?: string): boolean {
  // Exclude hub/relay nodes
  if (rawType === 'Hub' || rawType === 'Relay') return true
  // Exclude clan/dark sector nodes
  if (nodeKey.includes('Clan') || rawType?.includes('Dark Sector')) return true
  // Exclude event nodes
  if (nodeKey.includes('Event') || rawType?.includes('Event')) return true
  // Exclude PvP/Conclave
  if (rawType?.includes('PvP') || rawType?.includes('Conclave')) return true
  // Exclude crew battle nodes that aren't real missions
  if (rawType === 'Crew Battle') return true
  return false
}

async function seedNodes() {
  console.log('Fetching nodes from warframestat API...')

  const response = await fetch('https://api.warframestat.us/solNodes')
  if (!response.ok) {
    throw new Error(`Failed to fetch nodes: ${response.status}`)
  }

  const data = await response.json() as Record<string, RawNode>

  console.log(`Received ${Object.keys(data).length} total nodes`)

  const missionNodes = Object.entries(data)
    .filter(([key, node]) => !shouldExclude(key, node.type, node.enemy))
    .map(([key, node]) => {
      const nodeType = getNodeType(key, node.type)
      return {
        nodeKey: key,
        name: node.value.replace(/\s*\([^)]+\)\s*$/, '').trim(), // Remove planet suffix
        planet: parsePlanet(node.value, key),
        nodeType,
        masteryXp: getMasteryXp(nodeType),
      }
    })

  // Add hardcoded junctions (not in warframestat API)
  const junctionNodes = JUNCTIONS.map(j => ({
    nodeKey: j.key,
    name: j.name,
    planet: j.planet,
    nodeType: 'junction' as const,
    masteryXp: JUNCTION_XP,
  }))

  const nodesToInsert = [...missionNodes, ...junctionNodes]

  console.log(`Filtered to ${nodesToInsert.length} masterable nodes`)
  console.log(`  - Junctions: ${nodesToInsert.filter(n => n.nodeType === 'junction').length}`)
  console.log(`  - Railjack: ${nodesToInsert.filter(n => n.nodeType === 'railjack').length}`)
  console.log(`  - Missions: ${nodesToInsert.filter(n => n.nodeType === 'mission').length}`)

  const totalXp = nodesToInsert.reduce((sum, n) => sum + n.masteryXp, 0)
  console.log(`  - Total XP: ${totalXp.toLocaleString()}`)

  console.log('Inserting nodes into database...')

  const BATCH_SIZE = 100
  for (let i = 0; i < nodesToInsert.length; i += BATCH_SIZE) {
    const batch = nodesToInsert.slice(i, i + BATCH_SIZE)
    await db.insert(schema.nodes).values(batch).onConflictDoUpdate({
      target: schema.nodes.nodeKey,
      set: {
        name: sql`excluded.name`,
        planet: sql`excluded.planet`,
        nodeType: sql`excluded.node_type`,
        masteryXp: sql`excluded.mastery_xp`,
      },
    })
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, nodesToInsert.length)}/${nodesToInsert.length}`)
  }

  console.log('Node seed complete!')
  process.exit(0)
}

seedNodes().catch(console.error)
