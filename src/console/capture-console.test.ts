import { captureConsole, type ConsoleLike } from './capture-console';
import { describe, expect, it, vi } from 'vitest';

const createConsoleDouble = () => {
  return {
    log: vi.fn(() => 'log-result'),
    info: vi.fn(() => 'info-result'),
    warn: vi.fn(() => 'warn-result'),
    error: vi.fn(() => 'error-result'),
  } satisfies ConsoleLike;
};

describe('captureConsole', () => {
  it('preserves original console behavior and arguments while forwarding mapped levels', () => {
    const consoleRef = createConsoleDouble();
    const originalLog = consoleRef.log;
    const originalInfo = consoleRef.info;
    const originalWarn = consoleRef.warn;
    const originalError = consoleRef.error;
    const dispatchLog = vi.fn();
    const payload = { orderId: 123 };

    const restore = captureConsole({
      consoleRef,
      dispatchLog,
    });

    expect(consoleRef.log('order %d', 123, payload)).toBe('log-result');
    expect(consoleRef.info('service ready')).toBe('info-result');
    expect(consoleRef.warn('slow downstream')).toBe('warn-result');
    expect(consoleRef.error('request failed')).toBe('error-result');

    expect(originalLog).toHaveBeenCalledWith('order %d', 123, payload);
    expect(originalInfo).toHaveBeenCalledWith('service ready');
    expect(originalWarn).toHaveBeenCalledWith('slow downstream');
    expect(originalError).toHaveBeenCalledWith('request failed');

    expect(dispatchLog).toHaveBeenNthCalledWith(1, 'info', expect.stringContaining('order 123'));
    expect(dispatchLog).toHaveBeenNthCalledWith(2, 'info', 'service ready');
    expect(dispatchLog).toHaveBeenNthCalledWith(3, 'warn', 'slow downstream');
    expect(dispatchLog).toHaveBeenNthCalledWith(4, 'error', 'request failed');

    restore();
  });

  it('does not throw to callers when dispatching captured logs fails', () => {
    const consoleRef = createConsoleDouble();
    const originalWarn = consoleRef.warn;
    const dispatchLog = vi.fn(() => {
      throw new Error('dispatch failed');
    });

    const restore = captureConsole({
      consoleRef,
      dispatchLog,
    });

    expect(() => {
      consoleRef.warn('still prints warning');
    }).not.toThrow();
    expect(originalWarn).toHaveBeenCalledWith('still prints warning');

    restore();
  });

  it('supports multiple subscribers and restores originals when the last one is removed', () => {
    const consoleRef = createConsoleDouble();
    const originalInfo = consoleRef.info;
    const firstDispatch = vi.fn();
    const secondDispatch = vi.fn();

    const restoreFirst = captureConsole({
      consoleRef,
      dispatchLog: firstDispatch,
    });
    const restoreSecond = captureConsole({
      consoleRef,
      dispatchLog: secondDispatch,
    });

    consoleRef.info('first call');

    expect(firstDispatch).toHaveBeenCalledWith('info', 'first call');
    expect(secondDispatch).toHaveBeenCalledWith('info', 'first call');

    restoreFirst();
    consoleRef.info('second call');

    expect(firstDispatch).toHaveBeenCalledTimes(1);
    expect(secondDispatch).toHaveBeenCalledTimes(2);
    expect(consoleRef.info).not.toBe(originalInfo);

    restoreSecond();
    expect(consoleRef.info).toBe(originalInfo);
  });

  it('restores the original methods and prevents extra forwarding after restore', () => {
    const consoleRef = createConsoleDouble();
    const originalError = consoleRef.error;
    const dispatchLog = vi.fn();

    const restore = captureConsole({
      consoleRef,
      dispatchLog,
    });

    consoleRef.error('before restore');
    restore();
    restore();
    consoleRef.error('after restore');

    expect(dispatchLog).toHaveBeenCalledTimes(1);
    expect(dispatchLog).toHaveBeenCalledWith('error', 'before restore');
    expect(consoleRef.error).toBe(originalError);
    expect(originalError).toHaveBeenCalledTimes(2);
  });
});
