import { LOG_LEVELS } from '../constants';
import { describe, expect, it } from 'vitest';
import { createLevelFilterEvaluator } from './level-filter';

describe('createLevelFilterEvaluator', () => {
  it('allows all levels when filter is undefined', () => {
    const allowsLevel = createLevelFilterEvaluator(undefined);

    LOG_LEVELS.forEach((level) => {
      expect(allowsLevel(level)).toBe(true);
    });
  });

  it('allows all levels when levels list is undefined', () => {
    const allowsLevel = createLevelFilterEvaluator({});

    LOG_LEVELS.forEach((level) => {
      expect(allowsLevel(level)).toBe(true);
    });
  });

  it('allows only configured levels', () => {
    const allowsLevel = createLevelFilterEvaluator({
      levels: ['warn', 'error'],
    });

    expect(allowsLevel('trace')).toBe(false);
    expect(allowsLevel('debug')).toBe(false);
    expect(allowsLevel('info')).toBe(false);
    expect(allowsLevel('warn')).toBe(true);
    expect(allowsLevel('error')).toBe(true);
    expect(allowsLevel('fatal')).toBe(false);
  });

  it('blocks all levels when configured with an empty levels list', () => {
    const allowsLevel = createLevelFilterEvaluator({
      levels: [],
    });

    LOG_LEVELS.forEach((level) => {
      expect(allowsLevel(level)).toBe(false);
    });
  });

  it.each(LOG_LEVELS)('supports each LogLevel value in configured filters (%s)', (level) => {
    const allowsLevel = createLevelFilterEvaluator({
      levels: [level],
    });

    expect(allowsLevel(level)).toBe(true);

    LOG_LEVELS.filter((currentLevel) => currentLevel !== level).forEach((otherLevel) => {
      expect(allowsLevel(otherLevel)).toBe(false);
    });
  });
});
