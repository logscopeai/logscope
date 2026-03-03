import { MAX_MESSAGE_LENGTH, MAX_METADATA_BYTES, METADATA_PRIMITIVE_VALUE_KEY } from '../constants';
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

const normalizeMessage = (message: unknown): string => {
  const normalizedMessage = (() => {
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

  if (normalizedMessage.length <= MAX_MESSAGE_LENGTH) {
    return normalizedMessage;
  }

  return normalizedMessage.slice(0, MAX_MESSAGE_LENGTH);
};

const enforceMetadataLimit = (metadata: JsonSafeObject | undefined): JsonSafeObject | undefined => {
  if (metadata === undefined) {
    return undefined;
  }

  try {
    const serializedMetadata = JSON.stringify(metadata);

    if (serializedMetadata === undefined) {
      return undefined;
    }

    if (Buffer.byteLength(serializedMetadata, 'utf8') > MAX_METADATA_BYTES) {
      return undefined;
    }

    return metadata;
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
    source: input.source,
    level: input.level,
    timestamp: toIsoTimestamp(input.timestamp, now),
    message: normalizeMessage(input.message),
  };

  if (metadata !== undefined) {
    normalizedLog.metadata = metadata;
  }

  return normalizedLog;
};
