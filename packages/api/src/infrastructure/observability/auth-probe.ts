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
    labelNames: ['user_type'] as const,
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
