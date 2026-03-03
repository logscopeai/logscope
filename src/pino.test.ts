import createPinoTransport, {
  createPinoTransport as createNamedPinoTransport,
  type LogscopePinoTransportOptions,
} from './pino';
import { describe, expect, it, vi } from 'vitest';

describe('pino sdk subpath entrypoint', () => {
  it('exports a working pino transport factory as default and named export', () => {
    const options: LogscopePinoTransportOptions = {
      apiKey: 'api-key',
      endpoint: 'http://localhost:3000',
      source: 'unit-test',
    };

    const defaultTransport = createPinoTransport(options);
    const namedTransport = createNamedPinoTransport(options);

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
    const options: LogscopePinoTransportOptions = {
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
      const transport = createPinoTransport(options);

      transport.write(
        `${JSON.stringify({
          level: 50,
          time: '2026-02-15T20:00:00.000Z',
          msg: 'unauthorized test',
        })}\n`,
      );

      await new Promise<void>((resolve, reject) => {
        transport.once('error', reject);
        transport.end(() => {
          resolve();
        });
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain('unauthorized');
      expect(warnSpy.mock.calls[0]?.[0]).not.toContain(options.apiKey);
    } finally {
      warnSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });
});
