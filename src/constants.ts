import type { LogLevel } from './types';

export const LOG_LEVELS: ReadonlyArray<LogLevel> = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
];

export const METADATA_PRIMITIVE_VALUE_KEY = 'value';
export const MAX_MESSAGE_LENGTH = 2_048;
export const MAX_METADATA_BYTES = 2_048;
export const SAFE_FALLBACK_SOURCE = 'unknown';
export const DEFAULT_INGESTION_URL = 'https://ingestion.logscopeai.com';
export const DEFAULT_INGESTION_BASE_URL = DEFAULT_INGESTION_URL;
export const LOGSCOPE_INGESTION_URL_ENV_VAR = 'LOGSCOPE_INGESTION_URL';
