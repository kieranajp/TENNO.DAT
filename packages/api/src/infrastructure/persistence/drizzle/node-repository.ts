import { eq, sql, and } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { nodes, playerNodes } from './schema'
import type { Node, NodeCompletion } from '../../../domain/entities/node'
import type { NodeRepository, StarChartProgress, PlanetProgress, NodeWithCompletion } from '../../../domain/ports/node-repository'

export class DrizzleNodeRepository implements NodeRepository {
  constructor(private db: DrizzleDb) {}

  async findAllAsMap(): Promise<Map<string, Node>> {
    const results = await this.db.select().from(nodes)
    const map = new Map<string, Node>()
    for (const row of results) {
      map.set(row.nodeKey, {
        id: row.id,
        nodeKey: row.nodeKey,
        name: row.name,
        planet: row.planet,
        nodeType: row.nodeType as 'mission' | 'junction' | 'railjack',
        masteryXp: row.masteryXp,
      })
    }
    return map
  }

  async upsertCompletions(playerId: string, completions: NodeCompletion[]): Promise<void> {
    const nodesMap = await this.findAllAsMap()

    for (const completion of completions) {
      const node = nodesMap.get(completion.nodeKey)
      if (!node) continue

      await this.db
        .insert(playerNodes)
        .values({
          playerId,
          nodeId: node.id,
          completes: completion.completes,
          isSteelPath: completion.isSteelPath,
        })
        .onConflictDoUpdate({
          target: [playerNodes.playerId, playerNodes.nodeId, playerNodes.isSteelPath],
          set: {
            completes: sql`excluded.completes`,
            syncedAt: new Date(),
          },
        })
    }
  }

  async getStarChartMasteryXP(playerId: string): Promise<number> {
    const result = await this.db
      .select({
        totalXp: sql<number>`coalesce(sum(${nodes.masteryXp}), 0)::int`,
      })
      .from(playerNodes)
      .innerJoin(nodes, eq(playerNodes.nodeId, nodes.id))
      .where(
        and(
          eq(playerNodes.playerId, playerId),
          sql`${playerNodes.completes} > 0`
        )
      )

    return result[0]?.totalXp ?? 0
  }

  async getNodesWithCompletion(playerId: string, steelPath: boolean): Promise<StarChartProgress> {
    // Get all nodes with their completion status
    const results = await this.db
      .select({
        id: nodes.id,
        nodeKey: nodes.nodeKey,
        name: nodes.name,
        planet: nodes.planet,
        nodeType: nodes.nodeType,
        masteryXp: nodes.masteryXp,
        completes: playerNodes.completes,
      })
      .from(nodes)
      .leftJoin(
        playerNodes,
        and(
          eq(playerNodes.nodeId, nodes.id),
          eq(playerNodes.playerId, playerId),
          eq(playerNodes.isSteelPath, steelPath)
        )
      )
      .orderBy(nodes.planet, nodes.nodeType, nodes.name)

    // Group by planet
    const planetMap = new Map<string, NodeWithCompletion[]>()

    for (const row of results) {
      const node: NodeWithCompletion = {
        id: row.id,
        nodeKey: row.nodeKey,
        name: row.name,
        planet: row.planet,
        nodeType: row.nodeType as 'mission' | 'junction' | 'railjack',
        masteryXp: row.masteryXp,
        completed: (row.completes ?? 0) > 0,
      }

      if (!planetMap.has(row.planet)) {
        planetMap.set(row.planet, [])
      }
      planetMap.get(row.planet)!.push(node)
    }

    // Build planet progress array
    const planets: PlanetProgress[] = []
    let totalCompletedNodes = 0
    let totalNodes = 0
    let totalCompletedXP = 0
    let totalXP = 0

    // Define planet order for consistent display
    const planetOrder = [
      'Earth', 'Venus', 'Mercury', 'Mars', 'Phobos', 'Void', 'Ceres',
      'Jupiter', 'Europa', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
      'Sedna', 'Eris', 'Kuva Fortress', 'Lua', 'Deimos', 'Zariman'
    ]

    for (const planetName of planetOrder) {
      const nodesList = planetMap.get(planetName)
      if (!nodesList || nodesList.length === 0) continue

      const completed = nodesList.filter(n => n.completed).length
      const total = nodesList.length
      const xpEarned = nodesList.filter(n => n.completed).reduce((sum, n) => sum + n.masteryXp, 0)
      const xpTotal = nodesList.reduce((sum, n) => sum + n.masteryXp, 0)

      planets.push({
        name: planetName,
        completed,
        total,
        xpEarned,
        xpTotal,
        nodes: nodesList,
      })

      totalCompletedNodes += completed
      totalNodes += total
      totalCompletedXP += xpEarned
      totalXP += xpTotal
    }

    // Add any remaining planets not in the order list
    for (const [planetName, nodesList] of Array.from(planetMap.entries())) {
      if (planetOrder.includes(planetName)) continue

      const completed = nodesList.filter(n => n.completed).length
      const total = nodesList.length
      const xpEarned = nodesList.filter(n => n.completed).reduce((sum, n) => sum + n.masteryXp, 0)
      const xpTotal = nodesList.reduce((sum, n) => sum + n.masteryXp, 0)

      planets.push({
        name: planetName,
        completed,
        total,
        xpEarned,
        xpTotal,
        nodes: nodesList,
      })

      totalCompletedNodes += completed
      totalNodes += total
      totalCompletedXP += xpEarned
      totalXP += xpTotal
    }

    return {
      planets,
      summary: {
        completedNodes: totalCompletedNodes,
        totalNodes,
        completedXP: totalCompletedXP,
        totalXP,
      },
    }
  }
}
