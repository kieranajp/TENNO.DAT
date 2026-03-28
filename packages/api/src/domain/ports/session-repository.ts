import type { Session } from '../entities/user'

export interface SessionRepository {
  findByIdWithUser(id: string): Promise<{ session: Session; userId: number } | null>
  create(userId: number, rememberMe: boolean): Promise<Session>
  delete(id: string): Promise<void>
}
