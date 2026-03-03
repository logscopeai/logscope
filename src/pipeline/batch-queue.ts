import type { IngestionLogEntry } from '../types';

export interface BatchQueue {
  enqueue(log: IngestionLogEntry): void;
  dequeueBatch(maxBatchSize: number): IngestionLogEntry[];
  size(): number;
  isEmpty(): boolean;
  clear(): void;
}

export const createBatchQueue = (): BatchQueue => {
  const queue: IngestionLogEntry[] = [];

  return {
    enqueue(log: IngestionLogEntry): void {
      queue.push(log);
    },
    dequeueBatch(maxBatchSize: number): IngestionLogEntry[] {
      if (queue.length === 0 || maxBatchSize <= 0) {
        return [];
      }

      const batchSize = Math.min(maxBatchSize, queue.length);
      return queue.splice(0, batchSize);
    },
    size(): number {
      return queue.length;
    },
    isEmpty(): boolean {
      return queue.length === 0;
    },
    clear(): void {
      queue.length = 0;
    },
  };
};
