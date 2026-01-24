import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL ?? 'postgres://warframe:emarfraw@localhost:5432/warframe'
const client = postgres(connectionString)

export const db = drizzle(client, { schema })
export type DrizzleDb = typeof db
export { schema }
