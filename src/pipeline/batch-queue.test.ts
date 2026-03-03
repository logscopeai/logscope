import { createBatchQueue } from './batch-queue';
import { describe, expect, it } from 'vitest';

const createLog = (index: number) => {
  return {
    source: 'orders-api',
    level: 'info' as const,
    timestamp: `2026-02-15T00:00:${String(index).padStart(2, '0')}.000Z`,
    message: `log-${index}`,
  };
};

describe('createBatchQueue', () => {
  it('stores logs and dequeues them in insertion order', () => {
    const queue = createBatchQueue();

    queue.enqueue(createLog(1));
    queue.enqueue(createLog(2));
    queue.enqueue(createLog(3));

    expect(queue.size()).toBe(3);
    expect(queue.dequeueBatch(2)).toEqual([createLog(1), createLog(2)]);
    expect(queue.dequeueBatch(2)).toEqual([createLog(3)]);
    expect(queue.isEmpty()).toBe(true);
  });

  it('returns an empty batch for empty queues or invalid batch sizes', () => {
    const queue = createBatchQueue();

    expect(queue.dequeueBatch(5)).toEqual([]);

    queue.enqueue(createLog(1));
    expect(queue.dequeueBatch(0)).toEqual([]);
    expect(queue.size()).toBe(1);
  });

  it('can clear all queued logs', () => {
    const queue = createBatchQueue();

    queue.enqueue(createLog(1));
    queue.enqueue(createLog(2));
    queue.clear();

    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);
    expect(queue.dequeueBatch(1)).toEqual([]);
  });
});
