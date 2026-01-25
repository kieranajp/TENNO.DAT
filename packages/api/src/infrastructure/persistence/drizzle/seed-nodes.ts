import { sql } from 'drizzle-orm'
import { db, schema } from './connection'

// FrameHub node structure
interface FrameHubNode {
  name: string
  type: number
  faction: number
  lvl: [number, number]
  xp?: number
}

// Warframestat node structure (for Railjack)
interface WarframestatNode {
  value: string
  enemy?: string
  type?: string
}

// Junction XP is always 1000
const JUNCTION_XP = 1000

// Default XP for nodes without explicit XP (FrameHub uses ~24 for most)
const DEFAULT_NODE_XP = 24

// Railjack nodes give 69 XP each (based on FrameHub data pattern)
const RAILJACK_NODE_XP = 69

// Junctions (not in any API, must be hardcoded)
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
  { key: 'ErisToSednaJunction', name: 'Sedna Junction', planet: 'Eris' },
  { key: 'PlutoToErisJunction', name: 'Eris Junction', planet: 'Pluto' },
]

// Railjack proxima regions for grouping
const RAILJACK_REGIONS: Record<string, string> = {
  'Earth': 'Earth Proxima',
  'Venus': 'Venus Proxima',
  'Saturn': 'Saturn Proxima',
  'Neptune': 'Neptune Proxima',
  'Pluto': 'Pluto Proxima',
  'Veil': 'Veil Proxima',
}

/**
 * Parse Railjack planet from value like "Mordo Cluster (Saturn)" -> "Saturn Proxima"
 */
function parseRailjackPlanet(value: string): string {
  const match = value.match(/\(([^)]+)\)/)
  const planet = match ? match[1] : 'Unknown'
  return RAILJACK_REGIONS[planet] || `${planet} Proxima`
}

async function seedNodes() {
  console.log('Fetching nodes from FrameHub...')

  // Fetch curated node data from FrameHub
  const frameHubResponse = await fetch('https://raw.githubusercontent.com/Paroxity/FrameHub/main/src/resources/nodes.json')
  if (!frameHubResponse.ok) {
    throw new Error(`Failed to fetch FrameHub nodes: ${frameHubResponse.status}`)
  }
  const frameHubData = await frameHubResponse.json() as Record<string, Record<string, FrameHubNode>>

  // Build mission nodes from FrameHub (excludes ClanNodes automatically by filtering SolNode prefix)
  const missionNodes: Array<{ nodeKey: string; name: string; planet: string; nodeType: 'mission'; masteryXp: number }> = []

  for (const [planet, nodes] of Object.entries(frameHubData)) {
    for (const [nodeKey, node] of Object.entries(nodes)) {
      // Only include SolNodes (skip ClanNodes which are Dark Sector)
      if (!nodeKey.startsWith('SolNode')) continue

      missionNodes.push({
        nodeKey,
        name: node.name,
        planet,
        nodeType: 'mission',
        masteryXp: node.xp ?? DEFAULT_NODE_XP,
      })
    }
  }

  console.log(`FrameHub: ${missionNodes.length} mission nodes`)

  // Fetch Railjack nodes from warframestat (CrewBattleNodes)
  console.log('Fetching Railjack nodes from warframestat...')
  const warframestatResponse = await fetch('https://api.warframestat.us/solNodes/')
  if (!warframestatResponse.ok) {
    throw new Error(`Failed to fetch warframestat nodes: ${warframestatResponse.status}`)
  }
  const warframestatData = await warframestatResponse.json() as Record<string, WarframestatNode>

  const railjackNodes = Object.entries(warframestatData)
    .filter(([key]) => key.startsWith('CrewBattleNode'))
    .map(([key, node]) => ({
      nodeKey: key,
      name: node.value.replace(/\s*\([^)]+\)\s*$/, '').trim(),
      planet: parseRailjackPlanet(node.value),
      nodeType: 'railjack' as const,
      masteryXp: RAILJACK_NODE_XP,
    }))

  console.log(`Warframestat: ${railjackNodes.length} Railjack nodes`)

  // Add hardcoded junctions
  const junctionNodes = JUNCTIONS.map(j => ({
    nodeKey: j.key,
    name: j.name,
    planet: j.planet,
    nodeType: 'junction' as const,
    masteryXp: JUNCTION_XP,
  }))

  const nodesToInsert = [...missionNodes, ...railjackNodes, ...junctionNodes]

  console.log(`Total: ${nodesToInsert.length} masterable nodes`)
  console.log(`  - Missions: ${missionNodes.length}`)
  console.log(`  - Railjack: ${railjackNodes.length}`)
  console.log(`  - Junctions: ${junctionNodes.length}`)

  const totalXp = nodesToInsert.reduce((sum, n) => sum + n.masteryXp, 0)
  console.log(`  - Total XP: ${totalXp.toLocaleString()}`)

  // Clear existing nodes and insert fresh data
  console.log('Clearing existing nodes...')
  await db.delete(schema.playerNodes)
  await db.delete(schema.nodes)

  console.log('Inserting nodes into database...')
  const BATCH_SIZE = 100
  for (let i = 0; i < nodesToInsert.length; i += BATCH_SIZE) {
    const batch = nodesToInsert.slice(i, i + BATCH_SIZE)
    await db.insert(schema.nodes).values(batch)
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, nodesToInsert.length)}/${nodesToInsert.length}`)
  }

  console.log('Node seed complete!')
  process.exit(0)
}

seedNodes().catch(console.error)
