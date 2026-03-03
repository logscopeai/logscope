import type { RetryPolicy } from './retry-policy';

export const calculateRetryDelayMs = (attempt: number, policy: RetryPolicy): number => {
  if (attempt <= 0 || policy.baseDelayMs === 0 || policy.maxDelayMs === 0) {
    return 0;
  }

  const growthFactor = 2 ** (attempt - 1);
  const rawDelay = policy.baseDelayMs * growthFactor;

  if (!Number.isFinite(rawDelay)) {
    return policy.maxDelayMs;
  }

  return Math.min(policy.maxDelayMs, Math.trunc(rawDelay));
};
