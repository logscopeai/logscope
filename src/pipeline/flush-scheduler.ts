type TimerHandle = ReturnType<typeof setTimeout>;

export interface FlushScheduler {
  schedule(): void;
  cancel(): void;
  isScheduled(): boolean;
}

export interface CreateFlushSchedulerInput {
  intervalMs: number;
  onFlush: () => void;
  setTimeoutFn?: (callback: () => void, timeoutMs: number) => TimerHandle;
  clearTimeoutFn?: (handle: TimerHandle) => void;
}

const runSafe = (callback: () => void): void => {
  try {
    callback();
  } catch {
    // Timer callbacks must never throw into user code.
  }
};

export const createFlushScheduler = (input: CreateFlushSchedulerInput): FlushScheduler => {
  const setTimeoutFn =
    input.setTimeoutFn ?? ((callback, timeoutMs) => setTimeout(callback, timeoutMs));
  const clearTimeoutFn = input.clearTimeoutFn ?? ((handle) => clearTimeout(handle));

  let scheduledHandle: TimerHandle | undefined;

  return {
    schedule(): void {
      if (scheduledHandle !== undefined) {
        return;
      }

      scheduledHandle = setTimeoutFn(() => {
        scheduledHandle = undefined;
        runSafe(input.onFlush);
      }, input.intervalMs);
    },
    cancel(): void {
      if (scheduledHandle === undefined) {
        return;
      }

      clearTimeoutFn(scheduledHandle);
      scheduledHandle = undefined;
    },
    isScheduled(): boolean {
      return scheduledHandle !== undefined;
    },
  };
};
