# PLAN 004: Steam OpenID Authentication & Multi-User Support

## Overview

Add Steam OpenID 2.0 authentication with a Windows 98 style login page, mandatory Warframe ID onboarding for new users, and multi-user database support. This transforms the single-tenant application into a multi-user system where each user's mastery progress is isolated.

## Current State Analysis

### What Exists Now
- Single-tenant design: `player_settings` table has unique constraint on `playerId`
- All player data keyed by `playerId` string (mastery, loadout, nodes)
- No authentication, sessions, or login/logout functionality
- Settings page allows manual entry of Warframe player ID and platform
- KIM OS retro Windows 98/terminal aesthetic already established

### Key Files
- `packages/api/src/infrastructure/persistence/drizzle/schema.ts:91-101` - `playerSettings` table
- `packages/api/src/domain/ports/player-repository.ts` - Repository interface
- `packages/web/src/routes/settings/+page.svelte` - Current settings UI
- `packages/web/src/routes/+layout.svelte` - Main layout (needs auth check)

### Key Discoveries
- Steam OpenID 2.0 is the only viable auth option (per research doc)
- No way to auto-link Steam ID → Warframe account ID (users must enter manually)
- Existing `playerId` in tables refers to Warframe account ID, not our user ID

## Desired End State

After implementation:
1. Users visit the app and see a Windows 98 style login dialog
2. Clicking "Sign in with Steam" redirects to Steam's OpenID endpoint
3. After Steam auth, new users see an onboarding interstitial to enter their Warframe player ID
4. Returning users are taken directly to the dashboard
5. All routes except `/login` and `/auth/*` require authentication
6. Each user's data (mastery, loadout, nodes) is isolated by their user ID
7. Sessions persist for 30 days (with "remember me") or 24 hours (without)

### Verification
- [ ] Can authenticate via Steam OpenID
- [ ] New users must complete onboarding before accessing app
- [ ] Returning users skip onboarding
- [ ] Logging out clears session and redirects to login
- [ ] Protected routes redirect unauthenticated users to login
- [ ] Multiple users can have different Warframe accounts tracked

## What We're NOT Doing

- Console platform login (PlayStation/Xbox/Switch) - Steam only for now
- Steam API verification of Warframe ownership
- Email/password authentication
- OAuth 2.0 (requires Valve partnership)
- Automatic Steam → Warframe account linking (not possible)
- Redis session storage (database sessions are sufficient)

## Implementation Approach

1. **Database first**: Add `users` and `sessions` tables, update FKs
2. **Backend auth**: Steam OpenID flow, session middleware, protected routes
3. **Frontend auth**: Login page, auth state management, route guards
4. **Onboarding**: Mandatory Warframe ID entry for new users
5. **Migration**: Update all existing routes to use authenticated user context

## Phase 1: Database Schema Migration

### Overview
Add `users` table for authenticated accounts, `sessions` table for session management, and update existing tables to reference users.

### Changes Required

#### 1. Schema Updates
**File**: `packages/api/src/infrastructure/persistence/drizzle/schema.ts`

Add after line 3 (imports):
```typescript
// Users table - Steam authenticated accounts
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  steamId: varchar('steam_id', { length: 20 }).notNull().unique(),
  steamDisplayName: varchar('steam_display_name', { length: 100 }),
  steamAvatarUrl: varchar('steam_avatar_url', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
})

// Sessions table - cookie-based session storage
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(), // crypto random hex
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rememberMe: boolean('remember_me').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
}))
```

Update `playerSettings` table (lines 91-101) to add `userId` FK:
```typescript
export const playerSettings = pgTable('player_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  playerId: varchar('player_id', { length: 50 }), // Now nullable until onboarding complete
  platform: varchar('platform', { length: 10 }).default('pc'),
  displayName: varchar('display_name', { length: 100 }),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  railjackIntrinsics: integer('railjack_intrinsics').default(0).notNull(),
  drifterIntrinsics: integer('drifter_intrinsics').default(0).notNull(),
})
```

#### 2. Migration File
**File**: `packages/api/drizzle/0010_add_users_and_sessions.sql`

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "steam_id" VARCHAR(20) NOT NULL UNIQUE,
  "steam_display_name" VARCHAR(100),
  "steam_avatar_url" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "last_login_at" TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" VARCHAR(64) PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "remember_me" BOOLEAN DEFAULT FALSE NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions"("expires_at");

-- Add user_id to player_settings
ALTER TABLE "player_settings" ADD COLUMN "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "player_settings" ALTER COLUMN "player_id" DROP NOT NULL;

-- Note: Existing data will have NULL user_id - this is a fresh multi-user migration
-- Add unique constraint on user_id (one settings row per user)
ALTER TABLE "player_settings" ADD CONSTRAINT "player_settings_user_id_unique" UNIQUE("user_id");
```

### Success Criteria

#### Automated Verification:
- [x] Migration applies cleanly: `pnpm --filter api db:migrate`
- [x] TypeScript compiles: `pnpm --filter api typecheck`
- [x] Existing tests pass: `pnpm test`

#### Manual Verification:
- [ ] Can connect to database and see new tables
- [ ] `users` table has correct columns
- [ ] `sessions` table has correct columns and indexes
- [ ] `player_settings` has new `user_id` column

---

## Phase 2: Domain Layer Updates

### Overview
Add domain entities, ports (interfaces), and repository implementations for users and sessions.

### Changes Required

#### 1. User Entity
**File**: `packages/api/src/domain/entities/user.ts` (new file)

```typescript
export interface User {
  id: number
  steamId: string
  steamDisplayName: string | null
  steamAvatarUrl: string | null
  createdAt: Date
  lastLoginAt: Date | null
}

export interface Session {
  id: string
  userId: number
  rememberMe: boolean
  expiresAt: Date
  createdAt: Date
}

export interface UserWithSettings extends User {
  playerId: string | null
  platform: string
  onboardingComplete: boolean
}
```

#### 2. User Repository Port
**File**: `packages/api/src/domain/ports/user-repository.ts` (new file)

```typescript
import type { User, UserWithSettings } from '../entities/user'

