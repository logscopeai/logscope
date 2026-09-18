import type {
  FetchLike,
  FetchRequestInit,
  FetchResponseLike,
  IngestionRequestAction,
  IngestionRequestResult,
  SendIngestionRequestInput,
} from './transport-types';

const INGESTION_PATH = '/api/logs/ingest';
// The API reports each validation failure as `"logs.<index>.<field>" <message>`.
const DETAIL_ENTRY_INDEX_PATTERN = /^"logs\.(\d+)(?:\.|")/;

type StatusAction = Exclude<IngestionRequestAction, 'drop_entries'>;

// Explicit status classification for ingestion delivery behavior. `drop_entries` is not a status
// outcome: it is derived from the 400 body below.
const classifyIngestionStatus = (status: number): StatusAction => {
  switch (status) {
    case 202:
      return 'success';
    case 400:
    case 413:
      return 'drop';
    case 401:
      return 'unauthorized';
    case 429:
    case 500:
      return 'retry';
    default:
      return status >= 500 ? 'retry' : 'drop';
  }
};

const buildIngestionUrl = (endpoint: string): string => {
  return new URL(INGESTION_PATH, endpoint).toString();
};

const buildRequestInit = (input: SendIngestionRequestInput): FetchRequestInit => {
  return {
    method: 'POST',
    headers: {
      'x-api-key': input.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      logs: input.logs,
    }),
  };
};

const readValidationDetails = async (response: FetchResponseLike): Promise<string[]> => {
  if (typeof response.text !== 'function') {
    return [];
  }

  try {
    const parsedBody: unknown = JSON.parse(await response.text());
    const details =
      typeof parsedBody === 'object' && parsedBody !== null
        ? (parsedBody as { details?: unknown }).details
        : undefined;

    return Array.isArray(details)
      ? details.filter((detail): detail is string => typeof detail === 'string')
      : [];
  } catch {
    return [];
  }
};

/**
 * Maps the API's `details` to entry indexes. Returns an empty list when the failure is not
 * attributable to specific entries (a batch-level rule such as `"logs" Too big`), in which case
 * the whole batch is dropped as before.
 */
export const extractInvalidEntryIndexes = (details: string[], batchSize: number): number[] => {
  const indexes = new Set<number>();

  for (const detail of details) {
    const match = DETAIL_ENTRY_INDEX_PATTERN.exec(detail);

    if (match === null) {
      return [];
    }

    const index = Number(match[1]);

    if (!Number.isInteger(index) || index < 0 || index >= batchSize) {
      return [];
    }

    indexes.add(index);
  }

  return [...indexes].sort((left, right) => left - right);
};

export const sendIngestionRequest = async (
  input: SendIngestionRequestInput,
  dependencies: { fetch: FetchLike } = { fetch: globalThis.fetch as unknown as FetchLike },
): Promise<IngestionRequestResult> => {
  let requestUrl: string;

  try {
    requestUrl = buildIngestionUrl(input.endpoint);
  } catch {
    return {
      action: 'drop',
      shouldWarnUnauthorized: false,
      errorKind: 'invalid_endpoint',
    };
  }

  try {
    const response = await dependencies.fetch(requestUrl, buildRequestInit(input));
    const action = classifyIngestionStatus(response.status);

    if (action === 'unauthorized') {
      return {
        action,
        status: response.status,
        shouldWarnUnauthorized: true,
      };
    }

    if (response.status === 400) {
      const details = await readValidationDetails(response);
      const invalidIndexes = extractInvalidEntryIndexes(details, input.logs.length);

      // Only worth a resend when at least one entry is named and at least one would remain.
      if (invalidIndexes.length > 0 && invalidIndexes.length < input.logs.length) {
        return {
          action: 'drop_entries',
          status: 400,
          shouldWarnUnauthorized: false,
          invalidIndexes,
          details,
        };
      }
    }

    return {
      action,
      status: response.status,
      shouldWarnUnauthorized: false,
    };
  } catch {
    return {
      action: 'retry',
      shouldWarnUnauthorized: false,
      errorKind: 'network_error',
    };
  }
};
