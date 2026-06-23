type LogLevel = 'info' | 'warn' | 'error';

type FileLogWriter = (line: string) => void;

let fileLogWriter: FileLogWriter | null = null;

export const setFileLogWriter = (writer: FileLogWriter): void => {
  fileLogWriter = writer;
};

const write = (level: LogLevel, scope: string, message: string, meta?: unknown): void => {
  const prefix = `[launcher:${scope}] ${message}`;
  const line = meta === undefined ? prefix : `${prefix} ${formatMeta(meta)}`;
  fileLogWriter?.(`[${new Date().toISOString()}] [${level}] ${line}`);

  if (meta === undefined) {
    console[level](prefix);
    return;
  }

  console[level](prefix, meta);
};

export const createLogger = (scope: string) => ({
  info: (message: string, meta?: unknown) => write('info', scope, message, meta),
  warn: (message: string, meta?: unknown) => write('warn', scope, message, meta),
  error: (message: string, meta?: unknown) => write('error', scope, message, meta),
});

const formatMeta = (meta: unknown): string => {
  if (meta instanceof Error) {
    return `${meta.name}: ${meta.message}\n${meta.stack ?? ''}`;
  }

  if (typeof meta === 'string') {
    return meta;
  }

  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
};
