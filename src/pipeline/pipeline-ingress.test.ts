import { LOG_LEVELS } from '../constants';
import type { SendIngestionRequestInput } from '../transport/transport-types';
import type { IngestionLogEntry } from '../types';
import { createBatchingPipeline } from './pipeline';
import { createPipelineIngress } from './pipeline-ingress';
import { describe, expect, it, vi } from 'vitest';

const fixedDate = new Date('2026-02-15T13:30:00.000Z');

const createSuccessResult = () => {
  return {
    action: 'success' as const,
    status: 202 as const,
    shouldWarnUnauthorized: false,
  };
};

describe('createPipelineIngress', () => {
  it('allows all levels when logFilter is missing', () => {
    const enqueuedLogs: IngestionLogEntry[] = [];
    const enqueue = vi.fn((log: IngestionLogEntry) => {
      enqueuedLogs.push(log);
    });

    const ingress = createPipelineIngress({
      source: 'orders-api',
      pipeline: {
        enqueue,
      },
      now: () => fixedDate,
    });

    LOG_LEVELS.forEach((level) => {
      ingress.dispatch({
        level,
        message: `${level}-message`,
      });
    });

    expect(enqueue).toHaveBeenCalledTimes(LOG_LEVELS.length);
    expect(enqueuedLogs).toHaveLength(LOG_LEVELS.length);
    expect(enqueuedLogs.map((log) => log.level)).toEqual(LOG_LEVELS);
  });

  it('enqueues only levels allowed by logFilter', () => {
    const enqueuedLogs: IngestionLogEntry[] = [];
    const enqueue = vi.fn((log: IngestionLogEntry) => {
      enqueuedLogs.push(log);
    });

    const ingress = createPipelineIngress({
      source: 'orders-api',
      pipeline: {
        enqueue,
      },
      logFilter: {
        levels: ['warn', 'error'],
      },
      now: () => fixedDate,
    });

    LOG_LEVELS.forEach((level) => {
      ingress.dispatch({
        level,
        message: `${level}-message`,
      });
    });

    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(enqueuedLogs.map((log) => log.level)).toEqual(['warn', 'error']);
  });

  it('prevents filtered-out logs from reaching batches', async () => {
    const sendBatch = vi.fn().mockResolvedValue(createSuccessResult());
    const pipeline = createBatchingPipeline({
      endpoint: 'http://localhost:3000',
      apiKey: 'test-api-key',
      sendBatch,
    });

    const ingress = createPipelineIngress({
      source: 'orders-api',
      pipeline,
      logFilter: {
        levels: ['error'],
      },
      now: () => fixedDate,
    });

    ingress.dispatch({
      level: 'info',
      message: 'filtered-out-info',
    });
    ingress.dispatch({
      level: 'warn',
      message: 'filtered-out-warn',
    });
    ingress.dispatch({
      level: 'error',
      message: 'kept-error',
    });

    await pipeline.flushNow();

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect((sendBatch.mock.calls[0]?.[0] as SendIngestionRequestInput).logs).toEqual([
      {
        source: 'orders-api',
        level: 'error',
        timestamp: '2026-02-15T13:30:00.000Z',
        message: 'kept-error',
      },
    ]);

    await pipeline.stop();
  });

  it('never throws when enqueueing fails', () => {
    const ingress = createPipelineIngress({
      source: 'orders-api',
      pipeline: {
        enqueue: () => {
          throw new Error('enqueue failed');
        },
      },
      now: () => fixedDate,
    });

    expect(() => {
      ingress.dispatch({
        level: 'info',
        message: 'safe message',
      });
    }).not.toThrow();
  });
});
