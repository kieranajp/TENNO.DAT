import { db } from '../persistence/drizzle/connection'
import { DrizzleItemRepository } from '../persistence/drizzle/item-repository'
import { DrizzlePlayerRepository } from '../persistence/drizzle/player-repository'
import { DrizzleMasteryRepository } from '../persistence/drizzle/mastery-repository'
import { DeProfileApi } from '../external/de-profile-api'
import type { ItemRepository } from '../../domain/ports/item-repository'
import type { PlayerRepository } from '../../domain/ports/player-repository'
import type { MasteryRepository } from '../../domain/ports/mastery-repository'
import type { ProfileApi } from '../../domain/ports/profile-api'

export interface Container {
  itemRepo: ItemRepository
  playerRepo: PlayerRepository
  masteryRepo: MasteryRepository
  profileApi: ProfileApi
}

export function createContainer(): Container {
  return {
    itemRepo: new DrizzleItemRepository(db),
    playerRepo: new DrizzlePlayerRepository(db),
    masteryRepo: new DrizzleMasteryRepository(db),
    profileApi: new DeProfileApi(),
  }
}