export interface UserRepository {
  findById(id: number): Promise<User | null>
  findBySteamId(steamId: string): Promise<User | null>
  findByIdWithSettings(id: number): Promise<UserWithSettings | null>
  create(steamId: string, displayName: string | null, avatarUrl: string | null): Promise<User>
  updateLastLogin(id: number): Promise<void>
  updateSteamProfile(id: number, displayName: string | null, avatarUrl: string | null): Promise<void>
}
```

#### 3. Session Repository Port
**File**: `packages/api/src/domain/ports/session-repository.ts` (new file)

```typescript
import type { Session } from '../entities/user'

export interface SessionRepository {
  findById(id: string): Promise<Session | null>
  findByIdWithUser(id: string): Promise<{ session: Session; userId: number } | null>
  create(userId: number, rememberMe: boolean): Promise<Session>
  delete(id: string): Promise<void>
  deleteExpired(): Promise<number>
  deleteAllForUser(userId: number): Promise<void>
}
```

#### 4. Drizzle User Repository
**File**: `packages/api/src/infrastructure/persistence/drizzle/user-repository.ts` (new file)

```typescript
import { eq } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { users, playerSettings } from './schema'
import type { User, UserWithSettings } from '../../../domain/entities/user'
import type { UserRepository } from '../../../domain/ports/user-repository'

export class DrizzleUserRepository implements UserRepository {
  constructor(private db: DrizzleDb) {}

  async findById(id: number): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return result[0] ?? null
  }

  async findBySteamId(steamId: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.steamId, steamId)).limit(1)
    return result[0] ?? null
  }

  async findByIdWithSettings(id: number): Promise<UserWithSettings | null> {
    const result = await this.db
      .select({
        id: users.id,
        steamId: users.steamId,
        steamDisplayName: users.steamDisplayName,
        steamAvatarUrl: users.steamAvatarUrl,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        playerId: playerSettings.playerId,
        platform: playerSettings.platform,
      })
      .from(users)
      .leftJoin(playerSettings, eq(users.id, playerSettings.userId))
      .where(eq(users.id, id))
      .limit(1)

    if (!result[0]) return null

    const row = result[0]
    return {
      ...row,
      platform: row.platform ?? 'pc',
      onboardingComplete: row.playerId !== null,
    }
  }

  async create(steamId: string, displayName: string | null, avatarUrl: string | null): Promise<User> {
    const result = await this.db
      .insert(users)
      .values({
        steamId,
        steamDisplayName: displayName,
        steamAvatarUrl: avatarUrl,
        lastLoginAt: new Date(),
      })
      .returning()
    return result[0]
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id))
  }

  async updateSteamProfile(id: number, displayName: string | null, avatarUrl: string | null): Promise<void> {
    await this.db
      .update(users)
      .set({ steamDisplayName: displayName, steamAvatarUrl: avatarUrl })
      .where(eq(users.id, id))
  }
}
```

#### 5. Drizzle Session Repository
**File**: `packages/api/src/infrastructure/persistence/drizzle/session-repository.ts` (new file)

```typescript
import { eq, lt } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import type { DrizzleDb } from './connection'
import { sessions } from './schema'
import type { Session } from '../../../domain/entities/user'
import type { SessionRepository } from '../../../domain/ports/session-repository'

const SHORT_SESSION_HOURS = 24
const LONG_SESSION_DAYS = 30

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private db: DrizzleDb) {}

  async findById(id: string): Promise<Session | null> {
    const result = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    return result[0] ?? null
  }

  async findByIdWithUser(id: string): Promise<{ session: Session; userId: number } | null> {
    const result = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    if (!result[0]) return null
    return { session: result[0], userId: result[0].userId }
  }

  async create(userId: number, rememberMe: boolean): Promise<Session> {
    const id = randomBytes(32).toString('hex')
    const expiresAt = rememberMe
      ? new Date(Date.now() + LONG_SESSION_DAYS * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + SHORT_SESSION_HOURS * 60 * 60 * 1000)

    const result = await this.db
      .insert(sessions)
      .values({ id, userId, rememberMe, expiresAt })
      .returning()
    return result[0]
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id))
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
    return result.rowCount ?? 0
  }

  async deleteAllForUser(userId: number): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId))
  }
}
```

#### 6. Update Player Repository
**File**: `packages/api/src/domain/ports/player-repository.ts`

Update interface to accept `userId`:
```typescript
import type { Platform } from '@warframe-tracker/shared'
import type { PlayerSettings } from '../entities/player'

export interface PlayerRepository {
  getSettings(userId: number): Promise<PlayerSettings | null>
  getSettingsByPlayerId(playerId: string): Promise<PlayerSettings | null>
  createSettings(userId: number): Promise<void>
  saveSettings(userId: number, playerId: string, platform: Platform): Promise<void>
  updateDisplayName(userId: number, displayName: string): Promise<void>
  updateLastSync(userId: number): Promise<void>
  updateIntrinsics(userId: number, railjack: number, drifter: number): Promise<void>
}
```

**File**: `packages/api/src/infrastructure/persistence/drizzle/player-repository.ts`

Update implementation to use `userId` instead of assuming single player:
```typescript
import { eq } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { playerSettings } from './schema'
import type { PlayerSettings } from '../../../domain/entities/player'
import type { PlayerRepository } from '../../../domain/ports/player-repository'
import type { Platform } from '@warframe-tracker/shared'

export class DrizzlePlayerRepository implements PlayerRepository {
  constructor(private db: DrizzleDb) {}

  async getSettings(userId: number): Promise<PlayerSettings | null> {
    const result = await this.db
      .select()
      .from(playerSettings)
      .where(eq(playerSettings.userId, userId))
      .limit(1)
    return result[0] ?? null
  }

  async getSettingsByPlayerId(playerId: string): Promise<PlayerSettings | null> {
    const result = await this.db
      .select()
      .from(playerSettings)
      .where(eq(playerSettings.playerId, playerId))
      .limit(1)
    return result[0] ?? null
  }

