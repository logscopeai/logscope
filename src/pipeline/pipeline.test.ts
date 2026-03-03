import { createBatchingPipeline, DEFAULT_FLUSH_INTERVAL_MS, MAX_BATCH_SIZE } from './pipeline';
import type {
  IngestionRequestResult,
  SendIngestionRequestInput,
} from '../transport/transport-types';
import { afterEach, describe, expect, it, vi } from 'vitest';

const createLog = (index: number) => {
  return {
    source: 'orders-api',
    level: 'info' as const,
    timestamp: `2026-02-15T12:00:${String(index % 60).padStart(2, '0')}.000Z`,
    message: `message-${index}`,
  };
};

const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const createSuccessResult = (): IngestionRequestResult => {
  return {
    action: 'success',
    status: 202,
    shouldWarnUnauthorized: false,
  };
};

describe('createBatchingPipeline', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes immediately when reaching 50 logs', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
    });

    for (let index = 0; index < MAX_BATCH_SIZE - 1; index += 1) {
      pipeline.enqueue(createLog(index));
    }

    expect(sendBatch).not.toHaveBeenCalled();

    pipeline.enqueue(createLog(MAX_BATCH_SIZE - 1));
    await flushAsyncWork();

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect((sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs).toHaveLength(50);

    await pipeline.stop();
  });

  it('flushes immediately when reaching configured maxBatchSize override', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
      maxBatchSize: 10,
    });

    for (let index = 0; index < 9; index += 1) {
      pipeline.enqueue(createLog(index));
    }

    expect(sendBatch).not.toHaveBeenCalled();

    pipeline.enqueue(createLog(9));
    await flushAsyncWork();

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect((sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs).toHaveLength(10);

    await pipeline.stop();
  });

  it('falls back to safe maxBatchSize limit when override exceeds ingestion contract', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
      maxBatchSize: 100,
    });

    for (let index = 0; index < 49; index += 1) {
      pipeline.enqueue(createLog(index));
    }

    expect(sendBatch).not.toHaveBeenCalled();

    pipeline.enqueue(createLog(49));
    await flushAsyncWork();

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect((sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs).toHaveLength(50);

    await pipeline.stop();
  });

  it('flushes pending logs when flush interval elapses', async () => {
    vi.useFakeTimers();
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
      flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
    });

    pipeline.enqueue(createLog(1));
    pipeline.enqueue(createLog(2));

    vi.advanceTimersByTime(DEFAULT_FLUSH_INTERVAL_MS - 1);
    await flushAsyncWork();

    expect(sendBatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushAsyncWork();

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect((sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs).toHaveLength(2);

    await pipeline.stop();
  });

  it('never sends an empty logs array when flushing an empty queue', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
    });

    await pipeline.flushNow();
    await pipeline.stop();

    expect(sendBatch).not.toHaveBeenCalled();
  });

  it('never sends batches larger than 50 entries', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
    });

    for (let index = 0; index < 51; index += 1) {
      pipeline.enqueue(createLog(index));
    }

    await pipeline.flushNow();

    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect((sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs).toHaveLength(50);
    expect((sendBatch.mock.calls[1]?.[0] as SendIngestionRequestInput).logs).toHaveLength(1);
    expect(
      sendBatch.mock.calls.every((call) =>
        (call[0] as SendIngestionRequestInput).logs.length <= 50 ? true : false,
      ),
    ).toBe(true);

    await pipeline.stop();
  });

  it('handles concurrent enqueue calls safely without throwing', async () => {
    const sendBatch = vi.fn().mockImplementation(async () => {
      await Promise.resolve();
      return createSuccessResult();
    });
    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
    });

    const enqueueTasks = Array.from({ length: 200 }, (_, index) =>
      Promise.resolve().then(() => {
        pipeline.enqueue(createLog(index));
      }),
    );

    await expect(Promise.all(enqueueTasks)).resolves.toHaveLength(200);
    await pipeline.flushNow();

    const totalSent = sendBatch.mock.calls.reduce((count, call) => {
      return count + ((call[0] as SendIngestionRequestInput).logs.length ?? 0);
    }, 0);

    expect(totalSent).toBe(200);
    expect(
      sendBatch.mock.calls.every(
        (call) => (call[0] as SendIngestionRequestInput).logs.length <= 50,
      ),
    ).toBe(true);

    await pipeline.stop();
  });

  it('continues safely when batch sender rejects', async () => {
    const sendBatch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValue(createSuccessResult());

    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
      retryPolicy: {
        maxRetries: 1,
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
      flushIntervalMs: 1,
    });

    for (let index = 0; index < 51; index += 1) {
      pipeline.enqueue(createLog(index));
    }

    await pipeline.flushNow();

    expect(sendBatch).toHaveBeenCalledTimes(3);

    await pipeline.stop();
  });

  it('emits drop result when retriable outcomes exceed max retries', async () => {
    const sendBatch = vi.fn().mockResolvedValue({
      action: 'retry',
      status: 429,
      shouldWarnUnauthorized: false,
    } satisfies IngestionRequestResult);
    const onBatchResult = vi.fn();
    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
      onBatchResult,
      retryPolicy: {
        maxRetries: 1,
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
    });

    pipeline.enqueue(createLog(1));
    await pipeline.flushNow();

    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(onBatchResult).toHaveBeenCalledTimes(1);
    expect(onBatchResult.mock.calls[0]?.[0]).toEqual({
      action: 'drop',
      shouldWarnUnauthorized: false,
      errorKind: 'max_retries_exceeded',
    });

    await pipeline.stop();
  });

  it('uses default interval when provided flush interval is invalid', async () => {
    vi.useFakeTimers();
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
      flushIntervalMs: Number.NaN,
    });

    pipeline.enqueue(createLog(1));

    vi.advanceTimersByTime(DEFAULT_FLUSH_INTERVAL_MS - 1);
    await flushAsyncWork();

    expect(sendBatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushAsyncWork();

    expect(sendBatch).toHaveBeenCalledTimes(1);

    await pipeline.stop();
  });
});
