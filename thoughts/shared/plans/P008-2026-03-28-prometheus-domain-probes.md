# PLAN 8: Prometheus Metrics via Domain Probes

## Overview

Add Prometheus metrics to the API using the [domain probes pattern](https://martinfowler.com/articles/domain-oriented-observability.html). Each domain area gets a dedicated probe class that owns its metrics and speaks domain language — route handlers call `probe.profileSyncCompleted(...)` rather than scattering raw `counter.inc()` calls. `@hono/prometheus` handles the boring RED metrics (request count/duration/status by route) automatically.

## Current State Analysis

- No metrics, tracing, or observability dependencies exist (`package.json:1-29`)
- Logging is bespoke console output via `createLogger()` — used in 14 files but not structured
- The DI container (`container.ts:23-34`) is a plain object of port interfaces — no lifecycle, no middleware hooks
- Route factories receive the container and close over it — adding a new collaborator means passing it alongside
- Error handling is per-route via `handleRouteError()` (`errors.ts:8-17`) — no global `app.onError()`
- Seed scripts (`seed.ts`, `seed-nodes.ts`) run as standalone `tsx` processes and `process.exit(0)` — cannot be scraped by Prometheus, deferred to a future Pushgateway phase

### Key Discoveries
- Auth callback (`auth.ts:44-96`) doesn't use `handleRouteError` — it redirects on failure, so error counting needs to happen before the redirect
- Account deletion (`auth.ts:99-122`) bypasses auth middleware and manually validates the session — the user row is gone after `userRepo.delete()`, so a counter is the only record
- `DeProfileApi.fetch()` (`de-profile-api.ts:8-72`) throws specific errors for 403/409 — these are catchable for error-type labelling
- Profile sync (`sync.ts:49-186`) has rich data at each step: matched/unmatched counts, mastery records length, node completions, etc.

## Desired End State

A `/metrics` endpoint serving Prometheus text format with:
- Automatic RED metrics for all HTTP routes (via `@hono/prometheus`)
- Domain-specific metrics instrumented via probe classes, not scattered through handlers
- Probes injected as collaborators into route factories and infrastructure classes

Verification: `curl localhost:3000/metrics` returns Prometheus text with all custom metrics registered. TypeScript compiles. Existing tests pass.

## What We're NOT Doing

- Seed script metrics (needs Pushgateway — separate phase)
- Structured JSON logging (orthogonal concern)
- Tracing / OpenTelemetry spans
- Grafana dashboards or alerting rules
- Active session gauge (would need periodic DB count query or session create/delete tracking with risk of drift — better done as a Postgres metric exporter query)

## Implementation Approach

Three probe classes, one per domain area, each owning a set of `prom-client` metrics. All probes share a single `Registry` instance. `@hono/prometheus` middleware uses the same registry for its automatic RED metrics. The probes are instantiated once at startup and passed into route/infrastructure factories alongside the container.

Architecturally, probes live in `infrastructure/observability/` — they're an infrastructure concern (they know about prom-client) but speak domain language (their public API uses domain terms).

---

## Phase 1: Foundation

### Overview
Install dependencies, create the shared registry, wire up `@hono/prometheus` for automatic RED metrics, expose `/metrics`.

### Changes Required

#### 1. Install dependencies

```bash
cd packages/api && pnpm add prom-client @hono/prometheus
```

#### 2. Shared metrics registry
**File**: `packages/api/src/infrastructure/observability/registry.ts` (new)

```typescript
import { Registry, collectDefaultMetrics } from 'prom-client'

export const registry = new Registry()

registry.setDefaultLabels({ app: 'tenno-api' })
collectDefaultMetrics({ register: registry })
```

A singleton module — imported by probes and by the Hono prometheus middleware config.

#### 3. Wire `@hono/prometheus` and `/metrics` endpoint
**File**: `packages/api/src/application/index.ts`

Add after the `cors` middleware setup (line 27):

```typescript
import { prometheus } from '@hono/prometheus'
import { registry } from '../infrastructure/observability/registry'

const { printMetrics, registerMetrics } = prometheus({ registry })

app.use('*', registerMetrics)
app.get('/metrics', printMetrics)
```

The `/metrics` route goes before the auth middleware bindings so it's publicly accessible (for scraping).

### Success Criteria

#### Automated Verification
- [x] `cd packages/api && pnpm tsc --noEmit` passes
- [x] `curl localhost:3000/metrics` returns Prometheus text format including `http_requests_total` and `nodejs_*` default metrics
- [x] `curl localhost:3000/health` still returns `{"status":"ok"}`
- [x] `pnpm test` passes (no regressions)

---

## Phase 2: Domain Probes

### Overview
Create four probe classes — `SyncProbe`, `AuthProbe`, `PrimePartsProbe`, `DbProbe` — each owning their prom-client metrics and exposing a domain-language API.

### Changes Required

#### 1. Sync probe
**File**: `packages/api/src/infrastructure/observability/sync-probe.ts` (new)

```typescript
import { Counter, Histogram, Gauge } from 'prom-client'
import { registry } from './registry'

export class SyncProbe {
  private readonly profileFetchDuration = new Histogram({
    name: 'tenno_de_profile_fetch_duration_seconds',
    help: 'Time to fetch a profile from the DE API',
    labelNames: ['platform'] as const,
    buckets: [0.5, 1, 2, 5, 10, 20, 30],
    registers: [registry],
  })

  private readonly profileFetchErrors = new Counter({
    name: 'tenno_de_profile_fetch_errors_total',
    help: 'DE profile fetch errors by type',
    labelNames: ['error_type'] as const, // rate_limited, private_profile, http_error, network_error
    registers: [registry],
  })

  private readonly profilePayloadBytes = new Histogram({
    name: 'tenno_de_profile_payload_bytes',
    help: 'Size of DE profile API responses in bytes',
    buckets: [10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000],
    registers: [registry],
  })

  private readonly syncItemsMatched = new Gauge({
    name: 'tenno_sync_items_matched',
    help: 'Items matched in the most recent sync (per-sync snapshot)',
    registers: [registry],
  })

  private readonly syncItemsUnmatched = new Gauge({
    name: 'tenno_sync_items_unmatched',
    help: 'Items unmatched in the most recent sync (per-sync snapshot)',
    registers: [registry],
  })

  private readonly syncCompleted = new Counter({
    name: 'tenno_sync_completed_total',
    help: 'Successful profile syncs',
    registers: [registry],
  })

  private readonly masteryRankDistribution = new Histogram({
    name: 'tenno_mastery_rank',
    help: 'Distribution of synced player mastery ranks',
    buckets: [0, 5, 10, 15, 20, 25, 30, 31, 32, 33, 34, 35],
    registers: [registry],
  })

  // Called in DeProfileApi.fetch() — wraps the actual HTTP call
  startingProfileFetch(platform: string) {
    return this.profileFetchDuration.startTimer({ platform })
  }

  profileFetchSucceeded(payloadBytes: number) {
    this.profilePayloadBytes.observe(payloadBytes)
  }

  profileFetchFailed(errorType: 'rate_limited' | 'private_profile' | 'http_error' | 'network_error') {
    this.profileFetchErrors.inc({ error_type: errorType })
  }

  // Called in sync route after XP matching
  itemsMatched(matched: number, unmatched: number) {
    this.syncItemsMatched.set(matched)
    this.syncItemsUnmatched.set(unmatched)
  }

  // Called at the end of a successful sync
  profileSyncCompleted(masteryRank: number) {
    this.syncCompleted.inc()
    this.masteryRankDistribution.observe(masteryRank)
  }
}
```

#### 2. Auth probe
**File**: `packages/api/src/infrastructure/observability/auth-probe.ts` (new)

```typescript
import { Counter } from 'prom-client'
import { registry } from './registry'

export class AuthProbe {
  private readonly steamAuthAttempts = new Counter({
    name: 'tenno_steam_auth_attempts_total',
    help: 'Steam OpenID auth attempts',
    registers: [registry],
  })

  private readonly steamAuthFailures = new Counter({
    name: 'tenno_steam_auth_failures_total',
    help: 'Steam OpenID auth failures',
    registers: [registry],
  })

  private readonly steamAuthSuccesses = new Counter({
    name: 'tenno_steam_auth_successes_total',
    help: 'Steam OpenID auth successes',
    labelNames: ['user_type'] as const, // new, returning
    registers: [registry],
  })

  private readonly accountDeletions = new Counter({
    name: 'tenno_account_deletions_total',
    help: 'User account deletions',
    registers: [registry],
  })

  steamAuthStarted() {
    this.steamAuthAttempts.inc()
  }

  steamAuthSucceeded(isNewUser: boolean) {
    this.steamAuthSuccesses.inc({ user_type: isNewUser ? 'new' : 'returning' })
  }

  steamAuthFailed() {
    this.steamAuthFailures.inc()
  }

  accountDeleted() {
    this.accountDeletions.inc()
  }
}
```

#### 3. Prime parts probe
**File**: `packages/api/src/infrastructure/observability/prime-parts-probe.ts` (new)

```typescript
import { Counter } from 'prom-client'
import { registry } from './registry'

export class PrimePartsProbe {
  private readonly toggles = new Counter({
    name: 'tenno_prime_parts_toggles_total',
    help: 'Prime part ownership toggles',
    registers: [registry],
  })

  partToggled() {
    this.toggles.inc()
  }
}
```

#### 4. DB operation duration probe
**File**: `packages/api/src/infrastructure/observability/db-probe.ts` (new)

```typescript
import { Histogram } from 'prom-client'
import { registry } from './registry'

export class DbProbe {
  private readonly queryDuration = new Histogram({
    name: 'tenno_db_query_duration_seconds',
    help: 'Database query duration by repository method',
    labelNames: ['method'] as const,
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  })

  startQuery(method: string) {
    return this.queryDuration.startTimer({ method })
  }
}
```

#### 5. Barrel export
**File**: `packages/api/src/infrastructure/observability/index.ts` (new)

```typescript
export { registry } from './registry'
export { SyncProbe } from './sync-probe'
export { AuthProbe } from './auth-probe'
export { PrimePartsProbe } from './prime-parts-probe'
export { DbProbe } from './db-probe'
```

### Success Criteria

#### Automated Verification
- [x] `cd packages/api && pnpm tsc --noEmit` passes
- [x] All probe classes can be instantiated without errors (verified by Phase 3 integration)

---

## Phase 3: Wire Probes into Handlers

### Overview
Instantiate probes at startup, pass them into route factories and infrastructure classes, and call probe methods at the appropriate domain points.

### Changes Required

#### 1. Instantiate probes at startup
**File**: `packages/api/src/application/index.ts`

After `createContainer()` (line 18), add:

```typescript
import { SyncProbe, AuthProbe, PrimePartsProbe, DbProbe } from '../infrastructure/observability'

const syncInstrumentation = new SyncProbe()
const authInstrumentation = new AuthProbe()
const primePartsInstrumentation = new PrimePartsProbe()
const dbInstrumentation = new DbProbe()
```

Pass them into route factories:

```typescript
app.route('/auth', authRoutes(container, authInstrumentation))
app.route('/sync', syncRoutes(container, syncInstrumentation, dbInstrumentation))
app.route('/primes', primePartsRoutes(container, primePartsInstrumentation, dbInstrumentation))
```

Other routes (`items`, `mastery`, `starchart`, `wishlist`) get `dbInstrumentation` only:

```typescript
app.route('/items', itemsRoutes(container, dbInstrumentation))
app.route('/mastery', masteryRoutes(container, dbInstrumentation))
app.route('/starchart', starchartRoutes(container, dbInstrumentation))
app.route('/wishlist', wishlistRoutes(container, dbInstrumentation))
```

#### 2. Instrument DeProfileApi
**File**: `packages/api/src/infrastructure/external/de-profile-api.ts`

The `DeProfileApi` needs a `SyncProbe` dependency. Add it as a constructor param:

```typescript
export class DeProfileApi implements ProfileApi {
  constructor(private readonly instrumentation: SyncProbe) {}

  async fetch(playerId: string, platform: Platform): Promise<ProfileData> {
    const endTimer = this.instrumentation.startingProfileFetch(platform.id)

    try {
      const response = await fetch(url)

      if (!response.ok) {
        // Classify error type for metrics
        if (response.status === 403) {
          this.instrumentation.profileFetchFailed('rate_limited')
          throw new Error('Access denied - you may be rate limited...')
        }
        if (response.status === 409) {
          this.instrumentation.profileFetchFailed('private_profile')
          throw new Error('Profile is private...')
        }
        this.instrumentation.profileFetchFailed('http_error')
        throw new Error(`Profile API error: ${response.status}...`)
      }

      const text = await response.text()
      this.instrumentation.profileFetchSucceeded(text.length)
      endTimer()

      const data = JSON.parse(text)
      // ... rest of parsing unchanged
    } catch (error) {
      if (error instanceof TypeError) {
        // fetch() itself failed (network error, DNS, etc.)
        this.instrumentation.profileFetchFailed('network_error')
      }
      endTimer()
      throw error
    }
  }
}
```

Note: this changes the constructor signature, so `container.ts` must pass `syncInstrumentation` when constructing `DeProfileApi`. Since probes are instantiated before the container, update `createContainer` to accept probes:

**File**: `packages/api/src/infrastructure/bootstrap/container.ts`

```typescript
import type { SyncProbe } from '../observability/sync-probe'

export function createContainer(syncInstrumentation: SyncProbe): Container {
  return {
    // ...existing repos...
    profileApi: new DeProfileApi(syncInstrumentation),
  }
}
```

And in `index.ts`, move probe instantiation before container creation:

```typescript
const syncInstrumentation = new SyncProbe()
// ... other probes ...
const container = createContainer(syncInstrumentation)
```

#### 3. Instrument sync route
**File**: `packages/api/src/application/http/sync.ts`

Update factory signature:

```typescript
export function syncRoutes(
  container: Container,
  instrumentation: SyncProbe,
  db: DbProbe
)
```

In `POST /profile` handler, after XP matching (around line 74):

```typescript
instrumentation.itemsMatched(matchedCount, profile.xpComponents.length - matchedCount)
```

Before the mastery upsert (line 107):

```typescript
const endUpsert = db.startQuery('masteryRepo.upsertMany')
await container.masteryRepo.upsertMany(masteryRecords)
endUpsert()
```

Same pattern for other DB calls: `nodeRepo.upsertCompletions`, `primePartsRepo.markOwned`, etc.

At the end of a successful sync (before the return, around line 177):

```typescript
instrumentation.profileSyncCompleted(profile.playerLevel)
```

#### 4. Instrument auth routes
**File**: `packages/api/src/application/http/auth.ts`

Update factory signature:

```typescript
export function authRoutes(container: Container, instrumentation: AuthProbe)
```

In `GET /steam` (line 23):

```typescript
instrumentation.steamAuthStarted()
```

In `GET /steam/callback`, success path (around line 88):

```typescript
instrumentation.steamAuthSucceeded(!existingUser)
```

Where `existingUser` is a boolean derived from the `let user = await container.userRepo.findBySteamId(steamId)` check — rename the variable or capture the boolean:

```typescript
let user = await container.userRepo.findBySteamId(steamId)
const isNewUser = !user
// ... existing create/update logic ...
instrumentation.steamAuthSucceeded(isNewUser)
```

In the catch block (line 92):

```typescript
instrumentation.steamAuthFailed()
```

In `DELETE /account`, after successful deletion (line 113):

```typescript
instrumentation.accountDeleted()
```

#### 5. Instrument prime parts routes
**File**: `packages/api/src/application/http/prime-parts.ts`

Update factory signature:

```typescript
export function primePartsRoutes(
  container: Container,
  instrumentation: PrimePartsProbe,
  db: DbProbe
)
```

In `POST /components/:componentId/toggle`, after the toggle call (line 19):

```typescript
instrumentation.partToggled()
```

#### 6. Instrument remaining route factories
**Files**: `items.ts`, `mastery.ts`, `starchart.ts`, `wishlist.ts`

Each gets `DbProbe` as a second parameter. Wrap key DB calls with `db.startQuery('repo.method')` / `endTimer()`. The important ones:

- `mastery.ts`: `masteryRepo.getSummary`, `masteryRepo.getItemsWithMastery`
- `starchart.ts`: `nodeRepo.getNodesWithCompletion`
- `items.ts`: `itemRepo.findAll`, `itemRepo.findPrimesWithComponents`

### Success Criteria

#### Automated Verification
- [x] `cd packages/api && pnpm tsc --noEmit` passes
- [x] `pnpm test` passes
- [x] `curl localhost:3000/metrics | grep tenno_` shows all custom metrics registered (even if 0-valued)

#### Manual Verification
- [ ] Trigger a profile sync → `tenno_de_profile_fetch_duration_seconds` and `tenno_sync_completed_total` increment
- [ ] Log in via Steam → `tenno_steam_auth_attempts_total` and `tenno_steam_auth_successes_total` increment
- [ ] Toggle a prime part → `tenno_prime_parts_toggles_total` increments
- [ ] Delete an account → `tenno_account_deletions_total` increments
- [ ] DB operation histograms show sensible sub-second values

---

## Testing Strategy

### Unit Tests
- No new unit tests needed — probes are thin wrappers around prom-client, testing them would be testing the library
- Existing tests must continue to pass — route factory signatures change, but tests mock the container and can pass `undefined` or a stub for instrumentation params if needed

### Integration / Manual
- Spin up locally, hit endpoints, verify `/metrics` output
- Check that the `@hono/prometheus` auto-metrics have sensible route labels (not parameterised IDs leaking into cardinality)

## Performance Considerations

- prom-client metrics are in-memory counters/histograms — negligible overhead
- `@hono/prometheus` adds one middleware layer to every request — sub-microsecond
- `response.text()` + `JSON.parse()` in `DeProfileApi` instead of `response.json()` adds one extra string allocation per sync to measure payload size — acceptable given syncs are already 600KB+ and infrequent

## Migration Notes

- No DB changes required
- No breaking API changes — `/metrics` is a new endpoint
- VictoriaMetrics scrape config needs updating to include the new target (out of scope for this plan)

## Future Work (Deferred)

- **Seed metrics** via Pushgateway: `tenno_seed_duration_seconds`, `tenno_seed_category_item_count` gauge per category, `tenno_seed_category_changes` showing items added/removed vs previous run
- **Active sessions gauge**: better done as a VictoriaMetrics recording rule from a Postgres exporter query (`SELECT count(*) FROM sessions WHERE expires_at > now()`)
- **Mastery rank distribution as a gauge**: currently using a histogram which observes per-sync — could alternatively be a periodic DB query gauge for the full population

## References

- Domain-Oriented Observability: https://martinfowler.com/articles/domain-oriented-observability.html
- prom-client: https://github.com/siimon/prom-client
- @hono/prometheus: https://github.com/honojs/middleware/tree/main/packages/prometheus
