import type { LogLevel, LogscopeClient } from '../types';

export type DispatchManualLog = (level: LogLevel, message: string, metadata?: unknown) => void;

export const createLogMethods = (dispatchManualLog: DispatchManualLog): LogscopeClient => {
  return {
    trace(message: string, metadata?: unknown): void {
      dispatchManualLog('trace', message, metadata);
    },
    debug(message: string, metadata?: unknown): void {
      dispatchManualLog('debug', message, metadata);
    },
    info(message: string, metadata?: unknown): void {
      dispatchManualLog('info', message, metadata);
    },
    warn(message: string, metadata?: unknown): void {
      dispatchManualLog('warn', message, metadata);
    },
    error(message: string, metadata?: unknown): void {
      dispatchManualLog('error', message, metadata);
    },
    fatal(message: string, metadata?: unknown): void {
      dispatchManualLog('fatal', message, metadata);
    },
  };
};
