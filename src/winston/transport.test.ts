import { readFileSync } from 'node:fs';
import type { Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SendIngestionRequestInput } from '../transport/transport-types';
import { createWinstonTransportInternal, type LogscopeWinstonTransportOptions } from './transport';

const baseOptions: LogscopeWinstonTransportOptions = {
  apiKey: 'test-api-key',
  endpoint: 'http://localhost:3000',
  source: 'billing-api',
  flushIntervalMs: 1,
  retryPolicy: {
    maxRetries: 0,
    baseDelayMs: 0,
    maxDelayMs: 0,
  },
};

const createSuccessResult = () => {
  return {
    action: 'success' as const,
    status: 202 as const,
    shouldWarnUnauthorized: false,
  };
};

const endTransport = async (transport: Writable): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    transport.once('error', reject);
    transport.end(() => {
      resolve();
    });
  });
};

describe('createWinstonTransportInternal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps winston logs and applies level filtering before batching', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const transport = createWinstonTransportInternal(
      {
        ...baseOptions,
        logFilter: {
          levels: ['error'],
        },
      },
      {
        sendBatch,
        warn,
      },
    );
    const acceptedTimestamp = Date.parse('2026-02-15T15:00:00.000Z');

    transport.write({
      level: 'info',
      message: 'filtered info',
      timestamp: acceptedTimestamp,
      requestId: 'r-1',
    });
    transport.write({
      level: 'error',
      message: 'accepted error',
      timestamp: acceptedTimestamp,
      requestId: 'r-2',
    });
    await endTransport(transport);

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect((sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs).toEqual([
      {
        source: 'billing-api',
        level: 'error',
        timestamp: new Date(acceptedTimestamp).toISOString(),
        message: 'accepted error',
        metadata: {
          requestId: 'r-2',
        },
      },
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('forwards nested metadata and preserves stack-like fields', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const transport = createWinstonTransportInternal(baseOptions, {
      sendBatch,
      warn,
    });

    transport.write({
      level: 'warn',
      message: 'structured warning',
      timestamp: '2026-02-15T16:00:00.000Z',
      tenant: 'acme',
      stack: 'Error: boom',
      nested: {
        x: 1,
      },
    });
    await endTransport(transport);

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect((sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs).toEqual([
      {
        source: 'billing-api',
        level: 'warn',
        timestamp: '2026-02-15T16:00:00.000Z',
        message: 'structured warning',
        metadata: {
          tenant: 'acme',
          stack: 'Error: boom',
          nested: {
            x: 1,
          },
        },
      },
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to runtime timestamp when winston timestamp is not a supported type', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const transport = createWinstonTransportInternal(baseOptions, {
      sendBatch,
      warn,
    });

    transport.write({
      level: 'info',
      message: 'timestamp fallback message',
      timestamp: {
        invalid: true,
      },
    });
    await endTransport(transport);

    expect(sendBatch).toHaveBeenCalledTimes(1);
    const sentLogs = (sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs;

    expect(sentLogs).toHaveLength(1);
    expect(sentLogs[0]?.message).toBe('timestamp fallback message');
    expect(Date.parse(sentLogs[0]?.timestamp ?? '')).not.toBeNaN();
    expect(warn).not.toHaveBeenCalled();
  });

  it('ignores invalid payloads and unsupported levels safely without crashing', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const transport = createWinstonTransportInternal(baseOptions, {
      sendBatch,
      warn,
    });

    expect(() => {
      transport.write('not-an-object');
      transport.write({
        message: 'missing level',
      });
      transport.write({
        level: 'notice',
        message: 'unknown level',
      });
    }).not.toThrow();
    await endTransport(transport);

    expect(sendBatch).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once when multiple unauthorized batch results are received', async () => {
    const sendBatch = vi.fn().mockResolvedValue({
      action: 'unauthorized',
      status: 401,
      shouldWarnUnauthorized: true,
    });
    const warn = vi.fn();
    const transport = createWinstonTransportInternal(
      {
        ...baseOptions,
        flushIntervalMs: 0,
      },
      {
        sendBatch,
        warn,
      },
    );

    for (let index = 0; index < 75; index += 1) {
      transport.write({
        level: 'error',
        message: `error-${index}`,
        timestamp: '2026-02-15T17:00:00.000Z',
      });
    }

    await endTransport(transport);

    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('unauthorized response (401)');
    expect(warn.mock.calls[0]?.[0]).not.toContain(baseOptions.apiKey);
  });

  it('warns once when retriable responses exceed max retries across multiple batches', async () => {
    const sendBatch = vi.fn().mockResolvedValue({
      action: 'retry',
      status: 429,
      shouldWarnUnauthorized: false,
    });
    const warn = vi.fn();
    const transport = createWinstonTransportInternal(
      {
        ...baseOptions,
        flushIntervalMs: 0,
        retryPolicy: {
          maxRetries: 0,
          baseDelayMs: 0,
          maxDelayMs: 0,
        },
      },
      {
        sendBatch,
        warn,
      },
    );

    for (let index = 0; index < 75; index += 1) {
      transport.write({
        level: 'error',
        message: `retry-error-${index}`,
        timestamp: '2026-02-15T17:15:00.000Z',
      });
    }

    await endTransport(transport);

    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('max retry attempts');
    expect(warn.mock.calls[0]?.[0]).not.toContain(baseOptions.apiKey);
  });

  it('falls back to a no-op pipeline when pipeline initialization fails', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn(() => {
      throw new Error('warn failed');
    });
    const transport = createWinstonTransportInternal(baseOptions, {
      sendBatch,
      warn,
      createPipeline: () => {
        throw new Error('pipeline init failed');
      },
    });

    expect(() => {
      transport.write({
        level: 'error',
        message: 'ignored because pipeline fallback is no-op',
        timestamp: '2026-02-15T18:00:00.000Z',
      });
    }).not.toThrow();

    await endTransport(transport);
    expect(sendBatch).not.toHaveBeenCalled();
  });

  it('falls back safely when required winston transport options are missing or invalid', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const malformedOptions = {
      apiKey: 'super-secret-api-key',
      endpoint: '',
      source: '',
      flushIntervalMs: 10,
    } as unknown as LogscopeWinstonTransportOptions;
    const transport = createWinstonTransportInternal(malformedOptions, {
      sendBatch,
      warn,
    });

    expect(() => {
      transport.write({
        level: 'error',
        message: 'ignored because config is invalid',
        timestamp: '2026-02-15T18:00:00.000Z',
      });
    }).not.toThrow();

    await endTransport(transport);

    expect(sendBatch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('endpoint');
    expect(warn.mock.calls[0]?.[0]).toContain('source');
    expect(warn.mock.calls[0]?.[0]).not.toContain('super-secret-api-key');
  });

  it('never throws when invalid winston-config warning handler fails', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn(() => {
      throw new Error('warn failed');
    });
    const malformedOptions = {
      apiKey: '',
      endpoint: '',
      source: '',
    } as unknown as LogscopeWinstonTransportOptions;

    const transport = createWinstonTransportInternal(malformedOptions, {
      sendBatch,
      warn,
    });

    expect(() => {
      transport.write({
        level: 'error',
        message: 'ignored because warning handler failed',
        timestamp: '2026-02-15T18:00:00.000Z',
      });
    }).not.toThrow();

    await endTransport(transport);

    expect(sendBatch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('keeps package export path for winston subpath compatible with built module resolution', () => {
    const packageJsonRaw = readFileSync('package.json', 'utf8');
    const packageJson = JSON.parse(packageJsonRaw) as {
      exports?: Record<string, unknown>;
    };

    expect(packageJson.exports?.['./winston']).toEqual({
      types: './dist/winston.d.ts',
      default: './dist/winston.js',
    });
  });
});
