import { createLogscopeClient, createLogscopeClientInternal } from './create-logscope-client';
import { DEFAULT_FLUSH_INTERVAL_MS, DEFAULT_MAX_BATCH_SIZE } from '../config/runtime-config';
import { DEFAULT_INGESTION_BASE_URL, LOGSCOPE_INGESTION_URL_ENV_VAR } from '../constants';
import { DEFAULT_RETRY_POLICY } from '../retry/retry-policy';
import { MAX_BATCH_SIZE } from '../pipeline/pipeline';
import type { IngestionRequestResult } from '../transport/transport-types';
import type { FetchLike } from '../transport/transport-types';
import type { IngestionLogEntry, LogscopeClient, LogscopeConfig } from '../types';
import { afterEach, describe, expect, it, vi } from 'vitest';

const baseConfig: LogscopeConfig = {
  apiKey: 'test-api-key',
  ingestionBaseUrl: 'http://localhost:3000',
};

const fixedDate = new Date('2026-02-14T20:00:00.000Z');

afterEach(() => {
  vi.unstubAllEnvs();
});

const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const emitBatch = (client: LogscopeClient): void => {
  for (let index = 0; index < MAX_BATCH_SIZE; index += 1) {
    client.info(`message-${index}`);
  }
};

interface PipelineInput {
  ingestionBaseUrl: string;
  apiKey: string;
  runtimeConfig: {
    maxBatchSize: number;
    flushIntervalMs: number;
    retryPolicy: {
      maxRetries: number;
      baseDelayMs: number;
      maxDelayMs: number;
    };
  };
  onBatchResult: (result: IngestionRequestResult) => void;
}