  async createSettings(userId: number): Promise<void> {
    await this.db.insert(playerSettings).values({ userId }).onConflictDoNothing()
  }

  async saveSettings(userId: number, playerId: string, platform: Platform): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ playerId, platform: platform.id })
      .where(eq(playerSettings.userId, userId))
  }

  async updateDisplayName(userId: number, displayName: string): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ displayName })
      .where(eq(playerSettings.userId, userId))
  }

  async updateLastSync(userId: number): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ lastSyncAt: new Date() })
      .where(eq(playerSettings.userId, userId))
  }

  async updateIntrinsics(userId: number, railjack: number, drifter: number): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ railjackIntrinsics: railjack, drifterIntrinsics: drifter })
      .where(eq(playerSettings.userId, userId))
  }
}
```

#### 7. Update Container
**File**: `packages/api/src/infrastructure/bootstrap/container.ts`

Add new repositories:
```typescript
import { DrizzleUserRepository } from '../persistence/drizzle/user-repository'
import { DrizzleSessionRepository } from '../persistence/drizzle/session-repository'
import type { UserRepository } from '../../domain/ports/user-repository'
import type { SessionRepository } from '../../domain/ports/session-repository'

export interface Container {
  // ... existing repos ...
  userRepo: UserRepository
  sessionRepo: SessionRepository
}

export function createContainer(): Container {
  return {
    // ... existing repos ...
    userRepo: new DrizzleUserRepository(db),
    sessionRepo: new DrizzleSessionRepository(db),
  }
}
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `pnpm --filter api typecheck`
- [x] All tests pass: `pnpm test`
- [x] No linting errors: `pnpm lint`

#### Manual Verification:
- [ ] New repository files created in correct locations
- [ ] Container exports new repositories

---

## Phase 3: Steam OpenID Authentication

### Overview
Implement Steam OpenID 2.0 authentication flow with login/callback/logout routes.

### Changes Required

#### 1. Install Dependencies
```bash
pnpm --filter api add openid
pnpm --filter api add -D @types/openid
```

#### 2. Steam OpenID Service
**File**: `packages/api/src/infrastructure/external/steam-openid.ts` (new file)

```typescript
import { RelyingParty } from 'openid'
import { createLogger } from '../logger'

const log = createLogger('SteamOpenID')

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid'

export interface SteamProfile {
  steamId: string
  displayName: string | null
  avatarUrl: string | null
}

export class SteamOpenIDService {
  private relyingParty: RelyingParty

  constructor(baseUrl: string) {
    const returnUrl = `${baseUrl}/auth/steam/callback`
    const realm = baseUrl

    this.relyingParty = new RelyingParty(returnUrl, realm, true, true, [])
  }

  async getAuthUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.relyingParty.authenticate(STEAM_OPENID_URL, false, (err, authUrl) => {
        if (err || !authUrl) {
          log.error('Failed to generate auth URL', err ?? undefined)
          reject(err ?? new Error('No auth URL returned'))
          return
        }
        resolve(authUrl)
      })
    })
  }

  async verifyAssertion(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.relyingParty.verifyAssertion(url, (err, result) => {
        if (err || !result?.authenticated) {
          log.error('Failed to verify assertion', err ?? undefined)
          reject(err ?? new Error('Authentication failed'))
          return
        }

        // Extract SteamID from claimed_id
        // Format: https://steamcommunity.com/openid/id/76561198012345678
        const claimedId = result.claimedIdentifier
        const steamId = claimedId?.split('/').pop()

        if (!steamId) {
          reject(new Error('Could not extract Steam ID'))
          return
        }

        resolve(steamId)
      })
    })
  }

  async fetchProfile(steamId: string, apiKey: string): Promise<SteamProfile> {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`

    try {
      const response = await fetch(url)
      const data = await response.json() as {
        response: {
          players: Array<{
            steamid: string
            personaname?: string
            avatarmedium?: string
          }>
        }
      }

      const player = data.response.players[0]
      return {
        steamId,
        displayName: player?.personaname ?? null,
        avatarUrl: player?.avatarmedium ?? null,
      }
    } catch (error) {
      log.warn('Failed to fetch Steam profile', { steamId, error })
      return { steamId, displayName: null, avatarUrl: null }
    }
  }
}
```

#### 3. Auth Routes
**File**: `packages/api/src/application/http/auth.ts` (new file)

```typescript
import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { Container } from '../../infrastructure/bootstrap/container'
import { SteamOpenIDService } from '../../infrastructure/external/steam-openid'
import { createLogger } from '../../infrastructure/logger'
import { handleRouteError } from './errors'

const log = createLogger('Auth')

const SESSION_COOKIE = 'tenno_session'
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const STEAM_API_KEY = process.env.STEAM_API_KEY ?? ''
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

