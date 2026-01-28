export interface User {
  id: number
  steamId: string
  steamDisplayName: string | null
  steamAvatarUrl: string | null
  createdAt: Date
  lastLoginAt: Date | null
}

export interface Session {
  id: string
  userId: number
  rememberMe: boolean
  expiresAt: Date
  createdAt: Date
}

export interface UserWithSettings extends User {
  playerId: string | null
  platform: string
  onboardingComplete: boolean
}
