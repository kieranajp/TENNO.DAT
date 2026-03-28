# PLAN 7: Delete Account

## Overview

Add a "delete my account" feature to the settings modal. Hard delete — nukes user row, all sessions, player settings, mastery data, loadout, nodes, wishlist, and prime parts. Simple confirmation dialog, then gone.

## Current State Analysis

- `users` table cascades to `sessions` and `playerSettings` via FK (`onDelete: 'cascade'`)
- Player data tables (`playerMastery`, `playerLoadout`, `playerNodes`, `playerWishlist`, `playerPrimeParts`) are keyed by `playerId` (varchar), **not** `userId` — no FK cascade to users
- No `delete` method on `UserRepository`
- No `DELETE` endpoint anywhere in the API
- Settings modal (`SettingsDialog.svelte`) is a simple form with player ID + platform + save button
- Auth store (`auth.ts`) already has a `clear()` method
- Frontend `api.ts` already has a `logout()` function

### Key Discoveries:
- Schema cascades only cover `sessions` and `playerSettings` — player data needs explicit deletion (`schema.ts:17,115`)
- `playerId` may be `null` if onboarding wasn't completed (`player.ts:4`) — handle gracefully
- Auth middleware at `middleware/auth.ts:19` gives us `userId` and `steamId` on the context
- The delete route only needs auth middleware, not onboarding middleware (user should be able to delete even if they never finished onboarding)

## Desired End State

- `DELETE /auth/account` endpoint that deletes all user data and clears the session
- Settings modal has a danger zone section with a "Delete Account" button
- Clicking it shows a simple confirmation dialog
- On confirm, calls the API, clears auth state, redirects to login page
- All data associated with the user is permanently removed from the database

### Verification:
- Unit tests for the new `delete` method on `UserRepository`
- Unit tests for the `DELETE /auth/account` route
- Manual verification: delete account → confirm all tables are clean → redirected to login

## What We're NOT Doing

- Soft delete / grace period / tombstoning
- Email confirmation or "type DELETE to confirm"
- Data export before deletion
- Admin-initiated account deletion

## Implementation Approach

Two phases: backend (new port method + route), then frontend (danger zone in settings modal).

## Phase 1: Backend — Delete Account Endpoint

### Overview
Add `delete(id)` to `UserRepository`, then expose `DELETE /auth/account`.

### Changes Required:

#### 1. User Repository Port
**File**: `packages/api/src/domain/ports/user-repository.ts`
**Changes**: Add `delete` method to the interface

```typescript
delete(id: number): Promise<void>
```

#### 2. Drizzle User Repository
**File**: `packages/api/src/infrastructure/persistence/drizzle/user-repository.ts`
**Changes**: Implement `delete` — fetch `playerId` from settings, wipe player data tables, then delete user row (cascading sessions + settings)

```typescript
async delete(id: number): Promise<void> {
  // Get playerId before deleting (may be null if onboarding incomplete)
  const settings = await this.db
    .select({ playerId: playerSettings.playerId })
    .from(playerSettings)
    .where(eq(playerSettings.userId, id))
    .limit(1)

  const playerId = settings[0]?.playerId

  // Delete player data (not FK-cascaded)
  if (playerId) {
    await this.db.delete(playerMastery).where(eq(playerMastery.playerId, playerId))
    await this.db.delete(playerLoadout).where(eq(playerLoadout.playerId, playerId))
    await this.db.delete(playerNodes).where(eq(playerNodes.playerId, playerId))
    await this.db.delete(playerWishlist).where(eq(playerWishlist.playerId, playerId))
    await this.db.delete(playerPrimeParts).where(eq(playerPrimeParts.playerId, playerId))
  }

  // Delete user row (cascades sessions + playerSettings)
  await this.db.delete(users).where(eq(users.id, id))
}
```

#### 3. Auth Routes
**File**: `packages/api/src/application/http/auth.ts`
**Changes**: Add `DELETE /account` route

```typescript
// DELETE /auth/account - Delete user account and all data
router.delete('/account', async (c) => {
  try {
    const sessionId = getCookie(c, SESSION_COOKIE)

    if (!sessionId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const sessionData = await container.sessionRepo.findByIdWithUser(sessionId)

    if (!sessionData || sessionData.session.expiresAt < new Date()) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    await container.userRepo.delete(sessionData.userId)

    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    log.info('Account deleted', { userId: sessionData.userId })

    return c.json({ success: true })
  } catch (error) {
    return handleRouteError(c, log, error, 'Failed to delete account')
  }
})
```

