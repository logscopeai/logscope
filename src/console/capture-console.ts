import { format } from 'node:util';
import type { LogLevel } from '../types';

type ConsoleMethodName = 'log' | 'info' | 'warn' | 'error';
type ConsoleMethod = (...args: unknown[]) => unknown;

export interface ConsoleLike {
  log: ConsoleMethod;
  info: ConsoleMethod;
  warn: ConsoleMethod;
  error: ConsoleMethod;
}

export type DispatchConsoleLog = (level: LogLevel, message: string, metadata?: unknown) => void;
export type RestoreConsoleCapture = () => void;

export interface CaptureConsoleInput {
  dispatchLog: DispatchConsoleLog;
  consoleRef?: ConsoleLike;
}

interface ConsoleCaptureState {
  nextSubscriberId: number;
  subscribers: Map<number, DispatchConsoleLog>;
  originalMethods: Record<ConsoleMethodName, ConsoleMethod>;
}

const CONSOLE_METHODS: ReadonlyArray<ConsoleMethodName> = ['log', 'info', 'warn', 'error'];
const LEVEL_BY_METHOD: Record<ConsoleMethodName, LogLevel> = {
  log: 'info',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

const captureStates = new WeakMap<ConsoleLike, ConsoleCaptureState>();

const runSafe = (callback: () => void): void => {
  try {
    callback();
  } catch {
    // Never throw into user code.
  }
};

const stringifyFallback = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    const serialized = JSON.stringify(value);

    if (serialized !== undefined) {
      return serialized;
    }
  } catch {
    // Fallback below.
  }

  try {
    return String(value);
  } catch {
    return '[Unserializable]';
  }
};

const formatConsoleArguments = (args: unknown[]): string => {
  if (args.length === 0) {
    return '';
  }

  try {
    return format(...(args as [unknown, ...unknown[]]));
  } catch {
    return args.map((value) => stringifyFallback(value)).join(' ');
  }
};

const patchConsole = (consoleRef: ConsoleLike, state: ConsoleCaptureState): void => {
  CONSOLE_METHODS.forEach((methodName) => {
    const originalMethod = state.originalMethods[methodName];

    consoleRef[methodName] = (...args: unknown[]): unknown => {
      const result = Reflect.apply(originalMethod, consoleRef, args);
      const level = LEVEL_BY_METHOD[methodName];
      const message = formatConsoleArguments(args);

      Array.from(state.subscribers.values()).forEach((dispatchLog) => {
        runSafe(() => {
          dispatchLog(level, message);
        });
      });

      return result;
    };
  });
};

const restoreConsoleMethods = (
  consoleRef: ConsoleLike,
  methods: Record<ConsoleMethodName, ConsoleMethod>,
): void => {
  CONSOLE_METHODS.forEach((methodName) => {
    consoleRef[methodName] = methods[methodName];
  });
};

const ensureCaptureState = (consoleRef: ConsoleLike): ConsoleCaptureState => {
  const existingState = captureStates.get(consoleRef);

  if (existingState !== undefined) {
    return existingState;
  }

  const createdState: ConsoleCaptureState = {
    nextSubscriberId: 1,
    subscribers: new Map<number, DispatchConsoleLog>(),
    originalMethods: {
      log: consoleRef.log,
      info: consoleRef.info,
      warn: consoleRef.warn,
      error: consoleRef.error,
    },
  };

  patchConsole(consoleRef, createdState);
  captureStates.set(consoleRef, createdState);

  return createdState;
};

export const captureConsole = (input: CaptureConsoleInput): RestoreConsoleCapture => {
  const consoleRef = input.consoleRef ?? console;
  const state = ensureCaptureState(consoleRef);
  const subscriberId = state.nextSubscriberId;

  state.nextSubscriberId += 1;
  state.subscribers.set(subscriberId, input.dispatchLog);

  let restored = false;

  return (): void => {
    if (restored) {
      return;
    }

    restored = true;

    const activeState = captureStates.get(consoleRef);

    if (activeState === undefined) {
      return;
    }

    activeState.subscribers.delete(subscriberId);

    if (activeState.subscribers.size > 0) {
      return;
    }

    restoreConsoleMethods(consoleRef, activeState.originalMethods);
    captureStates.delete(consoleRef);
  };
};
