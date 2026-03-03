import { sendIngestionRequest } from './send-ingestion-request';
import type {
  FetchLike,
  IngestionRequestAction,
  SendIngestionRequestInput,
} from './transport-types';
import { describe, expect, it, vi } from 'vitest';

const buildInput = (endpoint = 'http://localhost:3000'): SendIngestionRequestInput => {
  return {
    endpoint,
    apiKey: 'test-api-key',
    logs: [
      {
        source: 'orders-api',
        level: 'info',
        timestamp: '2026-02-14T00:00:00.000Z',
        message: 'service started',
      },
    ],
  };
};

describe('sendIngestionRequest', () => {
  it('sends requests to /api/logs/ingest with required headers and payload', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({ status: 202 });
    const input = buildInput();

    const result = await sendIngestionRequest(input, { fetch: fetchMock });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/logs/ingest', {
      method: 'POST',
      headers: {
        'x-api-key': 'test-api-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logs: input.logs,
      }),
    });
    expect(result).toEqual({
      action: 'success',
      status: 202,
      shouldWarnUnauthorized: false,
    });
  });

  it('always targets /api/logs/ingest even when endpoint includes a path', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({ status: 202 });

    await sendIngestionRequest(buildInput('http://localhost:3000/custom/path'), {
      fetch: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/api/logs/ingest');
  });

  it('classifies response statuses for delivery outcomes', async () => {
    const scenarios: Array<{
      status: number;
      expectedAction: IngestionRequestAction;
      shouldWarnUnauthorized: boolean;
    }> = [
      { status: 202, expectedAction: 'success', shouldWarnUnauthorized: false },
      { status: 400, expectedAction: 'drop', shouldWarnUnauthorized: false },
      { status: 401, expectedAction: 'unauthorized', shouldWarnUnauthorized: true },
      { status: 413, expectedAction: 'drop', shouldWarnUnauthorized: false },
      { status: 429, expectedAction: 'retry', shouldWarnUnauthorized: false },
      { status: 500, expectedAction: 'retry', shouldWarnUnauthorized: false },
      { status: 503, expectedAction: 'retry', shouldWarnUnauthorized: false },
      { status: 418, expectedAction: 'drop', shouldWarnUnauthorized: false },
    ];

    for (const scenario of scenarios) {
      const fetchMock: FetchLike = vi.fn().mockResolvedValue({ status: scenario.status });

      const result = await sendIngestionRequest(buildInput(), { fetch: fetchMock });

      expect(result).toEqual({
        action: scenario.expectedAction,
        status: scenario.status,
        shouldWarnUnauthorized: scenario.shouldWarnUnauthorized,
      });
    }
  });

  it('returns safe retry outcomes on network/runtime fetch errors without throwing', async () => {
    const fetchMock: FetchLike = vi.fn().mockRejectedValue(new Error('socket hang up'));

    await expect(sendIngestionRequest(buildInput(), { fetch: fetchMock })).resolves.toEqual({
      action: 'retry',
      shouldWarnUnauthorized: false,
      errorKind: 'network_error',
    });
  });

  it('returns safe drop outcomes on invalid endpoints without throwing', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({ status: 202 });

    await expect(
      sendIngestionRequest(
        {
          ...buildInput(),
          endpoint: '://invalid-endpoint',
        },
        { fetch: fetchMock },
      ),
    ).resolves.toEqual({
      action: 'drop',
      shouldWarnUnauthorized: false,
      errorKind: 'invalid_endpoint',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs request endpoint without exposing secrets or emitting warnings/errors', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({ status: 401 });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await sendIngestionRequest(
      {
        ...buildInput(),
        apiKey: 'super-secret-key',
      },
      { fetch: fetchMock },
    );

    expect(result).toEqual({
      action: 'unauthorized',
      status: 401,
      shouldWarnUnauthorized: true,
    });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      '[logscope] Sending logs batch to http://localhost:3000/api/logs/ingest',
    );
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.join(' ')).not.toContain('super-secret-key');

    warnSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});
