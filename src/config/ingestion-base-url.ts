import { DEFAULT_INGESTION_BASE_URL, LOGSCOPE_INGESTION_URL_ENV_VAR } from '../constants';

type IngestionBaseUrlSource = 'config' | 'environment' | 'default';

export interface ResolveIngestionBaseUrlInput {
  configValue: unknown;
  hasConfigValue: boolean;
  getEnvironmentValue?: (name: string) => string | undefined;
}

export interface ResolvedIngestionBaseUrl {
  ingestionBaseUrl: string;
  isValid: boolean;
  source: IngestionBaseUrlSource;
  errorMessage?: string;
}

const OFFICIAL_HOST_SUFFIX = '.logscopeai.com';

const defaultGetEnvironmentValue = (name: string): string | undefined => {
  const env = globalThis.process?.env;

  return typeof env?.[name] === 'string' ? env[name] : undefined;
};

const buildInvalidIngestionBaseUrlMessage = (fieldName: string): string => {
  return `[logscope] Invalid ${fieldName}. Only https://*.logscopeai.com and http://localhost:<port>/http://127.0.0.1:<port> endpoints are supported by the official Logscope SDK.`;
};

const createInvalidResolution = (
  source: Exclude<IngestionBaseUrlSource, 'default'>,
  fieldName: string,
): ResolvedIngestionBaseUrl => {
  return {
    ingestionBaseUrl: '',
    isValid: false,
    source,
    errorMessage: buildInvalidIngestionBaseUrlMessage(fieldName),
  };
};

const normalizeCandidate = (value: string): string => {
  return value.trim();
};

const isLocalHost = (hostname: string): boolean => {
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

const isTrustedOfficialHost = (hostname: string): boolean => {
  return hostname.endsWith(OFFICIAL_HOST_SUFFIX);
};

const validateCandidate = (
  value: unknown,
  source: Exclude<IngestionBaseUrlSource, 'default'>,
  fieldName: string,
): ResolvedIngestionBaseUrl => {
  if (typeof value !== 'string') {
    return createInvalidResolution(source, fieldName);
  }

  const candidate = normalizeCandidate(value);

  if (candidate.length === 0) {
    return createInvalidResolution(source, fieldName);
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(candidate);
  } catch {
    return createInvalidResolution(source, fieldName);
  }

  if (isLocalHost(parsedUrl.hostname)) {
    if (parsedUrl.protocol !== 'http:' || parsedUrl.port.length === 0) {
      return createInvalidResolution(source, fieldName);
    }

    return {
      ingestionBaseUrl: parsedUrl.origin,
      isValid: true,
      source,
    };
  }

  if (parsedUrl.protocol !== 'https:' || !isTrustedOfficialHost(parsedUrl.hostname)) {
    return createInvalidResolution(source, fieldName);
  }

  return {
    ingestionBaseUrl: parsedUrl.origin,
    isValid: true,
    source,
  };
};

export const resolveIngestionBaseUrl = (
  input: ResolveIngestionBaseUrlInput,
): ResolvedIngestionBaseUrl => {
  if (input.hasConfigValue) {
    return validateCandidate(input.configValue, 'config', 'ingestionBaseUrl');
  }

  const environmentValue = (input.getEnvironmentValue ?? defaultGetEnvironmentValue)(
    LOGSCOPE_INGESTION_URL_ENV_VAR,
  );

  if (environmentValue !== undefined) {
    return validateCandidate(environmentValue, 'environment', LOGSCOPE_INGESTION_URL_ENV_VAR);
  }

  return {
    ingestionBaseUrl: DEFAULT_INGESTION_BASE_URL,
    isValid: true,
    source: 'default',
  };
};
