import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildInvalidClientConfigWarning,
  buildInvalidPinoOptionsWarning,
  buildInvalidWinstonOptionsWarning,
  guardLogscopeClientConfig,
  guardPinoTransportOptions,
  guardWinstonTransportOptions,
} from './config-guards';
import { DEFAULT_FLUSH_INTERVAL_MS, DEFAULT_MAX_BATCH_SIZE } from './runtime-config';
import { DEFAULT_RETRY_POLICY } from '../retry/retry-policy';
import { DEFAULT_INGESTION_BASE_URL, LOGSCOPE_INGESTION_URL_ENV_VAR } from '../constants';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('guardLogscopeClientConfig', () => {
  it('returns a valid guarded config for complete input', () => {
    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
      ingestionBaseUrl: 'http://localhost:3000',
      captureConsole: true,
      logFilter: {
        levels: ['warn', 'error'],
      },
    });

    expect(result).toEqual({
      isValid: true,
      apiKey: 'api-key',
      ingestionBaseUrl: 'http://localhost:3000',
      source: 'unknown',
      captureConsole: true,
      logFilter: {
        levels: ['warn', 'error'],
      },
      runtimeConfig: {
        maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
        flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
        retryPolicy: DEFAULT_RETRY_POLICY,
      },
      invalidFields: [],
      invalidIngestionBaseUrlMessage: undefined,
    });
  });

  it('normalizes trusted ingestionBaseUrl overrides to the base origin', () => {
    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
      ingestionBaseUrl: 'https://preview.dev.logscopeai.com/custom/path/?debug=true',
    });

    expect(result.isValid).toBe(true);
    expect(result.ingestionBaseUrl).toBe('https://preview.dev.logscopeai.com');
    expect(result.invalidFields).toEqual([]);
  });

  it('uses the environment override when root config omits ingestionBaseUrl', () => {
    vi.stubEnv(LOGSCOPE_INGESTION_URL_ENV_VAR, 'https://dev.ingestion.logscopeai.com/');

    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
    });

    expect(result.isValid).toBe(true);
    expect(result.ingestionBaseUrl).toBe('https://dev.ingestion.logscopeai.com');
    expect(result.invalidFields).toEqual([]);
  });

  it('prefers ingestionBaseUrl over the environment override', () => {
    vi.stubEnv(LOGSCOPE_INGESTION_URL_ENV_VAR, 'https://dev.ingestion.logscopeai.com');

    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
      ingestionBaseUrl: 'http://localhost:3001/',
    });

    expect(result.isValid).toBe(true);
    expect(result.ingestionBaseUrl).toBe('http://localhost:3001');
    expect(result.invalidFields).toEqual([]);
  });

  it('marks invalid apiKey and invalid ingestionBaseUrl input', () => {
    const result = guardLogscopeClientConfig({
      apiKey: '',
      ingestionBaseUrl: 123,
      logFilter: {
        levels: ['warn', 'invalid-level'],
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.apiKey).toBe('');
    expect(result.ingestionBaseUrl).toBe(DEFAULT_INGESTION_BASE_URL);
    expect(result.source).toBe('unknown');
    expect(result.logFilter).toBeUndefined();
    expect(result.runtimeConfig).toEqual({
      maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
      flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
      retryPolicy: DEFAULT_RETRY_POLICY,
    });
    expect(result.invalidFields).toEqual(['apiKey', 'ingestionBaseUrl']);
    expect(result.invalidIngestionBaseUrlMessage).toContain('official Logscope SDK');
  });

  it('rejects untrusted external domains instead of silently falling back', () => {
    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
      ingestionBaseUrl: 'https://some-other-logging-service.com',
    });

    expect(result.isValid).toBe(false);
    expect(result.invalidFields).toEqual(['ingestionBaseUrl']);
    expect(result.invalidIngestionBaseUrlMessage).toContain('https://*.logscopeai.com');
  });

  it('rejects localhost overrides without a port', () => {
    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
      ingestionBaseUrl: 'http://localhost',
    });

    expect(result.isValid).toBe(false);
    expect(result.invalidFields).toEqual(['ingestionBaseUrl']);
  });

  it('rejects invalid environment overrides instead of silently falling back', () => {
    vi.stubEnv(LOGSCOPE_INGESTION_URL_ENV_VAR, 'https://example.com');

    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
    });

    expect(result.isValid).toBe(false);
    expect(result.invalidFields).toEqual(['ingestionBaseUrl']);
    expect(result.invalidIngestionBaseUrlMessage).toContain(LOGSCOPE_INGESTION_URL_ENV_VAR);
  });

  it('ignores deprecated endpoint when ingestionBaseUrl is missing', () => {
    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
      endpoint: 'http://localhost:3000',
    } as unknown);

    expect(result).toEqual({
      isValid: true,
      apiKey: 'api-key',
      ingestionBaseUrl: DEFAULT_INGESTION_BASE_URL,
      source: 'unknown',
      captureConsole: false,
      logFilter: undefined,
      runtimeConfig: {
        maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
        flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
        retryPolicy: DEFAULT_RETRY_POLICY,
      },
      invalidFields: [],
      invalidIngestionBaseUrlMessage: undefined,
    });
  });

  it('applies production ingestion URL fallback when both ingestionBaseUrl and endpoint are missing', () => {
    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
    });

    expect(result.ingestionBaseUrl).toBe(DEFAULT_INGESTION_BASE_URL);
    expect(result.invalidFields).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  it('ignores deprecated context.source and applies deterministic fallback source', () => {
    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
      ingestionBaseUrl: 'http://localhost:3000',
      context: {
        source: 'billing-api',
      },
    } as unknown);

    expect(result).toEqual({
      isValid: true,
      apiKey: 'api-key',
      ingestionBaseUrl: 'http://localhost:3000',
      source: 'unknown',
      captureConsole: false,
      logFilter: undefined,
      runtimeConfig: {
        maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
        flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
        retryPolicy: DEFAULT_RETRY_POLICY,
      },
      invalidFields: [],
      invalidIngestionBaseUrlMessage: undefined,
    });
  });

  it('applies validated runtime overrides from client config', () => {
    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
      ingestionBaseUrl: 'http://localhost:3000',
      runtime: {
        maxBatchSize: 10,
        flushIntervalMs: 500,
        maxRetries: 4,
        retryBaseDelayMs: 120,
        retryMaxDelayMs: 2_000,
      },
    });

    expect(result.runtimeConfig).toEqual({
      maxBatchSize: 10,
      flushIntervalMs: 500,
      retryPolicy: {
        maxRetries: 4,
        baseDelayMs: 120,
        maxDelayMs: 2_000,
      },
    });
  });

  it('falls back safely for invalid runtime overrides', () => {
    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
      ingestionBaseUrl: 'http://localhost:3000',
      runtime: {
        maxBatchSize: 100,
        flushIntervalMs: 0,
        maxRetries: Number.NaN,
        retryBaseDelayMs: -10,
        retryMaxDelayMs: Infinity,
      },
    });

    expect(result.runtimeConfig).toEqual({
      maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
      flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
      retryPolicy: DEFAULT_RETRY_POLICY,
    });
  });

  it('ignores runtime overrides when runtime config is malformed', () => {
    const result = guardLogscopeClientConfig({
      apiKey: 'api-key',
      ingestionBaseUrl: 'http://localhost:3000',
      runtime: 'invalid-runtime-config',
    });

    expect(result.runtimeConfig).toEqual({
      maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
      flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
      retryPolicy: DEFAULT_RETRY_POLICY,
    });
    expect(result).toEqual({
      isValid: true,
      apiKey: 'api-key',
      ingestionBaseUrl: 'http://localhost:3000',
      source: 'unknown',
      captureConsole: false,
      logFilter: undefined,
      runtimeConfig: {
        maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
        flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
        retryPolicy: DEFAULT_RETRY_POLICY,
      },
      invalidFields: [],
      invalidIngestionBaseUrlMessage: undefined,
    });
  });
});

