import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { createContainer } from '../infrastructure/bootstrap/container'
import { createLogger } from '../infrastructure/logger'
import { authRoutes } from './http/auth'
import { itemsRoutes } from './http/items'
import { masteryRoutes } from './http/mastery'
import { syncRoutes } from './http/sync'
import { starchartRoutes } from './http/starchart'
import { wishlistRoutes } from './http/wishlist'
import { primePartsRoutes } from './http/prime-parts'
import { createAuthMiddleware, createOnboardingMiddleware } from './http/middleware/auth'

const log = createLogger('Server')
const container = createContainer()
const app = new Hono()

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

app.use('*', honoLogger())
app.use('*', cors({
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN,
  credentials: true,
}))

const authMiddleware = createAuthMiddleware(container)
const onboardingMiddleware = createOnboardingMiddleware(container)

// Public routes
app.get('/health', (c) => c.json({ status: 'ok' }))
app.route('/auth', authRoutes(container))

// Protected routes (require auth)
// Note: Must use both exact path and wildcard since /path/* doesn't match /path
app.use('/sync', authMiddleware)
app.use('/sync/*', authMiddleware)
app.use('/mastery', authMiddleware, onboardingMiddleware)
app.use('/mastery/*', authMiddleware, onboardingMiddleware)
// /items and /items/categories are public (static catalog)
// /items/:id requires auth for personal stats
app.use('/items/:id', authMiddleware, onboardingMiddleware)
app.use('/starchart', authMiddleware, onboardingMiddleware)
app.use('/starchart/*', authMiddleware, onboardingMiddleware)
app.use('/wishlist', authMiddleware, onboardingMiddleware)
app.use('/wishlist/*', authMiddleware, onboardingMiddleware)
app.use('/primes', authMiddleware, onboardingMiddleware)
app.use('/primes/*', authMiddleware, onboardingMiddleware)

// Route definitions
app.route('/items', itemsRoutes(container))
app.route('/mastery', masteryRoutes(container))
app.route('/sync', syncRoutes(container))
app.route('/starchart', starchartRoutes(container))
app.route('/wishlist', wishlistRoutes(container))
app.route('/primes', primePartsRoutes(container))

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, () => {
  log.info('Server started', { port, url: `http://localhost:${port}` })
})
