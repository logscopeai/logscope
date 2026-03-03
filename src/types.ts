export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogFilterConfig {
  levels?: LogLevel[];
}

export interface LogscopeRuntimeConfig {
  maxBatchSize?: number;
  flushIntervalMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
}

interface LogscopeConfigBase {
  apiKey: string;
  captureConsole?: boolean;
  context?: {
    /**
     * @deprecated Source input is optional and falls back safely when omitted.
     */
    source?: string;
  };
  logFilter?: LogFilterConfig;
  runtime?: LogscopeRuntimeConfig;
}

export interface LogscopeInitConfig {
  apiKey: string;
  ingestionBaseUrl?: string;
  /**
   * @deprecated Use ingestionBaseUrl instead.
   */
  endpoint?: string;
  captureConsole?: boolean;
  context?: {
    /**
     * @deprecated Source input is optional and falls back safely when omitted.
     */
    source?: string;
  };
  logFilter?: LogFilterConfig;
  runtime?: LogscopeRuntimeConfig;
}

interface LogscopeIngestionTarget {
  ingestionBaseUrl?: string;
  /**
   * @deprecated Use ingestionBaseUrl instead.
   */
  endpoint?: string;
}

export type LogscopeConfig = LogscopeConfigBase & LogscopeIngestionTarget;

export interface LogscopeClient {
  trace(message: string, metadata?: unknown): void;
  debug(message: string, metadata?: unknown): void;
  info(message: string, metadata?: unknown): void;
  warn(message: string, metadata?: unknown): void;
  error(message: string, metadata?: unknown): void;
  fatal(message: string, metadata?: unknown): void;
}

export type JsonSafePrimitive = string | number | boolean | null;
export type JsonSafeValue = JsonSafePrimitive | JsonSafeObject | JsonSafeValue[];

export interface JsonSafeObject {
  [key: string]: JsonSafeValue;
}

export interface IngestionLogEntry {
  source: string;
  level: LogLevel;
  timestamp: string;
  message: string;
  metadata?: Record<string, unknown>;
}
