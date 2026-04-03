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

export interface LogscopeConfig {
  apiKey: string;
  ingestionBaseUrl?: string;
  captureConsole?: boolean;
  logFilter?: LogFilterConfig;
  runtime?: LogscopeRuntimeConfig;
}

export type LogscopeInitConfig = LogscopeConfig;

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
