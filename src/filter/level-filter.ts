import type { LogFilterConfig, LogLevel } from '../types';

export type LevelFilterEvaluator = (level: LogLevel) => boolean;

const ALLOW_ALL_LEVELS: LevelFilterEvaluator = () => true;

export const createLevelFilterEvaluator = (
  logFilter: LogFilterConfig | undefined,
): LevelFilterEvaluator => {
  const configuredLevels = logFilter?.levels;

  if (configuredLevels === undefined) {
    return ALLOW_ALL_LEVELS;
  }

  const allowedLevels = new Set<LogLevel>(configuredLevels);

  return (level: LogLevel): boolean => {
    return allowedLevels.has(level);
  };
};
