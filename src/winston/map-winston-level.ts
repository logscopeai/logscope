import type { LogLevel } from '../types';

const WINSTON_LEVEL_MAP: Readonly<Record<string, LogLevel>> = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  http: 'info',
  verbose: 'debug',
  debug: 'debug',
  silly: 'trace',
};

export const mapWinstonLevel = (value: unknown): LogLevel | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return WINSTON_LEVEL_MAP[value.trim().toLowerCase()];
};