export function authRoutes(container: Container) {
  const router = new Hono()
  const steam = new SteamOpenIDService(BASE_URL)

  // GET /auth/steam - Redirect to Steam login
  router.get('/steam', async (c) => {
    try {
      const rememberMe = c.req.query('remember') === 'true'
      // Store remember preference in a temporary cookie
      setCookie(c, 'tenno_remember', rememberMe ? '1' : '0', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 300, // 5 minutes - just for the auth flow
        path: '/',
      })

      const authUrl = await steam.getAuthUrl()
      return c.redirect(authUrl)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to initiate Steam login')
    }
  })

  // GET /auth/steam/callback - Handle Steam callback
  router.get('/steam/callback', async (c) => {
    try {
      const fullUrl = `${BASE_URL}${c.req.path}?${c.req.raw.url.split('?')[1]}`
      const steamId = await steam.verifyAssertion(fullUrl)

      // Fetch Steam profile
      const profile = STEAM_API_KEY
        ? await steam.fetchProfile(steamId, STEAM_API_KEY)
        : { steamId, displayName: null, avatarUrl: null }

      // Find or create user
      let user = await container.userRepo.findBySteamId(steamId)

      if (user) {
        // Update profile and last login
        await container.userRepo.updateSteamProfile(user.id, profile.displayName, profile.avatarUrl)
        await container.userRepo.updateLastLogin(user.id)
      } else {
        // Create new user
        user = await container.userRepo.create(steamId, profile.displayName, profile.avatarUrl)
        // Create empty player settings row for onboarding
        await container.playerRepo.createSettings(user.id)
        log.info('New user created', { steamId, userId: user.id })
      }

      // Get remember preference
      const rememberMe = getCookie(c, 'tenno_remember') === '1'
      deleteCookie(c, 'tenno_remember')

      // Create session
      const session = await container.sessionRepo.create(user.id, rememberMe)

      // Set session cookie
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 days or 24 hours
      setCookie(c, SESSION_COOKIE, session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge,
        path: '/',
      })

      log.info('User logged in', { userId: user.id, steamId, rememberMe })

      // Redirect to frontend
      return c.redirect(FRONTEND_URL)
    } catch (error) {
      log.error('Steam callback failed', error instanceof Error ? error : undefined)
      return c.redirect(`${FRONTEND_URL}/login?error=auth_failed`)
    }
  })

  // POST /auth/logout - Clear session
  router.post('/logout', async (c) => {
    try {
      const sessionId = getCookie(c, SESSION_COOKIE)

      if (sessionId) {
        await container.sessionRepo.delete(sessionId)
      }

      deleteCookie(c, SESSION_COOKIE, { path: '/' })
      return c.json({ success: true })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to logout')
    }
  })

  // GET /auth/me - Get current user
  router.get('/me', async (c) => {
    try {
      const sessionId = getCookie(c, SESSION_COOKIE)

      if (!sessionId) {
        return c.json({ user: null })
      }

      const sessionData = await container.sessionRepo.findByIdWithUser(sessionId)

      if (!sessionData || sessionData.session.expiresAt < new Date()) {
        if (sessionData) {
          await container.sessionRepo.delete(sessionId)
        }
        deleteCookie(c, SESSION_COOKIE, { path: '/' })
        return c.json({ user: null })
      }

      const user = await container.userRepo.findByIdWithSettings(sessionData.userId)
      return c.json({ user })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to get current user')
    }
  })

  return router
}
```

#### 4. Auth Middleware
**File**: `packages/api/src/application/http/middleware/auth.ts` (new file)

```typescript
import type { Context, Next } from 'hono'
import { getCookie, deleteCookie } from 'hono/cookie'
import type { Container } from '../../../infrastructure/bootstrap/container'

const SESSION_COOKIE = 'tenno_session'

export interface AuthContext {
  userId: number
  steamId: string
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext
  }
}

export function createAuthMiddleware(container: Container) {
  return async (c: Context, next: Next) => {
    const sessionId = getCookie(c, SESSION_COOKIE)

    if (!sessionId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const sessionData = await container.sessionRepo.findByIdWithUser(sessionId)

    if (!sessionData || sessionData.session.expiresAt < new Date()) {
      if (sessionData) {
        await container.sessionRepo.delete(sessionId)
      }
      deleteCookie(c, SESSION_COOKIE, { path: '/' })
      return c.json({ error: 'Session expired' }, 401)
    }

    const user = await container.userRepo.findById(sessionData.userId)

    if (!user) {
      await container.sessionRepo.delete(sessionId)
      deleteCookie(c, SESSION_COOKIE, { path: '/' })
      return c.json({ error: 'User not found' }, 401)
    }

    c.set('auth', { userId: user.id, steamId: user.steamId })
    await next()
  }
}

export function createOnboardingMiddleware(container: Container) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth')

    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const settings = await container.playerRepo.getSettings(auth.userId)

    if (!settings?.playerId) {
      return c.json({ error: 'Onboarding required', code: 'ONBOARDING_REQUIRED' }, 403)
    }

    await next()
  }
}
```

#### 5. Update Main App
**File**: `packages/api/src/application/index.ts`

Add auth routes and middleware:
```typescript
import { authRoutes } from './http/auth'
import { createAuthMiddleware, createOnboardingMiddleware } from './http/middleware/auth'

// ... existing imports ...

const authMiddleware = createAuthMiddleware(container)
const onboardingMiddleware = createOnboardingMiddleware(container)

// Public routes
app.get('/health', (c) => c.json({ status: 'ok' }))
app.route('/auth', authRoutes(container))

// Protected routes (require auth)
app.use('/sync/*', authMiddleware)
app.use('/mastery/*', authMiddleware, onboardingMiddleware)
app.use('/items/*', authMiddleware, onboardingMiddleware)
app.use('/starchart/*', authMiddleware, onboardingMiddleware)

// Route definitions
app.route('/items', itemsRoutes(container))
app.route('/mastery', masteryRoutes(container))
app.route('/sync', syncRoutes(container))
app.route('/starchart', starchartRoutes(container))
```

#### 6. Environment Variables
**File**: `packages/api/.env.example` (update)

```env
DATABASE_URL=postgres://warframe:emarfraw@localhost:5433/warframe
PORT=3000

# BASE_URL: Where Steam redirects after auth (must be publicly accessible)
# For local dev with tunnel: https://92qh1xn5-3000.uks1.devtunnels.ms
# For production: https://your-domain.com
BASE_URL=http://localhost:3000

# FRONTEND_URL: Where users are redirected after successful auth
FRONTEND_URL=http://localhost:5173

# CORS_ORIGIN: Allowed origin for CORS
# Local dev: * (allow all)
# Production: https://your-frontend-domain.com
CORS_ORIGIN=*

# Steam API key for fetching profile info (optional but recommended)
# Get one at: https://steamcommunity.com/dev/apikey
STEAM_API_KEY=your_steam_api_key_here

NODE_ENV=development
```

**Dev Tunnel Configuration:**
When testing Steam auth locally, the API must be accessible via a public URL for Steam's callback. Use VS Code dev tunnels or ngrok:

```env
# .env.local (not committed)
BASE_URL=https://92qh1xn5-3000.uks1.devtunnels.ms
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=*
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `pnpm --filter api typecheck`
- [x] All tests pass: `pnpm test`
- [ ] Server starts without errors: `pnpm --filter api dev`

