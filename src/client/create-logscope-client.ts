import { captureConsole, type DispatchConsoleLog } from '../console/capture-console';
import type { ResolvedRuntimeConfig } from '../config/runtime-config';
import {
  buildInvalidClientConfigWarning,
  guardLogscopeClientConfig,
} from '../config/config-guards';
import { createBatchingPipeline, type BatchingPipeline } from '../pipeline/pipeline';
import { createPipelineIngress } from '../pipeline/pipeline-ingress';
import { sendIngestionRequest } from '../transport/send-ingestion-request';
import type {
  IngestionRequestResult,
  SendIngestionRequestInput,
} from '../transport/transport-types';
import type { LogLevel, LogscopeClient, LogscopeConfig } from '../types';
import { createLogMethods } from './log-methods';

const UNAUTHORIZED_WARNING_MESSAGE =
  '[logscope] Received unauthorized response (401). Check SDK API key configuration.';
const RETRY_EXHAUSTED_WARNING_MESSAGE =
  '[logscope] Dropping log batch after max retry attempts.';

interface CreatePipelineInput {
  ingestionBaseUrl: string;
  apiKey: string;
  runtimeConfig: ResolvedRuntimeConfig;
  onBatchResult: (result: IngestionRequestResult) => void;
}

type SendBatch = (input: SendIngestionRequestInput) => Promise<IngestionRequestResult>;
type CreatePipeline = (input: CreatePipelineInput) => BatchingPipeline;
type WarnFn = (message: string) => void;
type SetupConsoleCapture = (dispatchLog: DispatchConsoleLog) => void;

interface CreateLogscopeClientDependencies {
  createPipeline: CreatePipeline;
  warn: WarnFn;
  now: () => Date;
  setupConsoleCapture?: SetupConsoleCapture;
}

const createNoopPipeline = (): BatchingPipeline => {
  return {
    enqueue: () => {},
    flushNow: async () => {},
    stop: async () => {},
  };
};

const createDefaultDependencies = (): CreateLogscopeClientDependencies => {
  const sendBatch: SendBatch = (input) => sendIngestionRequest(input);

  return {
    createPipeline: (input) =>
      createBatchingPipeline({
        endpoint: input.ingestionBaseUrl,
        apiKey: input.apiKey,
        sendBatch,
        maxBatchSize: input.runtimeConfig.maxBatchSize,
        flushIntervalMs: input.runtimeConfig.flushIntervalMs,
        retryPolicy: input.runtimeConfig.retryPolicy,
        onBatchResult: input.onBatchResult,
      }),
    warn: (message) => console.warn(message),
    now: () => new Date(),
    setupConsoleCapture: (dispatchLog) => {
      captureConsole({
        dispatchLog,
      });
    },
  };
};

const runSafeWarn = (warn: WarnFn, message: string): void => {
  try {
    warn(message);
  } catch {
    // Never throw into user code.
  }
};

export const createLogscopeClientInternal = (
  config: LogscopeConfig,
  dependencies: CreateLogscopeClientDependencies,
): LogscopeClient => {
  const guardedConfig = guardLogscopeClientConfig(config);
  let hasWarnedUnauthorized = false;
  let hasWarnedRetryExhausted = false;

  if (!guardedConfig.isValid) {
    runSafeWarn(dependencies.warn, buildInvalidClientConfigWarning(guardedConfig.invalidFields));
  }

  const pipeline = (() => {
    if (!guardedConfig.isValid) {
      return createNoopPipeline();
    }

    try {
      return dependencies.createPipeline({
        ingestionBaseUrl: guardedConfig.ingestionBaseUrl,
        apiKey: guardedConfig.apiKey,
        runtimeConfig: guardedConfig.runtimeConfig,
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
    source: guardedConfig.source,
    logFilter: guardedConfig.logFilter,
    now: dependencies.now,
    pipeline,
  });

  const dispatchLog: DispatchConsoleLog = (
    level: LogLevel,
    message: string,
    metadata?: unknown,
  ) => {
    ingress.dispatch({
      level,
      message,
      metadata,
    });
  };

  if (
    guardedConfig.captureConsole === true &&
    guardedConfig.isValid &&
    dependencies.setupConsoleCapture !== undefined
  ) {
    try {
      dependencies.setupConsoleCapture(dispatchLog);
    } catch {
      // Never throw into user code.
    }
  }

  return createLogMethods(dispatchLog);
};

export const createLogscopeClient = (config: LogscopeConfig): LogscopeClient => {
  return createLogscopeClientInternal(config, createDefaultDependencies());
};
