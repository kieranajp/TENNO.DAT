export interface Node {
  id: number
  nodeKey: string
  name: string
  planet: string
  nodeType: 'mission' | 'junction' | 'railjack'
  missionType: string | null
  masteryXp: number
}

export interface NodeCompletion {
  nodeKey: string
  completes: number
  isSteelPath: boolean
}
