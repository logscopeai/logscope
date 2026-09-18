import {
  EMPTY_MESSAGE_PLACEHOLDER,
  MAX_MESSAGE_LENGTH,
  MAX_METADATA_BYTES,
  MAX_METADATA_KEYS,
  MAX_REQUEST_ID_LENGTH,
  MAX_SOURCE_LENGTH,
  METADATA_PRIMITIVE_VALUE_KEY,
  METADATA_REQUEST_ID_KEY,
  MIN_SOURCE_LENGTH,
  SAFE_FALLBACK_SOURCE,
} from '../constants';
import type { IngestionLogEntry, JsonSafeObject, JsonSafeValue, LogLevel } from '../types';

export interface NormalizeLogInput {
  source: string;
  level: LogLevel;
  message: string;
  metadata?: unknown;
  timestamp?: Date | string | number;
}

export interface NormalizeLogOptions {
  now?: () => Date;
}

const isJsonSafeObject = (value: JsonSafeValue): value is JsonSafeObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const sanitizeJsonValue = (
  value: unknown,
  seenObjects: WeakSet<object>,
): JsonSafeValue | undefined => {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      const normalizedItem = sanitizeJsonValue(item, seenObjects);
      return normalizedItem === undefined ? null : normalizedItem;
    });
  }

  if (typeof value === 'object') {
    if (seenObjects.has(value)) {
      return '[Circular]';
    }

    seenObjects.add(value);

    const normalizedObject: JsonSafeObject = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      const normalizedNestedValue = sanitizeJsonValue(nestedValue, seenObjects);

      if (normalizedNestedValue !== undefined) {
        normalizedObject[key] = normalizedNestedValue;
      }
    }

    seenObjects.delete(value);

    return normalizedObject;
  }

  return undefined;
};

const normalizeMetadata = (metadata: unknown): JsonSafeObject | undefined => {
  if (metadata === undefined) {
    return undefined;
  }

  try {
    const normalizedValue = sanitizeJsonValue(metadata, new WeakSet<object>());

    if (normalizedValue === undefined) {
      return undefined;
    }

    if (isJsonSafeObject(normalizedValue)) {
      return normalizedValue;
    }

    return {
      [METADATA_PRIMITIVE_VALUE_KEY]: normalizedValue,
    };
  } catch {
    return undefined;
  }
};

/**
 * The API validates `source` as a trimmed string of 2..100 characters. Anything shorter falls back
 * to the same safe source the root client uses; anything longer is truncated.
 */
export const normalizeSource = (source: unknown): string => {
  const trimmedSource = typeof source === 'string' ? source.trim() : '';

  if (trimmedSource.length < MIN_SOURCE_LENGTH) {
    return SAFE_FALLBACK_SOURCE;
  }

  if (trimmedSource.length > MAX_SOURCE_LENGTH) {
    return trimmedSource.slice(0, MAX_SOURCE_LENGTH);
  }

  return trimmedSource;
};

/**
 * The API rejects a message that is empty after trimming. A pino record without `msg` or an
 * explicit `logger.info('')` still carries a level, a timestamp and metadata worth keeping, so the
 * entry is sent with a placeholder instead of being dropped (or, worse, sinking the whole batch).
 */
const normalizeMessage = (message: unknown): string => {
  const serializedMessage = (() => {
    if (typeof message === 'string') {
      return message;
    }

    try {
      return JSON.stringify(message) ?? '';
    } catch {
      try {
        return String(message);
      } catch {
        return '[Unserializable message]';
      }
    }
  })();

  const trimmedMessage = serializedMessage.trim();

  if (trimmedMessage.length === 0) {
    return EMPTY_MESSAGE_PLACEHOLDER;
  }

  if (trimmedMessage.length <= MAX_MESSAGE_LENGTH) {
    return trimmedMessage;
  }

  // Truncation can expose trailing whitespace again; the API trims before measuring, so trim once more.
  return trimmedMessage.slice(0, MAX_MESSAGE_LENGTH).trimEnd() || EMPTY_MESSAGE_PLACEHOLDER;
};

const capMetadataKeys = (metadata: JsonSafeObject): JsonSafeObject => {
  const keys = Object.keys(metadata);

  if (keys.length <= MAX_METADATA_KEYS) {
    return metadata;
  }

  // Keep the first keys in insertion order so the outcome is deterministic for a given object.
  const cappedMetadata: JsonSafeObject = {};

  for (const key of keys.slice(0, MAX_METADATA_KEYS)) {
    cappedMetadata[key] = metadata[key] as JsonSafeValue;
  }

  return cappedMetadata;
};

// Mirrors the API rule: trimmed, dropped when empty, never longer than the log-index column.
const normalizeRequestId = (metadata: JsonSafeObject): JsonSafeObject => {
  const requestId = metadata[METADATA_REQUEST_ID_KEY];

  if (typeof requestId !== 'string') {
    return metadata;
  }

  const trimmedRequestId = requestId.trim().slice(0, MAX_REQUEST_ID_LENGTH);

  if (trimmedRequestId.length === 0) {
    const { [METADATA_REQUEST_ID_KEY]: _dropped, ...rest } = metadata;
    return rest;
  }

  if (trimmedRequestId === requestId) {
    return metadata;
  }

  return { ...metadata, [METADATA_REQUEST_ID_KEY]: trimmedRequestId };
};

const enforceMetadataLimit = (metadata: JsonSafeObject | undefined): JsonSafeObject | undefined => {
  if (metadata === undefined) {
    return undefined;
  }

  try {
    const boundedMetadata = normalizeRequestId(capMetadataKeys(metadata));
    const serializedMetadata = JSON.stringify(boundedMetadata);

    if (serializedMetadata === undefined) {
      return undefined;
    }

    if (Buffer.byteLength(serializedMetadata, 'utf8') > MAX_METADATA_BYTES) {
      return undefined;
    }

    return boundedMetadata;
  } catch {
    return undefined;
  }
};

const toIsoTimestamp = (timestamp: Date | string | number | undefined, now: () => Date): string => {
  if (timestamp === undefined) {
    return now().toISOString();
  }

  try {
    const parsedTimestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);

    if (Number.isNaN(parsedTimestamp.getTime())) {
      return now().toISOString();
    }

    return parsedTimestamp.toISOString();
  } catch {
    return now().toISOString();
  }
};

export const normalizeLog = (
  input: NormalizeLogInput,
  options: NormalizeLogOptions = {},
): IngestionLogEntry => {
  const now = options.now ?? (() => new Date());
  const metadata = enforceMetadataLimit(normalizeMetadata(input.metadata));

  const normalizedLog: IngestionLogEntry = {
    source: normalizeSource(input.source),
    level: input.level,
    timestamp: toIsoTimestamp(input.timestamp, now),
    message: normalizeMessage(input.message),
  };

  if (metadata !== undefined) {
    normalizedLog.metadata = metadata;
  }

  return normalizedLog;
};
