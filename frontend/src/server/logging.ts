type LogMeta = Record<string, unknown>;

function formatEntry(level: string, event: string, meta?: LogMeta, err?: unknown) {
  const entry: LogMeta = {
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  };
  if (err instanceof Error) {
    entry.error = err.message;
    if (process.env.NODE_ENV !== 'production') entry.stack = err.stack;
  } else if (err !== undefined) {
    entry.error = String(err);
  }
  return JSON.stringify(entry);
}

export const serverLog = {
  info(event: string, meta?: LogMeta) {
    console.info(formatEntry('info', event, meta));
  },
  warn(event: string, meta?: LogMeta) {
    console.warn(formatEntry('warn', event, meta));
  },
  error(event: string, err?: unknown, meta?: LogMeta) {
    console.error(formatEntry('error', event, meta, err));
  },
};
