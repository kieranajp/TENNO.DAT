import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://warframe:emarfraw@localhost:5432/warframe',
  },
})
