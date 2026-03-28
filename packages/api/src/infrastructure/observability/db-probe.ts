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
