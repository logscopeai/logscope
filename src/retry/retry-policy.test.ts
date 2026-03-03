import { DEFAULT_RETRY_POLICY, resolveRetryPolicy } from './retry-policy';
import { describe, expect, it } from 'vitest';

describe('resolveRetryPolicy', () => {
  it('returns defaults when no policy is provided', () => {
    expect(resolveRetryPolicy()).toEqual(DEFAULT_RETRY_POLICY);
  });

  it('applies valid custom policy values', () => {
    expect(
      resolveRetryPolicy({
        maxRetries: 5,
        baseDelayMs: 100,
        maxDelayMs: 1_000,
      }),
    ).toEqual({
      maxRetries: 5,
      baseDelayMs: 100,
      maxDelayMs: 1_000,
    });
  });

  it('normalizes invalid values to safe defaults', () => {
    expect(
      resolveRetryPolicy({
        maxRetries: Number.NaN,
        baseDelayMs: -10,
        maxDelayMs: Infinity,
      }),
    ).toEqual(DEFAULT_RETRY_POLICY);
  });

  it('truncates floating-point values and enforces maxDelay >= baseDelay', () => {
    expect(
      resolveRetryPolicy({
        maxRetries: 2.9,
        baseDelayMs: 150.8,
        maxDelayMs: 100.4,
      }),
    ).toEqual({
      maxRetries: 2,
      baseDelayMs: 150,
      maxDelayMs: 150,
    });
  });
});
