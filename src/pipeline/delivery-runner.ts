import { calculateRetryDelayMs } from '../retry/backoff';
import { resolveRetryPolicy, type RetryPolicy } from '../retry/retry-policy';
import type {
  DroppedEntriesSummary,
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

const withDroppedEntries = (
  result: IngestionRequestResult,
  droppedEntries: DroppedEntriesSummary | undefined,
): IngestionRequestResult => {
  return droppedEntries === undefined ? result : { ...result, droppedEntries };
};

export const runBatchDelivery = async (
  input: DeliveryRunnerInput,
): Promise<IngestionRequestResult> => {
  const retryPolicy = resolveRetryPolicy(input.retryPolicy);
  const waitForRetry = input.waitForRetry ?? waitForDelay;

  let retriesPerformed = 0;
  let logs: IngestionLogEntry[] = input.logs;
  let droppedEntries: DroppedEntriesSummary | undefined;

  while (true) {
    const result = await (async (): Promise<IngestionRequestResult> => {
      try {
        return await input.sendBatch({
          endpoint: input.endpoint,
          apiKey: input.apiKey,
          logs,
        });
      } catch {
        return safeRetryResult();
      }
    })();

    if (result.action === 'drop_entries') {
      // The API named the rejected entries: resend the rest once. A second validation failure on
      // the remaining entries means the batch is not salvageable this way.
      if (droppedEntries !== undefined) {
        return withDroppedEntries(
          {
            action: 'drop',
            status: 400,
            shouldWarnUnauthorized: false,
            errorKind: 'repeated_validation_failure',
          },
          droppedEntries,
        );
      }

      const invalidIndexes = new Set(result.invalidIndexes);
      droppedEntries = {
        count: invalidIndexes.size,
        indexes: result.invalidIndexes,
        details: result.details,
      };
      logs = logs.filter((_, index) => !invalidIndexes.has(index));
      continue;
    }

    if (
      result.action === 'success' ||
      result.action === 'drop' ||
      result.action === 'unauthorized'
    ) {
      return withDroppedEntries(result, droppedEntries);
    }

    if (retriesPerformed >= retryPolicy.maxRetries) {
      return withDroppedEntries(
        {
          action: 'drop',
          shouldWarnUnauthorized: false,
          errorKind: 'max_retries_exceeded',
        },
        droppedEntries,
      );
    }

    const retryAttempt = retriesPerformed + 1;
    const retryDelayMs = calculateRetryDelayMs(retryAttempt, retryPolicy);

    try {
      await waitForRetry(retryDelayMs);
    } catch {
      return withDroppedEntries(
        {
          action: 'drop',
          shouldWarnUnauthorized: false,
          errorKind: 'max_retries_exceeded',
        },
        droppedEntries,
      );
    }

    retriesPerformed += 1;
  }
};
