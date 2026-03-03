import { calculateRetryDelayMs } from './backoff';
import type { RetryPolicy } from './retry-policy';
import { describe, expect, it } from 'vitest';

const policy: RetryPolicy = {
  maxRetries: 5,
  baseDelayMs: 100,
  maxDelayMs: 1_000,
};

describe('calculateRetryDelayMs', () => {
  it('computes exponential delays per retry attempt', () => {
    expect(calculateRetryDelayMs(1, policy)).toBe(100);
    expect(calculateRetryDelayMs(2, policy)).toBe(200);
    expect(calculateRetryDelayMs(3, policy)).toBe(400);
  });

  it('caps delay at configured max delay', () => {
    expect(calculateRetryDelayMs(10, policy)).toBe(1_000);
  });

  it('returns zero delay for invalid attempts or zero-delay policy', () => {
    expect(calculateRetryDelayMs(0, policy)).toBe(0);
    expect(
      calculateRetryDelayMs(1, {
        ...policy,
        baseDelayMs: 0,
      }),
    ).toBe(0);
  });

  it('handles overflow safely by returning max delay', () => {
    expect(calculateRetryDelayMs(Number.MAX_SAFE_INTEGER, policy)).toBe(1_000);
  });
});
