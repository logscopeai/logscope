import {
  DEFAULT_INGESTION_BASE_URL,
  LOGSCOPE_INGESTION_URL_ENV_VAR,
  SAFE_FALLBACK_SOURCE,
} from './constants';
import { Logscope } from './logscope';
import { MAX_BATCH_SIZE } from './pipeline/pipeline';
import type { FetchLike } from './transport/transport-types';
import type { LogscopeInitConfig } from './types';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Logscope', () => {
  it('uses the production ingestion base URL by default', async () => {
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

  it('uses LOGSCOPE_INGESTION_URL when the root config omits ingestionBaseUrl', async () => {
    vi.stubEnv(LOGSCOPE_INGESTION_URL_ENV_VAR, 'https://dev.ingestion.logscopeai.com/');

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
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'https://dev.ingestion.logscopeai.com/api/logs/ingest',
      );
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
        ingestionBaseUrl: 'http://localhost:3000/',
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

  it('ignores deprecated endpoint when ingestionBaseUrl is missing', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({
      status: 202,
    });
    const originalFetch = globalThis.fetch;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const logscope = new Logscope({
        apiKey: 'test-api-key',
        endpoint: 'http://localhost:3000',
      } as unknown as LogscopeInitConfig);

      emitBatch(logscope);
      await flushAsyncWork();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(`${DEFAULT_INGESTION_BASE_URL}/api/logs/ingest`);
    } finally {
      logSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });

  it('does not silently fall back when ingestionBaseUrl is whitespace-only', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({
      status: 202,
    });
    const originalFetch = globalThis.fetch;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const logscope = new Logscope({
        apiKey: 'test-api-key',
        ingestionBaseUrl: '   ',
      });

      emitBatch(logscope);
      await flushAsyncWork();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain('ingestionBaseUrl');
    } finally {
      warnSpy.mockRestore();
      logSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });

  it('does not silently fall back when the environment override is invalid', async () => {
    vi.stubEnv(LOGSCOPE_INGESTION_URL_ENV_VAR, 'https://example.com');

    const fetchMock: FetchLike = vi.fn().mockResolvedValue({
      status: 202,
    });
    const originalFetch = globalThis.fetch;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const logscope = new Logscope({
        apiKey: 'test-api-key',
      });

      emitBatch(logscope);
      await flushAsyncWork();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain(LOGSCOPE_INGESTION_URL_ENV_VAR);
    } finally {
      warnSpy.mockRestore();
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
