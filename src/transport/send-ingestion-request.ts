import type {
  FetchLike,
  FetchRequestInit,
  IngestionRequestAction,
  IngestionRequestResult,
  SendIngestionRequestInput,
} from './transport-types';

const INGESTION_PATH = '/api/logs/ingest';

// Explicit status classification for ingestion delivery behavior.
const classifyIngestionStatus = (status: number): IngestionRequestAction => {
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
    console.log(`[logscope] Sending logs batch to ${requestUrl}`);
    const response = await dependencies.fetch(requestUrl, buildRequestInit(input));
    const action = classifyIngestionStatus(response.status);

    if (action === 'unauthorized') {
      return {
        action,
        status: response.status,
        shouldWarnUnauthorized: true,
      };
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