describe('createLogscopeClientInternal', () => {
  it('normalizes and enqueues logs, propagating ingestionBaseUrl and apiKey', () => {
    const enqueuedLogs: IngestionLogEntry[] = [];
    const enqueue = vi.fn((log: IngestionLogEntry) => {
      enqueuedLogs.push(log);
    });
    const createPipeline = vi.fn((input: PipelineInput) => {
      expect(input.ingestionBaseUrl).toBe(baseConfig.ingestionBaseUrl);
      expect(input.apiKey).toBe(baseConfig.apiKey);
      expect(input.runtimeConfig).toEqual({
        maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
        flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
        retryPolicy: DEFAULT_RETRY_POLICY,
      });

      return {
        enqueue,
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(baseConfig, {
      createPipeline,
      warn,
      now: () => fixedDate,
    });

    const invocations = [
      { level: 'trace', method: client.trace, message: 'trace-message' },
      { level: 'debug', method: client.debug, message: 'debug-message' },
      { level: 'info', method: client.info, message: 'info-message' },
      { level: 'warn', method: client.warn, message: 'warn-message' },
      { level: 'error', method: client.error, message: 'error-message' },
      { level: 'fatal', method: client.fatal, message: 'fatal-message' },
    ] as const;

    invocations.forEach((invocation) => {
      expect(invocation.method(invocation.message, { tag: invocation.level })).toBeUndefined();
    });

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(6);
    expect(warn).not.toHaveBeenCalled();

    invocations.forEach((invocation, index) => {
      expect(enqueuedLogs[index]).toEqual({
        source: 'unknown',
        level: invocation.level,
        timestamp: '2026-02-14T20:00:00.000Z',
        message: invocation.message,
        metadata: {
          tag: invocation.level,
        },
      });
    });
  });

  it('uses production ingestion URL fallback when ingestionBaseUrl is omitted', () => {
    const createPipeline = vi.fn((input: PipelineInput) => {
      expect(input.ingestionBaseUrl).toBe(DEFAULT_INGESTION_BASE_URL);

      return {
        enqueue: vi.fn(),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        apiKey: 'test-api-key',
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    client.info('message-default-endpoint');

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('uses LOGSCOPE_INGESTION_URL when ingestionBaseUrl is omitted', () => {
    vi.stubEnv(LOGSCOPE_INGESTION_URL_ENV_VAR, 'https://dev.ingestion.logscopeai.com/');

    const createPipeline = vi.fn((input: PipelineInput) => {
      expect(input.ingestionBaseUrl).toBe('https://dev.ingestion.logscopeai.com');

      return {
        enqueue: vi.fn(),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        apiKey: 'test-api-key',
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    client.info('message-env-endpoint');

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('prefers ingestionBaseUrl over LOGSCOPE_INGESTION_URL', () => {
    vi.stubEnv(LOGSCOPE_INGESTION_URL_ENV_VAR, 'https://dev.ingestion.logscopeai.com');

    const createPipeline = vi.fn((input: PipelineInput) => {
      expect(input.ingestionBaseUrl).toBe('http://localhost:3001');

      return {
        enqueue: vi.fn(),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        apiKey: 'test-api-key',
        ingestionBaseUrl: 'http://localhost:3001/',
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    client.info('message-config-wins');

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('supports apiKey-only bootstrap through createLogscopeClient with default ingestion URL', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({
      status: 202,
    });
    const originalFetch = globalThis.fetch;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const client = createLogscopeClient({
        apiKey: 'test-api-key',
      });

      emitBatch(client);
      await flushAsyncWork();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(`${DEFAULT_INGESTION_BASE_URL}/api/logs/ingest`);
    } finally {
      logSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });

  it('supports ingestionBaseUrl override through createLogscopeClient', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({
      status: 202,
    });
    const originalFetch = globalThis.fetch;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const client = createLogscopeClient({
        apiKey: 'test-api-key',
        ingestionBaseUrl: 'http://localhost:3000',
      });

      emitBatch(client);
      await flushAsyncWork();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/api/logs/ingest');
    } finally {
      logSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });

  it('uses fallback source for root-client logs', () => {
    const enqueuedLogs: IngestionLogEntry[] = [];
    const enqueue = vi.fn((log: IngestionLogEntry) => {
      enqueuedLogs.push(log);
    });
    const createPipeline = vi.fn(() => {
      return {
        enqueue,
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        apiKey: 'test-api-key',
        ingestionBaseUrl: 'http://localhost:3000',
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    client.info('message-with-fallback-source');

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueuedLogs[0]).toEqual({
      source: 'unknown',
      level: 'info',
      timestamp: '2026-02-14T20:00:00.000Z',
      message: 'message-with-fallback-source',
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('ignores deprecated endpoint and context.source on root-client config', () => {
    const enqueuedLogs: IngestionLogEntry[] = [];
    const enqueue = vi.fn((log: IngestionLogEntry) => {
      enqueuedLogs.push(log);
    });
    const createPipeline = vi.fn((input: PipelineInput) => {
      expect(input.ingestionBaseUrl).toBe(DEFAULT_INGESTION_BASE_URL);

      return {
        enqueue,
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        apiKey: 'test-api-key',
        endpoint: 'http://localhost:3000',
        context: {
          source: 'billing-api',
        },
      } as unknown as LogscopeConfig,
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    client.info('legacy root config');

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueuedLogs[0]?.source).toBe('unknown');
    expect(warn).not.toHaveBeenCalled();
  });

  it('forwards validated runtime overrides to the batching pipeline', () => {
    const createPipeline = vi.fn((input: PipelineInput) => {
      expect(input.runtimeConfig).toEqual({
        maxBatchSize: 10,
        flushIntervalMs: 750,
        retryPolicy: {
          maxRetries: 2,
          baseDelayMs: 100,
          maxDelayMs: 1_500,
        },
      });

      return {
        enqueue: vi.fn(),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        ...baseConfig,
        runtime: {
          maxBatchSize: 10,
          flushIntervalMs: 750,
          maxRetries: 2,
          retryBaseDelayMs: 100,
          retryMaxDelayMs: 1_500,
        },
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    client.info('runtime override message');

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to default runtime values when overrides are invalid', () => {
    const createPipeline = vi.fn((input: PipelineInput) => {
      expect(input.runtimeConfig).toEqual({
        maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
        flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
        retryPolicy: DEFAULT_RETRY_POLICY,
      });

      return {
        enqueue: vi.fn(),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        ...baseConfig,
        runtime: {
          maxBatchSize: 10_000,
          flushIntervalMs: 0,
          maxRetries: Number.NaN,
          retryBaseDelayMs: -100,
          retryMaxDelayMs: Infinity,
        },
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    client.warn('invalid runtime override message');

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('applies configured level filters before enqueueing manual logs', () => {
    const enqueuedLogs: IngestionLogEntry[] = [];
    const enqueue = vi.fn((log: IngestionLogEntry) => {
      enqueuedLogs.push(log);
    });
    const createPipeline = vi.fn(() => {
      return {
        enqueue,
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        ...baseConfig,
        logFilter: {
          levels: ['warn', 'error'],
        },
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    client.info('filtered-info');
    client.warn('allowed-warn');
    client.error('allowed-error');
    client.fatal('filtered-fatal');

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(enqueuedLogs.map((log) => log.level)).toEqual(['warn', 'error']);
    expect(enqueuedLogs.map((log) => log.message)).toEqual(['allowed-warn', 'allowed-error']);
  });

  it('drops all logs when logFilter.levels is configured as empty', () => {
    const enqueue = vi.fn();
    const createPipeline = vi.fn(() => {
      return {
        enqueue,
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        ...baseConfig,
        logFilter: {
          levels: [],
        },
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    client.trace('trace');
    client.debug('debug');
    client.info('info');
    client.warn('warn');
    client.error('error');
    client.fatal('fatal');

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('keeps console untouched by default when captureConsole is disabled', () => {
    const createPipeline = vi.fn(() => {
      return {
        enqueue: vi.fn(),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();
    const setupConsoleCapture = vi.fn();

    createLogscopeClientInternal(baseConfig, {
      createPipeline,
      warn,
      now: () => fixedDate,
      setupConsoleCapture,
    });

    expect(setupConsoleCapture).not.toHaveBeenCalled();
  });

  it('wires console capture through shared ingress and applies filtering to captured logs', () => {
    const enqueuedLogs: IngestionLogEntry[] = [];
    const enqueue = vi.fn((log: IngestionLogEntry) => {
      enqueuedLogs.push(log);
    });
    const createPipeline = vi.fn(() => {
      return {
        enqueue,
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();
    const setupConsoleCapture = vi.fn(
      (dispatchLog: (level: IngestionLogEntry['level'], message: string) => void) => {
        dispatchLog('info', 'filtered console info');
        dispatchLog('error', 'captured console error');
      },
    );

    createLogscopeClientInternal(
      {
        ...baseConfig,
        captureConsole: true,
        logFilter: {
          levels: ['error'],
        },
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
        setupConsoleCapture,
      },
    );

    expect(setupConsoleCapture).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueuedLogs).toEqual([
      {
        source: 'unknown',
        level: 'error',
        timestamp: '2026-02-14T20:00:00.000Z',
        message: 'captured console error',
      },
    ]);
  });

  it('never throws when console capture setup fails', () => {
    const createPipeline = vi.fn(() => {
      return {
        enqueue: vi.fn(),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();
    const setupConsoleCapture = vi.fn(() => {
      throw new Error('capture setup failed');
    });

    expect(() => {
      createLogscopeClientInternal(
        {
          ...baseConfig,
          captureConsole: true,
        },
        {
          createPipeline,
          warn,
          now: () => fixedDate,
          setupConsoleCapture,
        },
      );
    }).not.toThrow();
    expect(setupConsoleCapture).toHaveBeenCalledTimes(1);
  });

  it('never throws to callers when pipeline creation or enqueue fails', () => {
    const createPipelineThatThrows = vi.fn(() => {
      throw new Error('pipeline init failed');
    });
    const createPipelineWithThrowingEnqueue = vi.fn(() => {
      return {
        enqueue: vi.fn(() => {
          throw new Error('enqueue failed');
        }),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const fallbackClient = createLogscopeClientInternal(baseConfig, {
      createPipeline: createPipelineThatThrows,
      warn,
      now: () => fixedDate,
    });

    const throwingClient = createLogscopeClientInternal(baseConfig, {
      createPipeline: createPipelineWithThrowingEnqueue,
      warn,
      now: () => fixedDate,
    });

    expect(() => fallbackClient.info('message')).not.toThrow();
    expect(() => throwingClient.error('message')).not.toThrow();
  });

  it('warns once on unauthorized batch results without exposing api keys', () => {
    const createPipeline = vi.fn((input: PipelineInput) => {
      return {
        enqueue: vi.fn(() => {
          input.onBatchResult({
            action: 'unauthorized',
            status: 401,
            shouldWarnUnauthorized: true,
          } satisfies IngestionRequestResult);
        }),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(baseConfig, {
      createPipeline,
      warn,
      now: () => fixedDate,
    });

    client.warn('first unauthorized');
    client.warn('second unauthorized');

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('[logscope]');
    expect(warn.mock.calls[0]?.[0]).toContain('unauthorized');
    expect(warn.mock.calls[0]?.[0]).not.toContain(baseConfig.apiKey);
  });

  it('never throws to callers even if warn handler throws', () => {
    const createPipeline = vi.fn((input: PipelineInput) => {
      return {
        enqueue: vi.fn(() => {
          input.onBatchResult({
            action: 'unauthorized',
            status: 401,
            shouldWarnUnauthorized: true,
          } satisfies IngestionRequestResult);
        }),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn(() => {
      throw new Error('warn failed');
    });

    const client = createLogscopeClientInternal(baseConfig, {
      createPipeline,
      warn,
      now: () => fixedDate,
    });

    expect(() => client.fatal('trigger warn')).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('warns once when batches are dropped after max retry attempts', () => {
    const createPipeline = vi.fn((input: PipelineInput) => {
      return {
        enqueue: vi.fn(() => {
          input.onBatchResult({
            action: 'drop',
            shouldWarnUnauthorized: false,
            errorKind: 'max_retries_exceeded',
          });
        }),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(baseConfig, {
      createPipeline,
      warn,
      now: () => fixedDate,
    });

    client.info('retry exhausted #1');
    client.info('retry exhausted #2');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('[logscope]');
    expect(warn.mock.calls[0]?.[0]).toContain('max retry attempts');
    expect(warn.mock.calls[0]?.[0]).not.toContain(baseConfig.apiKey);
  });

  it('fails safely when ingestionBaseUrl uses an untrusted domain', () => {
    const createPipeline = vi.fn(() => {
      return {
        enqueue: vi.fn(),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        apiKey: 'test-api-key',
        ingestionBaseUrl: 'https://some-other-logging-service.com',
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    expect(() => client.info('message')).not.toThrow();
    expect(createPipeline).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('ingestionBaseUrl');
    expect(warn.mock.calls[0]?.[0]).toContain('official Logscope SDK');
  });

  it('fails safely when LOGSCOPE_INGESTION_URL is invalid', () => {
    vi.stubEnv(LOGSCOPE_INGESTION_URL_ENV_VAR, 'https://example.com');

    const createPipeline = vi.fn(() => {
      return {
        enqueue: vi.fn(),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();

    const client = createLogscopeClientInternal(
      {
        apiKey: 'test-api-key',
      },
      {
        createPipeline,
        warn,
        now: () => fixedDate,
      },
    );

    expect(() => client.info('message')).not.toThrow();
    expect(createPipeline).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain(LOGSCOPE_INGESTION_URL_ENV_VAR);
  });

  it('falls back safely when required config fields are missing or invalid', () => {
    const createPipeline = vi.fn(() => {
      return {
        enqueue: vi.fn(),
        flushNow: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
    });
    const warn = vi.fn();
    const setupConsoleCapture = vi.fn();
    const malformedConfig = {
      apiKey: '',
      ingestionBaseUrl: '',
      captureConsole: true,
    } as unknown as LogscopeConfig;

    const client = createLogscopeClientInternal(malformedConfig, {
      createPipeline,
      warn,
      now: () => fixedDate,
      setupConsoleCapture,
    });

    expect(() => client.trace('trace')).not.toThrow();
    expect(() => client.debug('debug')).not.toThrow();
    expect(() => client.info('info')).not.toThrow();
    expect(() => client.warn('warn')).not.toThrow();
    expect(() => client.error('error')).not.toThrow();
    expect(() => client.fatal('fatal')).not.toThrow();

    expect(createPipeline).not.toHaveBeenCalled();
    expect(setupConsoleCapture).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('[logscope]');
    expect(warn.mock.calls[0]?.[0]).toContain('apiKey');
    expect(warn.mock.calls[0]?.[0]).not.toContain('super-secret-api-key');
  });

  it('never throws when invalid-config warning handler fails', () => {
    const createPipeline = vi.fn();
    const warn = vi.fn(() => {
      throw new Error('warn failed');
    });
    const malformedConfig = {
      apiKey: '',
      ingestionBaseUrl: '',
    } as unknown as LogscopeConfig;

    expect(() => {
      createLogscopeClientInternal(malformedConfig, {
        createPipeline,
        warn,
        now: () => fixedDate,
      });
    }).not.toThrow();

    expect(createPipeline).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
