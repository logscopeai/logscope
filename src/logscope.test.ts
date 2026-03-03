import { DEFAULT_INGESTION_BASE_URL, SAFE_FALLBACK_SOURCE } from './constants';
import { Logscope } from './logscope';
import { MAX_BATCH_SIZE } from './pipeline/pipeline';
import type { FetchLike } from './transport/transport-types';
import type { LogscopeInitConfig } from './types';
import { describe, expect, it, vi } from 'vitest';

const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const emitBatch = (logscope: Logscope): void => {
  for (let index = 0; index < MAX_BATCH_SIZE; index += 1) {
    logscope.info(`message-${index}`);
  }
};

describe('Logscope', () => {
  it('uses the centralized production ingestion base URL by default', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({
      status: 202,
    });
    const originalFetch = globalThis.fetch;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const logscope = new Logscope({
        apiKey: 'test-api-key',
      });

      emitBatch(logscope);
      await flushAsyncWork();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(`${DEFAULT_INGESTION_BASE_URL}/api/logs/ingest`);

      const requestInit = fetchMock.mock.calls[0]?.[1];
      const requestBody = JSON.parse(requestInit?.body ?? '{}') as {
        logs?: Array<{ source?: string }>;
      };

      expect(requestBody.logs?.[0]?.source).toBe(SAFE_FALLBACK_SOURCE);
    } finally {
      logSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });

  it('uses ingestionBaseUrl override when provided', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({
      status: 202,
    });
    const originalFetch = globalThis.fetch;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const logscope = new Logscope({
        apiKey: 'test-api-key',
        ingestionBaseUrl: 'http://localhost:3000',
      });

      emitBatch(logscope);
      await flushAsyncWork();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/api/logs/ingest');
    } finally {
      logSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });

  it('falls back to endpoint when ingestionBaseUrl is an empty string', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({
      status: 202,
    });
    const originalFetch = globalThis.fetch;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const logscope = new Logscope({
        apiKey: 'test-api-key',
        ingestionBaseUrl: '',
        endpoint: 'http://localhost:3000',
      });

      emitBatch(logscope);
      await flushAsyncWork();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/api/logs/ingest');
    } finally {
      logSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });

  it('falls back to endpoint when ingestionBaseUrl is whitespace-only', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({
      status: 202,
    });
    const originalFetch = globalThis.fetch;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const logscope = new Logscope({
        apiKey: 'test-api-key',
        ingestionBaseUrl: '   ',
        endpoint: 'http://localhost:3000',
      });

      emitBatch(logscope);
      await flushAsyncWork();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/api/logs/ingest');
    } finally {
      logSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });

  it('handles invalid initialization input without throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const blankApiKeyClient = new Logscope({
        apiKey: '',
      });
      const nullInputClient = new Logscope(null as unknown as LogscopeInitConfig);

      expect(() => blankApiKeyClient.info('safe message')).not.toThrow();
      expect(() => nullInputClient.error('safe error')).not.toThrow();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
