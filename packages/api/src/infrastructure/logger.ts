type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',  // gray
  info: '\x1b[36m',   // cyan
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
}

const RESET = '\x1b[0m'

export class Logger {
  private context: string
  private minLevel: LogLevel

  constructor(context: string) {
    this.context = context
    const envLevel = typeof process !== 'undefined' ? process.env.LOG_LEVEL : undefined
    this.minLevel = (envLevel as LogLevel) ?? 'debug'
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return

    const timestamp = new Date().toISOString()
    const color = LEVEL_COLORS[level]
    const prefix = `${color}${timestamp} [${level.toUpperCase()}] [${this.context}]${RESET}`

    if (data) {
      console.log(prefix, message, JSON.stringify(data, null, 2))
    } else {
      console.log(prefix, message)
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log('debug', message, data)
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data)
  }

  error(message: string, error?: Error | Record<string, unknown>) {
    if (error instanceof Error) {
      this.log('error', message, { error: error.message, stack: error.stack, cause: describeCause(error) })
    } else {
      this.log('error', message, error)
    }
  }
}

/**
 * Walk an error's `.cause` chain and pull out the useful diagnostics.
 *
 * Driver/ORM errors (e.g. Drizzle) set their top-level message to the full
 * parametrised query and hang the actual failure — with Postgres fields like
 * code/detail/constraint — off `.cause`. Without this, the real reason (e.g.
 * "date/time field value out of range") never reaches the logs.
 */
function describeCause(error: Error): Record<string, unknown>[] | undefined {
  const chain: Record<string, unknown>[] = []
  const seen = new Set<unknown>()
  let current: unknown = (error as { cause?: unknown }).cause
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current)
    const pg = current as unknown as Record<string, unknown>
    const entry: Record<string, unknown> = { message: current.message }
    for (const field of ['code', 'detail', 'column', 'table', 'constraint', 'severity', 'routine']) {
      if (pg[field] != null) entry[field] = pg[field]
    }
    chain.push(entry)
    current = pg.cause
  }
  return chain.length ? chain : undefined
}

export function createLogger(context: string): Logger {
  return new Logger(context)
}
