export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
};

const normalizeNonNegativeInteger = (value: number | undefined, fallback: number): number => {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.trunc(value);
};

export const resolveRetryPolicy = (policy?: Partial<RetryPolicy>): RetryPolicy => {
  const maxRetries = normalizeNonNegativeInteger(
    policy?.maxRetries,
    DEFAULT_RETRY_POLICY.maxRetries,
  );
  const baseDelayMs = normalizeNonNegativeInteger(
    policy?.baseDelayMs,
    DEFAULT_RETRY_POLICY.baseDelayMs,
  );
  const maxDelayMs = normalizeNonNegativeInteger(
    policy?.maxDelayMs,
    DEFAULT_RETRY_POLICY.maxDelayMs,
  );

  return {
    maxRetries,
    baseDelayMs,
    maxDelayMs: Math.max(baseDelayMs, maxDelayMs),
  };
};
