// ---------------------------------------------------------------------------
// Structured Logger
// Provides consistent, professional log output without special characters or
// emoji. All log entries include a timestamp, severity level, and structured
// context object for easy parsing in production log aggregation tools.
// ---------------------------------------------------------------------------

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Formats and prints a structured log line to stdout.
 * Format: [TIMESTAMP] LEVEL | message | key=value key=value ...
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  let line = `[${timestamp}] ${level} | ${message}`;

  if (context) {
    const pairs = Object.entries(context)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    if (pairs) {
      line += ` | ${pairs}`;
    }
  }

  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log('INFO', message, context),
  warn: (message: string, context?: LogContext) => log('WARN', message, context),
  error: (message: string, context?: LogContext) => log('ERROR', message, context),
  debug: (message: string, context?: LogContext) => log('DEBUG', message, context),
};