describe('guardPinoTransportOptions', () => {
  it('returns a valid guarded options object for complete input', () => {
    const result = guardPinoTransportOptions({
      apiKey: 'api-key',
      endpoint: 'http://localhost:3000',
      source: 'billing-api',
      flushIntervalMs: 50,
      retryPolicy: {
        maxRetries: 1,
      },
      logFilter: {
        levels: ['info'],
      },
    });

    expect(result).toEqual({
      isValid: true,
      apiKey: 'api-key',
      endpoint: 'http://localhost:3000',
      source: 'billing-api',
      flushIntervalMs: 50,
      retryPolicy: {
        maxRetries: 1,
      },
      logFilter: {
        levels: ['info'],
      },
      invalidFields: [],
    });
  });

  it('falls back safely and reports invalid required fields', () => {
    const result = guardPinoTransportOptions({
      apiKey: '',
      endpoint: '',
      source: null,
      retryPolicy: 'invalid',
    });

    expect(result.isValid).toBe(false);
    expect(result.apiKey).toBe('');
    expect(result.endpoint).toBe('');
    expect(result.source).toBe('unknown');
    expect(result.retryPolicy).toBeUndefined();
    expect(result.invalidFields).toEqual(['apiKey', 'endpoint', 'source']);
  });
});

describe('guardWinstonTransportOptions', () => {
  it('returns a valid guarded options object for complete input', () => {
    const result = guardWinstonTransportOptions({
      apiKey: 'api-key',
      endpoint: 'http://localhost:3000',
      source: 'billing-api',
      flushIntervalMs: 50,
      retryPolicy: {
        maxRetries: 1,
      },
      logFilter: {
        levels: ['info'],
      },
    });

    expect(result).toEqual({
      isValid: true,
      apiKey: 'api-key',
      endpoint: 'http://localhost:3000',
      source: 'billing-api',
      flushIntervalMs: 50,
      retryPolicy: {
        maxRetries: 1,
      },
      logFilter: {
        levels: ['info'],
      },
      invalidFields: [],
    });
  });

  it('falls back safely and reports invalid required fields', () => {
    const result = guardWinstonTransportOptions({
      apiKey: '',
      endpoint: '',
      source: null,
      retryPolicy: 'invalid',
    });

    expect(result.isValid).toBe(false);
    expect(result.apiKey).toBe('');
    expect(result.endpoint).toBe('');
    expect(result.source).toBe('unknown');
    expect(result.retryPolicy).toBeUndefined();
    expect(result.invalidFields).toEqual(['apiKey', 'endpoint', 'source']);
  });
});

describe('config warning builders', () => {
  it('produces warning messages using only field names and safe guidance', () => {
    const clientWarning = buildInvalidClientConfigWarning({
      invalidFields: ['apiKey', 'ingestionBaseUrl'],
      invalidIngestionBaseUrlMessage:
        '[logscope] Invalid ingestionBaseUrl. Only trusted endpoints are supported.',
    });
    const pinoWarning = buildInvalidPinoOptionsWarning(['apiKey', 'source']);
    const winstonWarning = buildInvalidWinstonOptionsWarning(['apiKey', 'source']);

    expect(clientWarning).toContain('[logscope]');
    expect(pinoWarning).toContain('[logscope]');
    expect(winstonWarning).toContain('[logscope]');
    expect(clientWarning).toContain('apiKey');
    expect(clientWarning).toContain('ingestionBaseUrl');
    expect(pinoWarning).toContain('apiKey, source');
    expect(winstonWarning).toContain('apiKey, source');
    expect(clientWarning).not.toContain('super-secret-key');
    expect(pinoWarning).not.toContain('super-secret-key');
    expect(winstonWarning).not.toContain('super-secret-key');
  });
});
