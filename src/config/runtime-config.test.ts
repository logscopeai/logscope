import { DEFAULT_RETRY_POLICY } from '../retry/retry-policy';
import {
  DEFAULT_FLUSH_INTERVAL_MS,
  DEFAULT_MAX_BATCH_SIZE,
  MAX_BATCH_SIZE_LIMIT,
  resolveRuntimeConfig,
} from './runtime-config';
import { describe, expect, it } from 'vitest';

describe('resolveRuntimeConfig', () => {
  it('returns centralized defaults when no overrides are provided', () => {
    expect(resolveRuntimeConfig()).toEqual({
      maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
      flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
      retryPolicy: DEFAULT_RETRY_POLICY,
    });
  });

  it('applies valid runtime quantity overrides', () => {
    expect(
      resolveRuntimeConfig({
        maxBatchSize: 10,
        flushIntervalMs: 500,
        maxRetries: 5,
        retryBaseDelayMs: 100,
        retryMaxDelayMs: 2_500,
      }),
    ).toEqual({
      maxBatchSize: 10,
      flushIntervalMs: 500,
      retryPolicy: {
        maxRetries: 5,
        baseDelayMs: 100,
        maxDelayMs: 2_500,
      },
    });
  });

  it('falls back safely when runtime quantity overrides are invalid', () => {
    expect(
      resolveRuntimeConfig({
        maxBatchSize: MAX_BATCH_SIZE_LIMIT + 1,
        flushIntervalMs: 0,
        maxRetries: Number.NaN,
        retryBaseDelayMs: -100,
        retryMaxDelayMs: Infinity,
      }),
    ).toEqual({
      maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
      flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
      retryPolicy: DEFAULT_RETRY_POLICY,
    });
  });
});
