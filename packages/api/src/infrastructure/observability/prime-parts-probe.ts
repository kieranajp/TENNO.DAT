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
