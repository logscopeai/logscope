import type { Writable } from 'node:stream';
import { createLogger, format } from 'winston';
import createWinstonTransport, {
  createWinstonTransport as createNamedWinstonTransport,
  type LogscopeWinstonTransportOptions,
} from './winston';
import { describe, expect, it, vi } from 'vitest';

const endTransport = async (transport: Writable): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    transport.once('error', reject);
    transport.end(() => {
      resolve();
    });
  });
};

describe('winston sdk subpath entrypoint', () => {
  it('exports a working winston transport factory as default and named export', () => {
    const options: LogscopeWinstonTransportOptions = {
      apiKey: 'api-key',
      endpoint: 'http://localhost:3000',
      source: 'unit-test',
    };

    const defaultTransport = createWinstonTransport(options);
    const namedTransport = createNamedWinstonTransport(options);

    expect(defaultTransport).toHaveProperty('write');
    expect(defaultTransport).toHaveProperty('end');
    expect(namedTransport).toHaveProperty('write');
    expect(namedTransport).toHaveProperty('end');

    defaultTransport.end();
    namedTransport.end();
  });

  it('supports default dependency path for ingestion and unauthorized warning handling', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 401,
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const originalFetch = globalThis.fetch;
    const options: LogscopeWinstonTransportOptions = {
      apiKey: 'api-key',
      endpoint: 'http://localhost:3000',
      source: 'unit-test',
      flushIntervalMs: 1,
      retryPolicy: {
        maxRetries: 0,
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
    };

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const transport = createWinstonTransport(options);
      const logger = createLogger({
        level: 'silly',
        format: format.combine(format.timestamp()),
        transports: [transport],
      });

      logger.error('unauthorized test');
      await endTransport(transport);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain('unauthorized');
      expect(warnSpy.mock.calls[0]?.[0]).not.toContain(options.apiKey);
    } finally {
      warnSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });

  it('works with a real winston logger and forwards formatted metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 202,
    });
    const originalFetch = globalThis.fetch;
    const options: LogscopeWinstonTransportOptions = {
      apiKey: 'api-key',
      endpoint: 'http://localhost:3000',
      source: 'unit-test',
      flushIntervalMs: 1,
      retryPolicy: {
        maxRetries: 0,
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
    };

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const transport = createWinstonTransport(options);
      const logger = createLogger({
        level: 'silly',
        format: format.combine(format.timestamp(), format.errors({ stack: true })),
        transports: [transport],
      });

      logger.warn('integration warning', {
        requestId: 'req-123',
        nested: {
          ok: true,
        },
      });
      await endTransport(transport);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body ?? '{}') as {
        logs?: Array<{
          source?: string;
          level?: string;
          message?: string;
          metadata?: Record<string, unknown>;
        }>;
      };

      expect(requestBody.logs).toEqual([
        {
          source: 'unit-test',
          level: 'warn',
          message: 'integration warning',
          timestamp: expect.any(String),
          metadata: {
            requestId: 'req-123',
            nested: {
              ok: true,
            },
          },
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
