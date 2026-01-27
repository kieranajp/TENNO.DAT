import type { Context } from 'hono'
import type { Logger } from '../../infrastructure/logger'

/**
 * Standard error response helper for route handlers.
 * Logs the error and returns a consistent JSON response.
 */
export function handleRouteError(
  c: Context,
  log: Logger,
  error: unknown,
  fallbackMessage: string
) {
  log.error(fallbackMessage, error instanceof Error ? error : undefined)
  const message = error instanceof Error ? error.message : fallbackMessage
  return c.json({ error: message }, 500)
}

/**
 * Returns a 400 response when player settings are not configured.
 * Optionally logs the event.
 */
export function noPlayerConfigured(c: Context, log?: Logger) {
  if (log) {
    log.warn('Request rejected: no player configured')
  }
  return c.json({ error: 'No player configured' }, 400)
}
