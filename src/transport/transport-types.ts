import type { IngestionLogEntry } from '../types';

export type IngestionRequestAction = 'success' | 'drop' | 'drop_entries' | 'retry' | 'unauthorized';
export type IngestionDropErrorKind =
  | 'invalid_endpoint'
  | 'max_retries_exceeded'
  | 'repeated_validation_failure';
export type IngestionRetryErrorKind = 'network_error';

/**
 * Entries the API named in a 400 `details` response and that were removed before resending the
 * rest of the batch. Attached to the final delivery result so callers can surface the loss.
 */
export interface DroppedEntriesSummary {
  count: number;
  /** Zero-based positions in the batch as it was first sent. */
  indexes: number[];
  /** The API's `details` strings for those entries, e.g. `"logs.3.message" Too small: …`. */
  details: string[];
}

export type IngestionRequestResult = (
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
      /** A 400 whose `details` identify specific entries; the caller drops them and resends the rest. */
      action: 'drop_entries';
      status: 400;
      shouldWarnUnauthorized: false;
      errorKind?: never;
      invalidIndexes: number[];
      details: string[];
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
    }
) & {
  droppedEntries?: DroppedEntriesSummary;
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
  /** Optional so hand-rolled fetch doubles keep working; used to read the 400 `details` body. */
  text?: () => Promise<string>;
}

export type FetchLike = (url: string, init: FetchRequestInit) => Promise<FetchResponseLike>;
