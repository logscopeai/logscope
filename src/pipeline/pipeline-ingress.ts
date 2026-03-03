import { createLevelFilterEvaluator } from '../filter/level-filter';
import { normalizeLog } from '../normalization/normalize-log';
import type { IngestionLogEntry, LogFilterConfig, LogLevel } from '../types';

export interface PipelineIngressLogInput {
  level: LogLevel;
  message: string;
  metadata?: unknown;
  timestamp?: Date | string | number;
}

export interface PipelineIngress {
  dispatch(log: PipelineIngressLogInput): void;
}

export interface CreatePipelineIngressInput {
  source: string;
  logFilter?: LogFilterConfig;
  now?: () => Date;
  pipeline: {
    enqueue(log: IngestionLogEntry): void;
  };
}

const runSafe = (callback: () => void): void => {
  try {
    callback();
  } catch {
    // Never throw into user code.
  }
};

export const createPipelineIngress = (input: CreatePipelineIngressInput): PipelineIngress => {
  const allowsLevel = createLevelFilterEvaluator(input.logFilter);

  return {
    dispatch(log: PipelineIngressLogInput): void {
      if (!allowsLevel(log.level)) {
        return;
      }

      runSafe(() => {
        const normalizedLog = normalizeLog(
          {
            source: input.source,
            level: log.level,
            message: log.message,
            metadata: log.metadata,
            timestamp: log.timestamp,
          },
          {
            now: input.now,
          },
        );

        input.pipeline.enqueue(normalizedLog);
      });
    },
  };
};
