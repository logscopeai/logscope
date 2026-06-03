import type { RetryPolicy } from '../retry/retry-policy';
import {
  resolveRuntimeConfig,
  type ResolvedRuntimeConfig,
  type RuntimeQuantityOverrides,
} from './runtime-config';
import { DEFAULT_INGESTION_BASE_URL, LOG_LEVELS, SAFE_FALLBACK_SOURCE } from '../constants';
import { resolveIngestionBaseUrl } from './ingestion-base-url';
import type { LogFilterConfig, LogLevel } from '../types';

type RecordValue = Record<string, unknown>;

type ClientInvalidField = 'apiKey' | 'ingestionBaseUrl';
type PinoInvalidField = 'apiKey' | 'endpoint' | 'source';
type WinstonInvalidField = 'apiKey' | 'endpoint' | 'source';

interface GuardResult {
  isValid: boolean;
}

export interface ClientConfigGuardResult extends GuardResult {
  apiKey: string;
  ingestionBaseUrl: string;
  source: string;
  captureConsole: boolean;
  logFilter?: LogFilterConfig;
  runtimeConfig: ResolvedRuntimeConfig;
  invalidFields: ReadonlyArray<ClientInvalidField>;
  invalidIngestionBaseUrlMessage?: string;
}

export interface PinoOptionsGuardResult extends GuardResult {
  apiKey: string;
  endpoint: string;
  source: string;
  flushIntervalMs?: number;
  retryPolicy?: Partial<RetryPolicy>;
  logFilter?: LogFilterConfig;
  invalidFields: ReadonlyArray<PinoInvalidField>;
  invalidEndpointMessage?: string;
}

export interface WinstonOptionsGuardResult extends GuardResult {
  apiKey: string;
  endpoint: string;
  source: string;
  flushIntervalMs?: number;
  retryPolicy?: Partial<RetryPolicy>;
  logFilter?: LogFilterConfig;
  invalidFields: ReadonlyArray<WinstonInvalidField>;
  invalidEndpointMessage?: string;
}

const isRecord = (value: unknown): value is RecordValue => {
  return typeof value === 'object' && value !== null;
};

const safeGetProperty = (value: unknown, key: string): unknown => {
  if (!isRecord(value)) {
    return undefined;
  }

  try {
    return value[key];
  } catch {
    return undefined;
  }
};

const hasOwnProperty = (value: unknown, key: string): boolean => {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, key);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const isLogLevel = (value: unknown): value is LogLevel => {
  return typeof value === 'string' && LOG_LEVELS.includes(value as LogLevel);
};

const normalizeLogFilter = (value: unknown): LogFilterConfig | undefined => {
  const levels = safeGetProperty(value, 'levels');

  if (levels === undefined) {
    return isRecord(value) ? {} : undefined;
  }

  if (!Array.isArray(levels) || !levels.every((level) => isLogLevel(level))) {
    return undefined;
  }

  return {
    levels,
  };
};

const normalizeRetryPolicy = (value: unknown): Partial<RetryPolicy> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return value as Partial<RetryPolicy>;
};

const normalizeRuntimeOverrides = (value: unknown): RuntimeQuantityOverrides | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const maxBatchSize = safeGetProperty(value, 'maxBatchSize');
  const flushIntervalMs = safeGetProperty(value, 'flushIntervalMs');
  const maxRetries = safeGetProperty(value, 'maxRetries');
  const retryBaseDelayMs = safeGetProperty(value, 'retryBaseDelayMs');
  const retryMaxDelayMs = safeGetProperty(value, 'retryMaxDelayMs');

  return {
    maxBatchSize: typeof maxBatchSize === 'number' ? maxBatchSize : undefined,
    flushIntervalMs: typeof flushIntervalMs === 'number' ? flushIntervalMs : undefined,
    maxRetries: typeof maxRetries === 'number' ? maxRetries : undefined,
    retryBaseDelayMs: typeof retryBaseDelayMs === 'number' ? retryBaseDelayMs : undefined,
    retryMaxDelayMs: typeof retryMaxDelayMs === 'number' ? retryMaxDelayMs : undefined,
  };
};

export const buildInvalidClientConfigWarning = (
  input: Pick<ClientConfigGuardResult, 'invalidFields' | 'invalidIngestionBaseUrlMessage'>,
): string => {
  const warningParts: string[] = [];

  if (input.invalidFields.includes('apiKey')) {
    warningParts.push('Missing or invalid required field(s): apiKey.');
  }

  if (input.invalidIngestionBaseUrlMessage !== undefined) {
    warningParts.push(input.invalidIngestionBaseUrlMessage);
  }

  return `[logscope] Invalid client configuration. SDK fallback mode enabled.${
    warningParts.length > 0 ? ` ${warningParts.join(' ')}` : ''
  }`;
};

export const buildInvalidPinoOptionsWarning = (
  input: Pick<PinoOptionsGuardResult, 'invalidFields' | 'invalidEndpointMessage'>,
): string => {
  const warningParts = [`Missing or invalid required field(s): ${input.invalidFields.join(', ')}.`];

  if (input.invalidEndpointMessage !== undefined) {
    warningParts.push(input.invalidEndpointMessage);
  }

  return `[logscope] Invalid pino transport configuration. SDK fallback mode enabled. ${warningParts.join(
    ' ',
  )}`;
};