Note: this route does its own session validation inline (like `/auth/me` and `/auth/logout`) rather than using the auth middleware, since auth routes are mounted before the middleware in `index.ts:34`. This is consistent with the existing pattern.

#### 4. App Route Registration
**File**: `packages/api/src/application/index.ts`
**Changes**: None — the auth routes are already mounted at `/auth`, so `/auth/account` is automatically available.

#### 5. Mock Container
**File**: `packages/api/src/test-utils.ts`
**Changes**: Add `delete` mock to `userRepo`

```typescript
userRepo: {
  // ... existing mocks
  delete: vi.fn(),
},
```

#### 6. Unit Tests — User Repository
**File**: `packages/api/src/infrastructure/persistence/drizzle/user-repository.test.ts`
**Changes**: Add test for `delete` method

Tests:
- Deletes user and all associated player data
- Handles user with no playerId (onboarding incomplete) — should still delete user row
- Handles user with no player data at all

#### 7. Unit Tests — Auth Route
**File**: `packages/api/src/application/http/auth.test.ts`
**Changes**: Add tests for `DELETE /auth/account`

Tests:
- Returns 401 when no session cookie
- Returns 401 when session expired
- Calls `userRepo.delete` with correct userId
- Clears session cookie on success
- Returns `{ success: true }`

### Success Criteria:

#### Automated Verification:
- [ ] All existing tests still pass: `pnpm test`
- [ ] New user repository tests pass
- [ ] New auth route tests pass
- [ ] TypeScript compiles: `pnpm --filter api exec tsc --noEmit`

#### Manual Verification:
- [ ] `DELETE /auth/account` returns 401 without session
- [ ] `DELETE /auth/account` deletes user and returns success with valid session
- [ ] All player data tables are empty for that user after deletion
- [ ] Session cookie is cleared

---

## Phase 2: Frontend — Danger Zone in Settings Modal

### Overview
Add a danger zone section to the settings modal with a delete button and simple confirmation.

### Changes Required:

#### 1. API Client
**File**: `packages/web/src/lib/api.ts`
**Changes**: Add `deleteAccount` function

```typescript
export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/account`, {
    method: 'DELETE',
    credentials: 'include'
  });
  await handleResponse(res);
}
```

#### 2. Settings Dialog
**File**: `packages/web/src/lib/components/SettingsDialog.svelte`
**Changes**: Add danger zone section below the form, with delete button and inline confirm state

- Add `confirming` and `deleting` state variables
- Add a "DANGER ZONE" section with a horizontal rule separator
- "Delete Account" button — first click sets `confirming = true`, shows "Are you sure? This is permanent." with Confirm/Cancel buttons
- Confirm calls `deleteAccount()`, on success calls `auth.clear()` and navigates to `/login`

#### 3. Auth Store Integration
The settings dialog will import `auth` from `$lib/stores/auth` and call `auth.clear()` after successful deletion, then use `goto('/login')` from SvelteKit navigation.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web exec svelte-check`
- [ ] Existing E2E tests still pass: `cd packages/web && pnpm test:e2e`

#### Manual Verification:
- [ ] Danger zone section appears at bottom of settings modal
- [ ] First click shows confirmation prompt
- [ ] Cancel returns to normal state
- [ ] Confirm deletes account, redirects to login
- [ ] After deletion, visiting any protected page redirects to login

---

## Testing Strategy

### Unit Tests:
- `user-repository.test.ts` — delete with full data, delete with null playerId, delete with no player data
- `auth.test.ts` — DELETE /auth/account auth checks, success path, error handling

### Manual Testing Steps:
1. Log in, set up account with synced data
2. Open settings modal, scroll to danger zone
3. Click Delete Account → see confirmation
4. Click Cancel → back to normal
5. Click Delete Account → Confirm → redirected to login
6. Try to log in again → should create fresh account (Steam re-auth creates new user)
7. Verify database tables are clean for old playerId

## References

- Auth routes: `packages/api/src/application/http/auth.ts`
- User repository: `packages/api/src/infrastructure/persistence/drizzle/user-repository.ts`
- Settings dialog: `packages/web/src/lib/components/SettingsDialog.svelte`
- Schema (cascade config): `packages/api/src/infrastructure/persistence/drizzle/schema.ts:17,115`