#### Manual Verification:
- [ ] `/auth/steam` redirects to Steam
- [ ] After Steam login, callback creates user and session
- [ ] `/auth/me` returns user data when logged in
- [ ] `/auth/me` returns `{ user: null }` when not logged in
- [ ] `/auth/logout` clears session
- [ ] Protected routes return 401 when not authenticated

---

## Phase 4: Windows 98 Login Page

### Overview
Create a Windows 98 style login page with centered dialog box and Steam login button.

### Changes Required

#### 1. Login Page Route
**File**: `packages/web/src/routes/login/+page.svelte` (new file)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { API_BASE } from '$lib/api';

  let rememberMe = $state(true);
  let error = $state<string | null>(null);
  let loading = $state(false);

  onMount(() => {
    // Check for error from callback
    const errorParam = $page.url.searchParams.get('error');
    if (errorParam === 'auth_failed') {
      error = 'Authentication failed. Please try again.';
    }
  });

  function handleLogin() {
    loading = true;
    const url = `${API_BASE}/auth/steam?remember=${rememberMe}`;
    window.location.href = url;
  }
</script>

<div class="login-container">
  <div class="login-backdrop"></div>

  <div class="login-dialog window-frame">
    <div class="title-bar">
      <div class="d-flex align-items-center gap-2">
        <div class="title-icon"></div>
        <span class="title-text">Welcome to KIM OS</span>
      </div>
      <div class="window-controls">
        <button type="button" disabled>_</button>
        <button type="button" disabled>□</button>
        <button type="button" class="close-btn" disabled>X</button>
      </div>
    </div>

    <div class="login-content">
      <div class="login-banner">
        <div class="banner-icon">
          <span class="material-icons">computer</span>
        </div>
        <div class="banner-text">
          <h1>KIM OS</h1>
          <p>Warframe Mastery Tracker</p>
        </div>
      </div>

      <div class="login-form">
        <p class="login-instructions">
          Click the button below to sign in with your Steam account.
        </p>

        {#if error}
          <div class="login-error">
            <span class="material-icons">error</span>
            {error}
          </div>
        {/if}

        <button
          class="steam-login-btn"
          onclick={handleLogin}
          disabled={loading}
        >
          {#if loading}
            <span class="spinner"></span>
          {:else}
            <img src="/steam-logo.svg" alt="" class="steam-icon" />
          {/if}
          Sign in with Steam
        </button>

        <label class="remember-me">
          <input type="checkbox" bind:checked={rememberMe} />
          <span class="checkmark"></span>
          Remember me for 30 days
        </label>
      </div>

      <div class="login-footer">
        <p>Your Steam account will be used for authentication only.</p>
        <p>No Steam data is stored except your display name.</p>
      </div>
    </div>
  </div>
</div>

<style lang="sass">
  .login-container
    min-height: 100vh
    display: flex
    align-items: center
    justify-content: center
    padding: 1rem
    position: relative

  .login-backdrop
    position: fixed
    inset: 0
    background: $kim-bg-light
    background-image:
      linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
    background-size: 20px 20px
    z-index: -1

  .login-dialog
    width: 100%
    max-width: 400px
    animation: dialog-appear 0.3s ease-out

  @keyframes dialog-appear
    from
      opacity: 0
      transform: scale(0.95) translateY(-10px)
    to
      opacity: 1
      transform: scale(1) translateY(0)

  .title-icon
    width: $icon-size-sm
    height: $icon-size-sm
    background: $kim-accent
    border: 1px solid black

  .login-content
    background: $kim-terminal-light
    padding: 1.5rem

  .login-banner
    display: flex
    align-items: center
    gap: 1rem
    padding-bottom: 1.5rem
    border-bottom: 2px solid $kim-border
    margin-bottom: 1.5rem

    .banner-icon
      width: 64px
      height: 64px
      background: $kim-bg-dark
      border: 2px solid $kim-border
      display: flex
      align-items: center
      justify-content: center

      .material-icons
        font-size: 32px
        color: $kim-title

    .banner-text
      h1
        margin: 0
        font-family: $font-family-monospace
        font-size: 1.5rem
        color: $kim-border-dark
        letter-spacing: $letter-spacing-wider

      p
        margin: 0.25rem 0 0
        font-family: $font-family-monospace
        font-size: $font-size-sm
        color: $gray-500
        text-transform: uppercase

  .login-form
    display: flex
    flex-direction: column
    gap: 1rem

  .login-instructions
    font-family: $font-family-monospace
    font-size: $font-size-sm
    color: $gray-700
    margin: 0
    text-align: center

  .login-error
    display: flex
    align-items: center
    gap: 0.5rem
    padding: 0.75rem
    background: $danger-bg
    border: 1px solid $kim-accent
    color: $kim-accent
    font-family: $font-family-monospace
    font-size: $font-size-sm

    .material-icons
      font-size: 1rem

  .steam-login-btn
    display: flex
    align-items: center
    justify-content: center
    gap: 0.75rem
    width: 100%
    padding: 0.75rem 1rem
    background: #171a21
    color: white
    border: 2px solid black
    border-bottom-width: 4px
    border-right-width: 4px
    font-family: $font-family-monospace
    font-size: 1rem
    text-transform: uppercase
    letter-spacing: $letter-spacing-wide
    cursor: pointer
    transition: all $transition-fast

    &:hover:not(:disabled)
      background: #2a475e

    &:active:not(:disabled)
      border-bottom-width: 2px
      border-right-width: 2px
      transform: translate(2px, 2px)

    &:disabled
      opacity: 0.7
      cursor: wait

    .steam-icon
      width: 24px
      height: 24px

  .remember-me
    display: flex
    align-items: center
    gap: 0.5rem
    font-family: $font-family-monospace
    font-size: $font-size-sm
    color: $gray-700
    cursor: pointer
    user-select: none

    input
      display: none

    .checkmark
      width: 16px
      height: 16px
      border: 2px solid $kim-border
      background: white
      position: relative

    input:checked + .checkmark::after
      content: '✓'
      position: absolute
      top: -2px
      left: 2px
      font-size: 14px
      color: $kim-border-dark

  .login-footer
    margin-top: 1.5rem
    padding-top: 1rem
    border-top: 1px solid $gray-300
    text-align: center

    p
      margin: 0.25rem 0
      font-size: $font-size-xs
      color: $gray-500
</style>
```

#### 2. Steam Logo Asset
**File**: `packages/web/static/steam-logo.svg` (new file)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
  <path d="M12 2C6.48 2 2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15h-2v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3l-.5 3H13v6.95c5.05-.5 9-4.76 9-9.95 0-5.52-4.48-10-10-10z"/>
</svg>
```

Note: Use the official Steam logo from Steam's branding resources for production.

#### 3. Login Layout (No Chrome)
**File**: `packages/web/src/routes/login/+layout.svelte` (new file)

```svelte
<script lang="ts">
  import '../../styles/_styles.sass';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap"
    rel="stylesheet"
  />
  <link
    href="https://fonts.googleapis.com/icon?family=Material+Icons"
    rel="stylesheet"
  />
  <title>Login - TENNO.DAT</title>
</svelte:head>

<!-- CRT Effects -->
<div class="crt-overlay"></div>
<div class="noise-overlay"></div>

{@render children()}
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `pnpm --filter web typecheck`
- [x] No linting errors: `pnpm lint`
- [ ] Dev server starts: `pnpm --filter web dev`

#### Manual Verification:
- [ ] Login page renders with Windows 98 style dialog
- [ ] Steam button is visible and styled correctly
- [ ] Remember me checkbox works
- [ ] Error message displays when auth fails
- [ ] Clicking Steam button redirects to Steam

---

## Phase 5: Frontend Auth State & Route Guards

### Overview
Add authentication state management, route guards, and update the layout to handle auth.

### Changes Required

#### 1. Auth Store
**File**: `packages/web/src/lib/stores/auth.ts` (new file)

```typescript
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface AuthUser {
  id: number;
  steamId: string;
  steamDisplayName: string | null;
  steamAvatarUrl: string | null;
  playerId: string | null;
  platform: string;
  onboardingComplete: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  checked: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    loading: true,
    checked: false,
  });

  return {
    subscribe,
    setUser: (user: AuthUser | null) => {
      update(state => ({ ...state, user, loading: false, checked: true }));
    },
    setLoading: (loading: boolean) => {
      update(state => ({ ...state, loading }));
    },
    clear: () => {
      set({ user: null, loading: false, checked: true });
    },
  };
}

