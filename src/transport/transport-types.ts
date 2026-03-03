import type { IngestionLogEntry } from '../types';

export type IngestionRequestAction = 'success' | 'drop' | 'retry' | 'unauthorized';
export type IngestionDropErrorKind = 'invalid_endpoint' | 'max_retries_exceeded';
export type IngestionRetryErrorKind = 'network_error';

export type IngestionRequestResult =
  | {
      action: 'success';
      status?: number;
      shouldWarnUnauthorized: false;
      errorKind?: never;
    }
  | {
      action: 'drop';
      status?: number;
      shouldWarnUnauthorized: false;
      errorKind?: IngestionDropErrorKind;
    }
  | {
      action: 'retry';
      status?: number;
      shouldWarnUnauthorized: false;
      errorKind?: IngestionRetryErrorKind;
    }
  | {
      action: 'unauthorized';
      status?: number;
      shouldWarnUnauthorized: true;
      errorKind?: never;
    };

export interface SendIngestionRequestInput {
  endpoint: string;
  apiKey: string;
  logs: IngestionLogEntry[];
}

export interface FetchRequestInit {
  method: 'POST';
  headers: Record<string, string>;
  body: string;
}

export interface FetchResponseLike {
  status: number;
}

export type FetchLike = (url: string, init: FetchRequestInit) => Promise<FetchResponseLike>;
