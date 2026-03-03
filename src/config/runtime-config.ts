import { resolveRetryPolicy, type RetryPolicy } from '../retry/retry-policy';

export const DEFAULT_MAX_BATCH_SIZE = 50;
export const MAX_BATCH_SIZE_LIMIT = 50;
export const DEFAULT_FLUSH_INTERVAL_MS = 2_000;

export interface RuntimeQuantityOverrides {
  maxBatchSize?: number;
  flushIntervalMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
}

export interface ResolvedRuntimeConfig {
  maxBatchSize: number;
  flushIntervalMs: number;
  retryPolicy: RetryPolicy;
}

const normalizeBoundedInteger = (
  value: number | undefined,
  fallback: number,
  options: {
    min: number;
    max?: number;
  },
): number => {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  const integerValue = Math.trunc(value);

  if (integerValue < options.min) {
    return fallback;
  }

  if (options.max !== undefined && integerValue > options.max) {
    return fallback;
  }

  return integerValue;
};

export const resolveRuntimeConfig = (
  overrides?: RuntimeQuantityOverrides,
): ResolvedRuntimeConfig => {
  const maxBatchSize = normalizeBoundedInteger(overrides?.maxBatchSize, DEFAULT_MAX_BATCH_SIZE, {
    min: 1,
    max: MAX_BATCH_SIZE_LIMIT,
  });
  const flushIntervalMs = normalizeBoundedInteger(
    overrides?.flushIntervalMs,
    DEFAULT_FLUSH_INTERVAL_MS,
    {
      min: 1,
    },
  );
  const retryPolicy = resolveRetryPolicy({
    maxRetries: overrides?.maxRetries,
    baseDelayMs: overrides?.retryBaseDelayMs,
    maxDelayMs: overrides?.retryMaxDelayMs,
  });

  return {
    maxBatchSize,
    flushIntervalMs,
    retryPolicy,
  };
};
