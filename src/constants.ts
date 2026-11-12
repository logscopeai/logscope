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

// Public ingest contract limits. These mirror `docs/compatibility-contract.md` in
// `logscope-ingestion-api` (`src/shared/contracts/ingest/v1/limits.ts` there); the API rejects a
// whole batch with 400 when any entry violates them, so the SDK normalises every entry up front.
export const MAX_LOGS_PER_BATCH = 50;
export const MIN_SOURCE_LENGTH = 2;
export const MAX_SOURCE_LENGTH = 100;
export const MIN_MESSAGE_LENGTH = 1;
/** UTF-16 code units after trimming, not bytes — the same unit the API counts. */
export const MAX_MESSAGE_LENGTH = 2_048;
export const MAX_METADATA_BYTES = 2_048;
export const MAX_METADATA_KEYS = 50;
/** `metadata.requestId` is forwarded to the log index; the API rejects it above this length. */
export const MAX_REQUEST_ID_LENGTH = 160;
export const METADATA_REQUEST_ID_KEY = 'requestId';
/** Substituted when a message is empty after trimming so the entry (and its metadata) survives. */
export const EMPTY_MESSAGE_PLACEHOLDER = '[empty message]';
export const SAFE_FALLBACK_SOURCE = 'unknown';
export const DEFAULT_INGESTION_URL = 'https://ingestion.logscopeai.com';
export const DEFAULT_INGESTION_BASE_URL = DEFAULT_INGESTION_URL;
export const LOGSCOPE_INGESTION_URL_ENV_VAR = 'LOGSCOPE_INGESTION_URL';
