import type { LogLevel } from '../types';

const PINO_NUMERIC_LEVEL_MAP: Readonly<Record<number, LogLevel>> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

const PINO_STRING_LEVEL_MAP: Readonly<Record<string, LogLevel>> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  warning: 'warn',
  error: 'error',
  fatal: 'fatal',
};

export const mapPinoLevel = (value: unknown): LogLevel | undefined => {
  if (typeof value === 'number') {
    return PINO_NUMERIC_LEVEL_MAP[value];
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const mappedLevel = PINO_STRING_LEVEL_MAP[normalized];

  if (mappedLevel !== undefined) {
    return mappedLevel;
  }

  const numericValue = Number(normalized);

  if (Number.isInteger(numericValue)) {
    return PINO_NUMERIC_LEVEL_MAP[numericValue];
  }

  return undefined;
};
