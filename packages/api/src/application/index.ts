import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createContainer } from '../infrastructure/bootstrap/container'
import { itemsRoutes } from './http/items'
import { masteryRoutes } from './http/mastery'
import { syncRoutes } from './http/sync'
import { starchartRoutes } from './http/starchart'

const container = createContainer()
const app = new Hono()

app.use('*', logger())
app.use('*', cors({ origin: 'http://localhost:5173' }))

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/items', itemsRoutes(container))
app.route('/mastery', masteryRoutes(container))
app.route('/sync', syncRoutes(container))
app.route('/starchart', starchartRoutes(container))

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`)
})
