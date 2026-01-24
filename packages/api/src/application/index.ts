import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createContainer } from '../infrastructure/bootstrap/container'
import { itemsRoutes } from './http/items'

const container = createContainer()
const app = new Hono()

app.use('*', logger())
app.use('*', cors({ origin: 'http://localhost:5173' }))

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/items', itemsRoutes(container))

const port = Number(process.env.PORT) || 3000
console.log(`Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
