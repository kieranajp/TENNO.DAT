import type { Session } from '../entities/user'

export interface SessionRepository {
  findById(id: string): Promise<Session | null>
  findByIdWithUser(id: string): Promise<{ session: Session; userId: number } | null>
  create(userId: number, rememberMe: boolean): Promise<Session>
  delete(id: string): Promise<void>
  deleteExpired(): Promise<number>
  deleteAllForUser(userId: number): Promise<void>
}