export const auth = createAuthStore();

export const isAuthenticated = derived(auth, $auth => $auth.user !== null);
export const needsOnboarding = derived(auth, $auth =>
  $auth.user !== null && !$auth.user.onboardingComplete
);
```

#### 2. Update API Client
**File**: `packages/web/src/lib/api.ts`

Add auth functions:
```typescript
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// ... existing interfaces ...

export interface AuthUser {
  id: number;
  steamId: string;
  steamDisplayName: string | null;
  steamAvatarUrl: string | null;
  playerId: string | null;
  platform: string;
  onboardingComplete: boolean;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

// Update existing functions to include credentials
export async function getSettings(): Promise<PlayerSettings | null> {
  const response = await fetch(`${API_BASE}/sync/settings`, {
    credentials: 'include',
  });
  // ... rest unchanged
}

export async function saveSettings(playerId: string, platform: string): Promise<void> {
  const response = await fetch(`${API_BASE}/sync/settings`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, platform }),
  });
  // ... rest unchanged
}

// Add credentials: 'include' to ALL fetch calls
```

**Frontend Environment Setup:**
Create `packages/web/.env.local` (not committed) to point to the API tunnel:

```env
VITE_API_URL=https://92qh1xn5-3000.uks1.devtunnels.ms
```

This allows the frontend on `localhost:5173` to call the API on the tunnel, which is required for Steam auth to work (the callback URL must be publicly accessible).

#### 3. Root Layout Auth Check
**File**: `packages/web/src/routes/+layout.svelte`

Update to check auth and redirect:
```svelte
<script lang="ts">
  import '../styles/_styles.sass';
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { getCurrentUser, logout } from '$lib/api';
  import { auth, needsOnboarding } from '$lib/stores/auth';

  let { children }: { children: Snippet } = $props();

  // ... existing state variables ...

  onMount(async () => {
    // Check authentication
    const user = await getCurrentUser();
    auth.setUser(user);

    if (!user) {
      // Not logged in - redirect to login (unless already there)
      if (!$page.url.pathname.startsWith('/login')) {
        goto('/login');
      }
      return;
    }

    // Logged in but needs onboarding
    if (!user.onboardingComplete && !$page.url.pathname.startsWith('/onboarding')) {
      goto('/onboarding');
      return;
    }

    // Logged in and onboarded - redirect away from login/onboarding
    if ($page.url.pathname.startsWith('/login') || $page.url.pathname.startsWith('/onboarding')) {
      goto('/');
    }

    // Set username from Steam display name
    if (user.steamDisplayName) {
      username = user.steamDisplayName;
    }
  });

  async function handleLogout() {
    await logout();
    auth.clear();
    goto('/login');
  }

  // ... rest of existing code ...
</script>

<!-- Update header to show logout -->
<header class="header-bar">
  <!-- ... existing header content ... -->
  <div class="header-controls">
    <div class="user-badge d-none d-md-block">USER: {username.toUpperCase()}</div>
    <div class="d-none d-md-block">{currentTime}</div>
    <a href="/settings" class="header-btn" title="Settings">
      <span class="material-icons">settings</span>
    </a>
    <button class="header-btn" onclick={handleLogout} title="Logout">
      <span class="material-icons">logout</span>
    </button>
  </div>
