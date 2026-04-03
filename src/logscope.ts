import { createLogscopeClient } from './client/create-logscope-client';
import type { LogscopeClient, LogscopeConfig, LogscopeInitConfig } from './types';

const resolveApiKey = (config: LogscopeInitConfig): string => {
  return typeof config?.apiKey === 'string' ? config.apiKey : '';
};

const resolveIngestionBaseUrl = (config: LogscopeInitConfig): string | undefined => {
  return typeof config?.ingestionBaseUrl === 'string' ? config.ingestionBaseUrl : undefined;
};

export class Logscope implements LogscopeClient {
  private readonly client: LogscopeClient;

  constructor(config: LogscopeInitConfig) {
    const resolvedConfig: LogscopeConfig = {
      apiKey: resolveApiKey(config),
      ingestionBaseUrl: resolveIngestionBaseUrl(config),
      captureConsole: config?.captureConsole === true,
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
