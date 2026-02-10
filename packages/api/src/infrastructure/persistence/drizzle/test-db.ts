import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { sql } from 'drizzle-orm'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import * as schema from './schema'
import type { DrizzleDb } from './connection'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.resolve(__dirname, '../../../../drizzle')

export async function createTestDb() {
  const client = new PGlite()
  const db = drizzle(client, { schema }) as unknown as DrizzleDb

  // Run migrations using PGlite's exec() which supports multi-statement SQL.
  // The drizzle migrator uses query() internally which only handles single statements.
  const journal = JSON.parse(
    fs.readFileSync(path.join(migrationsFolder, 'meta', '_journal.json'), 'utf-8')
  )
  for (const entry of journal.entries) {
    const sqlContent = fs.readFileSync(
      path.join(migrationsFolder, `${entry.tag}.sql`),
      'utf-8',
    )
    await client.exec(sqlContent)
  }

  return {
    db,
    async cleanup() {
      await client.close()
    },
  }
}

/**
 * Truncate all tables in dependency order (children before parents).
 */
export async function truncateAll(db: DrizzleDb) {
  await db.execute(sql`
    TRUNCATE
      player_prime_parts,
      component_drops,
      item_drops,
      item_resources,
      resource_drops,
      player_nodes,
      player_mastery,
      player_loadout,
      player_wishlist,
      sessions,
      player_settings,
      item_components,
      items,
      nodes,
      resources,
      users
    CASCADE
  `)
}
