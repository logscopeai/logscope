import { createFlushScheduler } from './flush-scheduler';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('createFlushScheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs flush callback only once per scheduled timer', () => {
    vi.useFakeTimers();
    const onFlush = vi.fn();
    const scheduler = createFlushScheduler({
      intervalMs: 2_000,
      onFlush,
    });

    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();

    expect(onFlush).not.toHaveBeenCalled();
    expect(scheduler.isScheduled()).toBe(true);

    vi.advanceTimersByTime(2_000);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(scheduler.isScheduled()).toBe(false);
  });

  it('cancels a scheduled timer before it fires', () => {
    vi.useFakeTimers();
    const onFlush = vi.fn();
    const scheduler = createFlushScheduler({
      intervalMs: 2_000,
      onFlush,
    });

    scheduler.schedule();
    scheduler.cancel();
    vi.advanceTimersByTime(2_000);

    expect(onFlush).not.toHaveBeenCalled();
    expect(scheduler.isScheduled()).toBe(false);
  });

  it('swallows callback errors safely', () => {
    vi.useFakeTimers();
    const scheduler = createFlushScheduler({
      intervalMs: 2_000,
      onFlush: () => {
        throw new Error('timer failure');
      },
    });

    scheduler.schedule();

    expect(() => vi.advanceTimersByTime(2_000)).not.toThrow();
    expect(scheduler.isScheduled()).toBe(false);
  });
});
