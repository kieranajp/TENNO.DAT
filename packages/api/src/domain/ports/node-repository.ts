import type { Node, NodeCompletion } from '../entities/node'

export interface NodeWithCompletion extends Node {
  completed: boolean
}

export interface PlanetProgress {
  name: string
  completed: number
  total: number
  xpEarned: number
  xpTotal: number
  nodes: NodeWithCompletion[]
}

export interface StarChartProgress {
  planets: PlanetProgress[]
  summary: {
    completedNodes: number
    totalNodes: number
    completedXP: number
    totalXP: number
  }
}

export interface NodeRepository {
  findAllAsMap(): Promise<Map<string, Node>>
  upsertCompletions(playerId: string, completions: NodeCompletion[]): Promise<void>
  getStarChartMasteryXP(playerId: string): Promise<number>
  getNodesWithCompletion(playerId: string, steelPath: boolean): Promise<StarChartProgress>
}
