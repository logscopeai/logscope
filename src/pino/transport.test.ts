import { readFileSync } from 'node:fs';
import type { Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SendIngestionRequestInput } from '../transport/transport-types';
import { createPinoTransportInternal, type LogscopePinoTransportOptions } from './transport';

const baseOptions: LogscopePinoTransportOptions = {
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

describe('createPinoTransportInternal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses pino logs, maps levels, and applies level filtering before batching', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const transport = createPinoTransportInternal(
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

    transport.write(
      `${JSON.stringify({ level: 30, time: acceptedTimestamp, msg: 'filtered info', requestId: 'r-1' })}\n`,
    );
    transport.write(
      `${JSON.stringify({ level: 50, time: acceptedTimestamp, msg: 'accepted error', requestId: 'r-2' })}\n`,
    );
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

  it('handles chunked lines and forwards parsed metadata', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const transport = createPinoTransportInternal(baseOptions, {
      sendBatch,
      warn,
    });
    const serializedLog = JSON.stringify({
      level: 40,
      time: '2026-02-15T16:00:00.000Z',
      msg: 'chunked warning',
      tenant: 'acme',
      nested: {
        x: 1,
      },
    });

    transport.write(serializedLog.slice(0, 18));
    transport.write(serializedLog.slice(18));
    transport.write('\n');
    await endTransport(transport);

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect((sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs).toEqual([
      {
        source: 'billing-api',
        level: 'warn',
        timestamp: '2026-02-15T16:00:00.000Z',
        message: 'chunked warning',
        metadata: {
          tenant: 'acme',
          nested: {
            x: 1,
          },
        },
      },
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('flushes a final pending line when stream ends without trailing newline', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const transport = createPinoTransportInternal(baseOptions, {
      sendBatch,
      warn,
    });

    transport.write(
      JSON.stringify({
        level: 50,
        time: '2026-02-15T16:30:00.000Z',
        msg: 'last line without newline',
      }),
    );
    await endTransport(transport);

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect((sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs).toEqual([
      {
        source: 'billing-api',
        level: 'error',
        timestamp: '2026-02-15T16:30:00.000Z',
        message: 'last line without newline',
      },
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('ignores invalid payloads safely without crashing', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const transport = createPinoTransportInternal(baseOptions, {
      sendBatch,
      warn,
    });

    expect(() => {
      transport.write('not-json\n');
      transport.write(`${JSON.stringify({ msg: 'missing level' })}\n`);
      transport.write(`${JSON.stringify({ level: 999, msg: 'unknown level' })}\n`);
      transport.write(`${JSON.stringify(['array payload'])}\n`);
      transport.write('\n');
    }).not.toThrow();
    await endTransport(transport);

    expect(sendBatch).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to runtime timestamp when pino time is not a supported type', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const transport = createPinoTransportInternal(baseOptions, {
      sendBatch,
      warn,
    });

    transport.write(
      `${JSON.stringify({
        level: 30,
        time: {
          invalid: true,
        },
        msg: 'timestamp fallback message',
      })}\n`,
    );
    await endTransport(transport);

    expect(sendBatch).toHaveBeenCalledTimes(1);
    const sentLogs = (sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs;

    expect(sentLogs).toHaveLength(1);
    expect(sentLogs[0]?.message).toBe('timestamp fallback message');
    expect(Date.parse(sentLogs[0]?.timestamp ?? '')).not.toBeNaN();
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once when multiple unauthorized batch results are received', async () => {
    const sendBatch = vi.fn().mockResolvedValue({
      action: 'unauthorized',
      status: 401,
      shouldWarnUnauthorized: true,
    });
    const warn = vi.fn();
    const transport = createPinoTransportInternal(
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
      transport.write(
        `${JSON.stringify({
          level: 50,
          time: '2026-02-15T17:00:00.000Z',
          msg: `error-${index}`,
        })}\n`,
      );
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
    const transport = createPinoTransportInternal(
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
      transport.write(
        `${JSON.stringify({
          level: 50,
          time: '2026-02-15T17:15:00.000Z',
          msg: `retry-error-${index}`,
        })}\n`,
      );
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
    const transport = createPinoTransportInternal(baseOptions, {
      sendBatch,
      warn,
      createPipeline: () => {
        throw new Error('pipeline init failed');
      },
    });

    expect(() => {
      transport.write(
        `${JSON.stringify({
          level: 50,
          time: '2026-02-15T18:00:00.000Z',
          msg: 'ignored because pipeline fallback is no-op',
        })}\n`,
      );
    }).not.toThrow();

    await endTransport(transport);
    expect(sendBatch).not.toHaveBeenCalled();
  });

  it('falls back safely when required pino transport options are missing or invalid', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn();
    const malformedOptions = {
      apiKey: 'super-secret-api-key',
      endpoint: '',
      source: '',
      flushIntervalMs: 10,
    } as unknown as LogscopePinoTransportOptions;
    const transport = createPinoTransportInternal(malformedOptions, {
      sendBatch,
      warn,
    });

    expect(() => {
      transport.write(
        `${JSON.stringify({
          level: 50,
          time: '2026-02-15T18:00:00.000Z',
          msg: 'ignored because config is invalid',
        })}\n`,
      );
    }).not.toThrow();

    await endTransport(transport);

    expect(sendBatch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('endpoint');
    expect(warn.mock.calls[0]?.[0]).toContain('source');
    expect(warn.mock.calls[0]?.[0]).not.toContain('super-secret-api-key');
  });

  it('never throws when invalid pino-config warning handler fails', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const warn = vi.fn(() => {
      throw new Error('warn failed');
    });
    const malformedOptions = {
      apiKey: '',
      endpoint: '',
      source: '',
    } as unknown as LogscopePinoTransportOptions;

    const transport = createPinoTransportInternal(malformedOptions, {
      sendBatch,
      warn,
    });

    expect(() => {
      transport.write(
        `${JSON.stringify({
          level: 50,
          time: '2026-02-15T18:00:00.000Z',
          msg: 'ignored because warning handler failed',
        })}\n`,
      );
    }).not.toThrow();

    await endTransport(transport);

    expect(sendBatch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('keeps package export path for pino subpath compatible with built module resolution', () => {
    const packageJsonRaw = readFileSync('package.json', 'utf8');
    const packageJson = JSON.parse(packageJsonRaw) as {
      exports?: Record<string, unknown>;
    };

    expect(packageJson.exports?.['./pino']).toEqual({
      types: './dist/pino.d.ts',
      default: './dist/pino.js',
    });
  });
});