</header>
```

#### 4. Onboarding Page
**File**: `packages/web/src/routes/onboarding/+page.svelte` (new file)

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { saveSettings, getCurrentUser } from '$lib/api';
  import { auth } from '$lib/stores/auth';

  let playerId = $state('');
  let platform = $state('pc');
  let saving = $state(false);
  let error = $state<string | null>(null);

  async function handleSubmit() {
    if (!playerId.trim()) {
      error = 'Please enter your Warframe Account ID';
      return;
    }

    saving = true;
    error = null;

    try {
      await saveSettings(playerId.trim(), platform);

      // Refresh user data
      const user = await getCurrentUser();
      auth.setUser(user);

      // Navigate to dashboard
      goto('/');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save settings';
    } finally {
      saving = false;
    }
  }
</script>

<div class="onboarding-container">
  <div class="onboarding-backdrop"></div>

  <div class="onboarding-dialog window-frame">
    <div class="title-bar">
      <div class="d-flex align-items-center gap-2">
        <div class="title-icon"></div>
        <span class="title-text">Account Setup</span>
      </div>
      <div class="window-controls">
        <button type="button" disabled>_</button>
        <button type="button" disabled>□</button>
        <button type="button" class="close-btn" disabled>X</button>
      </div>
    </div>

    <div class="onboarding-content">
      <div class="onboarding-header">
        <span class="material-icons">person_add</span>
        <h2>Link Your Warframe Account</h2>
      </div>

      <p class="onboarding-intro">
        To track your mastery progress, we need your Warframe Account ID.
        This is different from your display name.
      </p>

      {#if error}
        <div class="onboarding-error">
          <span class="material-icons">error</span>
          {error}
        </div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div class="form-group">
          <label class="form-label" for="playerId">
            <span class="material-icons">badge</span>
            WARFRAME ACCOUNT ID
          </label>
          <input
            type="text"
            class="input-retro"
            id="playerId"
            bind:value={playerId}
            placeholder="e.g., abc123def456"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="platform">
            <span class="material-icons">devices</span>
            PLATFORM
          </label>
          <select class="input-retro" id="platform" bind:value={platform}>
            <option value="pc">PC</option>
            <option value="ps">PLAYSTATION</option>
            <option value="xbox">XBOX</option>
            <option value="switch">NINTENDO SWITCH</option>
          </select>
        </div>

        <button class="btn-retro btn-primary" type="submit" disabled={saving}>
          {#if saving}
            <span class="spinner"></span>
          {:else}
            <span class="material-icons">check</span>
          {/if}
          COMPLETE SETUP
        </button>
      </form>

      <div class="help-section kim-panel">
        <div class="panel-header">
          <h4>How to Find Your Account ID</h4>
        </div>
        <div class="panel-body">
          <p><strong>Method 1: EE.log File</strong></p>
          <ol>
            <li>Open Warframe and log in</li>
            <li>Navigate to <code>%LOCALAPPDATA%\Warframe\EE.log</code></li>
            <li>Search for "accountId" in the file</li>
          </ol>

          <p><strong>Method 2: Browser Extension</strong></p>
          <ol>
            <li>Install the Tenno Tracker browser extension</li>
            <li>Visit your profile on warframe.com</li>
            <li>The extension will display your Account ID</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="sass">
  .onboarding-container
    min-height: 100vh
    display: flex
    align-items: center
    justify-content: center
    padding: 1rem

  .onboarding-backdrop
    position: fixed
    inset: 0
    background: $kim-bg-light
    background-image:
      linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
    background-size: 20px 20px
    z-index: -1

  .onboarding-dialog
    width: 100%
    max-width: 500px

  .title-icon
    width: $icon-size-sm
    height: $icon-size-sm
    background: $kim-accent
    border: 1px solid black

  .onboarding-content
    background: $kim-terminal-light
    padding: 1.5rem

  .onboarding-header
    display: flex
    align-items: center
    gap: 0.75rem
    margin-bottom: 1rem

    .material-icons
      font-size: 2rem
      color: $kim-border

    h2
      margin: 0
      font-family: $font-family-monospace
      text-transform: uppercase
      letter-spacing: $letter-spacing-wide

  .onboarding-intro
    font-family: $font-family-monospace
    font-size: $font-size-sm
    color: $gray-700
    margin-bottom: 1.5rem
    line-height: 1.6

  .onboarding-error
    display: flex
    align-items: center
    gap: 0.5rem
    padding: 0.75rem
    background: $danger-bg
    border: 1px solid $kim-accent
    color: $kim-accent
    font-family: $font-family-monospace
    font-size: $font-size-sm
    margin-bottom: 1rem

    .material-icons
      font-size: 1rem

  .form-group
    margin-bottom: 1.25rem

  .form-label
    display: flex
    align-items: center
    gap: 0.5rem
    font-family: $font-family-monospace
    font-size: $font-size-sm
    margin-bottom: 0.5rem
    color: $gray-700

    .material-icons
      font-size: 1rem
      color: $kim-border

  .input-retro
    width: 100%
    padding: 0.5rem 0.75rem

  .btn-primary
    width: 100%
    display: flex
    align-items: center
    justify-content: center
    gap: 0.5rem
    margin-top: 1.5rem

  .help-section
    margin-top: 1.5rem

    .panel-body
      font-size: $font-size-sm

      p
        margin: 0.5rem 0

      ol
        margin: 0.5rem 0 1rem 1.25rem
        padding: 0

        li
          margin-bottom: 0.25rem

      code
        background: $gray-200
        padding: 0.125rem 0.375rem
        font-family: $font-family-monospace
        font-size: 0.8rem
</style>
```

#### 5. Onboarding Layout
**File**: `packages/web/src/routes/onboarding/+layout.svelte` (new file)

