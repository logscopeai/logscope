import type { RetryPolicy } from '../retry/retry-policy';
import {
  resolveRuntimeConfig,
  type ResolvedRuntimeConfig,
  type RuntimeQuantityOverrides,
} from './runtime-config';
import { DEFAULT_INGESTION_BASE_URL, LOG_LEVELS, SAFE_FALLBACK_SOURCE } from '../constants';
import type { LogFilterConfig, LogLevel } from '../types';

type RecordValue = Record<string, unknown>;

type ClientRequiredField = 'apiKey';
type PinoRequiredField = 'apiKey' | 'endpoint' | 'source';

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
  invalidFields: ReadonlyArray<ClientRequiredField>;
}

export interface PinoOptionsGuardResult extends GuardResult {
  apiKey: string;
  endpoint: string;
  source: string;
  flushIntervalMs?: number;
  retryPolicy?: Partial<RetryPolicy>;
  logFilter?: LogFilterConfig;
  invalidFields: ReadonlyArray<PinoRequiredField>;
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
  invalidFields: ReadonlyArray<ClientRequiredField>,
): string => {
  return `[logscope] Invalid client configuration. SDK fallback mode enabled. Missing or invalid required field(s): ${invalidFields.join(
    ', ',
  )}.`;
};

export const buildInvalidPinoOptionsWarning = (
  invalidFields: ReadonlyArray<PinoRequiredField>,
): string => {
  return `[logscope] Invalid pino transport configuration. SDK fallback mode enabled. Missing or invalid required field(s): ${invalidFields.join(
    ', ',
  )}.`;
};

export const guardLogscopeClientConfig = (config: unknown): ClientConfigGuardResult => {
  const apiKey = safeGetProperty(config, 'apiKey');
  const ingestionBaseUrlCandidate = safeGetProperty(config, 'ingestionBaseUrl');
  const endpoint = safeGetProperty(config, 'endpoint');
  const ingestionBaseUrl = isNonEmptyString(ingestionBaseUrlCandidate)
    ? ingestionBaseUrlCandidate
    : isNonEmptyString(endpoint)
      ? endpoint
      : DEFAULT_INGESTION_BASE_URL;
  const context = safeGetProperty(config, 'context');
  const source = safeGetProperty(context, 'source');
  const captureConsole = safeGetProperty(config, 'captureConsole') === true;
  const logFilter = normalizeLogFilter(safeGetProperty(config, 'logFilter'));
  const runtimeConfig = resolveRuntimeConfig(
    normalizeRuntimeOverrides(safeGetProperty(config, 'runtime')),
  );

  const invalidFields: ClientRequiredField[] = [];

  if (!isNonEmptyString(apiKey)) {
    invalidFields.push('apiKey');
  }

  return {
    isValid: invalidFields.length === 0,
    apiKey: isNonEmptyString(apiKey) ? apiKey : '',
    ingestionBaseUrl,
    source: isNonEmptyString(source) ? source : SAFE_FALLBACK_SOURCE,
    captureConsole,
    logFilter,
    runtimeConfig,
    invalidFields,
  };
};

export const guardPinoTransportOptions = (options: unknown): PinoOptionsGuardResult => {
  const apiKey = safeGetProperty(options, 'apiKey');
  const endpoint = safeGetProperty(options, 'endpoint');
  const source = safeGetProperty(options, 'source');
  const flushIntervalMsValue = safeGetProperty(options, 'flushIntervalMs');
  const retryPolicyValue = safeGetProperty(options, 'retryPolicy');
  const logFilter = normalizeLogFilter(safeGetProperty(options, 'logFilter'));

  const invalidFields: PinoRequiredField[] = [];

  if (!isNonEmptyString(apiKey)) {
    invalidFields.push('apiKey');
  }

  if (!isNonEmptyString(endpoint)) {
    invalidFields.push('endpoint');
  }

  if (!isNonEmptyString(source)) {
    invalidFields.push('source');
  }

  return {
    isValid: invalidFields.length === 0,
    apiKey: isNonEmptyString(apiKey) ? apiKey : '',
    endpoint: isNonEmptyString(endpoint) ? endpoint : '',
    source: isNonEmptyString(source) ? source : SAFE_FALLBACK_SOURCE,
    flushIntervalMs: typeof flushIntervalMsValue === 'number' ? flushIntervalMsValue : undefined,
    retryPolicy: normalizeRetryPolicy(retryPolicyValue),
    logFilter,
    invalidFields,
  };
};
