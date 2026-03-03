import { createLogscopeClient } from './client/create-logscope-client';
import { DEFAULT_INGESTION_BASE_URL, SAFE_FALLBACK_SOURCE } from './constants';
import type { LogscopeClient, LogscopeConfig, LogscopeInitConfig } from './types';

const resolveApiKey = (config: LogscopeInitConfig): string => {
  return typeof config?.apiKey === 'string' ? config.apiKey : '';
};

const toNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim().length > 0 ? value : undefined;
};

const resolveIngestionBaseUrl = (config: LogscopeInitConfig): string => {
  const ingestionBaseUrl = toNonEmptyString(config?.ingestionBaseUrl);
  const endpoint = toNonEmptyString(config?.endpoint);

  return ingestionBaseUrl ?? endpoint ?? DEFAULT_INGESTION_BASE_URL;
};

const resolveSource = (config: LogscopeInitConfig): string => {
  if (typeof config?.context?.source === 'string') {
    return config.context.source;
  }

  return SAFE_FALLBACK_SOURCE;
};

export class Logscope implements LogscopeClient {
  private readonly client: LogscopeClient;

  constructor(config: LogscopeInitConfig) {
    const resolvedConfig: LogscopeConfig = {
      apiKey: resolveApiKey(config),
      ingestionBaseUrl: resolveIngestionBaseUrl(config),
      captureConsole: config?.captureConsole === true,
      context: {
        source: resolveSource(config),
      },
      logFilter: config?.logFilter,
      runtime: config?.runtime,
    };

    this.client = createLogscopeClient(resolvedConfig);
  }

  trace(message: string, metadata?: unknown): void {
    this.client.trace(message, metadata);
  }

  debug(message: string, metadata?: unknown): void {
    this.client.debug(message, metadata);
  }

  info(message: string, metadata?: unknown): void {
    this.client.info(message, metadata);
  }

  warn(message: string, metadata?: unknown): void {
    this.client.warn(message, metadata);
  }

  error(message: string, metadata?: unknown): void {
    this.client.error(message, metadata);
  }

  fatal(message: string, metadata?: unknown): void {
    this.client.fatal(message, metadata);
  }
}