```svelte
<script lang="ts">
  import '../../styles/_styles.sass';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap"
    rel="stylesheet"
  />
  <link
    href="https://fonts.googleapis.com/icon?family=Material+Icons"
    rel="stylesheet"
  />
  <title>Setup - TENNO.DAT</title>
</svelte:head>

<!-- CRT Effects -->
<div class="crt-overlay"></div>
<div class="noise-overlay"></div>

{@render children()}
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `pnpm typecheck`
- [x] All tests pass: `pnpm test`
- [x] No linting errors: `pnpm lint`

#### Manual Verification:
- [ ] Unauthenticated users are redirected to /login
- [ ] After Steam login, new users see onboarding page
- [ ] After completing onboarding, users see dashboard
- [ ] Returning users skip onboarding
- [ ] Logout button clears session and redirects to login
- [ ] Username in header shows Steam display name

---

## Phase 6: Update API Routes for Multi-User

### Overview
Update all existing API routes to use the authenticated user's ID instead of the single-player assumption.

### Changes Required

#### 1. Update Sync Routes
**File**: `packages/api/src/application/http/sync.ts`

```typescript
import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import { Platform } from '@warframe-tracker/shared'
import { createLogger } from '../../infrastructure/logger'
import { handleRouteError, noPlayerConfigured } from './errors'

const log = createLogger('Sync')

export function syncRoutes(container: Container) {
  const router = new Hono()

  // Get settings for authenticated user
  router.get('/settings', async (c) => {
    const auth = c.get('auth')

    try {
      const settings = await container.playerRepo.getSettings(auth.userId)
      return c.json(settings)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to fetch settings')
    }
  })

  // Save settings for authenticated user
  router.post('/settings', async (c) => {
    const auth = c.get('auth')

    try {
      const { playerId, platform: platformId } = await c.req.json<{
        playerId: string
        platform: string
      }>()

      const platform = Platform.fromId(platformId)
      if (!platform) {
        log.warn('Invalid platform', { platformId })
        return c.json({ error: `Invalid platform: ${platformId}` }, 400)
      }

      await container.playerRepo.saveSettings(auth.userId, playerId, platform)
      log.info('Settings saved', { userId: auth.userId, playerId, platform: platform.id })
      return c.json({ success: true })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to save settings')
    }
  })

  // Sync profile - now uses authenticated user
  router.post('/profile', async (c) => {
    const auth = c.get('auth')
    const settings = await container.playerRepo.getSettings(auth.userId)

    if (!settings?.playerId) {
      return noPlayerConfigured(c, log)
    }

    // ... rest of sync logic, but use auth.userId and settings.playerId
    // Update all repository calls to use auth.userId
  })

  return router
}
```

#### 2. Update Mastery Routes
**File**: `packages/api/src/application/http/mastery.ts`

Update to use `auth.userId`:
```typescript
router.get('/summary', async (c) => {
  const auth = c.get('auth')
  const settings = await container.playerRepo.getSettings(auth.userId)

  if (!settings?.playerId) {
    return noPlayerConfigured(c, log)
  }

  // Use settings.playerId for mastery queries
  const [categories, loadout, ...] = await Promise.all([
    container.masteryRepo.getSummary(settings.playerId),
    container.loadoutRepo.getWithItems(settings.playerId),
    // ...
  ])

  // ...
})
```

#### 3. Update Starchart Routes
**File**: `packages/api/src/application/http/starchart.ts`

Similar pattern - use `c.get('auth').userId` to get settings, then use `playerId` for queries.

#### 4. Update CORS Configuration
**File**: `packages/api/src/application/index.ts`

CORS origin is env-driven: `*` for local dev, specific origin in production:

```typescript
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*'

app.use('*', cors({
  origin: CORS_ORIGIN,
  credentials: true,
}))
```

**Note:** When using `credentials: true` with `origin: '*'`, browsers will still enforce same-origin for cookies. However, since our frontend explicitly sets `VITE_API_URL` to the tunnel, requests go to that origin and cookies work correctly.

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `pnpm --filter api typecheck`
- [x] All tests pass: `pnpm test`
- [x] No linting errors: `pnpm lint`

#### Manual Verification:
- [ ] Settings are isolated per user
- [ ] Mastery data is isolated per user
- [ ] Sync updates correct user's data
- [ ] Two different Steam accounts see different data

---

## Testing Strategy

### Unit Tests

#### New Tests Required:
- `packages/api/src/infrastructure/persistence/drizzle/user-repository.test.ts`
- `packages/api/src/infrastructure/persistence/drizzle/session-repository.test.ts`
- `packages/api/src/application/http/auth.test.ts`
- `packages/api/src/application/http/middleware/auth.test.ts`

#### Update Existing Tests:
- `packages/api/src/application/http/sync.test.ts` - Mock auth context
- `packages/api/src/application/http/mastery.test.ts` - Mock auth context
- `packages/api/src/test-utils.ts` - Add user and session repo mocks

### Integration Tests

Test the full auth flow:
1. Initiate Steam login
2. Handle callback
3. Create session
4. Access protected route
5. Logout

### Manual Testing Steps

1. **Fresh user flow**:
   - Clear cookies
   - Visit app → redirected to login
   - Click Steam login → redirected to Steam
   - Authenticate → redirected to onboarding
   - Enter Warframe ID → redirected to dashboard

2. **Returning user flow**:
   - Clear cookies
   - Login via Steam
   - Should skip onboarding, go directly to dashboard

3. **Session persistence**:
   - Login with "remember me"
   - Close browser
   - Reopen → should still be logged in

4. **Multi-user isolation**:
   - Login as User A, set Warframe ID to "AAA"
   - Logout
   - Login as User B, set Warframe ID to "BBB"
   - User B should see only their data

## Performance Considerations

- Session lookups happen on every protected request - indexed by session ID
- Consider adding session caching (Redis) if latency becomes an issue
- Expired session cleanup should run periodically (cron job or on-demand)

## Migration Notes

- Existing single-user data will have `NULL` user_id - this is acceptable
- After migration, the first user to login will need to re-enter their Warframe ID
- No automatic migration of existing data to new users

## References

- Research document: `thoughts/shared/research/R2-2026-01-27-warframe-sso-authentication.md`
- Steam OpenID docs: https://steamcommunity.com/dev
- Steam Web API: https://partner.steamgames.com/doc/webapi_overview
- Existing settings implementation: `packages/web/src/routes/settings/+page.svelte`
