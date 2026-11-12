import { extractInvalidEntryIndexes, sendIngestionRequest } from './send-ingestion-request';
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

  it('turns a 400 whose details name specific entries into a drop_entries outcome', async () => {
    const details = [
      '"logs.1.message" Too small: expected string to have >=1 characters',
      '"logs.3.metadata.requestId" Too big: expected string to have <=160 characters',
      '"logs.1.source" Too small: expected string to have >=2 characters',
    ];
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({
      status: 400,
      text: async () => JSON.stringify({ error: 'Invalid request body', details }),
    });
    const input = buildInput();
    input.logs = Array.from({ length: 5 }, (_, index) => ({
      ...input.logs[0]!,
      message: `entry ${index}`,
    }));

    const result = await sendIngestionRequest(input, { fetch: fetchMock });

    expect(result).toEqual({
      action: 'drop_entries',
      status: 400,
      shouldWarnUnauthorized: false,
      invalidIndexes: [1, 3],
      details,
    });
  });

  it('keeps dropping the whole batch when a 400 is not attributable to entries', async () => {
    const scenarios: Array<{ name: string; body?: string; batchSize: number }> = [
      {
        name: 'batch-level rule',
        body: JSON.stringify({ details: ['"logs" Too big: expected array to have <=50 items'] }),
        batchSize: 2,
      },
      {
        name: 'every entry rejected',
        body: JSON.stringify({
          details: ['"logs.0.message" Too small', '"logs.1.message" Too small'],
        }),
        batchSize: 2,
      },
      { name: 'malformed body', body: 'not json', batchSize: 2 },
      { name: 'no details', body: JSON.stringify({ error: 'Invalid request body' }), batchSize: 2 },
      {
        name: 'index out of range',
        body: JSON.stringify({ details: ['"logs.7.message" Too small'] }),
        batchSize: 2,
      },
    ];

    for (const scenario of scenarios) {
      const fetchMock: FetchLike = vi.fn().mockResolvedValue({
        status: 400,
        text: scenario.body === undefined ? undefined : async () => scenario.body!,
      });
      const input = buildInput();
      input.logs = Array.from({ length: scenario.batchSize }, () => input.logs[0]!);

      const result = await sendIngestionRequest(input, { fetch: fetchMock });

      expect(result, scenario.name).toEqual({
        action: 'drop',
        status: 400,
        shouldWarnUnauthorized: false,
      });
    }
  });

  it('still drops a 400 from a response without a readable body', async () => {
    const fetchMock: FetchLike = vi.fn().mockResolvedValue({ status: 400 });

    await expect(sendIngestionRequest(buildInput(), { fetch: fetchMock })).resolves.toEqual({
      action: 'drop',
      status: 400,
      shouldWarnUnauthorized: false,
    });
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

  it('does not emit development request logs or expose secrets during delivery', async () => {
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
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.join(' ')).not.toContain('super-secret-key');

    warnSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});

describe('extractInvalidEntryIndexes', () => {
  it('collects unique, sorted entry indexes from details paths', () => {
    expect(
      extractInvalidEntryIndexes(
        ['"logs.4.message" x', '"logs.2.source" y', '"logs.4.metadata.requestId" z'],
        5,
      ),
    ).toEqual([2, 4]);
  });

  it('returns no indexes when any detail is not scoped to an entry', () => {
    expect(extractInvalidEntryIndexes(['"logs.1.message" x', '"logs" Too big'], 5)).toEqual([]);
    expect(extractInvalidEntryIndexes(['"value" Invalid input'], 5)).toEqual([]);
    expect(extractInvalidEntryIndexes([], 5)).toEqual([]);
  });
});
