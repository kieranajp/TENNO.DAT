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
      this.log('error', message, { error: error.message, stack: error.stack })
    } else {
      this.log('error', message, error)
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context)
}
