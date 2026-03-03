import { LOG_LEVELS, MAX_MESSAGE_LENGTH, MAX_METADATA_BYTES } from '../constants';
import { normalizeLog } from './normalize-log';
import { describe, expect, it } from 'vitest';

describe('normalizeLog', () => {
  it('passes through each supported log level', () => {
    for (const level of LOG_LEVELS) {
      const normalizedLog = normalizeLog({
        source: 'orders-api',
        level,
        message: `level-${level}`,
      });

      expect(normalizedLog.level).toBe(level);
    }
  });

  it('generates ISO-8601 timestamps', () => {
    const fixedDate = new Date('2026-02-14T16:00:00.123Z');

    const normalizedLog = normalizeLog(
      {
        source: 'orders-api',
        level: 'info',
        message: 'service started',
      },
      {
        now: () => fixedDate,
      },
    );

    expect(normalizedLog.timestamp).toBe('2026-02-14T16:00:00.123Z');
    expect(new Date(normalizedLog.timestamp).toISOString()).toBe(normalizedLog.timestamp);
  });

  it('normalizes metadata into a JSON-safe object', () => {
    const metadata: Record<string, unknown> = {
      requestId: 'req-123',
      attempt: 1,
      ok: true,
      skip: undefined,
      callback: () => 'ignore',
      createdAt: new Date('2026-02-14T17:00:00.000Z'),
      nested: {
        keep: 'value',
        ignored: Symbol('ignore'),
      },
      items: [1, undefined, BigInt(2)],
    };

    metadata.self = metadata;

    const normalizedLog = normalizeLog({
      source: 'orders-api',
      level: 'error',
      message: 'failed to process order',
      metadata,
    });

    expect(normalizedLog.metadata).toEqual({
      requestId: 'req-123',
      attempt: 1,
      ok: true,
      createdAt: '2026-02-14T17:00:00.000Z',
      nested: {
        keep: 'value',
      },
      items: [1, null, '2'],
      self: '[Circular]',
    });
    expect(() => JSON.stringify(normalizedLog.metadata)).not.toThrow();
  });

  it('wraps non-object metadata values into an object payload', () => {
    const normalizedLog = normalizeLog({
      source: 'orders-api',
      level: 'info',
      message: 'primitive metadata',
      metadata: 'raw-string',
    });

    expect(normalizedLog.metadata).toEqual({
      value: 'raw-string',
    });
  });

  it('handles null and invalid dates inside metadata', () => {
    const normalizedLog = normalizeLog({
      source: 'orders-api',
      level: 'warn',
      message: 'metadata date edge cases',
      metadata: {
        nullable: null,
        invalidDate: new Date('invalid-date'),
      },
    });

    expect(normalizedLog.metadata).toEqual({
      nullable: null,
      invalidDate: null,
    });
  });

  it('omits metadata when normalization results in an undefined payload', () => {
    const normalizedLog = normalizeLog({
      source: 'orders-api',
      level: 'debug',
      message: 'metadata omitted',
      metadata: Symbol('metadata'),
    });

    expect(normalizedLog).not.toHaveProperty('metadata');
  });

  it('truncates oversized messages deterministically to 2048 characters', () => {
    const oversizedMessage = 'x'.repeat(MAX_MESSAGE_LENGTH + 25);

    const normalizedLog = normalizeLog({
      source: 'orders-api',
      level: 'info',
      message: oversizedMessage,
    });

    expect(normalizedLog.message).toHaveLength(MAX_MESSAGE_LENGTH);
    expect(normalizedLog.message).toBe(oversizedMessage.slice(0, MAX_MESSAGE_LENGTH));
  });

  it('coerces malformed non-string messages safely', () => {
    const throwingMessage = {
      toString() {
        throw new Error('cannot stringify');
      },
    };

    const normalizedLog = normalizeLog({
      source: 'orders-api',
      level: 'warn',
      message: throwingMessage as unknown as string,
    });

    expect(normalizedLog.message).toBe('{}');
  });

  it('drops metadata when serialized metadata exceeds the 2048 byte limit', () => {
    const normalizedLog = normalizeLog({
      source: 'orders-api',
      level: 'error',
      message: 'oversized metadata',
      metadata: {
        payload: 'y'.repeat(3_000),
      },
    });

    expect(normalizedLog).not.toHaveProperty('metadata');
  });

  it('keeps message and metadata unchanged when they are exactly at size limits', () => {
    const exactMessage = 'm'.repeat(MAX_MESSAGE_LENGTH);
    const metadataPayloadSize = MAX_METADATA_BYTES - JSON.stringify({ payload: '' }).length;
    const exactMetadataPayload = 'z'.repeat(metadataPayloadSize);

    const normalizedLog = normalizeLog({
      source: 'orders-api',
      level: 'info',
      message: exactMessage,
      metadata: {
        payload: exactMetadataPayload,
      },
    });

    expect(normalizedLog.message).toBe(exactMessage);
    expect(normalizedLog.metadata).toEqual({
      payload: exactMetadataPayload,
    });
  });

  it('fails safely when metadata traversal throws', () => {
    const throwingMetadata = {};

    Object.defineProperty(throwingMetadata, 'problematic', {
      enumerable: true,
      get() {
        throw new Error('cannot read property');
      },
    });

    const normalizedLog = normalizeLog({
      source: 'orders-api',
      level: 'error',
      message: 'metadata getter throws',
      metadata: throwingMetadata,
    });

    expect(normalizedLog).not.toHaveProperty('metadata');
  });

  it('uses provided timestamps and falls back to now for invalid values', () => {
    const fallbackDate = new Date('2026-02-14T18:00:00.000Z');

    const validTimestampLog = normalizeLog({
      source: 'orders-api',
      level: 'info',
      message: 'valid timestamp',
      timestamp: '2026-02-14T18:05:00.000Z',
    });

    const invalidTimestampLog = normalizeLog(
      {
        source: 'orders-api',
        level: 'info',
        message: 'invalid timestamp',
        timestamp: 'not-a-valid-date',
      },
      {
        now: () => fallbackDate,
      },
    );

    const throwingTimestamp = {
      valueOf() {
        throw new Error('invalid coercion');
      },
    } as unknown as string;

    const throwingTimestampLog = normalizeLog(
      {
        source: 'orders-api',
        level: 'info',
        message: 'throwing timestamp',
        timestamp: throwingTimestamp,
      },
      {
        now: () => fallbackDate,
      },
    );

    expect(validTimestampLog.timestamp).toBe('2026-02-14T18:05:00.000Z');
    expect(invalidTimestampLog.timestamp).toBe('2026-02-14T18:00:00.000Z');
    expect(throwingTimestampLog.timestamp).toBe('2026-02-14T18:00:00.000Z');
  });

  it('omits metadata when it is not provided', () => {
    const normalizedLog = normalizeLog({
      source: 'orders-api',
      level: 'debug',
      message: 'debug message',
    });

    expect(normalizedLog).not.toHaveProperty('metadata');
  });
});
