import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { createLogger } from '../../logger'

const log = createLogger('Migrate')

const connectionString = process.env.DATABASE_URL ?? 'postgres://warframe:emarfraw@localhost:5433/warframe'
const client = postgres(connectionString, { max: 1 })
const db = drizzle(client)

async function main() {
  log.info('Running migrations...')
  await migrate(db, { migrationsFolder: './drizzle' })
  log.info('Migrations complete')
  await client.end()
}

main().catch((error) => {
  log.error('Migration failed', error instanceof Error ? error : undefined)
  process.exit(1)
})
