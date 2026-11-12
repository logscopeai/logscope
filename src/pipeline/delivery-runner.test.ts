import { runBatchDelivery } from './delivery-runner';
import type {
  IngestionRequestResult,
  SendIngestionRequestInput,
} from '../transport/transport-types';
import { afterEach, describe, expect, it, vi } from 'vitest';

const buildInput = () => {
  return {
    endpoint: 'http://localhost:3000',
    apiKey: 'test-api-key',
    logs: [
      {
        source: 'orders-api',
        level: 'info' as const,
        timestamp: '2026-02-15T00:00:00.000Z',
        message: 'service started',
      },
    ],
  };
};

const createResult = (
  action: IngestionRequestResult['action'],
  status?: number,
): IngestionRequestResult => {
  return {
    action,
    status,
    shouldWarnUnauthorized: action === 'unauthorized',
  };
};

describe('runBatchDelivery', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns terminal results without retry for success/drop/unauthorized', async () => {
    const scenarios: Array<IngestionRequestResult> = [
      createResult('success', 202),
      createResult('drop', 400),
      createResult('drop', 413),
      createResult('unauthorized', 401),
    ];

    for (const scenario of scenarios) {
      const sendBatch = vi.fn().mockResolvedValue(scenario);

      const result = await runBatchDelivery({
        ...buildInput(),
        sendBatch,
      });

      expect(result).toEqual(scenario);
      expect(sendBatch).toHaveBeenCalledTimes(1);
    }
  });

  it('retries 429/500 outcomes with exponential backoff and succeeds when later accepted', async () => {
    vi.useFakeTimers();
    const sendBatch = vi
      .fn()
      .mockResolvedValueOnce(createResult('retry', 429))
      .mockResolvedValueOnce(createResult('retry', 500))
      .mockResolvedValueOnce(createResult('success', 202));

    const runPromise = runBatchDelivery({
      ...buildInput(),
      sendBatch,
      retryPolicy: {
        maxRetries: 3,
        baseDelayMs: 100,
        maxDelayMs: 1_000,
      },
    });

    await Promise.resolve();
    expect(sendBatch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    expect(sendBatch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(200);
    expect(sendBatch).toHaveBeenCalledTimes(3);

    await expect(runPromise).resolves.toEqual(createResult('success', 202));
  });

  it('retries safely when sender throws and then succeeds', async () => {
    const sendBatch = vi
      .fn<Promise<IngestionRequestResult>, [SendIngestionRequestInput]>()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce(createResult('success', 202));

    const result = await runBatchDelivery({
      ...buildInput(),
      sendBatch,
      retryPolicy: {
        maxRetries: 2,
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
    });

    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(createResult('success', 202));
  });

  it('drops after max retries and returns a safe internal signal', async () => {
    vi.useFakeTimers();
    const sendBatch = vi.fn().mockResolvedValue(createResult('retry', 429));

    const runPromise = runBatchDelivery({
      ...buildInput(),
      sendBatch,
      retryPolicy: {
        maxRetries: 2,
        baseDelayMs: 50,
        maxDelayMs: 50,
      },
    });

    await Promise.resolve();
    expect(sendBatch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(50);
    expect(sendBatch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(50);
    expect(sendBatch).toHaveBeenCalledTimes(3);

    await expect(runPromise).resolves.toEqual({
      action: 'drop',
      shouldWarnUnauthorized: false,
      errorKind: 'max_retries_exceeded',
    });
  });

  it('drops safely when retry wait throws', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createResult('retry', 500));

    const result = await runBatchDelivery({
      ...buildInput(),
      sendBatch,
      waitForRetry: async () => {
        throw new Error('timer failed');
      },
      retryPolicy: {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 10,
      },
    });

    expect(result).toEqual({
      action: 'drop',
      shouldWarnUnauthorized: false,
      errorKind: 'max_retries_exceeded',
    });
  });

  describe('partial validation failures', () => {
    const buildBatch = (size: number) =>
      Array.from({ length: size }, (_, index) => ({
        source: 'orders-api',
        level: 'info' as const,
        timestamp: '2026-02-15T00:00:00.000Z',
        message: `entry ${index}`,
      }));

    it('drops only the entries named by the API and resends the rest once', async () => {
      const details = ['"logs.1.message" Too small: expected string to have >=1 characters'];
      const sendBatch = vi
        .fn()
        .mockResolvedValueOnce({
          action: 'drop_entries',
          status: 400,
          shouldWarnUnauthorized: false,
          invalidIndexes: [1],
          details,
        })
        .mockResolvedValueOnce(createResult('success', 202));
      const logs = buildBatch(3);

      const result = await runBatchDelivery({ ...buildInput(), logs, sendBatch });

      expect(sendBatch).toHaveBeenCalledTimes(2);
      expect(sendBatch.mock.calls[1]?.[0].logs).toEqual([logs[0], logs[2]]);
      expect(result).toEqual({
        action: 'success',
        status: 202,
        shouldWarnUnauthorized: false,
        droppedEntries: { count: 1, indexes: [1], details },
      });
    });

    it('does not count the resend against the retry budget', async () => {
      const sendBatch = vi
        .fn()
        .mockResolvedValueOnce({
          action: 'drop_entries',
          status: 400,
          shouldWarnUnauthorized: false,
          invalidIndexes: [0],
          details: ['"logs.0.message" Too small'],
        })
        .mockResolvedValueOnce(createResult('retry', 503))
        .mockResolvedValueOnce(createResult('success', 202));

      const result = await runBatchDelivery({
        ...buildInput(),
        logs: buildBatch(2),
        sendBatch,
        retryPolicy: { maxRetries: 1 },
        waitForRetry: async () => {},
      });

      expect(sendBatch).toHaveBeenCalledTimes(3);
      expect(result.action).toBe('success');
      expect(result.droppedEntries?.count).toBe(1);
    });

    it('drops the batch when the resend is rejected again', async () => {
      const sendBatch = vi.fn().mockResolvedValue({
        action: 'drop_entries',
        status: 400,
        shouldWarnUnauthorized: false,
        invalidIndexes: [0],
        details: ['"logs.0.message" Too small'],
      });

      const result = await runBatchDelivery({ ...buildInput(), logs: buildBatch(3), sendBatch });

      expect(sendBatch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        action: 'drop',
        status: 400,
        shouldWarnUnauthorized: false,
        errorKind: 'repeated_validation_failure',
        droppedEntries: { count: 1, indexes: [0], details: ['"logs.0.message" Too small'] },
      });
    });
  });
});
