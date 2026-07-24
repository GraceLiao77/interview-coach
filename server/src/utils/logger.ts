// Central logger. Use this instead of console.* so log format/level/transport
// can be changed in one place (and swapped for a real logger later, e.g. pino).

type Level = 'debug' | 'info' | 'warn' | 'error';

// Quieten debug/info noise in production; always surface warnings and errors.
const isProd = process.env.NODE_ENV === 'production';
const enabled: Record<Level, boolean> = {
  debug: !isProd,
  info: !isProd,
  warn: true,
  error: true,
};

function emit(level: Level, message: string, meta?: unknown): void {
  if (!enabled[level]) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  // The one place in the codebase allowed to touch the console.
  const sink = level === 'error' || level === 'warn' ? console.error : console.log;
  if (meta !== undefined) sink(line, meta);
  else sink(line);
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit('debug', message, meta),
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
