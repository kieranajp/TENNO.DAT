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
    labelNames: ['error_type'] as const,
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

  startingProfileFetch(platform: string) {
    return this.profileFetchDuration.startTimer({ platform })
  }

  profileFetchSucceeded(payloadBytes: number) {
    this.profilePayloadBytes.observe(payloadBytes)
  }

  profileFetchFailed(errorType: 'rate_limited' | 'private_profile' | 'http_error' | 'network_error') {
    this.profileFetchErrors.inc({ error_type: errorType })
  }

  itemsMatched(matched: number, unmatched: number) {
    this.syncItemsMatched.set(matched)
    this.syncItemsUnmatched.set(unmatched)
  }

  profileSyncCompleted(masteryRank: number) {
    this.syncCompleted.inc()
    this.masteryRankDistribution.observe(masteryRank)
  }
}
