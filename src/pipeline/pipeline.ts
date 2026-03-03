import {
  DEFAULT_FLUSH_INTERVAL_MS,
  DEFAULT_MAX_BATCH_SIZE,
  resolveRuntimeConfig,
} from '../config/runtime-config';
import type { RetryPolicy } from '../retry/retry-policy';
import type {
  IngestionRequestResult,
  SendIngestionRequestInput,
} from '../transport/transport-types';
import type { IngestionLogEntry } from '../types';
import { createBatchQueue } from './batch-queue';
import { runBatchDelivery } from './delivery-runner';
import { createFlushScheduler } from './flush-scheduler';

export const MAX_BATCH_SIZE = DEFAULT_MAX_BATCH_SIZE;
export { DEFAULT_FLUSH_INTERVAL_MS };

export interface BatchingPipeline {
  enqueue(log: IngestionLogEntry): void;
  flushNow(): Promise<void>;
  stop(): Promise<void>;
}

export interface CreateBatchingPipelineInput {
  endpoint: string;
  apiKey: string;
  sendBatch: (input: SendIngestionRequestInput) => Promise<IngestionRequestResult>;
  onBatchResult?: (result: IngestionRequestResult) => void;
  maxBatchSize?: number;
  flushIntervalMs?: number;
  retryPolicy?: Partial<RetryPolicy>;
}

const runSafe = (callback: () => void): void => {
  try {
    callback();
  } catch {
    // Internal callbacks must not surface to user code.
  }
};

export const createBatchingPipeline = (input: CreateBatchingPipelineInput): BatchingPipeline => {
  const runtimeConfig = resolveRuntimeConfig({
    maxBatchSize: input.maxBatchSize,
    flushIntervalMs: input.flushIntervalMs,
    maxRetries: input.retryPolicy?.maxRetries,
    retryBaseDelayMs: input.retryPolicy?.baseDelayMs,
    retryMaxDelayMs: input.retryPolicy?.maxDelayMs,
  });
  const queue = createBatchQueue();
  let activeFlushPromise: Promise<void> | null = null;
  let isStopped = false;

  const emitBatchResult = (result: IngestionRequestResult): void => {
    if (input.onBatchResult === undefined) {
      return;
    }

    runSafe(() => input.onBatchResult?.(result));
  };

  const scheduler = createFlushScheduler({
    intervalMs: runtimeConfig.flushIntervalMs,
    onFlush: () => {
      if (isStopped || queue.isEmpty()) {
        return;
      }

      void flushInternal();
    },
  });

  const flushInternal = (): Promise<void> => {
    if (activeFlushPromise !== null) {
      return activeFlushPromise;
    }

    activeFlushPromise = (async (): Promise<void> => {
      scheduler.cancel();

      while (!queue.isEmpty()) {
        const batch = queue.dequeueBatch(runtimeConfig.maxBatchSize);

        if (batch.length === 0) {
          break;
        }

        try {
          const result = await runBatchDelivery({
            endpoint: input.endpoint,
            apiKey: input.apiKey,
            sendBatch: input.sendBatch,
            logs: batch,
            retryPolicy: runtimeConfig.retryPolicy,
          });
          emitBatchResult(result);
        } catch {
          // Never throw into user code.
        }
      }
    })().finally(() => {
      activeFlushPromise = null;

      if (isStopped || queue.isEmpty()) {
        scheduler.cancel();
        return;
      }

      scheduler.schedule();
    });

    return activeFlushPromise;
  };

  return {
    enqueue(log: IngestionLogEntry): void {
      if (isStopped) {
        return;
      }

      queue.enqueue(log);

      if (queue.size() >= runtimeConfig.maxBatchSize) {
        void flushInternal();
        return;
      }

      scheduler.schedule();
    },
    async flushNow(): Promise<void> {
      if (isStopped || queue.isEmpty()) {
        return;
      }

      await flushInternal();
    },
    async stop(): Promise<void> {
      if (isStopped) {
        return;
      }

      isStopped = true;
      scheduler.cancel();
      await flushInternal();
      queue.clear();
    },
  };
};
