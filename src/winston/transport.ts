import TransportStream from 'winston-transport';
import { buildInvalidWinstonOptionsWarning, guardWinstonTransportOptions } from '../config/config-guards';
import type { RetryPolicy } from '../retry/retry-policy';
import {
  createBatchingPipeline,
  type BatchingPipeline,
  type CreateBatchingPipelineInput,
} from '../pipeline/pipeline';
import { createPipelineIngress } from '../pipeline/pipeline-ingress';
import { sendIngestionRequest } from '../transport/send-ingestion-request';
import type {
  IngestionRequestResult,
  SendIngestionRequestInput,
} from '../transport/transport-types';
import type { LogFilterConfig } from '../types';
import { mapWinstonLevel } from './map-winston-level';

const UNAUTHORIZED_WARNING_MESSAGE =
  '[logscope] Winston transport received unauthorized response (401). Check SDK API key configuration.';
const RETRY_EXHAUSTED_WARNING_MESSAGE =
  '[logscope] Winston transport dropped log batch after max retry attempts.';
const LEVEL_SYMBOL = Symbol.for('level');

export interface LogscopeWinstonTransportOptions {
  apiKey: string;
  endpoint: string;
  source: string;
  logFilter?: LogFilterConfig;
  flushIntervalMs?: number;
  retryPolicy?: Partial<RetryPolicy>;
}

export interface WinstonTransportDependencies {
  sendBatch: (input: SendIngestionRequestInput) => Promise<IngestionRequestResult>;
  warn: (message: string) => void;
  createPipeline?: (input: CreateBatchingPipelineInput) => BatchingPipeline;
}

type WinstonInfo = Record<PropertyKey, unknown>;

const runSafe = (callback: () => void): void => {
  try {
    callback();
  } catch {
    // Never throw into user code.
  }
};

const runSafeWarn = (warn: (message: string) => void, message: string): void => {
  runSafe(() => {
    warn(message);
  });
};

const createNoopPipeline = (): BatchingPipeline => {
  return {
    enqueue: () => {},
    flushNow: async () => {},
    stop: async () => {},
  };
};

const createDefaultDependencies = (): WinstonTransportDependencies => {
  return {
    sendBatch: (input) => sendIngestionRequest(input),
    warn: (message) => console.warn(message),
  };
};

const isWinstonInfo = (value: unknown): value is WinstonInfo => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toLogMessage = (info: WinstonInfo): string => {
  if (typeof info.message === 'string') {
    return info.message;
  }

  if (info.message === undefined) {
    return '';
  }

  try {
    return JSON.stringify(info.message) ?? '';
  } catch {
    try {
      return String(info.message);
    } catch {
      return '[Unserializable message]';
    }
  }
};

const toTimestamp = (info: WinstonInfo): Date | string | number | undefined => {
  const value = info.timestamp;

  if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return undefined;
};

const toMetadata = (info: WinstonInfo): Record<string, unknown> | undefined => {
  const metadataEntries = Object.entries(info as Record<string, unknown>).filter(([key]) => {
    return key !== 'level' && key !== 'message' && key !== 'timestamp';
  });

  if (metadataEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(metadataEntries);
};

class LogscopeWinstonTransportStream extends TransportStream {
  private readonly ingress;

  private readonly pipeline;

  private stopPromise: Promise<void> | null = null;

  constructor(
    options: LogscopeWinstonTransportOptions,
    dependencies: WinstonTransportDependencies,
  ) {
    super();

    const guardedOptions = guardWinstonTransportOptions(options);
    let hasWarnedUnauthorized = false;
    let hasWarnedRetryExhausted = false;

    if (!guardedOptions.isValid) {
      runSafeWarn(dependencies.warn, buildInvalidWinstonOptionsWarning(guardedOptions.invalidFields));
    }

    const createPipeline = dependencies.createPipeline ?? createBatchingPipeline;

    this.pipeline = (() => {
      if (!guardedOptions.isValid) {
        return createNoopPipeline();
      }

      try {
        return createPipeline({
          endpoint: guardedOptions.endpoint,
          apiKey: guardedOptions.apiKey,
          sendBatch: dependencies.sendBatch,
          flushIntervalMs: guardedOptions.flushIntervalMs,
          retryPolicy: guardedOptions.retryPolicy,
          onBatchResult: (result) => {
            if (!result.shouldWarnUnauthorized || hasWarnedUnauthorized) {
              if (result.errorKind !== 'max_retries_exceeded' || hasWarnedRetryExhausted) {
                return;
              }

              hasWarnedRetryExhausted = true;
              runSafeWarn(dependencies.warn, RETRY_EXHAUSTED_WARNING_MESSAGE);
              return;
            }

            hasWarnedUnauthorized = true;
            runSafeWarn(dependencies.warn, UNAUTHORIZED_WARNING_MESSAGE);
          },
        });
      } catch {
        return createNoopPipeline();
      }
    })();

    this.ingress = createPipelineIngress({
      source: guardedOptions.source,
      logFilter: guardedOptions.logFilter,
      pipeline: this.pipeline,
    });
  }

  override log(info: unknown, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    runSafe(() => {
      if (!isWinstonInfo(info)) {
        return;
      }

      const level = mapWinstonLevel(info.level ?? info[LEVEL_SYMBOL]);

      if (level === undefined) {
        return;
      }

      this.ingress.dispatch({
        level,
        message: toLogMessage(info),
        metadata: toMetadata(info),
        timestamp: toTimestamp(info),
      });
    });

    callback();
  }

  override close(): void {
    void this.stopPipeline();
  }

  override _final(callback: (error?: Error | null) => void): void {
    void this.stopPipeline().finally(() => {
      callback();
    });
  }

  private stopPipeline(): Promise<void> {
    if (this.stopPromise !== null) {
      return this.stopPromise;
    }

    this.stopPromise = this.pipeline.stop();
    return this.stopPromise;
  }
}

export const createWinstonTransportInternal = (
  options: LogscopeWinstonTransportOptions,
  dependencies: WinstonTransportDependencies,
): TransportStream => {
  return new LogscopeWinstonTransportStream(options, dependencies);
};

export const createWinstonTransport = (
  options: LogscopeWinstonTransportOptions,
): TransportStream => {
  return createWinstonTransportInternal(options, createDefaultDependencies());
};
