import type { User, UserWithSettings } from '../entities/user'

export interface UserRepository {
  findById(id: number): Promise<User | null>
  findBySteamId(steamId: string): Promise<User | null>
  findByIdWithSettings(id: number): Promise<UserWithSettings | null>
  create(steamId: string, displayName: string | null, avatarUrl: string | null): Promise<User>
  updateLastLogin(id: number): Promise<void>
  updateSteamProfile(id: number, displayName: string | null, avatarUrl: string | null): Promise<void>
}
