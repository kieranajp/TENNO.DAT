import { db, schema } from './connection'
import { createLogger } from '../../logger'
import {
  parseRailjackPlanet,
  JUNCTION_XP,
  DEFAULT_NODE_XP,
  RAILJACK_NODE_XP,
  JUNCTIONS,
} from './seed-utils'

const log = createLogger('SeedNodes')

// FrameHub node structure
interface FrameHubNode {
  name: string
  type: number
  faction: number
  lvl: [number, number]
  xp?: number
}

// Warframestat node structure (has mission type info)
interface WarframestatNode {
  value: string
  enemy?: string
  type?: string // Mission type: Capture, Defense, Survival, etc.
}

async function seedNodes() {
  // Fetch warframestat data first (has mission types for all nodes)
  log.info('Fetching nodes from warframestat...')
  const warframestatResponse = await fetch('https://api.warframestat.us/solNodes/')
  if (!warframestatResponse.ok) {
    throw new Error(`Failed to fetch warframestat nodes: ${warframestatResponse.status}`)
  }
  const warframestatData = await warframestatResponse.json() as Record<string, WarframestatNode>

  log.info('Fetching nodes from FrameHub...')

  // Fetch curated node data from FrameHub (has XP values)
  const frameHubResponse = await fetch('https://raw.githubusercontent.com/Paroxity/FrameHub/main/src/resources/nodes.json')
  if (!frameHubResponse.ok) {
    throw new Error(`Failed to fetch FrameHub nodes: ${frameHubResponse.status}`)
  }
  const frameHubData = await frameHubResponse.json() as Record<string, Record<string, FrameHubNode>>

  // Build mission nodes from FrameHub, enriched with mission types from warframestat
  const missionNodes: Array<{ nodeKey: string; name: string; planet: string; nodeType: 'mission'; missionType: string | null; masteryXp: number }> = []

  for (const [planet, nodes] of Object.entries(frameHubData)) {
    for (const [nodeKey, node] of Object.entries(nodes)) {
      // Only include SolNodes (skip ClanNodes which are Dark Sector)
      if (!nodeKey.startsWith('SolNode')) continue

      // Get mission type from warframestat if available
      const wsNode = warframestatData[nodeKey]
      const missionType = wsNode?.type || null

      missionNodes.push({
        nodeKey,
        name: node.name,
        planet,
        nodeType: 'mission',
        missionType,
        masteryXp: node.xp ?? DEFAULT_NODE_XP,
      })
    }
  }

  log.info(`FrameHub: ${missionNodes.length} mission nodes`)

  // Build Railjack nodes from warframestat (CrewBattleNodes)
  const railjackNodes = Object.entries(warframestatData)
    .filter(([key]) => key.startsWith('CrewBattleNode'))
    .map(([key, node]) => ({
      nodeKey: key,
      name: node.value.replace(/\s*\([^)]+\)\s*$/, '').trim(),
      planet: parseRailjackPlanet(node.value),
      nodeType: 'railjack' as const,
      missionType: node.type || null,
      masteryXp: RAILJACK_NODE_XP,
    }))

  log.info(`Warframestat: ${railjackNodes.length} Railjack nodes`)

  // Add hardcoded junctions (no mission type)
  const junctionNodes = JUNCTIONS.map(j => ({
    nodeKey: j.key,
    name: j.name,
    planet: j.planet,
    nodeType: 'junction' as const,
    missionType: null,
    masteryXp: JUNCTION_XP,
  }))

  const nodesToInsert = [...missionNodes, ...railjackNodes, ...junctionNodes]

  log.info(`Total: ${nodesToInsert.length} masterable nodes`)
  log.info(`  - Missions: ${missionNodes.length}`)
  log.info(`  - Railjack: ${railjackNodes.length}`)
  log.info(`  - Junctions: ${junctionNodes.length}`)

  const totalXp = nodesToInsert.reduce((sum, n) => sum + n.masteryXp, 0)
  log.info(`  - Total XP: ${totalXp.toLocaleString()}`)

  // Clear existing nodes and insert fresh data
  log.info('Clearing existing nodes...')
  await db.delete(schema.playerNodes)
  await db.delete(schema.nodes)

  log.info('Inserting nodes into database...')
  const BATCH_SIZE = 100
  for (let i = 0; i < nodesToInsert.length; i += BATCH_SIZE) {
    const batch = nodesToInsert.slice(i, i + BATCH_SIZE)
    await db.insert(schema.nodes).values(batch)
    log.info(`Inserted ${Math.min(i + BATCH_SIZE, nodesToInsert.length)}/${nodesToInsert.length}`)
  }

  log.info('Node seed complete!')
  process.exit(0)
}

seedNodes().catch((err) => {
  log.error('Node seed failed', err)
  process.exit(1)
})
