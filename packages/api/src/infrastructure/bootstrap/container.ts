import { db } from '../persistence/drizzle/connection'
import { DrizzleItemRepository } from '../persistence/drizzle/item-repository'
import type { ItemRepository } from '../../domain/ports/item-repository'

export interface Container {
  itemRepo: ItemRepository
}

export function createContainer(): Container {
  return {
    itemRepo: new DrizzleItemRepository(db),
  }
}
