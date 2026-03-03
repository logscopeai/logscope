import { calculateRetryDelayMs } from '../retry/backoff';
import { resolveRetryPolicy, type RetryPolicy } from '../retry/retry-policy';
import type {
  IngestionRequestResult,
  SendIngestionRequestInput,
} from '../transport/transport-types';
import type { IngestionLogEntry } from '../types';

export interface DeliveryRunnerInput {
  endpoint: string;
  apiKey: string;
  logs: IngestionLogEntry[];
  sendBatch: (input: SendIngestionRequestInput) => Promise<IngestionRequestResult>;
  retryPolicy?: Partial<RetryPolicy>;
  waitForRetry?: (delayMs: number) => Promise<void>;
}

const waitForDelay = async (delayMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

const safeRetryResult = (): IngestionRequestResult => {
  return {
    action: 'retry',
    shouldWarnUnauthorized: false,
    errorKind: 'network_error',
  };
};

export const runBatchDelivery = async (
  input: DeliveryRunnerInput,
): Promise<IngestionRequestResult> => {
  const retryPolicy = resolveRetryPolicy(input.retryPolicy);
  const waitForRetry = input.waitForRetry ?? waitForDelay;

  let retriesPerformed = 0;

  while (true) {
    const result = await (async (): Promise<IngestionRequestResult> => {
      try {
        return await input.sendBatch({
          endpoint: input.endpoint,
          apiKey: input.apiKey,
          logs: input.logs,
        });
      } catch {
        return safeRetryResult();
      }
    })();

    if (
      result.action === 'success' ||
      result.action === 'drop' ||
      result.action === 'unauthorized'
    ) {
      return result;
    }

    if (retriesPerformed >= retryPolicy.maxRetries) {
      return {
        action: 'drop',
        shouldWarnUnauthorized: false,
        errorKind: 'max_retries_exceeded',
      };
    }

    const retryAttempt = retriesPerformed + 1;
    const retryDelayMs = calculateRetryDelayMs(retryAttempt, retryPolicy);

    try {
      await waitForRetry(retryDelayMs);
    } catch {
      return {
        action: 'drop',
        shouldWarnUnauthorized: false,
        errorKind: 'max_retries_exceeded',
      };
    }

    retriesPerformed += 1;
  }
};