export const buildInvalidWinstonOptionsWarning = (
  input: Pick<WinstonOptionsGuardResult, 'invalidFields' | 'invalidEndpointMessage'>,
): string => {
  const warningParts = [`Missing or invalid required field(s): ${input.invalidFields.join(', ')}.`];

  if (input.invalidEndpointMessage !== undefined) {
    warningParts.push(input.invalidEndpointMessage);
  }

  return `[logscope] Invalid winston transport configuration. SDK fallback mode enabled. ${warningParts.join(
    ' ',
  )}`;
};

export const guardLogscopeClientConfig = (config: unknown): ClientConfigGuardResult => {
  const apiKey = safeGetProperty(config, 'apiKey');
  const ingestionBaseUrlCandidate = safeGetProperty(config, 'ingestionBaseUrl');
  const ingestionBaseUrlResolution = resolveIngestionBaseUrl({
    configValue: ingestionBaseUrlCandidate,
    hasConfigValue:
      hasOwnProperty(config, 'ingestionBaseUrl') && ingestionBaseUrlCandidate !== undefined,
  });
  const captureConsole = safeGetProperty(config, 'captureConsole') === true;
  const logFilter = normalizeLogFilter(safeGetProperty(config, 'logFilter'));
  const runtimeConfig = resolveRuntimeConfig(
    normalizeRuntimeOverrides(safeGetProperty(config, 'runtime')),
  );

  const invalidFields: ClientInvalidField[] = [];

  if (!isNonEmptyString(apiKey)) {
    invalidFields.push('apiKey');
  }

  if (!ingestionBaseUrlResolution.isValid) {
    invalidFields.push('ingestionBaseUrl');
  }

  return {
    isValid: invalidFields.length === 0,
    apiKey: isNonEmptyString(apiKey) ? apiKey : '',
    ingestionBaseUrl: ingestionBaseUrlResolution.isValid
      ? ingestionBaseUrlResolution.ingestionBaseUrl
      : DEFAULT_INGESTION_BASE_URL,
    source: SAFE_FALLBACK_SOURCE,
    captureConsole,
    logFilter,
    runtimeConfig,
    invalidFields,
    invalidIngestionBaseUrlMessage: ingestionBaseUrlResolution.errorMessage,
  };
};

export const guardPinoTransportOptions = (options: unknown): PinoOptionsGuardResult => {
  const apiKey = safeGetProperty(options, 'apiKey');
  const endpointCandidate = safeGetProperty(options, 'endpoint');
  const endpointResolution = resolveIngestionBaseUrl({
    configValue: endpointCandidate,
    hasConfigValue: hasOwnProperty(options, 'endpoint') && endpointCandidate !== undefined,
    fieldName: 'endpoint',
  });
  const source = safeGetProperty(options, 'source');
  const flushIntervalMsValue = safeGetProperty(options, 'flushIntervalMs');
  const retryPolicyValue = safeGetProperty(options, 'retryPolicy');
  const logFilter = normalizeLogFilter(safeGetProperty(options, 'logFilter'));

  const invalidFields: PinoInvalidField[] = [];

  if (!isNonEmptyString(apiKey)) {
    invalidFields.push('apiKey');
  }

  if (!endpointResolution.isValid) {
    invalidFields.push('endpoint');
  }

  if (!isNonEmptyString(source)) {
    invalidFields.push('source');
  }

  return {
    isValid: invalidFields.length === 0,
    apiKey: isNonEmptyString(apiKey) ? apiKey : '',
    endpoint: endpointResolution.isValid
      ? endpointResolution.ingestionBaseUrl
      : DEFAULT_INGESTION_BASE_URL,
    source: isNonEmptyString(source) ? source : SAFE_FALLBACK_SOURCE,
    flushIntervalMs: typeof flushIntervalMsValue === 'number' ? flushIntervalMsValue : undefined,
    retryPolicy: normalizeRetryPolicy(retryPolicyValue),
    logFilter,
    invalidFields,
    invalidEndpointMessage: endpointResolution.errorMessage,
  };
};

export const guardWinstonTransportOptions = (options: unknown): WinstonOptionsGuardResult => {
  const apiKey = safeGetProperty(options, 'apiKey');
  const endpointCandidate = safeGetProperty(options, 'endpoint');
  const endpointResolution = resolveIngestionBaseUrl({
    configValue: endpointCandidate,
    hasConfigValue: hasOwnProperty(options, 'endpoint') && endpointCandidate !== undefined,
    fieldName: 'endpoint',
  });
  const source = safeGetProperty(options, 'source');
  const flushIntervalMsValue = safeGetProperty(options, 'flushIntervalMs');
  const retryPolicyValue = safeGetProperty(options, 'retryPolicy');
  const logFilter = normalizeLogFilter(safeGetProperty(options, 'logFilter'));

  const invalidFields: WinstonInvalidField[] = [];

  if (!isNonEmptyString(apiKey)) {
    invalidFields.push('apiKey');
  }

  if (!endpointResolution.isValid) {
    invalidFields.push('endpoint');
  }

  if (!isNonEmptyString(source)) {
    invalidFields.push('source');
  }

  return {
    isValid: invalidFields.length === 0,
    apiKey: isNonEmptyString(apiKey) ? apiKey : '',
    endpoint: endpointResolution.isValid
      ? endpointResolution.ingestionBaseUrl
      : DEFAULT_INGESTION_BASE_URL,
    source: isNonEmptyString(source) ? source : SAFE_FALLBACK_SOURCE,
    flushIntervalMs: typeof flushIntervalMsValue === 'number' ? flushIntervalMsValue : undefined,
    retryPolicy: normalizeRetryPolicy(retryPolicyValue),
    logFilter,
    invalidFields,
    invalidEndpointMessage: endpointResolution.errorMessage,
  };
};
