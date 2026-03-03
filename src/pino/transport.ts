import { Writable } from 'node:stream';
import { buildInvalidPinoOptionsWarning, guardPinoTransportOptions } from '../config/config-guards';
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
import { mapPinoLevel } from './map-pino-level';

const UNAUTHORIZED_WARNING_MESSAGE =
  '[logscope] Pino transport received unauthorized response (401). Check SDK API key configuration.';
const RETRY_EXHAUSTED_WARNING_MESSAGE =
  '[logscope] Pino transport dropped log batch after max retry attempts.';

export interface LogscopePinoTransportOptions {
  apiKey: string;
  endpoint: string;
  source: string;
  logFilter?: LogFilterConfig;
  flushIntervalMs?: number;
  retryPolicy?: Partial<RetryPolicy>;
}

export interface PinoTransportDependencies {
  sendBatch: (input: SendIngestionRequestInput) => Promise<IngestionRequestResult>;
  warn: (message: string) => void;
  createPipeline?: (input: CreateBatchingPipelineInput) => BatchingPipeline;
}

type PinoRecord = Record<string, unknown>;

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

const createDefaultDependencies = (): PinoTransportDependencies => {
  return {
    sendBatch: (input) => sendIngestionRequest(input),
    warn: (message) => console.warn(message),
  };
};

const isPinoRecord = (value: unknown): value is PinoRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toLogMessage = (record: PinoRecord): string => {
  if (typeof record.msg === 'string') {
    return record.msg;
  }

  if (typeof record.message === 'string') {
    return record.message;
  }

  if (record.msg === undefined && record.message === undefined) {
    return '';
  }

  try {
    return JSON.stringify(record.msg ?? record.message) ?? '';
  } catch {
    try {
      return String(record.msg ?? record.message);
    } catch {
      return '[Unserializable message]';
    }
  }
};

const toTimestamp = (record: PinoRecord): Date | string | number | undefined => {
  const value = record.time ?? record.timestamp;

  if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return undefined;
};

const toMetadata = (record: PinoRecord): Record<string, unknown> | undefined => {
  const metadataEntries = Object.entries(record).filter(([key]) => {
    return (
      key !== 'level' && key !== 'msg' && key !== 'message' && key !== 'time' && key !== 'timestamp'
    );
  });

  if (metadataEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(metadataEntries);
};

export const createPinoTransportInternal = (
  options: LogscopePinoTransportOptions,
  dependencies: PinoTransportDependencies,
): Writable => {
  const guardedOptions = guardPinoTransportOptions(options);
  let hasWarnedUnauthorized = false;
  let hasWarnedRetryExhausted = false;

  if (!guardedOptions.isValid) {
    runSafeWarn(dependencies.warn, buildInvalidPinoOptionsWarning(guardedOptions.invalidFields));
  }

  const pipeline = (() => {
    const createPipeline = dependencies.createPipeline ?? createBatchingPipeline;

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

  const ingress = createPipelineIngress({
    source: guardedOptions.source,
    logFilter: guardedOptions.logFilter,
    pipeline,
  });

  let pending = '';

  const dispatchSerializedLine = (serializedLine: string): void => {
    const trimmedLine = serializedLine.trim();

    if (trimmedLine.length === 0) {
      return;
    }

    let parsedLine: unknown;

    try {
      parsedLine = JSON.parse(trimmedLine);
    } catch {
      return;
    }

    if (!isPinoRecord(parsedLine)) {
      return;
    }

    const level = mapPinoLevel(parsedLine.level);

    if (level === undefined) {
      return;
    }

    ingress.dispatch({
      level,
      message: toLogMessage(parsedLine),
      metadata: toMetadata(parsedLine),
      timestamp: toTimestamp(parsedLine),
    });
  };

  const consumeChunk = (chunkText: string): void => {
    pending += chunkText;

    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    lines.forEach((line) => {
      dispatchSerializedLine(line);
    });
  };

  const flushPending = (): void => {
    if (pending.length === 0) {
      return;
    }

    dispatchSerializedLine(pending);
    pending = '';
  };

  return new Writable({
    write(chunk, _encoding, callback): void {
      runSafe(() => {
        consumeChunk(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
      });

      callback();
    },
    final(callback): void {
      runSafe(() => {
        flushPending();
      });

      void pipeline.stop().finally(() => {
        callback();
      });
    },
  });
};

export const createPinoTransport = (options: LogscopePinoTransportOptions): Writable => {
  return createPinoTransportInternal(options, createDefaultDependencies());
};
